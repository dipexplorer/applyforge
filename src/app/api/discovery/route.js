import axios from 'axios';
import * as cheerio from 'cheerio';

// ─── Source 1: Remotive.com ───────────────────────────────────────────────────
async function fetchRemotive({ field, jobType, paid }) {
    const categoryMap = {
        'Software Engineering': 'software-dev',
        'Backend': 'software-dev',
        'Full Stack': 'software-dev',
        'Frontend': 'software-dev',
        'Data/ML': 'data',
        'DevOps': 'devops-sysadmin',
    };
    const category = categoryMap[field] || 'software-dev';

    const res = await axios.get(`https://remotive.com/api/remote-jobs?category=${category}&limit=100`, {
        timeout: 8000
    });

    const jobs = res.data.jobs || [];

    return jobs.map(j => ({
        source: 'Remotive',
        externalId: String(j.id),
        company: j.company_name || '',
        role: j.title || '',
        location: j.candidate_required_location || 'Remote',
        url: j.url || '',
        applyUrl: j.url || '',
        jobType: j.job_type || 'full_time',
        salary: j.salary || '',
        isPaid: !!(j.salary),
        isRemote: true,
        datePosted: j.publication_date || '',
    }));
}

// ─── Source 2: RemoteOK.com ───────────────────────────────────────────────────
async function fetchRemoteOK({ field }) {
    const tagMap = {
        'Software Engineering': 'software',
        'Backend': 'backend',
        'Full Stack': 'full-stack',
        'Frontend': 'front-end',
        'Data/ML': 'machine-learning',
        'DevOps': 'devops',
    };
    const tag = tagMap[field] || 'software';

    const res = await axios.get(`https://remoteok.com/api?tag=${tag}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 AutoApplier Bot' },
        timeout: 8000
    });

    const jobs = (res.data || []).filter(j => j.id);

    return jobs.map(j => ({
        source: 'RemoteOK',
        externalId: String(j.id),
        company: j.company || '',
        role: j.position || '',
        location: j.location || 'Remote',
        url: j.url || '',
        applyUrl: j.apply_url || j.url || '',
        jobType: (j.tags || []).includes('internship') ? 'internship' : 'full_time',
        salary: j.salary_min ? `$${j.salary_min} - $${j.salary_max}` : '',
        isPaid: !!(j.salary_min && j.salary_min > 0),
        isRemote: true,
        datePosted: j.date || '',
    }));
}

// ─── Source 3: Jobicy.com ─────────────────────────────────────────────────────
async function fetchJobicy({ field }) {
    const industryMap = {
        'Software Engineering': 'engineering',
        'Backend': 'engineering',
        'Full Stack': 'engineering',
        'Frontend': 'design',
        'Data/ML': 'data-science',
        'DevOps': 'sysadmin',
    };
    const industry = industryMap[field] || 'engineering';

    const res = await axios.get(`https://jobicy.com/api/v2/remote-jobs?count=50&industry=${industry}`, {
        timeout: 8000
    });

    const jobs = res.data.jobs || [];

    return jobs.map(j => ({
        source: 'Jobicy',
        externalId: String(j.id),
        company: j.companyName || '',
        role: j.jobTitle || '',
        location: j.jobGeo || 'Remote',
        url: j.url || '',
        applyUrl: j.url || '',
        jobType: j.jobType || 'full_time',
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : '',
        isPaid: !!(j.annualSalaryMin),
        isRemote: true,
        datePosted: j.pubDate || '',
    }));
}

// ─── Source 4 & 5: SimplifyJobs GitHub (Internships + New Grad) ──────────────
async function fetchSimplify({ jobType, field }) {
    const repos = [];

    if (!jobType || jobType === 'Internship') {
        repos.push({
            url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md',
            type: 'internship',
        });
    }
    if (!jobType || jobType === 'Full-Time') {
        repos.push({
            url: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md',
            type: 'full_time',
        });
    }

    const fieldKeywords = {
        'Software Engineering': ['software', 'engineer', 'swe'],
        'Backend': ['backend', 'back-end', 'server'],
        'Full Stack': ['full stack', 'fullstack'],
        'Frontend': ['frontend', 'front-end', 'ui'],
        'Data/ML': ['data', 'machine learning', 'ml', 'ai'],
        'DevOps': ['devops', 'cloud', 'infrastructure'],
    };
    const keywords = fieldKeywords[field] || [];

    const results = [];

    await Promise.allSettled(repos.map(async (repo) => {
        const res = await axios.get(repo.url, { timeout: 10000 });
        const $ = cheerio.load(res.data);

        $('tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length >= 4) {
                const company = $(tds[0]).text().trim();
                const role = $(tds[1]).text().trim();
                const location = $(tds[2]).text().trim();
                const link = $(tds[3]).find('a').attr('href');

                if (!link) return;
                if (!link.includes('greenhouse.io') && !link.includes('lever.co')) return;

                // Field filter
                if (keywords.length > 0) {
                    const roleLower = role.toLowerCase();
                    if (!keywords.some(k => roleLower.includes(k))) return;
                }

                results.push({
                    source: 'SimplifyJobs',
                    externalId: link,
                    company,
                    role,
                    location,
                    url: link,
                    applyUrl: link,
                    jobType: repo.type,
                    salary: '',
                    isPaid: true,
                    isRemote: location.toLowerCase().includes('remote'),
                    datePosted: '',
                });
            }
        });
    }));

    return results;
}

