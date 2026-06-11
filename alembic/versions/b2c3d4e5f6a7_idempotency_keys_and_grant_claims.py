"""idempotency keys + one-shot grant claims

Finishes RISK #6: the concurrency core (optimistic lock / CHECK / harvest-once)
made double effects DB-impossible; these two tables add the replay UX and the
faucet backstop:
  * idempotency_keys — (player_id, key) -> stored response, inserted in the
    same transaction as the mutation's effect, so a duplicate submission
    replays the original response instead of re-running (or 409-ing).
  * grant_claims — one-shot faucet claims (daily stipend per UTC day,
    achievement per key), unique so a raced double-claim can't double-pay.

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-06-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("player_id", sa.String(length=32), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=255), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["player_id"], ["players.id"],
            name=op.f("fk_idempotency_keys_player_id_players"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_idempotency_keys")),
    )
    op.create_index(
        "uq_idempotency_keys_player_key",
        "idempotency_keys", ["player_id", "key"], unique=True,
    )

    op.create_table(
        "grant_claims",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("player_id", sa.String(length=32), nullable=False),
        sa.Column("grant_type", sa.String(length=32), nullable=False),
        sa.Column("grant_key", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["player_id"], ["players.id"],
            name=op.f("fk_grant_claims_player_id_players"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_grant_claims")),
    )
    op.create_index(
        "uq_grant_claims_player_type_key",
        "grant_claims", ["player_id", "grant_type", "grant_key"], unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_grant_claims_player_type_key", table_name="grant_claims")
    op.drop_table("grant_claims")
    op.drop_index("uq_idempotency_keys_player_key", table_name="idempotency_keys")
    op.drop_table("idempotency_keys")
