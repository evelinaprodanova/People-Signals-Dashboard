# Method

Everything here is computed in the browser from the CSV files. Defaults are the values on the sliders in Settings. They are my judgment, not published standards.

## Non-response

A score describes only the people who answered. For each score the page assumes people who did not answer were `delta` points less favorable (default 5). The adjusted score is `r × score + (1 − r) × (score − delta)`, where `r` is the response rate. The manager score (out of 5) uses `delta × 0.04`, and eNPS uses `delta × 2`. Every score is shown with the share of the team behind it, and the team detail shows the full range from "every silent person at the bottom" to "every one at the top".

## Flags

| Flag | Fires when |
| --- | --- |
| Pulse falling | The adjusted pulse fell two quarters in a row, by at least 8 points in total. |
| Both down / Manager first / Pulse alone | Quarter-on-quarter move. A pulse move under 3 points counts as steady. A manager move counts from 0.2. A manager score hidden for too few answers counts as no move. |
| Going quiet | Response fell 15 points or more over three quarters, or the latest response is under 60% on either survey. |
| Pay and eNPS | Compa-ratio at or below 0.93 and eNPS at or below the company level, or down 10 points over two quarters. |
| Look beyond pay | Compa-ratio at or above 1.05 with at most 10% of the team under 0.90, and eNPS low or falling. |
| Ratings high / low | Average rating differs from the company average by 0.35 or more. A prompt for calibration, not a status. |
| Exit cluster | At least 3 exits in 12 months and 60% or more at one tenure point. When the regretted split by tenure is provided, each regretted exit counts as many times as the weight setting (default 2) when finding the cluster. |
| Turnover high | Exits in 12 months, as a share of headcount, are above the reference (default 15%) even at the low end of a 95% range for the exit count. When regretted exits are provided, each one counts as many times as the weight setting (default 2). |
| Too few exits to call | The rate is more than 5 points over the reference but the range includes it. Shown, but not counted in the status. |
| New manager | 30% or more of the team had a manager change in 6 months, or the manager has been in role under 3 months. |
| Stalled promotions | 40% or more of top-rated people with no promotion or pay change in 18 months or more. |
| Heavy load | The workload index is 55 or more. It averages whichever of these exist, each scaled 0 to 100: open roles (20% is 100), overtime (15 hours is 100), leave not taken (40% is 100), and 100 minus the share who can sustain their pace. Exits are left out because they have their own flag. |
| Wide span | One manager has 12 or more direct reports. |

## Status

One status per team, in this order:

1. **Act**: pulse and manager score both down, or the pulse falling, or an exit cluster.
2. **Slipping**: one score has moved, response is falling, or a pay, turnover or look-beyond-pay flag fired.
3. **Watch**: two or more of new manager, stalled promotions, heavy load, wide span, and none of the above.
4. **Stable**: otherwise.

The early signals never raise a separate alarm. They only decide the status when nothing else has fired. The four are treated as separate groups (people change, career, load, structure) and each is counted once.

## Guards against small numbers

- Teams under the minimum group size (default 5) are hidden and left out of every figure.
- A team's manager score is hidden below a minimum number of answers (default 6).
- Exit counts carry a 95% range (a Poisson interval).
- A pulse move smaller than the survey's margin of error (80% confidence, with a correction because most of the team answered) is tagged "within margin".
- Every correlation carries a 95% range from a Fisher transformation. It treats each team-quarter as independent, which they are not, so it is too narrow.
- Counts under 3 in a tenure split are shown as `<3`.

## Pair of surveys

The "does the manager score move first?" card correlates quarter-to-quarter manager score changes with pulse changes in the same quarter and the next. It is a question to test, not a result.

## Pay

Compa-ratio against pulse and eNPS across teams, with a best-fit line. Teams far from the line (8 eNPS points or more) are listed. Teams with low or falling eNPS are sorted into: pay may be a factor, look beyond pay, and unclear.

## Equity view

For teams where both groups meet the minimum size: pay gap (women's compa-ratio under men's), promotion rate ratio, exit rate ratio, pulse gap and response gap. Flags: pay gap at or above 5% (the line the EU Pay Transparency Directive uses for a joint pay assessment; check the exact test with legal), promotion ratio under 0.8 with at least 3 promotions (the four-fifths rule of thumb), exit ratio of 1.5 or more with at least 3 exits, pulse gap of 8 points, response gap of 15 points. It never changes a team's status.

## Drivers

Correlation of each of six pulse items with the plan-to-stay question across teams, with a 95% range. For the selected team, the items furthest below the company that also correlate most with staying are listed as places to start. Items that move together make the ranking weak evidence, and correlation is not cause.

## Regretted exits

An exit is regretted when the team wanted to keep the person. The count comes from `regretted_exits` in quarterly.csv, or from the four `reg_` columns in exits_by_tenure.csv. If both are given they should agree.

- **Weight.** Weighted exits = other exits + weight × regretted exits. The weight is a setting from 1 to 4, default 2. At 1 every exit counts once, and with no regretted data the weight changes nothing. The default is a judgment, not a measured value.
- **Turnover.** The weighted count over headcount is compared with the reference. The plausible range treats the weighted count as a scaled Poisson count with the same mean and variance (variance = other exits + weight² × regretted exits). It is an approximation, and a flag needs the whole range above the reference.
- **Exit cluster.** The 60% rule is applied to weighted exits per tenure band, so a cluster of regretted exits at one point shows up sooner than a cluster of other exits.
- **Tenure bands.** Regretted exits are shown inside each band, for the team and for all visible teams together. Counts under 3 are shown as <3.
- **Not weighted.** The cost of exits and the backtest use plain counts. The backtest adds the regretted exits as a separate line.

## Cost of exits

Exits in 12 months × average pay × an assumed share (default 50%). The share is an assumption. Regretted exits are shown apart. The weight on regretted exits does not change the cost.

## Backtest

For each of the two quarters that have a following quarter, a team is "flagged" if its pulse fell 3 points or more, its manager score fell by the threshold, or its pace item fell 5 points or more. The page compares exits per 100 people in the next quarter for flagged and other teams. This version reads four quarters, so this is a first look.

## Thresholds from the data

"Set from the data" measures the usual quarter-to-quarter move across all visible teams with a robust spread (median absolute deviation), and sets the pulse and manager lines at twice the usual move. It sets the workload and stalled-promotion lines at the top quarter of teams. Those lines will always flag some teams, even in a healthy company.
