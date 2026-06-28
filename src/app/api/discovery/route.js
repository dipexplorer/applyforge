/**
 * /api/discovery — Global Job Discovery Engine
 *
 * Fans out to 20+ sources covering 100+ job portals world-wide.
 * Every source is isolated: a single failure never blocks the others.
 * Results are deduplicated by URL, filtered, and sorted before returning.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeJobType(raw = '') {
    const r = raw.toLowerCase();
    if (r.includes('intern')) return 'internship';
    if (r.includes('part')) return 'part_time';
    if (r.includes('contract') || r.includes('freelance')) return 'contract';
    return 'full_time';
}

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AutoApplier/2.0';

async function safeFetch(url, opts = {}) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...opts.headers }, ...opts });
    if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
    return res;
}

function jobShape(overrides) {
    return {
        source: '',
        externalId: '',
        company: '',
        role: '',
        location: 'Remote',
        url: '',
        applyUrl: '',
        jobType: 'full_time',
        salary: '',
        isPaid: false,
        isRemote: false,
        datePosted: '',
        ...overrides,
    };
}

// ─── Source 1 · Remotive ──────────────────────────────────────────────────────
// https://remotive.com — 50 k+ remote jobs
async function fetchRemotive({ field }) {
    const map = { 'Software Engineering': 'software-dev', 'Backend': 'software-dev', 'Full Stack': 'software-dev', 'Frontend': 'software-dev', 'Data/ML': 'data', 'DevOps': 'devops-sysadmin', 'Design': 'design', 'Product': 'product', 'QA': 'qa' };
    const cat = map[field] || 'software-dev';
    const data = await (await safeFetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=100`)).json();
    return (data.jobs || []).map(j => jobShape({
        source: 'Remotive', externalId: String(j.id), company: j.company_name, role: j.title,
        location: j.candidate_required_location || 'Worldwide', url: j.url, applyUrl: j.url,
        jobType: normalizeJobType(j.job_type), salary: j.salary || '', isPaid: !!j.salary,
        isRemote: true, datePosted: j.publication_date || '',
    }));
}

// ─── Source 2 · RemoteOK ─────────────────────────────────────────────────────
// https://remoteok.com — tech-first remote board
async function fetchRemoteOK({ field }) {
    const map = { 'Software Engineering': 'software', 'Backend': 'backend', 'Full Stack': 'full-stack', 'Frontend': 'front-end', 'Data/ML': 'machine-learning', 'DevOps': 'devops', 'Design': 'design' };
    const tag = map[field] || 'software';
    const data = await (await safeFetch(`https://remoteok.com/api?tag=${tag}`)).json();
    return data.filter(j => j.id && j.position).map(j => jobShape({
        source: 'RemoteOK', externalId: String(j.id), company: j.company, role: j.position,
        location: j.location || 'Remote', url: j.url, applyUrl: j.apply_url || j.url,
        jobType: (j.tags || []).includes('internship') ? 'internship' : 'full_time',
        salary: j.salary_min ? `$${j.salary_min}–$${j.salary_max}` : '', isPaid: !!(j.salary_min > 0),
        isRemote: true, datePosted: j.date || '',
    }));
}

// ─── Source 3 · Jobicy ───────────────────────────────────────────────────────
// https://jobicy.com — 30 k+ remote jobs API
async function fetchJobicy({ field }) {
    const map = { 'Software Engineering': 'engineering', 'Backend': 'engineering', 'Full Stack': 'engineering', 'Frontend': 'design', 'Data/ML': 'data-science', 'DevOps': 'sysadmin' };
    const industry = map[field] || 'engineering';
    const data = await (await safeFetch(`https://jobicy.com/api/v2/remote-jobs?count=50&industry=${industry}`)).json();
    return (data.jobs || []).map(j => jobShape({
        source: 'Jobicy', externalId: String(j.id), company: j.companyName, role: j.jobTitle,
        location: j.jobGeo || 'Remote', url: j.url, applyUrl: j.url,
        jobType: normalizeJobType(String(j.jobType || '')),
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin}–$${j.annualSalaryMax}` : '',
        isPaid: !!j.annualSalaryMin, isRemote: true, datePosted: j.pubDate || '',
    }));
}

// ─── Source 4 · WFH.io ───────────────────────────────────────────────────────
// https://www.wfh.io — curated remote-first jobs
async function fetchWFH({ field }) {
    const map = { 'Software Engineering': 'software-engineer', 'Backend': 'back-end', 'Full Stack': 'full-stack', 'Frontend': 'front-end', 'Data/ML': 'data-science', 'DevOps': 'devops' };
    const tag = map[field] || 'software-engineer';
    const data = await (await safeFetch(`https://www.wfh.io/api/v1/jobs.json?job_types[]=Remote&skills[]=${tag}&per=50`)).json();
    return (data.jobs || []).map(j => jobShape({
        source: 'WFH.io', externalId: String(j.id), company: j.company_name, role: j.title,
        location: j.job_type || 'Remote', url: j.url, applyUrl: j.url,
        jobType: normalizeJobType(j.job_type), salary: '', isPaid: true, isRemote: true,
        datePosted: j.created_at || '',
    }));
}

// ─── Source 5 · Arbeitnow ────────────────────────────────────────────────────
// https://arbeitnow.com — Europe + worldwide remote tech jobs API
async function fetchArbeitnow({ field }) {
    const data = await (await safeFetch('https://www.arbeitnow.com/api/job-board-api?page=1')).json();
    const keywords = fieldKeywords(field);
    return (data.data || [])
        .filter(j => keywords.length === 0 || keywords.some(k => (j.title + ' ' + (j.tags || []).join(' ')).toLowerCase().includes(k)))
        .map(j => jobShape({
            source: 'Arbeitnow', externalId: j.slug, company: j.company_name, role: j.title,
            location: j.remote ? 'Remote' : (j.location || 'Germany'), url: j.url, applyUrl: j.url,
            jobType: normalizeJobType(j.job_types ? j.job_types[0] : ''),
            salary: '', isPaid: true, isRemote: !!j.remote, datePosted: j.created_at || '',
        }));
}

// ─── Source 6 · Adzuna (public test) ─────────────────────────────────────────
// https://api.adzuna.com — major aggregator covering 50+ countries, 10M+ jobs
// Uses public sandbox app_id/key (rate-limited but no account needed for small use)
async function fetchAdzuna({ field }) {
    // Adzuna free trial credentials (replace with real keys for production use)
    const appId = process.env.ADZUNA_APP_ID || '';
    const apiKey = process.env.ADZUNA_API_KEY || '';
    if (!appId || !apiKey) return []; // skip gracefully if not configured

    const what = encodeURIComponent(fieldToKeyword(field));
    const data = await (await safeFetch(
        `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=50&what=${what}&content-type=application/json`
    )).json();
    return (data.results || []).map(j => jobShape({
        source: 'Adzuna', externalId: String(j.id), company: j.company?.display_name || '',
        role: j.title, location: j.location?.display_name || '', url: j.redirect_url,
        applyUrl: j.redirect_url, jobType: normalizeJobType(j.contract_type || ''),
        salary: j.salary_min ? `${j.salary_min}–${j.salary_max}` : '', isPaid: !!j.salary_min,
        isRemote: (j.title + ' ' + (j.description || '')).toLowerCase().includes('remote'),
        datePosted: j.created || '',
    }));
}

// ─── Source 7 · The Muse ─────────────────────────────────────────────────────
// https://www.themuse.com/developer/api/v2 — free tier, 100 req/hr, good company data
async function fetchMuse({ field }) {
    const catMap = { 'Software Engineering': 'Software Engineer', 'Backend': 'Software Engineer', 'Full Stack': 'Software Engineer', 'Frontend': 'Software Engineer', 'Data/ML': 'Data Science', 'DevOps': 'DevOps' };
    const cat = encodeURIComponent(catMap[field] || 'Software Engineer');
    const data = await (await safeFetch(`https://www.themuse.com/api/public/jobs?category=${cat}&page=0&descending=true`)).json();
    return (data.results || []).map(j => jobShape({
        source: 'The Muse', externalId: String(j.id), company: j.company?.name || '',
        role: j.name, location: (j.locations || []).map(l => l.name).join(', ') || 'Remote',
        url: j.refs?.landing_page || '', applyUrl: j.refs?.landing_page || '',
        jobType: normalizeJobType(j.type || ''), salary: '', isPaid: true,
        isRemote: (j.locations || []).some(l => l.name.toLowerCase().includes('flexible')),
        datePosted: j.publication_date || '',
    }));
}

// ─── Source 8 · Greenhouse Job Boards (known companies) ──────────────────────
// Directly hits Greenhouse JSON APIs for top tech companies
async function fetchGreenhouseBoards({ field }) {
    // Well-known companies that publicly expose their Greenhouse board
    const boards = [
        'airbnb', 'stripe', 'notion', 'figma', 'vercel', 'linear', 'loom',
        'calendly', 'discord', 'databricks', 'openai', 'anthropic', 'cohere',
        'scale', 'hugging-face', 'stability', 'retool', 'airtable', 'zapier',
        'brex', 'plaid', 'ramp', 'gusto', 'lattice', 'rippling', 'deel',
        'remote', 'gitlab', 'hashicorp', 'cloudflare', 'pagerduty', 'datadog',
        'confluent', 'cockroachdb', 'planetscale', 'supabase', 'neon',
        'fly', 'render', 'modal', 'replicate',
    ];
    const keywords = fieldKeywords(field);
    const results = [];
    await Promise.allSettled(boards.map(async board => {
        try {
            const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`, { headers: { 'User-Agent': UA } });
            if (!res.ok) return;
            const data = await res.json();
            (data.jobs || []).forEach(j => {
                const titleLow = (j.title || '').toLowerCase();
                if (keywords.length > 0 && !keywords.some(k => titleLow.includes(k))) return;
                results.push(jobShape({
                    source: `Greenhouse/${board}`, externalId: String(j.id),
                    company: board.charAt(0).toUpperCase() + board.slice(1),
                    role: j.title, location: j.location?.name || 'Remote',
                    url: j.absolute_url, applyUrl: j.absolute_url,
                    jobType: normalizeJobType(j.title),
                    salary: '', isPaid: true,
                    isRemote: (j.location?.name || '').toLowerCase().includes('remote'),
                    datePosted: j.updated_at || '',
                }));
            });
        } catch { /* silently skip this board */ }
    }));
    return results;
}

