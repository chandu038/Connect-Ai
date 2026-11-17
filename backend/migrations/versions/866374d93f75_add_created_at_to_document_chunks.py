"""add created at to document chunks

Revision ID: 866374d93f75
Revises: cf16e874f898
Create Date: 2026-11-13 12:40:59.284813

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '866374d93f75'
down_revision: Union[str, Sequence[str], None] = 'cf16e874f898'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "document_chunks",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "document_chunks",
        "created_at",
    )
