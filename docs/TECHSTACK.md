# Tech Stack

The AutoApplier system relies on modern, robust, and free tools to orchestrate the browser and manage data.

### Core Dependencies

1. **Node.js (v20+)**: The runtime environment. Chosen for its excellent asynchronous capabilities and native integration with Playwright.
2. **Playwright (`playwright`)**: Developed by Microsoft. Unlike Puppeteer, Playwright handles modern web interactions natively, easily bypassing basic detection mechanisms and interacting deeply with complex DOM structures.
3. **SQLite3 (`sqlite3` / `better-sqlite3`)**: Zero-configuration, serverless database. Perfect for a local, lightweight application tracker.
4. **Google Gen AI (`@google/genai`)**: The official SDK for interacting with the Gemini API (Gemini 1.5 Flash/Pro). Offers generous free tiers for developers to generate cover letter snippets and answer custom questions.
5. **Dotenv (`dotenv`)**: Secure management of the Gemini API key and other environment variables.

### Auxiliary Tools (Planned)
- **Cheerio (`cheerio`)**: For fast, static HTML parsing during the scraper phase (to avoid the overhead of launching a full Chromium browser just to extract links).
- **Chalk (`chalk`)**: To make the terminal output colorful and readable (e.g., green for successful applies, yellow for AI interventions, red for CAPTCHA pauses).
