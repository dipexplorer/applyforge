const Database = require('better-sqlite3');
const path = require('path');

let _db = null;

function getDb() {
    if (_db) return _db;
    
    const dbPath = path.join(process.cwd(), 'data', 'applications.db');
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');

    // Applications table — tracks every auto-apply attempt
    _db.exec(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT DEFAULT 'manual',
            company TEXT,
            role TEXT,
            location TEXT,
            url TEXT NOT NULL,
            apply_url TEXT,
            job_type TEXT,
            salary TEXT,
            is_paid INTEGER DEFAULT 1,
            is_remote INTEGER DEFAULT 1,
            ats_platform TEXT,
            date_applied TEXT DEFAULT (datetime('now')),
            status TEXT DEFAULT 'Pending',
            notes TEXT
        )
    `);

    // Discovered jobs cache table — stores search results between sessions
    _db.exec(`
        CREATE TABLE IF NOT EXISTS discovered_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT,
            external_id TEXT,
            company TEXT,
            role TEXT,
            location TEXT,
            url TEXT,
            apply_url TEXT,
            job_type TEXT,
            salary TEXT,
            is_paid INTEGER DEFAULT 1,
            is_remote INTEGER DEFAULT 1,
            date_posted TEXT,
            date_fetched TEXT DEFAULT (datetime('now')),
            status TEXT DEFAULT 'New',
            UNIQUE(source, external_id)
        )
    `);

    return _db;
}

module.exports = { getDb };
