# System Architecture

AutoApplier is a pipeline-based application. Data flows from discovery to submission tracking.

## Pipeline Overview

```mermaid
graph TD
    A[Scraper Module] -->|Extracts URLs| B(URL Queue)
    B --> C{Is Supported ATS?}
    C -->|Yes (Greenhouse/Lever)| D[Playwright Form Filler]
    C -->|No| E[Skip / Flag Manual]
    
    D --> F[Inject profile.json Data]
    D --> G{Custom Question?}
    
    G -->|Yes| H[Gemini API Inference]
    H --> I[Inject AI Answer]
    G -->|No| J[Attach resume.pdf]
    I --> J
    
    J --> K[Pause for Human Review]
    K -->|User Clicks Submit| L[SQLite Tracker: Log Application]
```

## Module Definitions

### 1. The Scraper Module
A lightweight script that hits job boards (e.g., LinkedIn Jobs, Internshala) searching for specific keywords ("Software Engineer Intern", "Next.js"). It extracts a list of application URLs and stores them in memory.

### 2. The Engine (Playwright)
The core of the system. Playwright launches a Chromium instance (non-headless mode so the user can see it). It navigates to the URL, analyzes the DOM to identify the ATS provider, and begins executing filling strategies.

### 3. The Brain (Gemini API)
When Playwright encounters a `<textarea>` that doesn't match standard fields (like "Address" or "Summary"), it extracts the `<label>` for that input. It sends the label (the question) + the job description + `profile.json` to the Gemini API to generate a tailored 50-100 word response.

### 4. The Tracker (SQLite)
Once the user manually clicks "Submit" and the success page loads, Playwright detects the success URL and writes a record to the local `applications.db` SQLite database.
