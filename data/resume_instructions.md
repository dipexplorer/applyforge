# Resume Instructions

To enable AutoApplier to attach your resume to job applications, you must place your actual resume file in this directory.

## Setup
1. Export your latest resume as a PDF file.
2. Name the file **exactly** `resume.pdf`.
3. Place it in this folder (`/home/dipuser/DIP/AutoApplier/resume.pdf`).

## Important Notes
- **File Format:** Most ATS platforms strongly prefer `.pdf` files because they preserve formatting perfectly. Do not use `.docx` or `.png`.
- **File Size:** Try to keep your `resume.pdf` under 2MB. Some older ATS portals have strict size limits and will fail if the file is too large.
- **Git Ignore:** This file is usually ignored in `.gitignore` to prevent you from accidentally publishing personal data to public repositories.

Once you have placed `resume.pdf` here, the Playwright script will automatically pick it up and attach it to file upload inputs (`<input type="file">`).
