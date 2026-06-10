"""Regression tests for mint idempotency across a commit-fail window (F006).

INVARIANT UNDER TEST: a chain mint that succeeds on-chain but whose DB commit
later rolls back must NOT be re-minted on retry. The status-only guard
(``nft_status == MINTED``) is insufficient because a rollback reverts the row to
its pre-mint state, so a retry would sail past it and create a SECOND,
irreversible on-chain asset. The fix records an external-key -> asset_id mapping
on the provider (which lives outside the rolled-back DB session) the instant the
chain call returns, so a retry ADOPTS the existing asset instead of minting
again.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from growpodempire.db.session import session_scope
from growpodempire.db.models import Strain
from growpodempire.enums import NFTStatus
from growpodempire.services.game_service import GameService
from growpodempire.services.minting_service import MintingService
from growpodempire.chain.mock import MockChainProvider


def _rare_harvest(s):
    svc = GameService(s)
    p = svc.create_player("mintidem")
    strain = s.query(Strain).filter(Strain.slug == "gorilla-glue-no-4").one()  # rare
    stack = svc.buy_seed(p.id, strain.id)
    pod = svc.create_pod(p.id, "Tent", charge=False)
    plant = svc.plant_seed(p.id, stack.id, pod.id)
    harvest = svc.harvest_plant(p.id, plant.id, weight_g=100, quality=90)
    return p.id, harvest


def test_retry_after_commit_failure_does_not_double_mint(db):
    """Simulate chain-success -> DB rollback -> retry; assert no duplicate ASA.

    We mint once (the chain ASA is created and the provider-side registry is
    populated), then manually rewind the row's DB-visible state to mimic the
    surrounding transaction rolling back AFTER the chain call succeeded. The
    retry must reuse the same asset id and must NOT call ``create_asset`` again.
    """
    with session_scope() as s:
        pid, harvest = _rare_harvest(s)
        # CRITICAL: the same provider instance must persist across the retry,
        # exactly as the process-wide ``shared_provider`` would in production —
        # that is where the reconciliation registry lives.
        provider = MockChainProvider()
        svc = MintingService(s, provider=provider)

        first = svc.mint_harvest(pid, harvest.id)
        first_asset = first.nft_asset_id
        assert first_asset is not None
        assert len(provider.assets) == 1

        # --- Simulate the commit failing and the DB transaction rolling back ---
        # The chain asset already exists, but the DB row reverts to pre-mint.
        harvest.nft_asset_id = None
        harvest.nft_status = NFTStatus.PENDING.value  # not MINTED
        s.flush()

        # Retry. Without the reconciliation guard this would mint a 2nd ASA.
        second = svc.mint_harvest(pid, harvest.id)
        assert second.nft_asset_id == first_asset, "retry must adopt the same asset"
        assert second.nft_status == NFTStatus.MINTED.value
        assert len(provider.assets) == 1, "retry must NOT create a second on-chain asset"


def test_retry_reverted_to_failed_state_does_not_double_mint(db):
    """Same guard holds if the row was left FAILED (the explicit error path)."""
    with session_scope() as s:
        pid, harvest = _rare_harvest(s)
        provider = MockChainProvider()
        svc = MintingService(s, provider=provider)

        first_asset = svc.mint_harvest(pid, harvest.id).nft_asset_id
        assert len(provider.assets) == 1

        # Rewind to FAILED + null asset (as if commit died and a cleanup ran).
        harvest.nft_asset_id = None
        harvest.nft_status = NFTStatus.FAILED.value
        s.flush()

        second = svc.mint_harvest(pid, harvest.id)
        assert second.nft_asset_id == first_asset
        assert len(provider.assets) == 1


def test_status_guard_still_short_circuits_minted_rows(db):
    """The plain idempotency path (already MINTED, no rollback) still works."""
    with session_scope() as s:
        pid, harvest = _rare_harvest(s)
        provider = MockChainProvider()
        svc = MintingService(s, provider=provider)
        a = svc.mint_harvest(pid, harvest.id).nft_asset_id
        b = svc.mint_harvest(pid, harvest.id).nft_asset_id
        assert a == b
        assert len(provider.assets) == 1
