import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
    const dbPath = path.join(process.cwd(), 'data', 'applications.db');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    return db;
}

export async function POST(req) {
    try {
        const { url } = await req.json();
        
        if (!url) {
            return new Response(JSON.stringify({ error: "URL is required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Save the click to history
        const db = getDb();
        db.prepare(`
            INSERT INTO applications (url, apply_url, status, source) 
            VALUES (?, ?, 'Pending', 'AutoApplier')
        `).run(url, url);
        
        return new Response(JSON.stringify({ message: "Recorded in history" }), {
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
