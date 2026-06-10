"""
SettlementService — materialize in-game GROW on-chain and back.

The DB ledger stays authoritative; this mirrors balances to the GROW ASA:
- withdraw: debit the in-game balance, transfer ASA treasury -> player, bump
  wallet.asa_balance, and stamp the ledger entry with the on-chain txid.
- deposit:  the reverse.
Uses the configured chain provider (offline MockChainProvider by default).
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from ..config import get_settings
from ..economy.config import get_economy_config, EconomyConfig
from ..economy.ledger import post, to_money, get_wallet
from ..enums import LedgerEntryType
from ..db.models import Player, LedgerEntry
from ..chain.provider import ChainProvider, ChainError, TREASURY
from ..chain.factory import shared_provider
from ..chain.token import create_token_asa
from .game_service import GameError


class SettlementService:
    def __init__(
        self,
        session: Session,
        provider: Optional[ChainProvider] = None,
        config: Optional[EconomyConfig] = None,
        settings=None,
        asset_id: Optional[int] = None,
    ):
        self.session = session
        self.cfg = config or get_economy_config()
        self.settings = settings or get_settings()
        self.provider = provider or shared_provider(self.settings)
        self._decimals = int(self.cfg.raw.get("chain", {}).get("token", {}).get("decimals", 6))
        # Resolve the GROW ASA id: configured, explicit, or freshly created.
        self.asset_id = asset_id or self.settings.asa_id or create_token_asa(self.provider, self.cfg)

    def _base_units(self, amount: Decimal) -> int:
        return int(amount * (10 ** self._decimals))

    def _require_amount(self, amount) -> Decimal:
        amount = to_money(amount)
        if amount <= 0:
            raise GameError("amount must be positive")
        return amount

    def _enforce_daily_cap(self, player_id: str, amount: Decimal) -> None:
        """Block withdrawals that exceed the rolling-24h per-player cap.

        Defence in depth around the treasury: even with a stolen API key, an
        attacker can't drain more than the configured daily limit.

        INVARIANT: the rolling-24h sum MUST include the withdrawal currently
        being processed. ``withdraw`` posts the debit row *before* calling this
        guard; because the session runs ``autoflush=False`` that row is not yet
        visible to a plain query, so we ``flush()`` first to make the in-flight
        debit count. (The previous code summed only previously-flushed rows and
        then added ``amount`` separately — but two debits posted in the *same*
        un-flushed session both saw zero prior rows, so the pair could exceed
        the cap. Flushing here folds the in-flight row(s) into the sum, so the
        Nth withdrawal in a session is always measured against the real total.)

        TOCTOU / true concurrency: a real row-lock (``SELECT ... FOR UPDATE`` on
        the player's withdrawal window, or a serialized per-player counter) is
        required to make this safe against parallel committed transactions on
        Postgres. That exceeds this lane (schema/locking) — see
        reports/2026-06-10/rebuttals/sloan.md. The flush fix below closes the
        single-session undercount, which is the exploitable path today.
        """
        cap = to_money(self.settings.max_withdrawal_per_day)
        if cap <= 0:  # cap disabled
            return
        # Make the just-posted (un-flushed) debit visible to the sum below.
        self.session.flush()
        since = datetime.now(timezone.utc) - timedelta(hours=24)
        rows = (
            self.session.query(LedgerEntry)
            .filter(
                LedgerEntry.player_id == player_id,
                LedgerEntry.entry_type == LedgerEntryType.ASA_WITHDRAWAL.value,
                LedgerEntry.created_at >= since,
            )
            .all()
        )
        # Withdrawal entries are negative; sum their magnitudes. This total now
        # INCLUDES the in-flight debit, so we compare the post-debit total
        # directly against the cap (no separate `+ amount`).
        total = sum((-r.amount for r in rows), Decimal("0"))
        if total > cap:
            # `total` already includes this withdrawal; the headroom that was
            # available *before* it is cap minus the prior total (total-amount).
            remaining = cap - (total - amount)
            raise GameError(
                f"Daily withdrawal limit reached (cap {cap}/24h, "
                f"{remaining if remaining > 0 else 0} remaining)"
            )

    def withdraw(self, player_id: str, amount) -> dict:
        amount = self._require_amount(amount)
        player = self.session.get(Player, player_id)
        if player is None:
            raise GameError("Player not found")
        if not player.algorand_address:
            raise GameError("Link an Algorand wallet first")

        # Debit in-game balance (raises InsufficientFundsError if short).
        entry = post(
            self.session, player_id, -amount, LedgerEntryType.ASA_WITHDRAWAL,
            ref_type="asa", ref_id=str(self.asset_id),
        )
        # Then enforce the rolling-24h treasury cap. The cap guard flushes so the
        # just-posted debit (autoflush is off) is counted in the rolling sum — a
        # violation raises and the surrounding transaction rolls the debit back.
        self._enforce_daily_cap(player_id, amount)
        try:
            txid = self.provider.transfer_asset(
                self.asset_id, player.algorand_address, self._base_units(amount)
            )
        except ChainError as exc:
            raise GameError(f"On-chain transfer failed: {exc}") from exc

        entry.onchain_txid = txid
        wallet = get_wallet(self.session, player_id)
        wallet.asa_balance = to_money((wallet.asa_balance or Decimal("0")) + amount)
        return {
            "withdrawn": float(amount),
            "txid": txid,
            "asa_balance": float(wallet.asa_balance),
            "balance": float(wallet.cached_balance),
        }

    def deposit(self, player_id: str, amount) -> dict:
        amount = self._require_amount(amount)
        wallet = get_wallet(self.session, player_id)
        if (wallet.asa_balance or Decimal("0")) < amount:
            raise GameError("Insufficient on-chain ASA balance")

        try:
            txid = self.provider.transfer_asset(
                self.asset_id, TREASURY, self._base_units(amount)
            )
        except ChainError as exc:
            raise GameError(f"On-chain transfer failed: {exc}") from exc

        entry = post(
            self.session, player_id, amount, LedgerEntryType.ASA_DEPOSIT,
            ref_type="asa", ref_id=str(self.asset_id),
        )
        entry.onchain_txid = txid
        wallet.asa_balance = to_money((wallet.asa_balance or Decimal("0")) - amount)
        return {
            "deposited": float(amount),
            "txid": txid,
            "asa_balance": float(wallet.asa_balance),
            "balance": float(wallet.cached_balance),
        }
