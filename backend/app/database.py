import asyncpg
import json
import os
from pathlib import Path
from typing import Optional

_pool: Optional[asyncpg.Pool] = None

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


async def init_connection(conn: asyncpg.Connection) -> None:
    await conn.set_type_codec(
        "jsonb",
        schema="pg_catalog",
        encoder=json.dumps,
        decoder=json.loads,
        format="text",
    )


async def _run_migrations(pool: asyncpg.Pool) -> None:
    """Apply any migration .sql files that haven't been applied yet."""
    await pool.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # If parcels table already exists (from Docker entrypoint init scripts),
    # mark the pre-existing migrations as applied so we don't re-run them.
    parcels_exists = await pool.fetchval(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parcels')"
    )
    if parcels_exists:
        existing_applied = {row["filename"] for row in await pool.fetch("SELECT filename FROM _migrations")}
        pre_existing = ["001_init.sql", "002_seed_parcels.sql", "003_add_search_fields.sql"]
        for fname in pre_existing:
            if fname not in existing_applied:
                await pool.execute(
                    "INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", fname
                )
                print(f"[migration] Marked {fname} as already applied (via Docker entrypoint)")

    existing = {row["filename"] for row in await pool.fetch("SELECT filename FROM _migrations")}

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    for fpath in migration_files:
        name = fpath.name
        if name in existing:
            continue
        sql = fpath.read_text(encoding="utf-8")
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute("INSERT INTO _migrations (filename) VALUES ($1)", name)
        print(f"[migration] Applied {name}")


async def init_db() -> None:
    global _pool
    dsn = os.getenv(
        "DATABASE_URL",
        "postgresql://watermap:watermap123@localhost:5432/watermap",
    )
    _pool = await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10, init=init_connection)
    await _run_migrations(_pool)


async def close_db() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool
