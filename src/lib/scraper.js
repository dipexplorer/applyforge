const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes a public job board for roles matching keywords.
 * Supports both Greenhouse (boards.greenhouse.io) and Lever (jobs.lever.co).
 * @param {string} boardUrl - The root board URL
 * @param {string} keyword - Keyword to filter by
 * @returns {Promise<string[]>} - Array of application URLs
 */
async function scrapeJobs(boardUrl, keyword = "") {
    try {
        console.log(`Scraping ${boardUrl} for keyword: "${keyword}"...`);
        const { data } = await axios.get(boardUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const jobLinks = [];
        
        const isGreenhouse = boardUrl.includes('boards.greenhouse.io');
        const isLever = boardUrl.includes('jobs.lever.co');

        if (isGreenhouse) {
            $('.opening a').each((i, element) => {
                const title = $(element).text().trim();
                const link = $(element).attr('href');
                
                if (title.toLowerCase().includes(keyword.toLowerCase())) {
                    const baseUrl = new URL(boardUrl);
                    const fullUrl = link.startsWith('http') ? link : `${baseUrl.protocol}//${baseUrl.host}${link}`;
                    jobLinks.push(fullUrl);
                }
            });
        } else if (isLever) {
            $('.posting-title').each((i, element) => {
                const $el = $(element);
                const title = $el.find('h5[data-qa="posting-name"]').text().trim() || $el.text().trim();
                let link = $el.attr('href');
                
                // Sometimes the link is on the parent or the element itself
                if (!link && $el.closest('a').length) {
                    link = $el.closest('a').attr('href');
                }

                if (link && title.toLowerCase().includes(keyword.toLowerCase())) {
                    const baseUrl = new URL(boardUrl);
                    const fullUrl = link.startsWith('http') ? link : `${baseUrl.protocol}//${baseUrl.host}${link}`;
                    jobLinks.push(fullUrl);
                }
            });
        } else {
            throw new Error("Unsupported job board URL. Only Greenhouse and Lever are currently supported.");
        }
        
        console.log(`Found ${jobLinks.length} jobs matching "${keyword}".`);
        return jobLinks;
    } catch (error) {
        console.error(`Failed to scrape ${boardUrl}:`, error.message);
        return [];
    }
}

module.exports = { scrapeJobs };
