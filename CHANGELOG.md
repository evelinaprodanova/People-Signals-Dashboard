# Changelog

## 0.1.8

- New Feedback section at the end of the page, with a button that opens a short feedback form on GitHub (an issue form). The page itself still makes no network requests.
- The no-network test now allows only links to this repository, not any GitHub link.

## 0.1.7

- New One team tab on the dashboard: pick a team from a dropdown and see it against the company and against its own earlier quarters. It leaves out the equity view and every other team, and it prints on its own.
- Equity lens gets a third group: people who are another gender or have not said. It is pooled across teams, so a small group is never shown team by team. New optional columns in groups.csv.
- "Where each team sits" is smaller and sits beside its key. Team detail is two columns instead of three.
- "Follow-through" is now "Action plan - Follow through".
- The data section now says which data comes from the two surveys and which from HRIS, performance and Total Rewards records.
- Numbers use the same font as the text. Fixed a clipped first quarter label on the trend charts, "eNPS" showing as "ENPS" in capitals, and a merged line in "Before you rely on it".

## 0.1.6

- Legend: one short line per signal. The tooltips on the flags use the same lines.
- Limits dropdown on the page now shows the ten that matter most. All 31 are listed in `docs/LIMITS.md`.

## 0.1.5

- Shorter wording across the page, the limits, the settings help and the notes under each card (about a sixth fewer words on the page).
- Long notes under the dashboard cards now sit behind a "How to read this" toggle and open for printing.
- "Ten small files" corrected to "Six small files".
- Fixed a duplicate element id that made the "Early signals" link in the top bar jump to the wrong place. A test now checks for duplicate ids.

## 0.1.4

- Teams table: filter by status, search by name, sort by any column (a sort menu on phones).
- A legend that explains every signal, colour and term, also shown as tooltips on the flags. A test checks that every flag the page can raise is in it.
- Upload panel is closed by default and shows what is loaded. It collapses after a successful load.
- Settings grouped into four sections, with a reset button and a mark on anything changed from the defaults.
- A one-line "what this means" under each card heading.
- Tables become cards on phones.

## 0.1.3

- Regretted exits (people the team wanted to keep) count more, twice by default, in the turnover and exit-cluster flags. New setting: weight of a regretted exit.
- Regretted exits shown inside each tenure band, for the team and for all teams together. New optional columns in exits_by_tenure.csv: reg_under_6m, reg_m6_12, reg_m12_18, reg_over_18.
- Exits and regretted exits added to the headline figures and the Teams table. The backtest shows regretted exits as a separate line.
- Tests for the new columns, the weight, and cases with no regretted data.

## 0.1.2

- Two ready-made prompts for preparing the files with an AI assistant: one that shares only column names, one that attaches the data. Includes a privacy note. Also in docs/PREPARE_WITH_AI.md.
- A Paste button next to each file: paste cells copied from a spreadsheet instead of choosing a file.
- Tests that keep the prompts in step with the templates.

## 0.1.1

Page redesign. No change to the analysis.

- "How it works" moved up, before the dashboard.
- Non-response, pay and "beyond the pulse" combined into one tabbed section.
- "Choices I made" and "Before you rely on it" in two columns.
- "Limits and blind spots" moved into a dropdown (opens automatically when printing).
- Top navigation bar, hero with demo link, softer cards.

## 0.1.0

First public version.

- Reads team-level CSV files in the browser, with row-by-row error messages. Demo data and templates included.
- One status per team: Stable, Watch, Slipping, Act.
- Pulse and manager survey read as a pair, with non-response adjustment, ranges and margins of error.
- Pay (compa-ratio) next to pulse and eNPS.
- Early signals: manager change, stalled promotions, workload, manager span.
- Equity view, driver view, cost of exits, manager spans.
- Follow-through log with CSV download.
- Backtest on four quarters, and thresholds taken from the data.
- Tests for the file reader and a render check.
