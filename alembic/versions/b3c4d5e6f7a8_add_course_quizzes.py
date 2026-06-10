"""add course_quizzes table for interactive post-lecture quizzes

Revision ID: b3c4d5e6f7a8
Revises: f1a2b3c4d5e6
Create Date: 2026-06-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_quizzes",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("player_id", sa.String(36), sa.ForeignKey("players.id"), nullable=False),
        sa.Column("course_key", sa.String(64), nullable=False),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_quiz_player_course", "course_quizzes", ["player_id", "course_key"])


def downgrade() -> None:
    op.drop_index("ix_quiz_player_course", table_name="course_quizzes")
    op.drop_table("course_quizzes")
