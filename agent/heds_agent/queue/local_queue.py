import sqlite3
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


class LocalQueue:
    def __init__(self, db_path: str = "local_queue.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS local_jobs (
                    job_id TEXT PRIMARY KEY,
                    order_id TEXT NOT NULL,
                    order_number TEXT NOT NULL,
                    lease_id TEXT NOT NULL,
                    lease_expires_at TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    document_filename TEXT NOT NULL,
                    page_count INTEGER NOT NULL,
                    print_spec_json TEXT NOT NULL,
                    status TEXT NOT NULL, -- RECEIVED, PRINTING, COMPLETED, FAILED
                    synced_with_cloud INTEGER DEFAULT 0, -- 1 if cloud confirmed
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            conn.commit()

    def save_job(
        self,
        job_id: str,
        order_id: str,
        order_number: str,
        lease_id: str,
        lease_expires_at: str,
        document_id: str,
        document_filename: str,
        page_count: int,
        print_spec: Dict[str, Any],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO local_jobs (
                    job_id, order_id, order_number, lease_id, lease_expires_at,
                    document_id, document_filename, page_count, print_spec_json,
                    status, synced_with_cloud, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', 0, ?, ?)
            """, (
                job_id, order_id, order_number, lease_id, lease_expires_at,
                document_id, document_filename, page_count, json.dumps(print_spec),
                now, now
            ))
            conn.commit()

    def update_status(self, job_id: str, status: str, synced: bool = False) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute("""
                UPDATE local_jobs
                SET status = ?, synced_with_cloud = ?, updated_at = ?
                WHERE job_id = ?
            """, (status, 1 if synced else 0, now, job_id))
            conn.commit()

    def get_pending_unsynced_jobs(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT job_id, order_id, order_number, status, updated_at
                FROM local_jobs
                WHERE synced_with_cloud = 0
            """)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_queue_depth(self) -> int:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM local_jobs WHERE status IN ('RECEIVED', 'PRINTING')")
            return cursor.fetchone()[0]
