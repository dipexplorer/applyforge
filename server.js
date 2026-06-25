const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const { spawn } = require('child_process');
const { scrapeJobs } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());


// Initialize DB connection
const db = new Database(path.join(__dirname, 'applications.db'));
db.pragma('journal_mode = WAL');

app.get('/api/applications', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM applications ORDER BY id DESC');
        const rows = stmt.all();
        res.json(rows);
    } catch (err) {
        // Table might not exist yet if script hasn't run
        if (err.message.includes('no such table')) {
            res.json([]);
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.post('/api/apply', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    console.log(`Starting Playwright automation for: ${url}`);
    
    // Spawn the index.js script as a child process
    const child = spawn('node', ['index.js', url], {
        cwd: __dirname,
        stdio: 'inherit' // Inherits stdout so user can see logs in terminal
    });

    res.json({ message: "Application started. Check the Playwright window.", url });
});

app.post('/api/scrape', async (req, res) => {
    const { boardUrl, keyword } = req.body;
    if (!boardUrl) return res.status(400).json({ error: "boardUrl is required" });

    try {
        const links = await scrapeJobs(boardUrl, keyword || "");
        res.json({ links });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(` AutoApplier Dashboard running at http://localhost:${PORT}`);
    console.log(`=================================================\n`);
});
