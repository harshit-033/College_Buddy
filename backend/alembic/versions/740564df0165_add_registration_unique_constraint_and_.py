"""add_registration_unique_constraint_and_numeric_fees

Revision ID: 740564df0165
Revises: f3b49ef478c9
Create Date: 2026-10-07 00:07:51.029148

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '740564df0165'
down_revision: Union[str, Sequence[str], None] = 'f3b49ef478c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.create_unique_constraint('_user_event_reg_uc', ['user_id', 'event_id'])

    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.alter_column('fee',
               existing_type=sa.Float(),
               type_=sa.Numeric(precision=10, scale=2),
               existing_nullable=True)
        batch_op.alter_column('volunteer_fee',
               existing_type=sa.Float(),
               type_=sa.Numeric(precision=10, scale=2),
               existing_nullable=True)

    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.alter_column('amount',
               existing_type=sa.Float(),
               type_=sa.Numeric(precision=10, scale=2),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.alter_column('amount',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Float(),
               existing_nullable=False)

    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.alter_column('volunteer_fee',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Float(),
               existing_nullable=True)
        batch_op.alter_column('fee',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Float(),
               existing_nullable=True)

    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.drop_constraint('_user_event_reg_uc', type_='unique')