// ─── Source 9 · Lever Job Boards (known companies) ───────────────────────────
// Directly queries Lever's public posting API for top companies
async function fetchLeverBoards({ field }) {
    const boards = [
        'netflix', 'spotify', 'canva', 'asana', 'twilio', 'sendgrid', 'segment',
        'amplitude', 'mixpanel', 'heap', 'fullstory', 'launchdarkly', 'split',
        'allbirds', 'warby-parker', 'glossier', 'calm', 'headspace',
        'duolingo', 'khan-academy', 'coursera', 'udemy', 'masterclass',
        'robinhood', 'coinbase', 'kraken', 'blockfi', 'anchorage',
        'waymo', 'aurora', 'cruise', 'mobileye',
        'doordash', 'instacart', 'gopuff', 'getir',
    ];
    const keywords = fieldKeywords(field);
    const results = [];
    await Promise.allSettled(boards.map(async board => {
        try {
            const res = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers: { 'User-Agent': UA } });
            if (!res.ok) return;
            const data = await res.json();
            (Array.isArray(data) ? data : []).forEach(j => {
                const titleLow = (j.text || '').toLowerCase();
                if (keywords.length > 0 && !keywords.some(k => titleLow.includes(k))) return;
                results.push(jobShape({
                    source: `Lever/${board}`, externalId: j.id,
                    company: board.charAt(0).toUpperCase() + board.slice(1),
                    role: j.text, location: j.categories?.location || j.workplaceType || 'Remote',
                    url: j.hostedUrl, applyUrl: j.applyUrl || j.hostedUrl,
                    jobType: normalizeJobType(j.categories?.commitment || ''),
                    salary: '', isPaid: true,
                    isRemote: (j.workplaceType || '').toLowerCase().includes('remote'),
                    datePosted: j.createdAt ? new Date(j.createdAt).toISOString() : '',
                }));
            });
        } catch { /* silently skip */ }
    }));
    return results;
}

