require('dotenv').config();
const Database = require('better-sqlite3');
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

async function handleCustomQuestions(page, profileData, ai) {
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
}

async function applyToGreenhouse(page, profileData) {
    console.log("Mapping Greenhouse fields...");
    const firstNameLoc = page.locator('input[id="first_name"]');
    if (await firstNameLoc.count() > 0 && profileData.personal.first_name) {
        await firstNameLoc.fill(profileData.personal.first_name);
    }
    
    const lastNameLoc = page.locator('input[id="last_name"]');
    if (await lastNameLoc.count() > 0 && profileData.personal.last_name) {
        await lastNameLoc.fill(profileData.personal.last_name);
    }
    
    const emailLoc = page.locator('input[id="email"]');
    if (await emailLoc.count() > 0 && profileData.personal.email) {
        await emailLoc.fill(profileData.personal.email);
    }
    
    const phoneLoc = page.locator('input[id="phone"]');
    if (await phoneLoc.count() > 0 && profileData.personal.phone) {
        await phoneLoc.fill(profileData.personal.phone);
    }
    
    const linkedinLoc = page.locator('input[autocomplete="custom-question-linkedin"], input[name*="linkedin" i]').first();
    if (await linkedinLoc.count() > 0 && profileData.personal.linkedin) {
        await linkedinLoc.fill(profileData.personal.linkedin);
    }
    
    const resumePath = path.join(process.cwd(), 'data', 'resume.pdf');
    try {
        await fs.access(resumePath);
        const resumeInput = page.locator('input[type="file"][data-source="resume"], input#resume').first();
        if (await resumeInput.count() > 0) {
            await resumeInput.setInputFiles(resumePath);
        }
    } catch (e) {
        console.error("Error: resume.pdf not found.");
    }
}

async function applyToLever(page, profileData) {
    console.log("Mapping Lever fields...");
    const nameLoc = page.locator('input[name="name"]');
    if (await nameLoc.count() > 0 && profileData.personal.first_name) {
        const fullName = `${profileData.personal.first_name} ${profileData.personal.last_name || ''}`.trim();
        await nameLoc.fill(fullName);
    }

    const emailLoc = page.locator('input[name="email"]');
    if (await emailLoc.count() > 0 && profileData.personal.email) {
        await emailLoc.fill(profileData.personal.email);
    }
    
    const phoneLoc = page.locator('input[name="phone"]');
    if (await phoneLoc.count() > 0 && profileData.personal.phone) {
        await phoneLoc.fill(profileData.personal.phone);
    }
    
    // Some Lever forms have an org field
    const orgLoc = page.locator('input[name="org"]');
    if (await orgLoc.count() > 0 && profileData.education && profileData.education.length > 0) {
        await orgLoc.fill(profileData.education[0].university);
    }
    
    const linkedinLoc = page.locator('input[name="urls[LinkedIn]"]');
    if (await linkedinLoc.count() > 0 && profileData.personal.linkedin) {
        await linkedinLoc.fill(profileData.personal.linkedin);
    }

    const githubLoc = page.locator('input[name="urls[GitHub]"]');
    if (await githubLoc.count() > 0 && profileData.personal.github) {
        await githubLoc.fill(profileData.personal.github);
    }

    const portfolioLoc = page.locator('input[name="urls[Portfolio]"]');
    if (await portfolioLoc.count() > 0 && profileData.personal.website) {
        await portfolioLoc.fill(profileData.personal.website);
    }

    const resumePath = path.join(process.cwd(), 'data', 'resume.pdf');
    try {
        await fs.access(resumePath);
        const resumeInput = page.locator('input[type="file"][name="resume"]').first();
        if (await resumeInput.count() > 0) {
            await resumeInput.setInputFiles(resumePath);
        }
    } catch (e) {
        console.error("Error: resume.pdf not found.");
    }
}

/**
 * Main entry point for applying to a job.
 * @param {string} url - The job posting URL
 */
async function applyToJob(url) {
    try {
        console.log("Initializing Gemini AI Client...");
        const ai = new GoogleGenAI({});

        console.log("Initializing SQLite database...");
        const dbPath = path.join(process.cwd(), 'data', 'applications.db');
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');

        console.log("Loading profile data...");
        const profilePath = path.join(process.cwd(), 'data', 'profile.json');
        let profileData;
        try {
            const profileRaw = await fs.readFile(profilePath, 'utf8');
            profileData = JSON.parse(profileRaw);
        } catch (err) {
            throw new Error(`Failed to read profile.json: ${err.message}`);
        }

        const isGreenhouse = url.includes('boards.greenhouse.io');
        const isLever = url.includes('jobs.lever.co');

        if (!isGreenhouse && !isLever) {
            throw new Error("Unsupported URL. Only Greenhouse and Lever are supported.");
        }

        console.log("Launching Playwright (Chromium, non-headless)...");
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();

        console.log(`\nStarting application process for: ${url}`);
        const page = await context.newPage();
        
        try {
            console.log("Navigating to URL...");
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            let atsName = "Unknown";

            if (isGreenhouse) {
                atsName = "Greenhouse";
                await applyToGreenhouse(page, profileData);
            } else if (isLever) {
                atsName = "Lever";
                // Lever often puts the apply form behind an "Apply for this job" button click on the main page.
                // We attempt to find the form directly, or click the button.
                const applyBtn = page.locator('a.postings-btn').filter({ hasText: 'Apply' }).first();
                if (await applyBtn.count() > 0 && await applyBtn.isVisible()) {
                    await applyBtn.click();
                    await page.waitForLoadState('domcontentloaded');
                }
                await applyToLever(page, profileData);
            }

            await handleCustomQuestions(page, profileData, ai);

            // Insert into Database
            const stmt = db.prepare('INSERT INTO applications (company, role, url, date_applied, status, ats_platform) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run("Unknown Company", "Unknown Role", url, new Date().toISOString(), "Pending", atsName);

            console.log("PAUSING SCRIPT FOR MANUAL REVIEW.");
            await page.pause();

        } catch (error) {
            console.error(`Error during apply execution: ${error.message}`);
            throw error;
        }
    } catch (error) {
        console.error("Fatal error:", error.message);
        throw error;
    }
}

module.exports = { applyToJob };
