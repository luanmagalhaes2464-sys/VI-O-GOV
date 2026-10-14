from contextlib import contextmanager
from psycopg import connect
from psycopg.rows import dict_row
from .config import settings

@contextmanager
def conn():
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL não configurada")
    with connect(settings.database_url, row_factory=dict_row, connect_timeout=8) as db:
        yield db

def query(sql: str, params: tuple = ()) -> list[dict]:
    with conn() as db:
        with db.cursor() as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]