// ─── Source 10 · SimplifyJobs GitHub ─────────────────────────────────────────
// Parses the curated Summer Internship and New Grad markdown tables
async function fetchSimplify({ jobType, field }) {
    const repos = [];
    if (!jobType || jobType === 'Any' || jobType === 'Internship')
        repos.push({ url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md', type: 'internship' });
    if (!jobType || jobType === 'Any' || jobType === 'Full-Time')
        repos.push({ url: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md', type: 'full_time' });

    const { load } = await import('cheerio');
    const results = [];
    await Promise.allSettled(repos.map(async repo => {
        try {
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
                if (!link) return;
                if (role.includes('🔒')) return;
                results.push(jobShape({
                    source: 'SimplifyJobs', externalId: link, company, role, location,
                    url: link, applyUrl: link, jobType: repo.type,
                    isRemote: location.toLowerCase().includes('remote'),
                    isPaid: true,
                }));
            });
        } catch { /* skip */ }
    }));
    return results;
}

// ─── Source 11 · PittCSC GitHub Internships ──────────────────────────────────
// The famous community-maintained internship list (100k+ stars)
async function fetchPittCSC({ jobType }) {
    if (jobType && jobType !== 'Any' && jobType !== 'Internship') return [];
    const { load } = await import('cheerio');
    const results = [];
    try {
        const res = await fetch('https://raw.githubusercontent.com/pittcsc/Summer2024-Internships/dev/README.md');
        if (!res.ok) return [];
        const html = await res.text();
        const $ = load(html);
        $('tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length < 4) return;
            const company = $(tds[0]).text().trim();
            const role = $(tds[1]).text().trim();
            const location = $(tds[2]).text().trim();
            const link = $(tds[3]).find('a').attr('href') || $(tds[3]).text().trim();
            if (!link || !link.startsWith('http')) return;
            if (role.includes('🔒') || location.includes('🔒')) return;
            results.push(jobShape({
                source: 'PittCSC', externalId: link, company, role, location,
                url: link, applyUrl: link, jobType: 'internship',
                isRemote: location.toLowerCase().includes('remote'), isPaid: true,
            }));
        });
    } catch { /* skip */ }
    return results;
}

// ─── Source 12 · Coroflot (design + engineering) ─────────────────────────────
async function fetchCoroflot({ field }) {
    // Only relevant for design/frontend
    if (!['Design', 'Frontend', 'Any'].includes(field || 'Any')) return [];
    const data = await (await safeFetch('https://www.coroflot.com/api/jobs?page=1&per=50&discipline=engineering')).json();
    return (data.jobs || []).map(j => jobShape({
        source: 'Coroflot', externalId: String(j.id), company: j.company?.name || '',
        role: j.title, location: j.location || 'Remote',
        url: `https://www.coroflot.com${j.path}`, applyUrl: `https://www.coroflot.com${j.path}`,
        jobType: normalizeJobType(j.type), isPaid: true,
        isRemote: (j.location || '').toLowerCase().includes('remote'),
        datePosted: j.posted_on || '',
    }));
}

// ─── Source 13 · Himalayas ───────────────────────────────────────────────────
// https://himalayas.app — curated remote jobs with JSON endpoint
async function fetchHimalayas({ field }) {
    const map = { 'Software Engineering': 'engineering', 'Backend': 'engineering', 'Full Stack': 'engineering', 'Frontend': 'engineering', 'Data/ML': 'data-science', 'DevOps': 'engineering' };
    const dept = map[field] || 'engineering';
    try {
        const data = await (await safeFetch(`https://himalayas.app/jobs/api?department=${dept}&limit=50`)).json();
        return (data.jobs || []).map(j => jobShape({
            source: 'Himalayas', externalId: j.slug, company: j.company?.name || '',
            role: j.title, location: 'Remote', url: j.applicationLink || j.url,
            applyUrl: j.applicationLink || j.url, jobType: normalizeJobType(j.jobType || ''),
            isPaid: true, isRemote: true, datePosted: j.publishedAt || '',
        }));
    } catch { return []; }
}

// ─── Source 14 · Otta (JSON feed) ────────────────────────────────────────────
// https://otta.com — curated startup + scale-up jobs
async function fetchOtta({ field }) {
    const keyword = encodeURIComponent(fieldToKeyword(field));
    try {
        const res = await safeFetch(`https://api.otta.com/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
            body: JSON.stringify({
                query: `{ jobs(searchQuery:"${fieldToKeyword(field)}", limit:50) { id title company { name } locations { name } url externalUrl } }`,
            }),
        });
        const data = await res.json();
        return (data.data?.jobs || []).map(j => jobShape({
            source: 'Otta', externalId: j.id, company: j.company?.name || '',
            role: j.title, location: (j.locations || []).map(l => l.name).join(', '),
            url: j.externalUrl || j.url, applyUrl: j.externalUrl || j.url,
            jobType: 'full_time', isPaid: true,
            isRemote: (j.locations || []).some(l => l.name.toLowerCase().includes('remote')),
        }));
    } catch { return []; }
}

// ─── Source 15 · JSearch via RapidAPI ────────────────────────────────────────
// Aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter etc. (requires free API key)
async function fetchJSearch({ field, jobType }) {
    const key = process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY || '';
    if (!key) return [];
    const query = encodeURIComponent(`${fieldToKeyword(field)} ${jobType === 'Internship' ? 'intern' : 'engineer'}`);
    const data = await (await safeFetch(`https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=3&remote_jobs_only=false`, {
        headers: { 'x-rapidapi-host': 'jsearch.p.rapidapi.com', 'x-rapidapi-key': key, 'User-Agent': UA },
    })).json();
    return (data.data || []).map(j => jobShape({
        source: 'JSearch', externalId: j.job_id, company: j.employer_name,
        role: j.job_title, location: j.job_city ? `${j.job_city}, ${j.job_country}` : j.job_country || 'Remote',
        url: j.job_apply_link, applyUrl: j.job_apply_link,
        jobType: normalizeJobType(j.job_employment_type),
        salary: j.job_min_salary ? `${j.job_min_salary}–${j.job_max_salary}` : '',
        isPaid: !!j.job_min_salary, isRemote: j.job_is_remote || false,
        datePosted: j.job_posted_at_datetime_utc || '',
    }));
}

// ─── Source 16 · LinkedIn (public job search feed) ───────────────────────────
// LinkedIn exposes a non-auth RSS/JSON feed for job searches
async function fetchLinkedIn({ field, jobType }) {
    const keyword = encodeURIComponent(fieldToKeyword(field));
    const isIntern = jobType === 'Internship';
    const typeCode = isIntern ? '&f_JT=I' : '';
    try {
        const res = await safeFetch(
            `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=Worldwide&start=0${typeCode}&count=50`
        );
        const html = await res.text();
        const { load } = await import('cheerio');
        const $ = load(html);
        const results = [];
        $('.job-search-card').each((_, el) => {
            const title = $(el).find('.base-search-card__title').text().trim();
            const company = $(el).find('.base-search-card__subtitle').text().trim();
            const location = $(el).find('.job-search-card__location').text().trim();
            const link = $(el).find('a.base-card__full-link').attr('href') || $(el).find('a').attr('href');
            const date = $(el).find('time').attr('datetime') || '';
            if (!link || !title) return;
            results.push(jobShape({
                source: 'LinkedIn', externalId: link.split('?')[0].split('/').pop(),
                company, role: title, location, url: link, applyUrl: link,
                jobType: isIntern ? 'internship' : 'full_time',
                isRemote: location.toLowerCase().includes('remote'), isPaid: true,
                datePosted: date,
            }));
        });
        return results;
    } catch { return []; }
}

// ─── Source 17 · Indeed (public RSS) ─────────────────────────────────────────
async function fetchIndeed({ field, jobType }) {
    const keyword = encodeURIComponent(`${fieldToKeyword(field)}${jobType === 'Internship' ? ' intern' : ''}`);
    try {
        const res = await safeFetch(`https://rss.indeed.com/rss?q=${keyword}&l=&sort=date&limit=50`);
        const text = await res.text();
        const { load } = await import('cheerio');
        const $ = load(text, { xmlMode: true });
        const results = [];
        $('item').each((_, el) => {
            const title = $('title', el).text().replace(' - Indeed', '').trim();
            const link = $('link', el).text().trim() || $('guid', el).text().trim();
            const desc = $('description', el).text();
            const pubDate = $('pubDate', el).text();
            const company = desc.match(/company:\s*([^<\n,]+)/i)?.[1]?.trim() || '';
            const location = desc.match(/location:\s*([^<\n,]+)/i)?.[1]?.trim() || 'Various';
            if (!link) return;
            results.push(jobShape({
                source: 'Indeed', externalId: link, company, role: title, location,
                url: link, applyUrl: link, jobType: normalizeJobType(title),
                isPaid: true, isRemote: location.toLowerCase().includes('remote'),
                datePosted: pubDate ? new Date(pubDate).toISOString() : '',
            }));
        });
        return results;
    } catch { return []; }
}

// ─── Source 18 · Glassdoor (public RSS) ──────────────────────────────────────
async function fetchGlassdoor({ field, jobType }) {
    const kw = encodeURIComponent(`${fieldToKeyword(field)}${jobType === 'Internship' ? ' intern' : ''}`);
    try {
        const res = await safeFetch(`https://www.glassdoor.com/Job/jobs.htm?suggestCount=0&suggestChosen=false&clickSource=searchBtn&typedKeyword=${kw}&locT=N&jobType=all&fromAge=-1&minSalary=0&includeNoSalaryJobs=true&radius=100&cityId=-1&minRating=0.0&industryId=-1&sgocId=-1&seniorityType=all&orderBy=date&format=json`);
        const data = await res.json();
        return (data.listing || []).slice(0, 50).map(j => jobShape({
            source: 'Glassdoor', externalId: String(j.jobListingId), company: j.employer?.name || '',
            role: j.header?.title || '', location: j.header?.location || '',
            url: `https://www.glassdoor.com${j.header?.jobLink || ''}`,
            applyUrl: `https://www.glassdoor.com${j.header?.jobLink || ''}`,
            jobType: normalizeJobType(j.header?.jobType || ''), isPaid: true,
            isRemote: (j.header?.location || '').toLowerCase().includes('remote'),
            datePosted: j.header?.listed || '',
        }));
    } catch { return []; }
}

// ─── Source 19 · AngelList / Wellfound ───────────────────────────────────────
// Startup-focused job board
async function fetchWellfound({ field }) {
    const role = encodeURIComponent(fieldToKeyword(field));
    try {
        const res = await safeFetch(`https://wellfound.com/role/r/${role.toLowerCase()}`);
        const html = await res.text();
        const { load } = await import('cheerio');
        const $ = load(html);
        const results = [];
        $('[class*="JobSearchResults_jobResult"]').each((_, el) => {
            const title = $(el).find('[class*="title"]').first().text().trim();
            const company = $(el).find('[class*="company"]').first().text().trim();
            const location = $(el).find('[class*="location"]').first().text().trim();
            const link = $(el).find('a').first().attr('href');
            const fullUrl = link ? (link.startsWith('http') ? link : `https://wellfound.com${link}`) : '';
            if (!title || !fullUrl) return;
            results.push(jobShape({
                source: 'Wellfound', externalId: fullUrl, company, role: title, location,
                url: fullUrl, applyUrl: fullUrl, jobType: 'full_time',
                isRemote: location.toLowerCase().includes('remote'), isPaid: true,
            }));
        });
        return results;
    } catch { return []; }
}

// ─── Source 20 · Startup.jobs ────────────────────────────────────────────────
async function fetchStartupJobs({ field }) {
    const tag = encodeURIComponent(fieldToKeyword(field).toLowerCase());
    try {
        const data = await (await safeFetch(`https://startup.jobs/api/1/jobs?tag=${tag}&remote=1&per_page=50`)).json();
        return (data.jobs || []).map(j => jobShape({
            source: 'Startup.jobs', externalId: String(j.id), company: j.startup?.name || '',
            role: j.title, location: j.remote ? 'Remote' : (j.location || 'Remote'),
            url: j.url, applyUrl: j.url, jobType: normalizeJobType(j.job_type || ''),
            isPaid: true, isRemote: !!j.remote, datePosted: j.created_at || '',
        }));
    } catch { return []; }
}

// ─── Source 21 · Dice (tech jobs USA) ────────────────────────────────────────
async function fetchDice({ field, jobType }) {
    const q = encodeURIComponent(`${fieldToKeyword(field)}${jobType === 'Internship' ? ' internship' : ''}`);
    try {
        const data = await (await safeFetch(`https://job-search-api.svc.dice.com/v1/jobsearch?q=${q}&countryCode=US&pageSize=50&facets=employmentType|postedDate|locationState|employerType|easyApply|isRemote&filters.isRemote=true&language=en&eid=S2Q_&sortby=postedDate`)).json();
        return ((data.data || {}).jobs || []).map(j => jobShape({
            source: 'Dice', externalId: j.id, company: j.hiringOrganization?.name || j.employer || '',
            role: j.title, location: j.workplaceTypes?.includes('Remote') ? 'Remote' : (j.location || ''),
            url: `https://www.dice.com/job-detail/${j.id}`,
            applyUrl: `https://www.dice.com/job-detail/${j.id}`,
            jobType: normalizeJobType(j.employmentType || ''), isPaid: true,
            isRemote: (j.workplaceTypes || []).includes('Remote'),
            datePosted: j.postedDate || '',
        }));
    } catch { return []; }
}

// ─── Source 22 · Devpost Hackathon / Intern Boards ───────────────────────────
async function fetchBuiltIn({ field }) {
    const cat = fieldToKeyword(field).toLowerCase().replace(/ /g, '-');
    try {
        const data = await (await safeFetch(`https://api.builtin.com/api/v1/jobs?roles=${cat}&remote=true&page=1&perPage=50`)).json();
        return ((data.jobs || data.data) || []).map(j => jobShape({
            source: 'Built In', externalId: String(j.id), company: j.company?.name || '',
            role: j.title, location: j.locationDisplay || 'Remote',
            url: `https://builtin.com${j.jobPath || ''}`,
            applyUrl: j.applyUrl || `https://builtin.com${j.jobPath || ''}`,
            jobType: normalizeJobType(j.jobType || ''), isPaid: true,
            isRemote: j.isRemote || false, datePosted: j.postedDate || '',
        }));
    } catch { return []; }
}

// ─── Source 23 · Internshala (India-focused intern board) ────────────────────
async function fetchInternshala({ field, jobType }) {
    if (jobType && jobType !== 'Any' && jobType !== 'Internship') return [];
    const keyword = encodeURIComponent(fieldToKeyword(field));
    try {
        const res = await safeFetch(`https://internshala.com/internships/keywords-${keyword}/`);
        const html = await res.text();
        const { load } = await import('cheerio');
        const $ = load(html);
        const results = [];
        $('.internship_meta').each((_, el) => {
            const title = $(el).find('.profile').first().text().trim();
            const company = $(el).find('.company_name').first().text().trim();
            const location = $(el).find('.location_link').first().text().trim() || 'Remote';
            const link = $(el).closest('a').attr('href') || '';
            const fullUrl = link.startsWith('http') ? link : `https://internshala.com${link}`;
            if (!title) return;
            results.push(jobShape({
                source: 'Internshala', externalId: fullUrl, company, role: title, location,
                url: fullUrl, applyUrl: fullUrl, jobType: 'internship',
                isRemote: location.toLowerCase().includes('work from home') || location.toLowerCase().includes('remote'),
                isPaid: false,
            }));
        });
        return results;
    } catch { return []; }
}

// ─── Source 24 · Naukri.com (India) ──────────────────────────────────────────
async function fetchNaukri({ field, jobType }) {
    const kw = encodeURIComponent(`${fieldToKeyword(field)}${jobType === 'Internship' ? ' internship' : ''}`);
    try {
        const data = await (await safeFetch(`https://www.naukri.com/jobapi/v3/search?noOfResults=50&urlType=search_by_keyword&searchType=adv&keyword=${kw}&pageNo=1&seoKey=${kw}`, {
            headers: { appid: '109', systemid: 'Naukri', 'User-Agent': UA },
        })).json();
        return ((data.jobDetails || [])).map(j => jobShape({
            source: 'Naukri', externalId: String(j.jobId), company: j.companyName || '',
            role: j.title, location: (j.locations || []).join(', ') || 'India',
            url: j.jdURL, applyUrl: j.jdURL,
            jobType: normalizeJobType(jobType || ''), isPaid: true,
            isRemote: (j.tagsAndSkills || '').toLowerCase().includes('remote'),
            datePosted: j.footerPlaceholderLabel || '',
        }));
    } catch { return []; }
}

// ─── Source 25 · Y Combinator Work at a Startup ──────────────────────────────
// YC-backed startups, excellent for high-signal tech roles
async function fetchYCStartup({ field }) {
    const role = encodeURIComponent(fieldToKeyword(field));
    try {
        const data = await (await safeFetch(`https://api.workatastartup.com/companies/search?query=${role}&remote=any&page=0`, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
        })).json();
        const results = [];
        (data.startups || []).forEach(c => {
            (c.jobs || []).forEach(j => {
                const titleLow = (j.title || '').toLowerCase();
                const keywords = fieldKeywords(field);
                if (keywords.length > 0 && !keywords.some(k => titleLow.includes(k))) return;
                results.push(jobShape({
                    source: 'Y Combinator', externalId: String(j.id), company: c.name,
                    role: j.title, location: j.remote ? 'Remote' : (c.locations || []).join(', '),
                    url: `https://www.ycombinator.com/companies/${c.slug}/jobs/${j.id}`,
                    applyUrl: `https://www.ycombinator.com/companies/${c.slug}/jobs/${j.id}`,
                    jobType: normalizeJobType(j.type || ''), isPaid: true,
                    isRemote: !!j.remote, datePosted: j.created_at || '',
                }));
            });
        });
        return results;
    } catch { return []; }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function fieldToKeyword(field = 'Any') {
    const map = {
        'Software Engineering': 'software engineer',
        'Backend': 'backend engineer',
        'Full Stack': 'full stack developer',
        'Frontend': 'frontend engineer',
        'Data/ML': 'machine learning engineer',
        'DevOps': 'devops engineer',
        'Design': 'product designer',
        'Product': 'product manager',
        'QA': 'qa engineer',
        'Any': 'software engineer',
    };
    return map[field] || field.toLowerCase();
}

function fieldKeywords(field = 'Any') {
    const map = {
        'Software Engineering': ['software', 'engineer', 'swe', 'developer', 'dev'],
        'Backend': ['backend', 'back-end', 'back end', 'server', 'api', 'node', 'python', 'java', 'go'],
        'Full Stack': ['full stack', 'fullstack', 'full-stack'],
        'Frontend': ['frontend', 'front-end', 'ui', 'react', 'vue', 'angular', 'next'],
        'Data/ML': ['data', 'machine learning', 'ml', 'ai', 'analyst', 'science', 'nlp', 'llm'],
        'DevOps': ['devops', 'cloud', 'infrastructure', 'sre', 'platform', 'kubernetes', 'aws'],
        'Design': ['design', 'ux', 'ui', 'figma', 'product design'],
        'Product': ['product manager', 'pm', 'product owner'],
        'QA': ['qa', 'test', 'quality assurance', 'sdet'],
        'Any': [],
    };
    return map[field] || [];
}

// ─── All Sources Registry ─────────────────────────────────────────────────────
const SOURCES = [
    { name: 'Remotive',         fn: fetchRemotive },
    { name: 'RemoteOK',         fn: fetchRemoteOK },
    { name: 'Jobicy',           fn: fetchJobicy },
    { name: 'WFH.io',           fn: fetchWFH },
    { name: 'Arbeitnow',        fn: fetchArbeitnow },
    { name: 'Adzuna',           fn: fetchAdzuna },
    { name: 'The Muse',         fn: fetchMuse },
    { name: 'Greenhouse Boards',fn: fetchGreenhouseBoards },
    { name: 'Lever Boards',     fn: fetchLeverBoards },
    { name: 'SimplifyJobs',     fn: fetchSimplify },
    { name: 'PittCSC',          fn: fetchPittCSC },
    { name: 'Coroflot',         fn: fetchCoroflot },
    { name: 'Himalayas',        fn: fetchHimalayas },
    { name: 'Otta',             fn: fetchOtta },
    { name: 'JSearch',          fn: fetchJSearch },
    { name: 'LinkedIn',         fn: fetchLinkedIn },
    { name: 'Indeed',           fn: fetchIndeed },
    { name: 'Glassdoor',        fn: fetchGlassdoor },
    { name: 'Wellfound',        fn: fetchWellfound },
    { name: 'Startup.jobs',     fn: fetchStartupJobs },
    { name: 'Dice',             fn: fetchDice },
    { name: 'Built In',         fn: fetchBuiltIn },
    { name: 'Internshala',      fn: fetchInternshala },
    { name: 'Naukri',           fn: fetchNaukri },
    { name: 'Y Combinator',     fn: fetchYCStartup },
];

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

        // Fan out to all sources in parallel — failures are fully isolated
        const settled = await Promise.allSettled(SOURCES.map(s => s.fn(params)));

        let allJobs = [];
        const sourceErrors = [];
        const sourceCounts = {};

        settled.forEach((r, i) => {
            const name = SOURCES[i].name;
            if (r.status === 'fulfilled') {
                const jobs = Array.isArray(r.value) ? r.value : [];
                allJobs = allJobs.concat(jobs);
                sourceCounts[name] = jobs.length;
            } else {
                sourceErrors.push(`${name}: ${r.reason?.message || 'Unknown error'}`);
                sourceCounts[name] = 0;
            }
        });

        // ── Field filter ─────────────────────────────────────────────────────
        if (field && field !== 'Any') {
            const keywords = fieldKeywords(field);
            if (keywords.length > 0) {
                allJobs = allJobs.filter(j => {
                    const haystack = (j.role + ' ' + j.company + ' ' + (j.source || '')).toLowerCase();
                    return keywords.some(k => haystack.includes(k));
                });
            }
        }

        // ── Job type filter ──────────────────────────────────────────────────
        if (jobType && jobType !== 'Any') {
            const want = jobType.toLowerCase().replace(/-| /g, '_');
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
                j.location.toLowerCase().includes('anywhere') ||
                j.location.toLowerCase().includes('work from home')
            );
        }

        // ── Location filter ──────────────────────────────────────────────────
        if (location && location !== 'Any' && location !== 'Remote') {
            const locLower = location.toLowerCase();
            allJobs = allJobs.filter(j =>
                j.location.toLowerCase().includes(locLower) || j.isRemote
            );
        }

        // ── Paid filter ──────────────────────────────────────────────────────
        if (paid === 'Paid') allJobs = allJobs.filter(j => j.isPaid);
        else if (paid === 'Unpaid') allJobs = allJobs.filter(j => !j.isPaid);

        // ── Deduplicate by canonical URL ─────────────────────────────────────
        const seen = new Set();
        allJobs = allJobs.filter(j => {
            const key = (j.applyUrl || j.url || '').split('?')[0].split('#')[0].toLowerCase();
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

        return Response.json({
            jobs: allJobs,
            total: allJobs.length,
            sourceCounts,
            sourceErrors,
            sourcesQueried: SOURCES.length,
        });

    } catch (err) {
        console.error('[Discovery API Error]', err);
        return Response.json({ error: err.message, jobs: [], total: 0 }, { status: 500 });
    }
}
