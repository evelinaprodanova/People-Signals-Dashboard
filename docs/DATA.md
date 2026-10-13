# Data formats

Six CSV files. Only the first two are required. All are team-level: **one row per team (or per team and quarter), never one row per person.**

- Header names must match exactly (case does not matter). Extra columns are ignored with a notice.
- Commas, semicolons or tabs are detected. A decimal comma (3,5) is accepted.
- Blank cells mean "not available". A view that needs a column switches off unless every team has it.
- Files over 5 MB are refused: that size means the data is not team-level.
- Templates are in `templates/` and can be downloaded from the page.
- You can paste cells copied from a spreadsheet into the page instead of choosing a file. To have an AI assistant prepare the files, see [PREPARE_WITH_AI.md](PREPARE_WITH_AI.md).

## teams.csv (required)

| Column | Meaning | Needed for |
| --- | --- | --- |
| `team` | Team name. Must be the same in every file. | required |
| `headcount` | People in the team, whole number. | required |
| `rating_1` to `rating_5` | Share of the team (%) at each performance rating, 1 lowest. | rating gap flag |
| `compa_ratio` | Average pay divided by the market midpoint for the role, for example 0.95. | pay views |
| `share_below_090` | Share of the team (%) with a compa-ratio under 0.90. | pay views |
| `avg_salary` | Average annual pay per person. | cost view |
| `manager_spans` | Direct reports per people manager, separated by `;`, for example `8;6;5`. | span view, wide span flag |
| `manager_change_pct` | Share of the team (%) whose manager changed in the last 6 months. | new manager signal |
| `manager_months` | Months the current manager has been in role. | new manager signal |
| `stalled_promo_pct` | Share of top-rated people (%) with no promotion or pay change in 18 months or more. | stalled promotions signal |
| `open_roles_pct` | Open roles as a share of headcount (%). | load index |
| `overtime_hours` | Overtime hours per person per month. Leave blank if not tracked. | load index |
| `leave_unused_pct` | Share of expected leave not taken (%). | load index |

## quarterly.csv (required)

One row per team per quarter. The last four quarters, in the order they first appear in the file, are used. Every team needs all four.

| Column | Meaning | Range |
| --- | --- | --- |
| `team`, `quarter` | Team name and a label such as `Q3 26`. | |
| `pulse_favorable` | Share of answers (%) that were favorable on the pulse. | 0 to 100 |
| `pulse_response` | Share of the team (%) that answered the pulse. | 0 to 100 |
| `manager_score` | Average on the manager effectiveness survey. | 1 to 5 |
| `manager_response` | Share of the team (%) that answered the manager survey. | 0 to 100 |
| `enps` | Employee net promoter score. | -100 to 100 |
| `pace_favorable` | Share (%) agreeing "I can sustain my current pace". | 0 to 100 |
| `exits` | People who left the team in the quarter, whole number. | 0 or more |
| `regretted_exits` | Optional. Of those, how many the team wanted to keep. | not above `exits` |

## exits_by_tenure.csv (optional)

`team`, `under_6m`, `m6_12`, `m12_18`, `over_18`: exits in the last 12 months by tenure at exit. Should add up to the sum of the four quarters of `exits`. Switches on the exit-cluster flag and the tenure chart.

## items.csv (optional)

`team`, `growth_career`, `workload_pace`, `manager_support`, `tools_process`, `recognition`, `pay_fairness`, `plan_to_stay`: share of answers (%) that were favorable on each pulse item this quarter, and on "I plan to be here in a year". Switches on the driver view.

## groups.csv (optional)

Switches on the equity view. One attribute, two groups (women and men), and a count of people who are in neither group shown.

`team`, `women`, `other` (optional, default 0), `promoted_women`, `promoted_men`, `exits_women`, `exits_men` (counts over the last 12 months), `compa_women`, `compa_men`, `pulse_women`, `pulse_men`, `response_women`, `response_men`.

Men are worked out as headcount minus women minus other. The page shows nothing for a team where either group is smaller than the minimum group size.

## comments.csv (optional)

`team`, `comment`: one survey comment per row. Themes come from a keyword match, so treat them as a rough guide. Remove names and anything that could identify a person before you load it.
