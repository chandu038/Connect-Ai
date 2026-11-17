"""add must change password to users

Revision ID: 3c5f23730cf0
Revises: 55c58b342d3d
Create Date: 2026-11-09 12:25:33.359578

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c5f23730cf0'
down_revision: Union[str, Sequence[str], None] = '55c58b342d3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade():
    op.drop_column("users", "must_change_password")
