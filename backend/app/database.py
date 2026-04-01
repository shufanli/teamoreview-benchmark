import sqlite3
import os
from contextlib import contextmanager

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "lobster.db")


def get_db_path():
    os.makedirs(DB_DIR, exist_ok=True)
    return DB_PATH


def init_db():
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE NOT NULL,
            lobster_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            total_score INTEGER DEFAULT 0,
            speed_score INTEGER DEFAULT 0,
            skill_bonus INTEGER DEFAULT 0,
            iq INTEGER DEFAULT 0,
            title TEXT DEFAULT '',
            percentile REAL DEFAULT 0,
            duration_seconds INTEGER DEFAULT 0,
            answers_json TEXT DEFAULT '{}',
            scores_json TEXT DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_tests_token ON tests(token);
        CREATE INDEX IF NOT EXISTS idx_tests_iq ON tests(iq DESC);

        CREATE TABLE IF NOT EXISTS upgrade_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id TEXT UNIQUE NOT NULL,
            token TEXT NOT NULL,
            selected_qids TEXT NOT NULL DEFAULT '[]',
            selected_skills TEXT NOT NULL DEFAULT '[]',
            command_text TEXT NOT NULL DEFAULT '',
            skill_url TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            old_iq INTEGER DEFAULT 0,
            new_iq INTEGER DEFAULT 0,
            old_title TEXT DEFAULT '',
            new_title TEXT DEFAULT '',
            old_percentile REAL DEFAULT 0,
            new_percentile REAL DEFAULT 0,
            FOREIGN KEY (token) REFERENCES tests(token)
        );
        CREATE INDEX IF NOT EXISTS idx_upgrade_task_id ON upgrade_tasks(task_id);
        CREATE INDEX IF NOT EXISTS idx_upgrade_token ON upgrade_tasks(token);

        CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sharer_token TEXT NOT NULL,
            friend_token TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            friend_completed BOOLEAN DEFAULT 0,
            redeemed BOOLEAN DEFAULT 0,
            redeemed_qid TEXT DEFAULT NULL,
            FOREIGN KEY (sharer_token) REFERENCES tests(token),
            FOREIGN KEY (friend_token) REFERENCES tests(token)
        );
        CREATE INDEX IF NOT EXISTS idx_referrals_sharer ON referrals(sharer_token);
        CREATE INDEX IF NOT EXISTS idx_referrals_friend ON referrals(friend_token);
    """)
    conn.commit()
    conn.close()


@contextmanager
def get_connection():
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
