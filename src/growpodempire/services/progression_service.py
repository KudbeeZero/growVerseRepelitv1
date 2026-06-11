"""
ProgressionService — retention features: a daily login stipend and one-time
achievement rewards. Both are faucets routed through the economy ledger.

Duplicate-claim protection is layered: the ledger-derived checks below give
friendly 400s for sequential re-claims, and a unique `GrantClaim` row written
with each grant makes a *raced* double-claim collide at the DB level (the
loser's transaction rolls back -> 409), so the faucet can never double-pay.
"""

from datetime import timedelta
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from ..economy.config import get_economy_config, EconomyConfig
from ..economy.ledger import post, balance
from ..enums import LedgerEntryType
from ..db.models import LedgerEntry, Harvest, BreedingEvent, GrantClaim
from ..simulation.clock import Clock, SystemClock
from .game_service import GameService, GameError


class ProgressionService:
    def __init__(
        self,
        session: Session,
        config: Optional[EconomyConfig] = None,
        clock: Optional[Clock] = None,
    ):
        self.session = session
        self.cfg = config or get_economy_config()
        self.clock = clock or SystemClock()
        self._prog = self.cfg.raw.get("progression", {})

    # ----- Daily stipend --------------------------------------------------
    def claim_daily(self, player_id: str) -> dict:
        GameService(self.session).get_player(player_id)  # validates existence
        self.session.flush()  # make prior pending entries visible to the query
        last = (
            self.session.query(LedgerEntry)
            .filter(
                LedgerEntry.player_id == player_id,
                LedgerEntry.entry_type == LedgerEntryType.DAILY_STIPEND.value,
            )
            .order_by(LedgerEntry.created_at.desc())
            .first()
        )
        cooldown = timedelta(hours=self._prog.get("daily_cooldown_hours", 22))
        now = self.clock.now()
        if last is not None and now - last.created_at < cooldown:
            ready_in = cooldown - (now - last.created_at)
            raise GameError(
                f"Daily stipend already claimed; available again in "
                f"{int(ready_in.total_seconds() // 3600)}h"
            )

        # One-shot backstop: at most one stipend per (player, UTC day). The row
        # is deliberately NOT flushed here — a raced duplicate collides on the
        # unique index at commit and rolls the whole grant back (-> 409), while
        # sequential duplicates never get past the cooldown check above.
        self.session.add(GrantClaim(
            player_id=player_id,
            grant_type="daily_stipend",
            grant_key=now.strftime("%Y-%m-%d"),
        ))
        amount = self.cfg.daily_stipend
        entry = post(self.session, player_id, amount, LedgerEntryType.DAILY_STIPEND)
        entry.created_at = now  # honor the injected clock for cooldown math
        return {"claimed": float(amount), "balance": float(balance(self.session, player_id))}

    # ----- Achievements ---------------------------------------------------
    def list_achievements(self, player_id: str) -> List[dict]:
        defs = self._prog.get("achievements", {})
        claimed = self._claimed_keys(player_id)
        out = []
        for key, spec in defs.items():
            out.append(
                {
                    "key": key,
                    "description": spec.get("description", key),
                    "reward": spec.get("reward", 0),
                    "unlocked": self._is_unlocked(player_id, key, spec),
                    "claimed": key in claimed,
                }
            )
        return out

    def claim_achievement(self, player_id: str, key: str) -> dict:
        defs = self._prog.get("achievements", {})
        if key not in defs:
            raise GameError(f"Unknown achievement '{key}'")
        if key in self._claimed_keys(player_id):
            raise GameError("Achievement already claimed")
        if not self._is_unlocked(player_id, key, defs[key]):
            raise GameError("Achievement not yet unlocked")

        # One-shot backstop: unique per (player, achievement) — a raced
        # double-claim collides at commit and rolls back (-> 409).
        self.session.add(GrantClaim(
            player_id=player_id, grant_type="achievement", grant_key=key,
        ))
        reward = defs[key].get("reward", 0)
        post(
            self.session, player_id, reward, LedgerEntryType.REWARD,
            ref_type="achievement", ref_id=key,
        )
        return {"key": key, "reward": reward, "balance": float(balance(self.session, player_id))}

    # ----- helpers --------------------------------------------------------
    def _claimed_keys(self, player_id: str) -> set:
        self.session.flush()
        rows = (
            self.session.query(LedgerEntry.ref_id)
            .filter(
                LedgerEntry.player_id == player_id,
                LedgerEntry.entry_type == LedgerEntryType.REWARD.value,
                LedgerEntry.ref_type == "achievement",
            )
            .all()
        )
        return {r[0] for r in rows}

    def _is_unlocked(self, player_id: str, key: str, spec: dict) -> bool:
        harvests = (
            self.session.query(Harvest).filter(Harvest.player_id == player_id).count()
        )
        breeds = (
            self.session.query(BreedingEvent)
            .filter(BreedingEvent.player_id == player_id)
            .count()
        )
        nfts = (
            self.session.query(Harvest)
            .filter(Harvest.player_id == player_id, Harvest.nft_status == "minted")
            .count()
        )
        if key == "first_harvest":
            return harvests >= 1
        if key == "first_breed":
            return breeds >= 1
        if key == "first_nft":
            return nfts >= 1
        if key == "green_thumb":
            return harvests >= spec.get("threshold", 5)
        if key == "master_breeder":
            return breeds >= spec.get("threshold", 5)
        if key == "high_roller":
            return balance(self.session, player_id) >= Decimal(str(spec.get("threshold", 2000)))
        return False
