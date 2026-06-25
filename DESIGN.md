# System Design

## 1. Database Schema
A local `applications.db` SQLite database will be used.

**Table: `applications`**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary Key |
| `company` | TEXT | Extracted company name |
| `role` | TEXT | Extracted job title |
| `url` | TEXT | The application URL |
| `date_applied`| TEXT | ISO Datetime |
| `status` | TEXT | 'Applied', 'Rejected', 'Interview' |
| `ats_platform`| TEXT | e.g. 'Greenhouse', 'Lever' |

## 2. DOM Selector Strategy
ATS platforms use consistent IDs and Names.

**Greenhouse Strategies:**
- First Name: `input[id="first_name"]`
- Last Name: `input[id="last_name"]`
- Email: `input[id="email"]`
- Phone: `input[id="phone"]`
- Resume: `input[type="file"][data-source="resume"]` or `input#resume`
- LinkedIn: `input[autocomplete="custom-question-linkedin"]` or `input[name*="linkedin" i]`

**Lever Strategies:**
- Full Name: `input[name="name"]`
- Email: `input[name="email"]`
- Phone: `input[name="phone"]`
- Resume: `input[type="file"][name="resume"]`

## 3. LLM Prompting Strategy

When encountering a `<textarea>` that requires a dynamic answer, the system will use the following prompt structure for the Gemini API:

```text
You are Dipjyoti Das, a Software Engineering Intern applicant.
You are applying for the role of [ROLE] at [COMPANY].
Based on the following resume data: [PROFILE_JSON_DUMP]

Answer the following application question in a professional, concise tone.
Keep the answer under [X] words. Do not lie or invent experience outside of the resume.

Question: [EXTRACTED_LABEL_TEXT]
```
