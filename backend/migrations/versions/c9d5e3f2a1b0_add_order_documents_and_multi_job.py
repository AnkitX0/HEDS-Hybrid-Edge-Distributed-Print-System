"""add_order_documents_and_multi_job

Revision ID: c9d5e3f2a1b0
Revises: b8c4d2e1f0a9
Create Date: 2026-10-08 23:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c9d5e3f2a1b0'
down_revision: Union[str, None] = 'b8c4d2e1f0a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update print_specifications: make order_id nullable, drop unique index, recreate non-unique
    op.drop_index('ix_print_specifications_order_id', table_name='print_specifications')
    op.create_index(op.f('ix_print_specifications_order_id'), 'print_specifications', ['order_id'], unique=False)
    op.alter_column('print_specifications', 'order_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    # 2. Create order_documents table
    op.create_table(
        'order_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('print_specification_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('sequence', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('page_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('copies', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('calculated_price_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['print_specification_id'], ['print_specifications.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_documents_document_id'), 'order_documents', ['document_id'], unique=False)
    op.create_index(op.f('ix_order_documents_order_id'), 'order_documents', ['order_id'], unique=False)
    op.create_index(op.f('ix_order_documents_print_specification_id'), 'order_documents', ['print_specification_id'], unique=False)

    # 3. Add order_document_id to print_specifications
    op.add_column('print_specifications', sa.Column('order_document_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_print_specifications_order_document_id', 'print_specifications', 'order_documents', ['order_document_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_print_specifications_order_document_id'), 'print_specifications', ['order_document_id'], unique=False)

    # 4. Update print_jobs: drop unique index on order_id, recreate non-unique, add document_id, order_document_id, sequence
    op.drop_index('ix_print_jobs_order_id', table_name='print_jobs')
    op.create_index(op.f('ix_print_jobs_order_id'), 'print_jobs', ['order_id'], unique=False)

    op.add_column('print_jobs', sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('print_jobs', sa.Column('order_document_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('print_jobs', sa.Column('sequence', sa.Integer(), nullable=False, server_default='1'))

    op.create_foreign_key('fk_print_jobs_document_id', 'print_jobs', 'documents', ['document_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_print_jobs_order_document_id', 'print_jobs', 'order_documents', ['order_document_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_print_jobs_document_id'), 'print_jobs', ['document_id'], unique=False)
    op.create_index(op.f('ix_print_jobs_order_document_id'), 'print_jobs', ['order_document_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_print_jobs_order_document_id'), table_name='print_jobs')
    op.drop_index(op.f('ix_print_jobs_document_id'), table_name='print_jobs')
    op.drop_constraint('fk_print_jobs_order_document_id', 'print_jobs', type_='foreignkey')
    op.drop_constraint('fk_print_jobs_document_id', 'print_jobs', type_='foreignkey')
    op.drop_column('print_jobs', 'sequence')
    op.drop_column('print_jobs', 'order_document_id')
    op.drop_column('print_jobs', 'document_id')
    op.drop_index(op.f('ix_print_jobs_order_id'), table_name='print_jobs')
    op.create_index('ix_print_jobs_order_id', 'print_jobs', ['order_id'], unique=True)

    op.drop_index(op.f('ix_print_specifications_order_document_id'), table_name='print_specifications')
    op.drop_constraint('fk_print_specifications_order_document_id', 'print_specifications', type_='foreignkey')
    op.drop_column('print_specifications', 'order_document_id')

    op.drop_index(op.f('ix_order_documents_print_specification_id'), table_name='order_documents')
    op.drop_index(op.f('ix_order_documents_order_id'), table_name='order_documents')
    op.drop_index(op.f('ix_order_documents_document_id'), table_name='order_documents')
    op.drop_table('order_documents')

    op.alter_column('print_specifications', 'order_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.drop_index(op.f('ix_print_specifications_order_id'), table_name='print_specifications')
    op.create_index('ix_print_specifications_order_id', 'print_specifications', ['order_id'], unique=True)
