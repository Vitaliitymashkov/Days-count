Prompt (spec) for a code generator: SPA in JavaScript to track days absent in Poland

Below is a ready prompt that can be pasted into a code generator / sent to a developer / used with ChatGPT to produce a working single-page web app. The application must run as a static site (GitHub Pages) without a backend; default data storage is localStorage and optional S3 integration is described separately.

Copy the entire block below and paste it into the code generator (or send to a developer).
'''
Task
---
Create a single-page web application (SPA) using plain JavaScript (no bundler / no backend) that can be hosted as a static site (for example on GitHub Pages). The app should allow tracking people's trips (exit from Poland and return to Poland), store multiple people and their trips, and compute the total number of absent days in Poland for a given period.

Implementation requirements
---
1. Technologies:
   - Plain HTML + CSS + vanilla JavaScript (ES6+). The project may be split into files, but it must be runnable without a build step.
   - Use a simple, tidy UI (Tailwind CDN allowed but not required).
   - No authentication.

2. Data storage:
   - Default: localStorage (key: `absenceData`).
   - Provide buttons: "Save", "Load", "Export JSON", "Import JSON".
   - Optional section: AWS S3 integration (describe example integration via presigned URLs or instructions for manual JSON upload to a bucket). S3 implementation is optional, but the UI should include a toggle/section "Store in S3 (optional)" with fields: `S3 PUT URL` / `S3 GET URL` (the user may paste their presigned URL).

3. Data model:
   - Example JSON structure:
     ```json
     {
       "people": [
         {
           "id": "uuid-1",
           "name": "Ivan Ivanov",
           "trips": [
             {"id":"t1","exit":"2022-03-10","return":"2022-04-05"},
             {"id":"t2","exit":"2023-01-15","return":null} // null — not yet returned
           ]
         }
       ]
     }
     ```
   - Dates in ISO format `YYYY-MM-DD`.
   - If a trip's `return` == `null`, treat the return date as the selected `date1` (the upper bound of the calculation period) when computing.

4. Minimum UI:
   - "Period parameters" panel: `Date 1 (end)` — default = today; `Date 2 (start)` — default = date1 minus 5 years. Fields editable.
   - List of people: add / edit / delete a person.
   - For each person: list of trips with add / edit / delete (fields: `exit date`, `return date`, note).
   - Button "Calculate absences" for a selected person and "Calculate for all".
   - Results: table with each person, total absent days for the period, and per-trip detail (which periods were counted and how many days each contributed).
   - Button "Clear local" to remove localStorage key.

5. Absence counting algorithm
   - Definitions:
     - Calculation interval: `[start = date2, end = date1]` (see inclusive/exclusive rules below).
     - Each trip is represented as `[exit, return)` (exit inclusive; return day is counted as being in Poland — i.e. if exit 2022-03-01 and return 2022-03-05, absent days = 4: 1,2,3,4). Display this rule in the UI. (If users want a different rule — provide an option.)
   - For each trip compute the intersection with `[start, end]`:
     - effective_start = max(exit, start)
     - effective_end = min(return_or_date1, end + 1 day)  // if return day is considered as returned to Poland then we do not include that day
     - days = max(0, (effective_end - effective_start) in days)
   - To avoid double counting when trips overlap — merge (union) all overlapping/adjacent intervals per person within the calculation period, then sum the lengths of the merged intervals.
   - Perform calendar-day computations (use Date objects and compute difference in milliseconds divided by 86400000). Work in UTC or use `Date.UTC(year, month-1, day)` to avoid timezone issues.

6. Additional functionality:
   - Option to set counting rule: "include return day / do not include return day" (i.e. whether the return day is counted as absent).
   - Filter by person and a button "Trip history" (small table).
   - Visual highlight of overlapping trips.

7. Sample data: include a "Load sample" button that inserts 3 people with multiple trips (including overlapping and open-ended trips).

8. Accessibility / localization: UI in Russian (original spec). [Note: can be localized — add language switch if desired.]

UI/UX notes
---
- Keep the form simple and clear.
- Results should show two things: (1) total days in the interval, (2) breakdown by trips (which dates were counted and how many days).
- Show the counting rules used (e.g. inclusive/exclusive days).

Deploy to GitHub Pages (user instructions)
---
1. Create a public repository `username/absence-tracker`.
2. Put `index.html` (and optionally `styles.css`, `app.js`) in the repository root of the `main` branch.
3. Enable GitHub Pages: Settings → Pages → branch: main / (root).
4. The site will be available at `https://username.github.io/absence-tracker/`.

Optional: S3 storage (short instructions)
---
- The static site can be hosted in an S3 bucket, but to write to a bucket from the browser you will need presigned PUT URLs or a backend (Lambda) to sign requests.
- For simplicity, users can export JSON locally and upload it manually to S3 (or keep a public JSON and load it).
- If needed, provide an example snippet (Node.js, AWS SDK v3) to obtain presigned URLs; presigning itself is outside the minimal required functionality.

Input / output examples
---
Input (period):
- date1 = 2025-10-18
- date2 = 2020-10-18

Person A:
- trip1: exit=2021-01-05, return=2021-02-01
- trip2: exit=2022-12-20, return=null (not yet returned)

Expected result:
- For trip1: count days from 2021-01-05 to 2021-01-31 inclusive = 27 days (if return day is excluded)
- For trip2: count up to date1 (2025-10-18) — days from 2022-12-20 to 2025-10-17 = N days
- Total = 27 + N (after merging overlaps if any).

Acceptance criteria
---
- The app runs by opening the local `index.html` and works in modern browsers.
- You can add/delete people and trips and obtain correct calculations.
- Results on sample cases match manual computation (provide 3 test cases).
- Data is saved in `localStorage` and export/import via JSON is supported.

Code/style requests
---
- Code should be readable, with comments where intervals are merged and days are computed.
- Handle edge cases: trips completely outside the period (ignore), trips overlapping the boundaries.
- Provide user-friendly error messages for invalid dates (return < exit, etc.).

End of prompt
---

If you want, I can:
  1. Generate a ready-to-run index.html (vanilla JS) based on this prompt here — a file you can deploy to GitHub Pages.
  2. Or prepare short commands and a sample Node.js presign snippet for uploading JSON to S3.

Which do