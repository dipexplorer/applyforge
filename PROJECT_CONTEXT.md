# Project Context & Philosophy

## The Problem
Applying to software engineering internships is a numbers game. However, the process is highly repetitive. Candidates copy and paste the same links (GitHub, LinkedIn, Portfolio), upload the same PDF, and answer the same generic questions ("Are you legally authorized to work?"). 

## The Solution
AutoApplier aims to automate the repetitive 80% of this process, saving hours of data entry, while keeping the human in the loop for the critical 20% (CAPTCHA solving, final review, and submitting).

## Why "Semi-Automated"?
Many tutorials promise "100% automated bots that apply to 1000 jobs while you sleep." These are structurally flawed because:
1. **Cloudflare / Bot Protection**: Major ATS platforms (especially Workday and Taleo) aggressively block headless browsers.
2. **Hallucinations**: If an AI is tasked with answering "What is your biggest weakness?" entirely autonomously, it might generate an unprofessional response.
3. **CAPTCHAs**: Recaptcha and hCaptcha actively block form submissions from automated scripts.

By pausing the Playwright script *right before* submission, AutoApplier allows the user to solve any CAPTCHAs, review the AI-generated text, and click the final button. This ensures a 100% human-verified application while eliminating all data entry.

## Target Audience
This system is tailored for Dipjyoti Das, highlighting a core stack of **Next.js, Node.js, MongoDB, React, and Supabase**, aiming for Internships in India.

## Target Portals
The initial focus will be on:
1. **Greenhouse** (`boards.greenhouse.io`)
2. **Lever** (`jobs.lever.co`)
3. **Wellfound** (AngelList)

These portals generally have predictable HTML DOM structures and less aggressive bot-blocking compared to enterprise solutions like Workday.
