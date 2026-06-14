"""Feature-flag gating for the MVP launch.

Non-MVP systems (the marketplace, the on-chain wallet/minting layer, the Cup,
the University, and NPC contracts) are gated behind boolean flags resolved at
app-creation time into ``current_app.config["FEATURE_*"]`` (see
``config.Settings`` + ``create_app``). A gated route returns **404** when its
feature is off, so a hidden system is indistinguishable from one that does not
exist. Flags default OFF; flip the matching env var on to surface a system.

The web client mirrors the same flags via ``NEXT_PUBLIC_ENABLE_*`` (see
``web/src/lib/features.ts``) so the nav and routes hide in lock-step.
"""
from functools import wraps

from flask import current_app, jsonify


def require_feature(feature: str):
    """Gate a route behind ``FEATURE_<feature>``; 404 when the feature is off."""
    config_key = f"FEATURE_{feature.upper()}"

    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            if not current_app.config.get(config_key, False):
                return jsonify({"error": "Not found"}), 404
            return view(*args, **kwargs)

        return wrapper

    return decorator
