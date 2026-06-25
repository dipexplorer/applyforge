import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
    const dbPath = path.join(process.cwd(), 'data', 'applications.db');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    db.exec(`
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

    return db;
}

export async function GET() {
    try {
        const db = getDb();
        const apps = db.prepare('SELECT * FROM applications ORDER BY date_applied DESC LIMIT 200').all();
        return new Response(JSON.stringify(apps), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function PATCH(req) {
    try {
        const { id, status } = await req.json();
        const db = getDb();
        db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id);
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
