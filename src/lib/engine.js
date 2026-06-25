require('dotenv').config();
const { getDb } = require('./db');
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

async function applyToGreenhouse(page, profileData) {
    console.log('Mapping Greenhouse fields...');
    const fields = [
        ['input[id="first_name"]', profileData.personal?.first_name],
        ['input[id="last_name"]', profileData.personal?.last_name],
        ['input[id="email"]', profileData.personal?.email],
        ['input[id="phone"]', profileData.personal?.phone],
        ['input[autocomplete="custom-question-linkedin"], input[name*="linkedin" i]', profileData.personal?.linkedin],
    ];
    for (const [selector, value] of fields) {
        if (!value) continue;
        try {
            const loc = page.locator(selector).first();
            if (await loc.count() > 0) await loc.fill(String(value));
        } catch (e) { /* skip */ }
    }

    const resumePath = path.join(process.cwd(), 'data', 'resume.pdf');
    try {
        await fs.access(resumePath);
        const resumeInput = page.locator('input[type="file"][data-source="resume"], input#resume').first();
        if (await resumeInput.count() > 0) await resumeInput.setInputFiles(resumePath);
    } catch (e) { console.log('resume.pdf not found, skipping upload.'); }
}

async function applyToLever(page, profileData) {
    console.log('Mapping Lever fields...');
    const fullName = `${profileData.personal?.first_name || ''} ${profileData.personal?.last_name || ''}`.trim();
    const fields = [
        ['input[name="name"]', fullName],
        ['input[name="email"]', profileData.personal?.email],
        ['input[name="phone"]', profileData.personal?.phone],
        ['input[name="org"]', profileData.education?.[0]?.university],
        ['input[name="urls[LinkedIn]"]', profileData.personal?.linkedin],
        ['input[name="urls[GitHub]"]', profileData.personal?.github],
        ['input[name="urls[Portfolio]"]', profileData.personal?.website],
    ];
    for (const [selector, value] of fields) {
        if (!value) continue;
        try {
            const loc = page.locator(selector).first();
            if (await loc.count() > 0) await loc.fill(String(value));
        } catch (e) { /* skip */ }
    }

    const resumePath = path.join(process.cwd(), 'data', 'resume.pdf');
    try {
        await fs.access(resumePath);
        const resumeInput = page.locator('input[type="file"][name="resume"]').first();
        if (await resumeInput.count() > 0) await resumeInput.setInputFiles(resumePath);
    } catch (e) { console.log('resume.pdf not found, skipping upload.'); }
}

// ─── Copilot Injection Script (string, not template literal) ─────────────────
// This runs inside the browser, so we pass it as a plain string
const copilotScript = `
(function() {
    var style = document.createElement('style');
    style.textContent = '.ai-btn{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;cursor:pointer;margin-top:6px;display:inline-block;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.15);transition:all 0.2s;font-family:system-ui,sans-serif;}.ai-btn:hover{opacity:0.9;transform:translateY(-1px);}';
    document.head.appendChild(style);

    function addButtons() {
        var selectors = [
            'textarea',
            'input[type="text"]:not([id="first_name"]):not([id="last_name"]):not([id="email"]):not([id="phone"]):not([name="name"]):not([name="email"]):not([name="phone"]):not([name="org"])'
        ];
        selectors.forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(field) {
                if (field.nextElementSibling && field.nextElementSibling.classList.contains('ai-btn')) return;
                var btn = document.createElement('button');
                btn.className = 'ai-btn';
                btn.innerHTML = '\\u{1FA84} Auto-Generate with AI';
                btn.type = 'button';
                btn.onclick = async function(e) {
                    e.preventDefault();
                    btn.innerHTML = '\\u23F3 Generating...';
                    try {
                        var label = '';
                        var parent = field.closest('div,li,section');
                        if (parent) {
                            var lel = parent.querySelector('label,.application-label,p');
                            if (lel) label = lel.innerText;
                        }
                        if (!label) label = field.placeholder || field.name || field.id || 'Tell me about yourself';
                        var answer = await window.generateAIAnswer(label);
                        field.value = answer;
                        field.dispatchEvent(new Event('input', {bubbles:true}));
                        field.dispatchEvent(new Event('change', {bubbles:true}));
                        btn.innerHTML = '\\u2728 Done! You can edit this.';
                        setTimeout(function(){ btn.innerHTML = '\\u{1FA84} Auto-Generate with AI'; }, 3000);
                    } catch(err) {
                        btn.innerHTML = '\\u274C Error: ' + err.message;
                    }
                };
                field.parentNode.insertBefore(btn, field.nextSibling);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addButtons);
    } else {
        addButtons();
    }
    var obs = new MutationObserver(addButtons);
    obs.observe(document.body, {childList:true, subtree:true});
})();
`;

/**
 * Interactive AI Copilot — opens a visible browser, fills basic fields,
 * and injects magic AI buttons for all custom questions.
 */
async function applyToJob(url) {
    console.log('Initializing Gemini AI Client...');
    const ai = new GoogleGenAI({});

    console.log('Loading DB & profile...');
    const db = getDb();

    const profilePath = path.join(process.cwd(), 'data', 'profile.json');
    let profileData;
    try {
        profileData = JSON.parse(await fs.readFile(profilePath, 'utf8'));
    } catch (err) {
        throw new Error(`Failed to read profile.json: ${err.message}`);
    }
    const profileDump = JSON.stringify(profileData, null, 2);

    const isGreenhouse = url.includes('boards.greenhouse.io') || url.includes('job-boards.greenhouse.io');
    const isLever = url.includes('jobs.lever.co');
    if (!isGreenhouse && !isLever) {
        throw new Error('Unsupported URL. Only Greenhouse and Lever ATS are supported for auto-fill.');
    }

    console.log('Launching Chromium (Interactive Copilot Mode)...');
    const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Bridge browser ↔ Node AI
    await page.exposeFunction('generateAIAnswer', async (question) => {
        console.log(`[Copilot] Gemini answering: "${question}"`);
        try {
            const prompt = [
                'You are a real human applicant filling a job application form.',
                'Write a natural, conversational, first-person answer to the question below.',
                'Sound authentic — not robotic or like a template.',
                'Keep it under 120 words. Never lie or hallucinate experience you do not have.',
                '',
                `== Your Resume Data ==`,
                profileDump,
                '',
                `== Question ==`,
                question,
            ].join('\n');

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });
            return response.text;
        } catch (err) {
            console.error(`AI Error: ${err.message}`);
            return 'AI generation failed. Please type your answer here.';
        }
    });

    // Inject copilot UI
    await page.addInitScript(copilotScript);

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let atsName = 'Unknown';
    if (isGreenhouse) {
        atsName = 'Greenhouse';
        await applyToGreenhouse(page, profileData);
    } else if (isLever) {
        atsName = 'Lever';
        try {
            const applyBtn = page.locator('a.postings-btn').filter({ hasText: 'Apply' }).first();
            if (await applyBtn.count() > 0 && await applyBtn.isVisible()) {
                await applyBtn.click();
                await page.waitForLoadState('domcontentloaded');
            }
        } catch (e) { /* skip if no apply button */ }
        await applyToLever(page, profileData);
    }

    // Record in DB
    const stmt = db.prepare(`
        INSERT INTO applications (source, company, role, location, url, apply_url, ats_platform, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run('copilot', 'Auto-Detected', 'Copilot Mode', 'Remote', url, url, atsName, 'Pending');

    console.log('[Copilot] Browser launched. Window left open for user interaction.');
    // ⚠️ Do NOT close the browser — leave it open for the user!
}

module.exports = { applyToJob };
