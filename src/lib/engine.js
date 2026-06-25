require('dotenv').config();
const Database = require('better-sqlite3');
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

// Keep references to prevent GC
global.activeBrowsers = global.activeBrowsers || [];

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
 * Main entry point for applying to a job in Interactive Copilot mode.
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

        const profileDump = JSON.stringify(profileData, null, 2);
        const isGreenhouse = url.includes('boards.greenhouse.io');
        const isLever = url.includes('jobs.lever.co');

        if (!isGreenhouse && !isLever) {
            throw new Error("Unsupported URL. Only Greenhouse and Lever are supported.");
        }

        console.log("Launching Playwright (Chromium, Interactive Mode)...");
        const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
        global.activeBrowsers.push(browser);
        
        const context = await browser.newContext({ viewport: null });
        const page = await context.newPage();

        // Expose AI functionality to the browser
        await page.exposeFunction('generateAIAnswer', async (question) => {
            console.log(`[Copilot] AI requested for: "${question}"`);
            try {
                const prompt = `You are a human applicant filling out a job application. Based on your following resume data:\n\n${profileDump}\n\nAnswer the application question in a conversational, professional, and authentic human tone. Do not sound robotic. Write a natural response. Keep it under 100 words. Do not hallucinate or lie. Only answer the question asked.\nQuestion: ${question}`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: prompt,
                });
                return response.text;
            } catch (err) {
                console.error(`AI Generation Error: ${err.message}`);
                return "AI Error: Could not generate answer.";
            }
        });

        // Inject UI script
        await page.addInitScript(() => {
            document.addEventListener('DOMContentLoaded', () => {
                const style = document.createElement('style');
                style.textContent = `
                    .ai-magic-btn {
                        background: linear-gradient(135deg, #2563eb, #7c3aed);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        padding: 6px 12px;
                        font-size: 13px;
                        cursor: pointer;
                        margin-top: 6px;
                        display: inline-block;
                        font-weight: bold;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        transition: all 0.2s ease;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    .ai-magic-btn:hover {
                        opacity: 0.9;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px rgba(0,0,0,0.15);
                    }
                `;
                document.head.appendChild(style);

                const addButtons = () => {
                    // Only target textareas and specific text inputs for custom questions
                    const fields = document.querySelectorAll('textarea, input[type="text"]:not([id="first_name"]):not([id="last_name"]):not([id="email"]):not([id="phone"]):not([name="name"]):not([name="email"]):not([name="phone"]):not([name="org"])');
                    
                    fields.forEach(field => {
                        // Skip if already added
                        if (field.nextElementSibling?.classList.contains('ai-magic-btn')) return;
                        
                        const btn = document.createElement('button');
                        btn.className = 'ai-magic-btn';
                        btn.innerHTML = '🪄 Auto-Generate';
                        btn.type = 'button'; // Prevent form submission
                        
                        btn.onclick = async (e) => {
                            e.preventDefault();
                            btn.innerHTML = '⏳ Generating...';
                            try {
                                // Attempt to find the label for this field
                                let label = '';
                                const parent = field.closest('div');
                                if (parent) {
                                    const labelEl = parent.querySelector('label') || parent.querySelector('.application-label');
                                    if (labelEl) label = labelEl.innerText;
                                }
                                if (!label) label = field.name || field.id || field.placeholder;
                                
                                const answer = await window.generateAIAnswer(label);
                                field.value = answer;
                                
                                // Dispatch events so React/Vue/custom frameworks register the change
                                field.dispatchEvent(new Event('input', { bubbles: true }));
                                field.dispatchEvent(new Event('change', { bubbles: true }));

                                btn.innerHTML = '✨ Done';
                                setTimeout(() => { btn.innerHTML = '🪄 Auto-Generate'; }, 2500);
                            } catch (err) {
                                btn.innerHTML = '❌ Error';
                            }
                        };
                        
                        field.parentNode.insertBefore(btn, field.nextSibling);
                    });
                };
                
                addButtons();
                const observer = new MutationObserver(addButtons);
                observer.observe(document.body, { childList: true, subtree: true });
            });
        });

        console.log("Navigating to URL...");
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        let atsName = "Unknown";

        if (isGreenhouse) {
            atsName = "Greenhouse";
            await applyToGreenhouse(page, profileData);
        } else if (isLever) {
            atsName = "Lever";
            const applyBtn = page.locator('a.postings-btn').filter({ hasText: 'Apply' }).first();
            if (await applyBtn.count() > 0 && await applyBtn.isVisible()) {
                await applyBtn.click();
                await page.waitForLoadState('domcontentloaded');
            }
            await applyToLever(page, profileData);
        }

        // Insert into Database
        const stmt = db.prepare('INSERT INTO applications (company, role, url, date_applied, status, ats_platform) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run("Copilot Mode", "Interactive", url, new Date().toISOString(), "Pending", atsName);

        console.log("Application started in interactive mode. Window is left open for the user.");
        // We do NOT await browser.close() or page.pause() because we want the API request to finish 
        // while leaving the browser open for the user to interact with.

    } catch (error) {
        console.error(`Error during apply execution: ${error.message}`);
        throw error;
    }
}

module.exports = { applyToJob };
