import { readFile } from 'fs/promises';
import path from 'path';

// Allow cross-origin requests from the Chrome extension
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
    try {
        const profilePath = path.join(process.cwd(), 'data', 'profile.json');
        const raw = await readFile(profilePath, 'utf8');
        const profile = JSON.parse(raw);
        return new Response(JSON.stringify(profile), { status: 200, headers: CORS });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
    }
}
