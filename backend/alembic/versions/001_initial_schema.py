"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table("parcels",
        sa.Column("id",               sa.Integer,      primary_key=True),
        sa.Column("name",             sa.String(255),  nullable=False),
        sa.Column("geom",             geoalchemy2.Geometry("MULTIPOLYGON", srid=32642), nullable=True),
        sa.Column("water_limit",      sa.Numeric(15,2), nullable=False, server_default="0"),
        sa.Column("water_fact",       sa.Numeric(15,2), nullable=False, server_default="0"),
        sa.Column("notes",            sa.Text,          nullable=True),
        sa.Column("phone",            sa.String(50),    nullable=True),
        sa.Column("iin",              sa.String(20),    nullable=True),
        sa.Column("cadastral_number", sa.String(100),   nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_parcels_geom",      "parcels", ["geom"], postgresql_using="gist")
    op.create_index("idx_parcels_iin",       "parcels", ["iin"])
    op.create_index("idx_parcels_cadastral", "parcels", ["cadastral_number"])

    op.create_table("farmers",
        sa.Column("id",              sa.Integer,     primary_key=True),
        sa.Column("full_name",       sa.String(255), nullable=False),
        sa.Column("iin",             sa.String(20),  nullable=False, unique=True),
        sa.Column("contract_number", sa.String(100), nullable=True),
        sa.Column("phone",           sa.String(50),  nullable=True),
        sa.Column("address",         sa.Text,        nullable=True),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP, server_default=sa.func.now()),
    )
    op.create_index("idx_farmers_iin",             "farmers", ["iin"])
    op.create_index("idx_farmers_contract_number", "farmers", ["contract_number"])

    op.create_table("contracts",
        sa.Column("id",                  sa.Integer,       primary_key=True),
        sa.Column("farmer_id",           sa.Integer,       sa.ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contract_number",     sa.String(100),   nullable=False),
        sa.Column("contract_date",       sa.Date,          nullable=True),
        sa.Column("total_water_volume",  sa.Numeric(12,3), nullable=True),
        sa.Column("actual_water_volume", sa.Numeric(12,3), nullable=True),
        sa.Column("tariff_amount",       sa.Numeric(12,2), nullable=True, server_default="0"),
        sa.Column("year",                sa.Integer,       nullable=True),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP, server_default=sa.func.now()),
        sa.UniqueConstraint("contract_number", "year", name="uq_contract_number_year"),
    )
    op.create_index("idx_contracts_farmer_id",      "contracts", ["farmer_id"])
    op.create_index("idx_contracts_contract_number","contracts", ["contract_number"])
    op.create_index("idx_contracts_year",           "contracts", ["year"])

    op.create_table("contract_parcels",
        sa.Column("id",                   sa.Integer,       primary_key=True),
        sa.Column("contract_id",          sa.Integer,       sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parcel_id",            sa.Integer,       sa.ForeignKey("parcels.id",   ondelete="SET NULL"), nullable=True),
        sa.Column("cadastral_number",     sa.String(100),   nullable=True),
        sa.Column("distribution_channel", sa.String(255),   nullable=True),
        sa.Column("main_channel",         sa.String(255),   nullable=True),
        sa.Column("culture",              sa.String(255),   nullable=True),
        sa.Column("doc_hectares",         sa.Numeric(10,3), nullable=True),
        sa.Column("irrigated_hectares",   sa.Numeric(10,3), nullable=True),
        sa.Column("rural_district",       sa.String(255),   nullable=True),
        sa.Column("geom",                 geoalchemy2.Geometry("GEOMETRY", srid=4326), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP, server_default=sa.func.now()),
    )
    op.create_index("idx_contract_parcels_contract_id",  "contract_parcels", ["contract_id"])
    op.create_index("idx_contract_parcels_parcel_id",    "contract_parcels", ["parcel_id"])
    op.create_index("idx_contract_parcels_rural_district","contract_parcels", ["rural_district"])
    op.create_index("idx_contract_parcels_geom",         "contract_parcels", ["geom"], postgresql_using="gist")

    # View
    op.execute("""
        CREATE OR REPLACE VIEW parcels_with_pct AS
        SELECT *,
            CASE WHEN water_limit > 0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct
        FROM parcels
    """)

    # Функция и триггеры updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
        $$ LANGUAGE plpgsql
    """)
    for tbl in ["parcels", "farmers", "contracts", "contract_parcels"]:
        op.execute(f"""
            CREATE TRIGGER {tbl}_updated_at
            BEFORE UPDATE ON {tbl}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at()
        """)


def downgrade() -> None:
    for tbl in ["parcels", "farmers", "contracts", "contract_parcels"]:
        op.execute(f"DROP TRIGGER IF EXISTS {tbl}_updated_at ON {tbl}")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at")
    op.execute("DROP VIEW IF EXISTS parcels_with_pct")
    op.drop_table("contract_parcels")
    op.drop_table("contracts")
    op.drop_table("farmers")
    op.drop_table("parcels")
