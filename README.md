# AutoApplier: AI-Powered Job Application Assistant

AutoApplier is a semi-automated pipeline built to help Software Engineering Interns apply to roles faster. Instead of spending hours filling out repetitive ATS (Applicant Tracking System) forms, AutoApplier uses browser automation and generative AI to parse job postings, fill forms with your profile data, and even draft custom answers to unique application questions.

## ⚠️ Important Disclaimer

> [!WARNING]
> This project is designed for **semi-automation**, meaning it will fill out 80-90% of an application form, but you **must manually review and submit**. 
> Fully automating job applications (100%) violates the terms of service of many platforms (like LinkedIn, Workday, etc.) and can result in IP bans or account suspension. Additionally, AI can hallucinate answers. **Always review before clicking submit.**

## Features

- **Automated Form Filling**: Leverages Playwright to inject your name, email, GitHub links, and work experience directly into standard inputs.
- **Smart Parsing**: Uses the Gemini API to dynamically answer custom questions (e.g. "Why do you want to work here?") based on your unique `profile.json` context.
- **Application History Tracking**: Automatically logs every successfully filled application into a local SQLite database so you never lose track of where you applied.
- **Targeted ATS Compatibility**: Specifically designed to target standardized, developer-friendly platforms like Greenhouse, Lever, and Ashby.

## Getting Started

1. Clone this repository.
2. Run `npm install` (once the Node.js project is fully initialized).
3. Copy your resume into this directory and name it `resume.pdf`.
4. Review and update the `profile.json` file with your sensitive details (phone number, address).
5. Add your Gemini API key to a `.env` file (`GEMINI_API_KEY=your_key`).
6. Run the scraper/filler script (TBD).

## Documentation

- [Project Context](./PROJECT_CONTEXT.md)
- [Architecture Blueprint](./ARCHITECTURE.md)
- [Design Details](./DESIGN.md)
- [Tech Stack](./TECHSTACK.md)