// ─── Source 6: The Muse ───────────────────────────────────────────────────────
async function fetchMuse({ field }) {
    const categoryMap = {
        'Software Engineering': 'Software Engineer',
        'Data/ML': 'Data Science',
        'DevOps': 'IT & Systems',
        'Frontend': 'Software Engineer',
        'Backend': 'Software Engineer',
        'Full Stack': 'Software Engineer',
    };
    const category = categoryMap[field] || 'Software Engineer';

    const res = await axios.get(`https://www.themuse.com/api/public/jobs?category=${encodeURIComponent(category)}&level=Internship&page=1`, {
        timeout: 8000
    });

    const jobs = res.data?.results || [];

    return jobs.map(j => ({
        source: 'TheMuse',
        externalId: String(j.id),
        company: j.company?.name || '',
        role: j.name || '',
        location: (j.locations || []).map(l => l.name).join(', ') || 'Remote',
        url: j.refs?.landing_page || '',
        applyUrl: j.refs?.landing_page || '',
        jobType: 'internship',
        salary: '',
        isPaid: true,
        isRemote: (j.locations || []).some(l => l.name?.toLowerCase().includes('remote')),
        datePosted: j.publication_date || '',
    }));
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const {
            jobType = 'Any',
            field = 'Any',
            remoteOnly = false,
            paid = 'Any',
            location = 'Any',
            sortBy = 'newest',
        } = await req.json();

        const params = { jobType, field, remoteOnly, paid };

        // Fetch from all sources in parallel
        const sourceResults = await Promise.allSettled([
            fetchRemotive(params),
            fetchRemoteOK(params),
            fetchJobicy(params),
            fetchSimplify(params),
            fetchMuse(params),
        ]);

        let allJobs = [];
        sourceResults.forEach(result => {
            if (result.status === 'fulfilled') {
                allJobs = allJobs.concat(result.value);
            }
        });

        // ── Apply cross-source filters ──────────────────────────────────────
        if (jobType && jobType !== 'Any') {
            const typeLower = jobType.toLowerCase().replace('-', '_');
            allJobs = allJobs.filter(j => {
                const jt = (j.jobType || '').toLowerCase().replace('-', '_');
                if (typeLower === 'internship') return jt.includes('intern');
                if (typeLower === 'full_time' || typeLower === 'full-time') return jt.includes('full');
                return true;
            });
        }

        if (field && field !== 'Any') {
            const fieldLower = field.toLowerCase();
            allJobs = allJobs.filter(j =>
                j.role.toLowerCase().includes(fieldLower.split(' ')[0]) ||
                j.role.toLowerCase().includes(fieldLower)
            );
        }

        if (remoteOnly) {
            allJobs = allJobs.filter(j =>
                j.isRemote || j.location.toLowerCase().includes('remote') || j.location.toLowerCase().includes('worldwide')
            );
        }

        if (paid === 'Paid') {
            allJobs = allJobs.filter(j => j.isPaid);
        } else if (paid === 'Unpaid') {
            allJobs = allJobs.filter(j => !j.isPaid);
        }

        if (location && location !== 'Any' && location !== 'Remote') {
            const locLower = location.toLowerCase();
            allJobs = allJobs.filter(j =>
                j.location.toLowerCase().includes(locLower)
            );
        }

        // ── Deduplicate by URL ──────────────────────────────────────────────
        const seen = new Set();
        allJobs = allJobs.filter(j => {
            const key = j.applyUrl || j.url;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // ── Sort ────────────────────────────────────────────────────────────
        if (sortBy === 'newest') {
            allJobs.sort((a, b) => {
                if (!a.datePosted) return 1;
                if (!b.datePosted) return -1;
                return new Date(b.datePosted) - new Date(a.datePosted);
            });
        }

        return new Response(JSON.stringify({ jobs: allJobs, total: allJobs.length }), {
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
