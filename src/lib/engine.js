require('dotenv').config();
const Database = require('better-sqlite3');
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

/**
 * Applies to a Greenhouse job board URL using profile data.
 * @param {string} url - The Greenhouse job posting URL
 */
async function applyToGreenhouse(url) {
    try {
        console.log("Initializing Gemini AI Client...");
        const ai = new GoogleGenAI({});

        console.log("Initializing SQLite database...");
        const dbPath = path.join(process.cwd(), 'data', 'applications.db');
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');

        db.exec(`
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company TEXT,
                role TEXT,
                url TEXT,
                date_applied TEXT,
                status TEXT,
                ats_platform TEXT
            )
        `);

        console.log("Loading profile data from profile.json...");
        const profilePath = path.join(process.cwd(), 'data', 'profile.json');
        let profileData;
        try {
            const profileRaw = await fs.readFile(profilePath, 'utf8');
            profileData = JSON.parse(profileRaw);
        } catch (err) {
            throw new Error(`Failed to read or parse profile.json: ${err.message}`);
        }

        console.log("Launching Playwright (Chromium, non-headless)...");
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();

        console.log(`\nStarting application process for: ${url}`);
        const page = await context.newPage();
        
        try {
            console.log("Navigating to URL...");
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            console.log("Mapping fields from profile.json...");

            // Map First Name
            const firstNameLoc = page.locator('input[id="first_name"]');
            if (await firstNameLoc.count() > 0 && profileData.personal.first_name) {
                await firstNameLoc.fill(profileData.personal.first_name);
            }
            
            // Map Last Name
            const lastNameLoc = page.locator('input[id="last_name"]');
            if (await lastNameLoc.count() > 0 && profileData.personal.last_name) {
                await lastNameLoc.fill(profileData.personal.last_name);
            }
            
            // Map Email
            const emailLoc = page.locator('input[id="email"]');
            if (await emailLoc.count() > 0 && profileData.personal.email) {
                await emailLoc.fill(profileData.personal.email);
            }
            
            // Map Phone
            const phoneLoc = page.locator('input[id="phone"]');
            if (await phoneLoc.count() > 0 && profileData.personal.phone) {
                await phoneLoc.fill(profileData.personal.phone);
            }
            
            // Map LinkedIn
            const linkedinLoc = page.locator('input[autocomplete="custom-question-linkedin"], input[name*="linkedin" i]').first();
            if (await linkedinLoc.count() > 0 && profileData.personal.linkedin) {
                await linkedinLoc.fill(profileData.personal.linkedin);
            }
            
            // Upload Resume
            console.log("Attempting to upload resume.pdf...");
            const resumePath = path.join(process.cwd(), 'data', 'resume.pdf');
            try {
                await fs.access(resumePath);
                const resumeInput = page.locator('input[type="file"][data-source="resume"], input#resume').first();
                if (await resumeInput.count() > 0) {
                    await resumeInput.setInputFiles(resumePath);
                }
            } catch (e) {
                console.error("  - Error: resume.pdf not found in data/ directory.");
            }

            console.log("\nChecking for custom questions in textareas...");
            const textareas = page.locator('textarea');
            const textareaCount = await textareas.count();
            
            if (textareaCount > 0) {
                const profileDump = JSON.stringify(profileData, null, 2);
                
                for (let i = 0; i < textareaCount; i++) {
                    const ta = textareas.nth(i);
                    if (await ta.isVisible()) {
                        let questionText = "Unknown Question";
                        
                        const id = await ta.getAttribute('id');
                        if (id) {
                            const label = page.locator(`label[for="${id}"]`);
                            if (await label.count() > 0) {
                                questionText = await label.innerText();
                            }
                        }
                        
                        if (questionText === "Unknown Question") {
                            const parentText = await ta.evaluate(el => el.parentElement?.innerText || '');
                            if (parentText) questionText = parentText.split('\n')[0];
                        }
                        
                        try {
                            const prompt = `You are an applicant. Based on the following resume data: ${profileDump}\nAnswer the application question in a professional tone. Keep it under 50 words. Do not lie.\nQuestion: ${questionText}`;
                            
                            const response = await ai.models.generateContent({
                                model: 'gemini-1.5-flash',
                                contents: prompt,
                            });
                            
                            const answer = response.text;
                            await ta.fill(answer);
                        } catch (aiError) {
                            console.error(`AI Error: ${aiError.message}`);
                        }
                    }
                }
            }

            // Insert into Database
            const stmt = db.prepare('INSERT INTO applications (company, role, url, date_applied, status, ats_platform) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run("Unknown Company", "Unknown Role", url, new Date().toISOString(), "Pending", "Greenhouse");

            console.log("PAUSING SCRIPT FOR MANUAL REVIEW.");
            await page.pause();

        } catch (error) {
            console.error(`Error during applyToGreenhouse execution: ${error.message}`);
            throw error;
        } finally {
            // Wait for user to close browser manually if they want, or close after pause finishes.
        }
    } catch (error) {
        console.error("Fatal error:", error.message);
        throw error;
    }
}

module.exports = { applyToGreenhouse };
