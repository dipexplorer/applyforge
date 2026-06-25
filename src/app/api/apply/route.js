import { applyToJob } from '@/lib/engine';

export async function POST(req) {
    try {
        const { url } = await req.json();
        
        if (!url) {
            return new Response(JSON.stringify({ error: "URL is required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Run in background without blocking the response
        applyToJob(url).catch(err => console.error("Background apply error:", err));
        
        return new Response(JSON.stringify({ message: "Application started. Check your terminal and Playwright window.", url }), {
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
