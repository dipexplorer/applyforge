// Use native fetch (Node 18+ built-in) — no axios/cheerio import issues
// cheerio is loaded via require() inside the function for HTML parsing

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizeJobType(raw = '') {
    const r = raw.toLowerCase();
    if (r.includes('intern')) return 'internship';
    if (r.includes('part')) return 'part_time';
    if (r.includes('contract') || r.includes('freelance')) return 'contract';
    return 'full_time';
}

// ─── Source 1: Remotive ───────────────────────────────────────────────────────
async function fetchRemotive({ field }) {
    const categoryMap = {
        'Software Engineering': 'software-dev',
        'Backend': 'software-dev',
        'Full Stack': 'software-dev',
        'Frontend': 'software-dev',
        'Data/ML': 'data',
        'DevOps': 'devops-sysadmin',
    };
    const category = categoryMap[field] || 'software-dev';
    const res = await fetch(`https://remotive.com/api/remote-jobs?category=${category}&limit=100`);
    if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);
    const data = await res.json();
    return (data.jobs || []).map(j => ({
        source: 'Remotive',
        externalId: String(j.id),
        company: j.company_name || '',
        role: j.title || '',
        location: j.candidate_required_location || 'Worldwide',
        url: j.url || '',
        applyUrl: j.url || '',
        jobType: normalizeJobType(j.job_type),
        salary: j.salary || '',
        isPaid: !!j.salary,
        isRemote: true,
        datePosted: j.publication_date || '',
    }));
}

// ─── Source 2: RemoteOK ───────────────────────────────────────────────────────
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
    const res = await fetch(`https://remoteok.com/api?tag=${tag}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 AutoApplier' }
    });
    if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`);
    const data = await res.json();
    const jobs = data.filter(j => j.id && j.position);
    return jobs.map(j => ({
        source: 'RemoteOK',
        externalId: String(j.id),
        company: j.company || '',
        role: j.position || '',
        location: j.location || 'Remote',
        url: j.url || '',
        applyUrl: j.apply_url || j.url || '',
        jobType: (j.tags || []).includes('internship') ? 'internship' : 'full_time',
        salary: j.salary_min ? `$${j.salary_min}–$${j.salary_max}` : '',
        isPaid: !!(j.salary_min && j.salary_min > 0),
        isRemote: true,
        datePosted: j.date || '',
    }));
}

// ─── Source 3: Jobicy ────────────────────────────────────────────────────────
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
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&industry=${industry}`);
    if (!res.ok) throw new Error(`Jobicy HTTP ${res.status}`);
    const data = await res.json();
    return (data.jobs || []).map(j => ({
        source: 'Jobicy',
        externalId: String(j.id),
        company: j.companyName || '',
        role: j.jobTitle || '',
        location: j.jobGeo || 'Remote',
        url: j.url || '',
        applyUrl: j.url || '',
        jobType: normalizeJobType(String(j.jobType || '')),
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin}–$${j.annualSalaryMax}` : '',
        isPaid: !!j.annualSalaryMin,
        isRemote: true,
        datePosted: j.pubDate || '',
    }));
}

