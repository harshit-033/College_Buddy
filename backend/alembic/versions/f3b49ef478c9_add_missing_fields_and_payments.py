"""add missing fields and payments

Revision ID: f3b49ef478c9
Revises: ecb9148e56ae
Create Date: 2026-07-02 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b49ef478c9'
down_revision: Union[str, Sequence[str], None] = 'ecb9148e56ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns to events table
    # Using batch_alter_table for SQLite compatibility
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('volunteer_fee', sa.Float(), nullable=True, server_default='0.0'))
        batch_op.add_column(sa.Column('event_type', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('criteria', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('prizes', sa.String(), nullable=True))

    # 2. Create payments table
    op.create_table('payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('order_id', sa.String(), nullable=True),
        sa.Column('payment_id', sa.String(), nullable=True),
        sa.Column('signature', sa.String(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(), nullable=True, server_default='INR'),
        sa.Column('status', sa.String(), nullable=True, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_payments_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_payments_order_id'), ['order_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_payments_payment_id'), ['payment_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_payments_status'), ['status'], unique=False)


def downgrade() -> None:
    # 1. Drop payments table
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_payments_status'))
        batch_op.drop_index(batch_op.f('ix_payments_payment_id'))
        batch_op.drop_index(batch_op.f('ix_payments_order_id'))
        batch_op.drop_index(batch_op.f('ix_payments_id'))
    op.drop_table('payments')

    # 2. Drop columns from events table
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.drop_column('prizes')
        batch_op.drop_column('criteria')
        batch_op.drop_column('event_type')
        batch_op.drop_column('volunteer_fee')
