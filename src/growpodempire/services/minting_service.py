"""
MintingService — turns eligible in-game assets into Algorand NFTs.

Flow is DB-first / chain-second and idempotent:
  1. validate ownership + eligibility,
  2. mark the row PENDING,
  3. create the ASA via the chain provider,
  4. persist the returned asset id + MINTED status.
If the chain call fails the row is marked FAILED and a GameError is raised. An
already-MINTED asset is returned unchanged (no double-mint).

IDEMPOTENCY / DOUBLE-MINT (F006):
The DB-status guard (``nft_status == MINTED``) alone is NOT enough. Consider:
the chain ``create_asset`` succeeds (a real ASA now exists on-chain), then the
surrounding DB transaction *fails to commit and rolls back*. The row reverts to
its pre-mint state (status not MINTED, ``nft_asset_id`` NULL), so a retry sails
past the status guard and mints a SECOND on-chain asset — a permanent,
irreversible duplicate.

To make minting safe across that chain-success -> commit-fail -> retry window
we reconcile against a side record that does NOT live in the rolled-back DB
session: a provider-scoped reconciliation registry keyed by a stable external
key (kind + row id + metadata hash). The asset id is recorded the instant the
chain call returns — before any DB commit — so a retry finds it and ADOPTS the
existing asset instead of minting again. The external key is also the natural
hook for cross-process reconciliation against a chain indexer in production
(see residual-risk note in the rebuttal).
"""

from typing import Optional

from sqlalchemy.orm import Session

from ..config import get_settings
from ..economy.config import get_economy_config, EconomyConfig
from ..enums import NFTStatus, Rarity, rarity_index
from ..db.models import Harvest, Strain
from ..chain.provider import ChainProvider, ChainError
from ..chain import metadata as md
from ..chain.factory import shared_provider
from . import leveling_service
from .game_service import GameError


