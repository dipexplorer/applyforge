# GSSoC PR Labeling & Scoring Guide

This internal guide dictates how PRs should be evaluated and labeled for the GirlScript Summer of Code (GSSoC) scoring engine. Labels are not cosmetic—they strictly define the points a contributor earns.

## 1. Difficulty Labels (Select ONE)

Difficulty represents the **cognitive demand** of the change, not the time taken. If multiple apply, the scoring engine uses the lowest one.

| Label                | Points | Description                                                                           | Examples                                                                                         |
| :------------------- | :----- | :------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| `level:beginner`     | 20 pts | Self-contained, single file or tightly scoped. No architectural understanding needed. | Typo fixes, README updates, variable renaming, simple isolated UI tweaks.                        |
| `level:intermediate` | 35 pts | Spans multiple files or requires cross-file reasoning.                                | Tracing bugs across files, new UI components with tests, simple refactoring, form validation.    |
| `level:advanced`     | 55 pts | Core logic, architectural decisions, deep understanding needed.                       | New features with interacting parts, perf improvements with benchmarks, complex hooks/refactors. |
| `level:critical`     | 80 pts | High-stakes areas (mistakes cause data loss, outage, or breaches).                    | Security vulnerabilities, Database schema migrations, Auth/Session logic, CI/CD pipelines.       |

## 2. Quality Multipliers (Select ONE - Optional)

Rewards contributors who go the extra mile. Absence defaults to 1.0×.

| Label                 | Multiplier | Description                                                     | Checklist                                                                                                                              |
| :-------------------- | :--------- | :-------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `quality:clean`       | 1.2×       | Well-structured, readable, matches existing style.              | No dead code/logs, descriptive names, no nitpicks required from reviewer.                                                              |
| `quality:exceptional` | 1.5×       | Goes meaningfully beyond what was asked. Shows deep initiative. | **MUST HAVE WRITTEN JUSTIFICATION IN REVIEW.** Handles unmentioned edge cases, adds unprompted tests, significantly reduces tech debt. |

## 3. Type Bonuses (Cumulative)

Flat bonuses added on top. Add all that truthfully apply as the primary purpose of the PR.

- `type:bug` (+10): Fixes incorrect behavior.
- `type:feature` (+10): Adds new functionality.
- `type:docs` (+5): Improves documentation/comments.
- `type:testing` (+10): Adds/improves test coverage.
- `type:refactor` (+10): Restructures code without behavior change.
- `type:design` (+10): Visual UI/UX improvements.
- `type:accessibility` (+15): Screen readers, contrast, keyboard nav.
- `type:performance` (+15): Reduces load time, bundle size, or memory.
- `type:devops` (+15): CI/CD, Docker, workflows, deployment.
- `type:security` (+20): Addresses a vulnerability or hardens surface area.

## 4. Blocking Labels (No Score)

Any of these block scoring entirely, even if `gssoc:approved` is applied.

- `gssoc:invalid`: Low effort, duplicate, off-topic (not malicious).
- `gssoc:spam`: Fabricated, empty files, no real value.
- `gssoc:ai-slop`: AI-generated code pasted without human understanding (contributor cannot explain it).

## Scoring Formula

`score = 50 (base) + (difficulty × quality) + type_bonuses`
_(Capped at 175 pts max per PR. First-time contributors get an automatic +25 pts)._

---

## 🎯 Example Evaluation: PR #1596 (Per-Caller API Keys)

Based on these guidelines, here is how PR #xxx shuld be scored:

1. **Difficulty:** `level:critical` (80 pts) — Touches Authentication, implements Database Schema Migrations (`api_keys` table), and hardens Security.
2. **Quality:** `quality:exceptional` (1.5×) — Upgraded to PBKDF2 hashing securely without being prompted, handled edge cases natively via RLS policies, and added thorough tests unprompted. _(Note: We must leave a review comment justifying this)._
3. **Types:** `type:security` (+20), `type:etc...` (if exists, else N/A), `type:testing` (+10), `type:refactor` (+10).

**Total Estimated Score:** 50 + (80 \* 1.5) + 40 = 210 -> **Capped at 175 points**.
