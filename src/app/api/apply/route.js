import { spawn } from 'child_process';
import path from 'path';

export async function POST(req) {
    try {
        const { url } = await req.json();
        
        if (!url) {
            return new Response(JSON.stringify({ error: "URL is required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const workerPath = path.join(process.cwd(), 'src', 'lib', 'worker.js');
        
        // Spawn a detached Node process to handle Playwright
        const child = spawn('node', [workerPath, url], {
            detached: true,
            stdio: 'ignore'
        });
        
        // Unref so the parent (Next.js) doesn't wait for the child
        child.unref();
        
        return new Response(JSON.stringify({ message: "AI Copilot successfully launched in a new window!", url }), {
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
