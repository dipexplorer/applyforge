import Database from 'better-sqlite3';
import path from 'path';

export async function GET() {
    try {
        const dbPath = path.join(process.cwd(), 'data', 'applications.db');
        const db = new Database(dbPath);
        
        const stmt = db.prepare('SELECT * FROM applications ORDER BY id DESC');
        const rows = stmt.all();
        db.close();
        
        return new Response(JSON.stringify(rows), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        if (err.message.includes('no such table') || err.message.includes('unable to open database file')) {
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
