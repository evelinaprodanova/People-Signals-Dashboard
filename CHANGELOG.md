# Changelog

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