// ─── Source 4 & 5: SimplifyJobs GitHub Markdown ──────────────────────────────
async function fetchSimplify({ jobType, field }) {
    const repos = [];
    if (!jobType || jobType === 'Any' || jobType === 'Internship') {
        repos.push({ url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md', type: 'internship' });
    }
    if (!jobType || jobType === 'Any' || jobType === 'Full-Time') {
        repos.push({ url: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md', type: 'full_time' });
    }

    const { load } = await import('cheerio');
    const results = [];

    await Promise.allSettled(repos.map(async (repo) => {
        const res = await fetch(repo.url);
        if (!res.ok) return;
        const html = await res.text();
        const $ = load(html);
        $('tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length < 4) return;
            const company = $(tds[0]).text().trim();
            const role = $(tds[1]).text().trim();
            const location = $(tds[2]).text().trim();
            const link = $(tds[3]).find('a').attr('href');
            if (!link || (!link.includes('greenhouse.io') && !link.includes('lever.co'))) return;
            if (link.includes('🔒') || role.includes('🔒')) return; // skip closed
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
        });
    }));
    return results;
}

// ─── Source 6: WFH.io ────────────────────────────────────────────────────────
async function fetchWFH({ field }) {
    const tagMap = {
        'Software Engineering': 'software-engineer',
        'Backend': 'back-end',
        'Full Stack': 'full-stack',
        'Frontend': 'front-end',
        'Data/ML': 'data-science',
        'DevOps': 'devops',
    };
    const tag = tagMap[field] || 'software-engineer';
    try {
        const res = await fetch(`https://www.wfh.io/api/v1/jobs.json?job_types[]=Remote&job_types[]=Partly+Remote&skills[]=${tag}&per=50`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.jobs || []).map(j => ({
            source: 'WFH.io',
            externalId: String(j.id),
            company: j.company_name || '',
            role: j.title || '',
            location: j.job_type || 'Remote',
            url: j.url || '',
            applyUrl: j.url || '',
            jobType: normalizeJobType(j.job_type),
            salary: '',
            isPaid: true,
            isRemote: true,
            datePosted: j.created_at || '',
        }));
    } catch { return []; }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            jobType = 'Any',
            field = 'Any',
            remoteOnly = false,
            paid = 'Any',
            location = 'Any',
            sortBy = 'newest',
        } = body;

        const params = { jobType, field };

        // Fetch all sources in parallel — failures are isolated
        const settled = await Promise.allSettled([
            fetchRemotive(params),
            fetchRemoteOK(params),
            fetchJobicy(params),
            fetchSimplify(params),
            fetchWFH(params),
        ]);

        let allJobs = [];
        const errors = [];
        settled.forEach((r, i) => {
            const names = ['Remotive', 'RemoteOK', 'Jobicy', 'SimplifyJobs', 'WFH.io'];
            if (r.status === 'fulfilled') {
                allJobs = allJobs.concat(r.value);
            } else {
                errors.push(`${names[i]}: ${r.reason?.message}`);
            }
        });

        // ── Field filter (cross-source) ──────────────────────────────────────
        if (field && field !== 'Any') {
            const keywords = {
                'Software Engineering': ['software', 'engineer', 'swe', 'developer', 'dev'],
                'Backend': ['backend', 'back-end', 'back end', 'server', 'api'],
                'Full Stack': ['full stack', 'fullstack', 'full-stack'],
                'Frontend': ['frontend', 'front-end', 'ui developer', 'react', 'vue', 'angular'],
                'Data/ML': ['data', 'machine learning', 'ml', 'ai', 'analyst', 'science'],
                'DevOps': ['devops', 'cloud', 'infrastructure', 'sre', 'platform'],
            }[field] || [field.toLowerCase()];

            allJobs = allJobs.filter(j => {
                const haystack = (j.role + ' ' + j.company).toLowerCase();
                return keywords.some(k => haystack.includes(k));
            });
        }

        // ── Job type filter ──────────────────────────────────────────────────
        if (jobType && jobType !== 'Any') {
            const want = jobType.toLowerCase().replace('-', '_').replace(' ', '_');
            allJobs = allJobs.filter(j => {
                const jt = (j.jobType || '').toLowerCase();
                if (want === 'internship') return jt.includes('intern');
                if (want === 'full_time') return jt.includes('full');
                if (want === 'part_time') return jt.includes('part');
                if (want === 'contract') return jt.includes('contract') || jt.includes('freelance');
                return true;
            });
        }

        // ── Remote filter ────────────────────────────────────────────────────
        if (remoteOnly) {
            allJobs = allJobs.filter(j =>
                j.isRemote ||
                j.location.toLowerCase().includes('remote') ||
                j.location.toLowerCase().includes('worldwide') ||
                j.location.toLowerCase().includes('anywhere')
            );
        }

        // ── Location filter ──────────────────────────────────────────────────
        if (location && location !== 'Any' && location !== 'Remote') {
            const locLower = location.toLowerCase();
            allJobs = allJobs.filter(j =>
                j.location.toLowerCase().includes(locLower) ||
                j.isRemote
            );
        }

        // ── Paid filter ──────────────────────────────────────────────────────
        if (paid === 'Paid') {
            allJobs = allJobs.filter(j => j.isPaid);
        } else if (paid === 'Unpaid') {
            allJobs = allJobs.filter(j => !j.isPaid);
        }

        // ── Deduplicate by URL ───────────────────────────────────────────────
        const seen = new Set();
        allJobs = allJobs.filter(j => {
            const key = (j.applyUrl || j.url || '').split('?')[0]; // strip query params
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // ── Sort ─────────────────────────────────────────────────────────────
        if (sortBy === 'newest') {
            allJobs.sort((a, b) => {
                if (!a.datePosted) return 1;
                if (!b.datePosted) return -1;
                return new Date(b.datePosted) - new Date(a.datePosted);
            });
        }

        return Response.json({ jobs: allJobs, total: allJobs.length, sourceErrors: errors });

    } catch (err) {
        console.error('[Discovery API Error]', err);
        return Response.json({ error: err.message, jobs: [], total: 0 }, { status: 500 });
    }
}
