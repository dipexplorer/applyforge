import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req) {
    try {
        const { jobType, field, remoteOnly } = await req.json();
        
        // Select repo based on job type
        let url = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md';
        if (jobType === 'Full-Time') {
            url = 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md';
        }

        const res = await axios.get(url);
        const $ = cheerio.load(res.data);
        
        let jobs = [];
        
        $('tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length >= 4) {
                const company = $(tds[0]).text().trim();
                const role = $(tds[1]).text().trim();
                const location = $(tds[2]).text().trim();
                const link = $(tds[3]).find('a').attr('href');
                
                if (link && (link.includes('greenhouse.io') || link.includes('lever.co'))) {
                    jobs.push({
                        company,
                        role,
                        location,
                        link
                    });
                }
            }
        });

        // Apply filters
        if (field && field !== 'Any') {
            const fieldLower = field.toLowerCase();
            jobs = jobs.filter(job => job.role.toLowerCase().includes(fieldLower));
        }

        if (remoteOnly) {
            jobs = jobs.filter(job => job.location.toLowerCase().includes('remote'));
        }

        return new Response(JSON.stringify({ jobs }), {
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
