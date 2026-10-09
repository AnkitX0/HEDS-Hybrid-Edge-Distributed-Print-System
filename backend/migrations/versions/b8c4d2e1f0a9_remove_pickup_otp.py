"""remove_pickup_otp

Revision ID: b8c4d2e1f0a9
Revises: 05af244050c1
Create Date: 2026-10-08 23:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c4d2e1f0a9'
down_revision: Union[str, None] = '05af244050c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('pickups', 'otp_hash')
    op.drop_column('pickups', 'otp_salt')


def downgrade() -> None:
    op.add_column('pickups', sa.Column('otp_hash', sa.String(length=128), nullable=True))
    op.add_column('pickups', sa.Column('otp_salt', sa.String(length=64), nullable=True))
