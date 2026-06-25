import { scrapeJobs } from '@/lib/scraper';

export async function POST(req) {
    try {
        const { boardUrl, keyword } = await req.json();
        
        if (!boardUrl) {
            return new Response(JSON.stringify({ error: "boardUrl is required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const links = await scrapeJobs(boardUrl, keyword || "");
        
        return new Response(JSON.stringify({ links }), {
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