class MintingService:
    def __init__(
        self,
        session: Session,
        provider: Optional[ChainProvider] = None,
        config: Optional[EconomyConfig] = None,
        settings=None,
    ):
        self.session = session
        self.cfg = config or get_economy_config()
        self.settings = settings or get_settings()
        self.provider = provider or shared_provider(self.settings)

    @property
    def _nft_cfg(self) -> dict:
        return self.cfg.raw.get("chain", {}).get("nft", {})

    def _min_rarity_index(self) -> int:
        return rarity_index(Rarity(self._nft_cfg.get("mint_min_rarity", "rare")))

    def _nft_url(self, kind: str, obj_id: str) -> str:
        base = self.settings.nft_metadata_base_url.rstrip("/")
        path = f"/api/game/nft/{kind}/{obj_id}.json"
        return f"{base}{path}#arc3" if base else f"{path}#arc3"

    # ----- Harvest NFTs ---------------------------------------------------
    def mint_harvest(self, player_id: str, harvest_id: str) -> Harvest:
        harvest = self.session.get(Harvest, harvest_id)
        if harvest is None or harvest.player_id != player_id:
            raise GameError("Harvest not found")
        if harvest.nft_status == NFTStatus.MINTED.value:
            return harvest  # idempotent

        if rarity_index(harvest.rarity_snapshot) < self._min_rarity_index():
            raise GameError(
                f"Harvest rarity '{harvest.rarity_snapshot}' is below the mint "
                f"threshold '{self._nft_cfg.get('mint_min_rarity', 'rare')}'"
            )

        strain = self.session.get(Strain, harvest.strain_id)
        metadata = md.harvest_metadata(harvest, strain)
        minted = self._mint(
            harvest,
            kind="harvest",
            asset_name=f"{strain.name} Harvest"[:32],
            url=self._nft_url("harvest", harvest.id),
            metadata=metadata,
        )
        leveling_service.award(self.session, player_id, "mint", self.cfg)
        return minted

    # ----- Strain NFTs ----------------------------------------------------
    def mint_strain(self, player_id: str, strain_id: str) -> Strain:
        strain = self.session.get(Strain, strain_id)
        if strain is None:
            raise GameError("Strain not found")
        if strain.created_by_player_id != player_id:
            raise GameError("Only the breeder can mint this strain")
        if strain.nft_status == NFTStatus.MINTED.value:
            return strain

        min_stability = float(self._nft_cfg.get("strain_min_stability", 0.85))
        if strain.stability < min_stability:
            raise GameError(
                f"Strain stability {strain.stability:.2f} is below the mint "
                f"threshold {min_stability:.2f} (stabilize it further first)"
            )
        if rarity_index(strain.rarity) < self._min_rarity_index():
            raise GameError(
                f"Strain rarity '{strain.rarity}' is below the mint threshold"
            )

        metadata = md.strain_metadata(strain)
        minted = self._mint(
            strain,
            kind="strain",
            asset_name=strain.name[:32],
            url=self._nft_url("strain", strain.id),
            metadata=metadata,
        )
        leveling_service.award(self.session, player_id, "mint", self.cfg)
        return minted

    # ----- idempotency / reconciliation ----------------------------------
    @staticmethod
    def _mint_registry(provider) -> dict:
        """Provider-scoped {external_key -> asset_id} map of completed mints.

        Lives on the chain provider (a process-wide singleton via
        ``shared_provider``), NOT in the DB session, so it survives a DB
        transaction rollback. That is precisely what lets a retry detect an
        already-minted on-chain asset after a chain-success -> commit-fail.
        """
        reg = getattr(provider, "_mint_reconciliation", None)
        if reg is None:
            reg = {}
            # Stored on the provider instance; harmless for mock and real alike.
            provider._mint_reconciliation = reg
        return reg

    def _external_key(self, kind: str, row_id: str, metadata: dict) -> str:
        """Stable idempotency key for a (row, metadata) mint.

        Bound to the row identity AND the metadata hash so the same logical
        asset always maps to one on-chain mint, while a genuinely different
        asset (different content) gets its own.
        """
        return f"{kind}:{row_id}:{md.metadata_hash(metadata).hex()}"

    # ----- shared mint path ----------------------------------------------
    def _mint(self, row, kind: str, asset_name: str, url: str, metadata: dict):
        registry = self._mint_registry(self.provider)
        ext_key = self._external_key(kind, row.id, metadata)

        # Reconcile FIRST: if we already created this asset on-chain in a prior
        # attempt (whose DB commit may have been rolled back), adopt it instead
        # of minting a duplicate. This is the F006 double-mint guard.
        existing = registry.get(ext_key)
        if existing is not None:
            row.nft_asset_id = existing
            row.nft_status = NFTStatus.MINTED.value
            return row

        row.nft_status = NFTStatus.PENDING.value
        self.session.flush()
        try:
            asset_id = self.provider.create_asset(
                unit_name="GPNFT",
                asset_name=asset_name,
                total=1,
                decimals=0,
                url=url,
                metadata_hash=md.metadata_hash(metadata),
            )
        except ChainError as exc:
            row.nft_status = NFTStatus.FAILED.value
            raise GameError(f"On-chain mint failed: {exc}") from exc

        # Record the mapping IMMEDIATELY, before touching anything that depends
        # on the DB commit succeeding. If the commit later fails and the row
        # rolls back, this registry entry remains and the next retry adopts the
        # asset above rather than minting again.
        registry[ext_key] = asset_id

        row.nft_asset_id = asset_id
        row.nft_status = NFTStatus.MINTED.value
        return row

    def metadata_for(self, kind: str, obj_id: str) -> dict:
        """Serve the ARC-3 metadata JSON for a minted asset."""
        if kind == "harvest":
            harvest = self.session.get(Harvest, obj_id)
            if harvest is None:
                raise GameError("Harvest not found")
            return md.harvest_metadata(harvest, self.session.get(Strain, harvest.strain_id))
        if kind == "strain":
            strain = self.session.get(Strain, obj_id)
            if strain is None:
                raise GameError("Strain not found")
            return md.strain_metadata(strain)
        raise GameError("Unknown metadata kind")
