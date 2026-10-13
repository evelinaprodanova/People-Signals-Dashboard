# Contributing

Thanks for looking. A few things matter more than the rest.

**Evidence over features.** The biggest gap is that the signals have not been checked against real exits. If you can run the tool on real data you are allowed to use, tell me which signals held up, which were noise, and what thresholds worked. Please share findings, never the data.

**Never commit real data.** Not in issues, pull requests or examples. The demo data is invented and should stay that way. `.gitignore` already skips `my-data/` and `*.local.csv`.

**Keep the guardrails.** Changes that make the tool show individual people, hide a limit, or drop a minimum group size will not be merged. Team level only. Every flag comes with a plain-language question, not a verdict.

**Keep it offline.** No network requests, no analytics, no external fonts or scripts. `tests/run.js` checks for this.

**How to work on it**

1. `node tests/run.js` should pass before and after your change.
2. If you change `demo-data/` or `templates/`, run `node scripts/build-demo.js`.
3. Say in the pull request what the change does for a person reading the page, not just what code moved.
4. If you add a signal, add its definition to `docs/METHOD.md` and its limits to `docs/LIMITS.md`.

Ideas that would help: more quarters of history and a proper backtest, within-level comparisons for the equity view, a column-mapping step for messy exports, and translations of the wording.
