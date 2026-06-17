"""add diploma nft columns to degree_progress

Revision ID: e1a7c4d92b08
Revises: 9d669edf48a8
Create Date: 2026-06-17 06:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a7c4d92b08'
down_revision: Union[str, None] = '9d669edf48a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('degree_progress', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nft_asset_id', sa.Integer(), nullable=True))
        # server_default backfills existing earned-degree rows so the NOT NULL
        # add succeeds on a populated table; the ORM sets it explicitly otherwise.
        batch_op.add_column(
            sa.Column('nft_status', sa.String(length=16), nullable=False, server_default='none')
        )


def downgrade() -> None:
    with op.batch_alter_table('degree_progress', schema=None) as batch_op:
        batch_op.drop_column('nft_status')
        batch_op.drop_column('nft_asset_id')
