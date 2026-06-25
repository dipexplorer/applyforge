require('dotenv').config();
const { applyToJob } = require('./engine');

const url = process.argv[2];

if (!url) {
    console.error("No URL provided to worker.");
    process.exit(1);
}

applyToJob(url).catch(err => {
    console.error("Worker error:", err);
    process.exit(1);
});
