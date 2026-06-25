require('dotenv').config();
const Database = require('better-sqlite3');
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

async function main() {
    try {
        console.log("Loading environment variables...");
        // Environment variables are loaded via dotenv.config() above.
        
        console.log("Initializing Gemini AI Client...");
        const ai = new GoogleGenAI({});

        console.log("Initializing SQLite database...");
        const dbPath = path.join(__dirname, 'applications.db');
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
        console.log("Database 'applications.db' initialized and ready.");

        console.log("Loading profile data from profile.json...");
        const profilePath = path.join(__dirname, 'profile.json');
        let profileData;
        try {
            const profileRaw = await fs.readFile(profilePath, 'utf8');
            profileData = JSON.parse(profileRaw);
            console.log("Profile data loaded successfully.");
        } catch (err) {
            throw new Error(`Failed to read or parse profile.json: ${err.message}`);
        }

        console.log("Launching Playwright (Chromium, non-headless)...");
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();

        /**
         * Applies to a Greenhouse job board URL using profile data.
         * @param {string} url - The Greenhouse job posting URL
         */
        async function applyToGreenhouse(url) {
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
                    console.log("  - Filled First Name");
                }
                
                // Map Last Name
                const lastNameLoc = page.locator('input[id="last_name"]');
                if (await lastNameLoc.count() > 0 && profileData.personal.last_name) {
                    await lastNameLoc.fill(profileData.personal.last_name);
                    console.log("  - Filled Last Name");
                }
                
                // Map Email
                const emailLoc = page.locator('input[id="email"]');
                if (await emailLoc.count() > 0 && profileData.personal.email) {
                    await emailLoc.fill(profileData.personal.email);
                    console.log("  - Filled Email");
                }
                
                // Map Phone
                const phoneLoc = page.locator('input[id="phone"]');
                if (await phoneLoc.count() > 0 && profileData.personal.phone) {
                    await phoneLoc.fill(profileData.personal.phone);
                    console.log("  - Filled Phone");
                }
                
                // Map LinkedIn
                const linkedinLoc = page.locator('input[autocomplete="custom-question-linkedin"], input[name*="linkedin" i]').first();
                if (await linkedinLoc.count() > 0 && profileData.personal.linkedin) {
                    await linkedinLoc.fill(profileData.personal.linkedin);
                    console.log("  - Filled LinkedIn");
                }
                
                // Upload Resume
                console.log("Attempting to upload resume.pdf...");
                const resumePath = path.join(__dirname, 'resume.pdf');
                try {
                    await fs.access(resumePath); // Verify file exists before trying to upload
                    const resumeInput = page.locator('input[type="file"][data-source="resume"], input#resume').first();
                    if (await resumeInput.count() > 0) {
                        await resumeInput.setInputFiles(resumePath);
                        console.log("  - Resume uploaded successfully.");
                    } else {
                        console.warn("  - Warning: Resume input field not found on the page.");
                    }
                } catch (e) {
                    console.error("  - Error: resume.pdf not found in the directory. Please ensure it exists.");
                }

                console.log("\nChecking for custom questions in textareas...");
                const textareas = page.locator('textarea');
                const textareaCount = await textareas.count();
                
                if (textareaCount > 0) {
                    console.log(`Found ${textareaCount} textareas. Attempting to generate answers...`);
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
                                if (parentText) questionText = parentText.split('\\n')[0];
                            }
                            
                            console.log(`  - Question: "${questionText.substring(0, 50)}..."`);
                            
                            try {
                                const prompt = `
You are an applicant. 
Based on the following resume data: 
${profileDump}

Answer the following application question in a professional, concise tone.
Keep the answer under 50 words. Do not lie or invent experience outside of the resume.

Question: ${questionText}
                                `;
                                
                                console.log("    -> Calling Gemini API...");
                                const response = await ai.models.generateContent({
                                    model: 'gemini-1.5-flash',
                                    contents: prompt,
                                });
                                
                                const answer = response.text;
                                await ta.fill(answer);
                                console.log(`    -> Answer filled: "${answer.substring(0, 50)}..."`);
                            } catch (aiError) {
                                console.error(`    -> Error generating/filling answer for this question: ${aiError.message}`);
                            }
                        }
                    }
                } else {
                    console.log("No textareas found.");
                }

                console.log("\nAll possible fields mapped and filled.");
                console.log("=========================================================");
                console.log("PAUSING SCRIPT FOR MANUAL REVIEW.");
                console.log("You can review the form in the browser window.");
                console.log("To resume the script, click 'Resume' in the Playwright Inspector.");
                console.log("=========================================================");
                
                // Pause execution right before submission so the user can manually review the form
                await page.pause();

            } catch (error) {
                console.error(`\nError during applyToGreenhouse execution: ${error.message}`);
            } finally {
                // We keep the page open intentionally here as per requirements, 
                // but normally we might close it or the browser context after application.
            }
        }

        // --- Example Usage ---
        // Uncomment the line below and add a valid Greenhouse URL to test the script
        // await applyToGreenhouse('https://boards.greenhouse.io/company/jobs/123456');

        console.log("\nSetup completed successfully. The application is ready.");
        console.log("Note: The browser will remain open. You can uncomment the 'applyToGreenhouse' call in the script to test.");

    } catch (error) {
        console.error("\nFatal error encountered during main execution:", error.message);
        process.exit(1);
    }
}

main();
