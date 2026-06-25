const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes a Greenhouse public job board for roles matching keywords.
 * @param {string} boardUrl - The root board URL (e.g. https://boards.greenhouse.io/figma)
 * @param {string} keyword - Keyword to filter by (e.g. "Software", "Intern")
 * @returns {Promise<string[]>} - Array of application URLs
 */
async function scrapeJobs(boardUrl, keyword = "") {
    try {
        console.log(`Scraping ${boardUrl} for keyword: "${keyword}"...`);
        // We use a basic user-agent to reduce the chance of 403 Forbidden errors
        const { data } = await axios.get(boardUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        
        const jobLinks = [];
        
        // Greenhouse standard format: <a href="/company/jobs/1234">Job Title</a> inside <div class="opening">
        $('.opening a').each((i, element) => {
            const title = $(element).text().trim();
            const link = $(element).attr('href');
            
            if (title.toLowerCase().includes(keyword.toLowerCase())) {
                // Handle relative paths correctly based on the boardUrl
                const baseUrl = new URL(boardUrl);
                const fullUrl = link.startsWith('http') ? link : `${baseUrl.protocol}//${baseUrl.host}${link}`;
                jobLinks.push(fullUrl);
            }
        });
        
        console.log(`Found ${jobLinks.length} jobs matching "${keyword}".`);
        return jobLinks;
    } catch (error) {
        console.error(`Failed to scrape ${boardUrl}:`, error.message);
        return [];
    }
}

module.exports = { scrapeJobs };
