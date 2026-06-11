"""
Opt-in idempotency for money mutations via the `Idempotency-Key` header.

A client that sends `Idempotency-Key: <key>` with a mutation gets exactly-once
semantics with replay: the first request runs normally and its JSON response is
stored in the SAME transaction as the effect (see `record`); any later request
with the same key gets the original response back (`Idempotency-Replayed: true`)
without re-running the effect. Two *concurrent* requests with the same key both
miss the replay lookup, but they collide on the unique `(player_id, key)` index
at commit — the loser's whole transaction (effect included) rolls back and
surfaces as a 409, so the effect still applies exactly once.

The stored rows are responses only; the ledger remains the money truth.

Usage — `@idempotent` goes UNDER `@require_player` (auth must run first, or an
unauthenticated caller could replay another player's stored responses), and the
route calls `record(s, payload, status)` inside its `session_scope` block:

    @game_bp.post("/players/<player_id>/seeds/buy")
    @require_player
    @idempotent
    def buy_seed(player_id):
        ...
        with session_scope() as s:
            payload = ...
            record(s, payload, 201)
        return jsonify(payload), 201
"""

import re
from functools import wraps

from flask import current_app, g, json, jsonify, request

from ..db.models import IdempotencyKey
from ..db.session import session_scope

HEADER = "Idempotency-Key"
REPLAY_HEADER = "Idempotency-Replayed"
# Printable token, no whitespace — typically a client-generated UUID.
_KEY_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")


def idempotent(view):
    """Replay a stored response for a duplicate `Idempotency-Key`, else run the
    view with the key staged for `record`. No header -> plain passthrough."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        key = request.headers.get(HEADER)
        if key is None:
            return view(*args, **kwargs)
        if not _KEY_RE.match(key):
            return (
                jsonify({"error": f"{HEADER} must be 1-128 chars of letters, "
                                  "digits, or _.:-"}),
                400,
            )

        player_id = kwargs.get("player_id")
        fingerprint = f"{request.method} {request.path}"
        with session_scope() as s:
            row = (
                s.query(IdempotencyKey)
                .filter_by(player_id=player_id, key=key)
                .one_or_none()
            )
            stored = (
                (row.request_fingerprint, row.response_json, row.status_code)
                if row is not None else None
            )
        if stored is not None:
            stored_fingerprint, body, status = stored
            if stored_fingerprint != fingerprint:
                return (
                    jsonify({"error": f"{HEADER} was already used for a "
                                      f"different request ({stored_fingerprint})"}),
                    400,
                )
            resp = current_app.response_class(body, mimetype="application/json")
            resp.headers[REPLAY_HEADER] = "true"
            return resp, status

        g.idempotency = (player_id, key, fingerprint)
        try:
            return view(*args, **kwargs)
        finally:
            g.idempotency = None

    return wrapper


def record(session, payload, status_code: int = 200) -> None:
    """Stage the response for the in-flight `Idempotency-Key` (no-op without one).

    Must be called INSIDE the route's `session_scope` block so the stored
    response commits in the same transaction as the effect — a key without its
    effect (or vice versa) is impossible.
    """
    info = getattr(g, "idempotency", None)
    if not info:
        return
    player_id, key, fingerprint = info
    session.add(
        IdempotencyKey(
            player_id=player_id,
            key=key,
            request_fingerprint=fingerprint,
            # Serialize with Flask's JSON provider — identical semantics to the
            # jsonify() the route is about to call on the same payload.
            response_json=json.dumps(payload),
            status_code=status_code,
        )
    )
