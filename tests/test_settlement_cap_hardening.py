"""Regression tests for the rolling-24h withdrawal cap (F005 + F019).

INVARIANT UNDER TEST: two withdrawals whose combined magnitude exceeds the
per-player daily cap are ALWAYS blocked — including when both are posted in the
*same* (autoflush=False) session before any commit. The historical bug summed
only previously-flushed ledger rows, so a pair of un-flushed same-session
debits each saw zero prior withdrawals and both slipped past the cap. The fix
flushes the in-flight debit before summing, so the Nth withdrawal is measured
against the true post-debit total.
"""

import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.config import Settings
from growpodempire.db.session import session_scope
from growpodempire.economy.ledger import balance, get_wallet
from growpodempire.services.game_service import GameService, GameError
from growpodempire.services.settlement_service import SettlementService
from growpodempire.chain.mock import MockChainProvider


def _settings_with_cap(cap: str) -> Settings:
    """A Settings instance with a low withdrawal cap, mock chain forced."""
    s = Settings()
    s.max_withdrawal_per_day = cap
    s.asa_id = None  # force the service to create its own ASA on the mock
    return s


def _svc(s, cap="150"):
    # One MockChainProvider per service so each call mirrors to chain cleanly.
    return SettlementService(
        s, provider=MockChainProvider(), settings=_settings_with_cap(cap)
    )


def test_two_same_session_withdrawals_over_cap_block_the_second(db):
    """Same un-flushed session: first withdrawal fits, second breaches → raises.

    This is the core F005 regression. Both debits are posted with autoflush off;
    the flush-before-sum fix must let the cap *see* the first debit when the
    second is evaluated.
    """
    with session_scope() as s:
        gs = GameService(s)
        p = gs.create_player("capper")
        gs.link_wallet(p.id, "A" * 58)
        # Give the player ample in-game balance so the cap, not funds, is the gate.
        get_wallet(s, p.id)  # ensure wallet row exists
        start = balance(s, p.id)
        assert start >= Decimal("200"), "seed balance should comfortably exceed cap"

        svc = _svc(s, cap="150")
        # First withdrawal of 100 is under the 150 cap → succeeds.
        svc.withdraw(p.id, 100)
        # Second withdrawal of 100 would push the rolling total to 200 > 150.
        with pytest.raises(GameError, match="Daily withdrawal limit"):
            svc.withdraw(p.id, 100)


def test_single_withdrawal_at_cap_is_allowed(db):
    """A withdrawal exactly at the cap is permitted (cap is inclusive)."""
    with session_scope() as s:
        gs = GameService(s)
        p = gs.create_player("atcap")
        gs.link_wallet(p.id, "B" * 58)
        svc = _svc(s, cap="150")
        result = svc.withdraw(p.id, 150)
        assert result["withdrawn"] == 150.0


def test_cap_holds_across_separate_committed_sessions(db):
    """The cap must also span sessions: a committed withdrawal counts later.

    session_scope() commits on clean exit, so the first withdrawal's debit is
    durably on the ledger when the second session evaluates the cap.
    """
    pid = None
    with session_scope() as s:
        gs = GameService(s)
        p = gs.create_player("crosssession")
        gs.link_wallet(p.id, "C" * 58)
        pid = p.id
        _svc(s, cap="150").withdraw(p.id, 100)  # committed on scope exit

    # New session: the prior committed 100 must count toward the 150 cap, so a
    # further 100 (total 200) is rejected. The GameError is allowed to propagate
    # out of session_scope so the scope ROLLS BACK the rejected debit — letting
    # it commit would corrupt the rolling sum (and mask the cap on the retry).
    with pytest.raises(GameError, match="Daily withdrawal limit"):
        with session_scope() as s:
            _svc(s, cap="150").withdraw(pid, 100)

    # And a withdrawal within the remaining headroom (50, total 150 == cap) is
    # still allowed — proving the rejected 100 above did not persist.
    with session_scope() as s:
        result = _svc(s, cap="150").withdraw(pid, 50)
        assert result["withdrawn"] == 50.0


def test_cap_disabled_when_zero(db):
    """cap == 0 disables the guard entirely (back-compat / opt-out)."""
    with session_scope() as s:
        gs = GameService(s)
        p = gs.create_player("nocap")
        gs.link_wallet(p.id, "D" * 58)
        svc = _svc(s, cap="0")
        svc.withdraw(p.id, 100)
        svc.withdraw(p.id, 100)  # would breach a 150 cap, but cap is off
