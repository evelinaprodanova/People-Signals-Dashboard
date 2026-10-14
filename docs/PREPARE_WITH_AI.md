# Prepare your files with an AI assistant

The tool reads six small CSV files. If your data sits in an HR system export or a survey export, an AI assistant can do the reshaping for you. Two ways, from safest to fastest.

**Read this first.** If you give an assistant your data, the data leaves your computer and goes to that provider. People Signals itself never sends anything anywhere, but the assistant does. Use one your company has approved, remove names and anything that identifies a person, and prefer team totals to person-level rows where you can. If in doubt, use Way 1.

## Way 1: share only the column names (safest)

Paste the prompt below into your assistant, then paste only the column names of your export, and optionally two invented example rows. The assistant writes the formulas or a script. You run them on your own computer, so the data never leaves it.

```text
I am preparing data for People Signals, a free tool that reads team-level CSV files in the browser. I will not share my data itself. I will give you only the column names of my export, and you will write the spreadsheet formulas, or a short Python script, that I can run on my own computer to build the files below. Do not ask me for the data.

RULES
1. One row per team (or per team and quarter). Never one row per person. Work out each team figure from my data. Do not copy person-level rows into any file.
2. Use exactly the column names given, in the order given.
3. Percentages are plain numbers from 0 to 100, with no % sign. Use a decimal point, not a comma.
4. Leave a cell empty when my data does not have the figure. Never invent or estimate a number.
5. Spell each team name exactly the same in every file.
6. If a definition is unclear, for example which survey questions count as the pulse, ask me before you guess.

FILES (create only the ones my data supports)

1. teams.csv (required). One row per team.
Header row: team,headcount,rating_1,rating_2,rating_3,rating_4,rating_5,compa_ratio,share_below_090,avg_salary,manager_spans,manager_change_pct,manager_months,stalled_promo_pct,open_roles_pct,overtime_hours,leave_unused_pct
- team: team name. headcount: people in the team.
- rating_1 to rating_5: percent of the team at each performance rating, 1 is lowest.
- compa_ratio: average pay divided by the market midpoint for the role, for example 0.95.
- share_below_090: percent of the team with a compa-ratio under 0.90.
- avg_salary: average annual pay per person.
- manager_spans: direct reports of each people manager in the team, separated by semicolons, for example 8;6;5.
- manager_change_pct: percent of the team whose manager changed in the last 6 months.
- manager_months: months the current manager has been in role.
- stalled_promo_pct: percent of top-rated people with no promotion or pay change in 18 months or more.
- open_roles_pct: open roles as a percent of headcount.
- overtime_hours: overtime hours per person per month. Empty if not tracked.
- leave_unused_pct: percent of expected leave not taken.

2. quarterly.csv (required). One row per team per quarter, for the last four quarters. Every team needs all four.
Header row: team,quarter,pulse_favorable,pulse_response,manager_score,manager_response,enps,pace_favorable,exits,regretted_exits
- quarter: a label such as Q3 26.
- pulse_favorable: percent of pulse answers that were favorable. pulse_response: percent of the team that answered the pulse.
- manager_score: average on the manager survey, from 1 to 5. manager_response: percent of the team that answered it.
- enps: employee net promoter score, from -100 to 100.
- pace_favorable: percent who agree "I can sustain my current pace".
- exits: people who left the team in the quarter. regretted_exits: of those, how many the team wanted to keep (optional, never more than exits).

3. exits_by_tenure.csv (optional). One row per team.
Header row: team,under_6m,m6_12,m12_18,over_18,reg_under_6m,reg_m6_12,reg_m12_18,reg_over_18
- under_6m, m6_12, m12_18, over_18: exits in the last 12 months, by how long the person had been in the company when they left. Should add up to the four quarters of exits.
- reg_under_6m, reg_m6_12, reg_m12_18, reg_over_18 (optional, all four or none): of those exits, how many were people the team wanted to keep (regretted), in the same bands. Never more than the exits in that band. Ask me how "regretted" is defined before you count.

4. items.csv (optional). One row per team, latest quarter.
Header row: team,growth_career,workload_pace,manager_support,tools_process,recognition,pay_fairness,plan_to_stay
- Percent of answers that were favorable on each pulse item. plan_to_stay is "I plan to be here in a year".

5. groups.csv (optional, only if I ask for the equity view). One row per team.
Header row: team,women,other,promoted_women,promoted_men,exits_women,exits_men,compa_women,compa_men,pulse_women,pulse_men,response_women,response_men,promoted_other,exits_other,compa_other,pulse_other,response_other
- women: number of women in the team. other: number of people who are another gender or have not said (0 if none). Never guess anyone's gender.
- promoted_women, promoted_men, exits_women, exits_men: counts over the last 12 months.
- promoted_other, exits_other, compa_other, pulse_other, response_other: the same figures for the people counted in other. Leave them empty when other is 0.
- compa_women, compa_men: average compa-ratio. pulse_women, pulse_men: percent favorable. response_women, response_men: percent who answered.

6. comments.csv (optional). One survey comment per row.
Header row: team,comment
- Remove names and anything that could identify a person before writing a comment.

WHAT I NEED FROM YOU
Explain each step in plain language, say which of my columns you used for each figure, and tell me which figures my columns cannot give. Where a figure needs a choice (for example which survey questions count as the pulse), ask me first.

MY COLUMN NAMES
[paste the column names of your export here, and, if it helps, two invented example rows]
```

## Way 2: attach the data (fastest)

Attach your export and paste this prompt. Check the answer before you use it: ask the assistant to show its working for two teams, and compare those two against your own numbers.

```text
I am preparing data for People Signals, a free tool that reads team-level CSV files in the browser. Please turn the data I have attached into the files described below.

RULES
1. One row per team (or per team and quarter). Never one row per person. Work out each team figure from my data. Do not copy person-level rows into any file.
2. Use exactly the column names given, in the order given.
3. Percentages are plain numbers from 0 to 100, with no % sign. Use a decimal point, not a comma.
4. Leave a cell empty when my data does not have the figure. Never invent or estimate a number.
5. Spell each team name exactly the same in every file.
6. If a definition is unclear, for example which survey questions count as the pulse, ask me before you guess.

FILES (create only the ones my data supports)

1. teams.csv (required). One row per team.
Header row: team,headcount,rating_1,rating_2,rating_3,rating_4,rating_5,compa_ratio,share_below_090,avg_salary,manager_spans,manager_change_pct,manager_months,stalled_promo_pct,open_roles_pct,overtime_hours,leave_unused_pct
- team: team name. headcount: people in the team.
- rating_1 to rating_5: percent of the team at each performance rating, 1 is lowest.
- compa_ratio: average pay divided by the market midpoint for the role, for example 0.95.
- share_below_090: percent of the team with a compa-ratio under 0.90.
- avg_salary: average annual pay per person.
- manager_spans: direct reports of each people manager in the team, separated by semicolons, for example 8;6;5.
- manager_change_pct: percent of the team whose manager changed in the last 6 months.
- manager_months: months the current manager has been in role.
- stalled_promo_pct: percent of top-rated people with no promotion or pay change in 18 months or more.
- open_roles_pct: open roles as a percent of headcount.
- overtime_hours: overtime hours per person per month. Empty if not tracked.
- leave_unused_pct: percent of expected leave not taken.

2. quarterly.csv (required). One row per team per quarter, for the last four quarters. Every team needs all four.
Header row: team,quarter,pulse_favorable,pulse_response,manager_score,manager_response,enps,pace_favorable,exits,regretted_exits
- quarter: a label such as Q3 26.
- pulse_favorable: percent of pulse answers that were favorable. pulse_response: percent of the team that answered the pulse.
- manager_score: average on the manager survey, from 1 to 5. manager_response: percent of the team that answered it.
- enps: employee net promoter score, from -100 to 100.
- pace_favorable: percent who agree "I can sustain my current pace".
- exits: people who left the team in the quarter. regretted_exits: of those, how many the team wanted to keep (optional, never more than exits).

3. exits_by_tenure.csv (optional). One row per team.
Header row: team,under_6m,m6_12,m12_18,over_18,reg_under_6m,reg_m6_12,reg_m12_18,reg_over_18
- under_6m, m6_12, m12_18, over_18: exits in the last 12 months, by how long the person had been in the company when they left. Should add up to the four quarters of exits.
- reg_under_6m, reg_m6_12, reg_m12_18, reg_over_18 (optional, all four or none): of those exits, how many were people the team wanted to keep (regretted), in the same bands. Never more than the exits in that band. Ask me how "regretted" is defined before you count.

4. items.csv (optional). One row per team, latest quarter.
Header row: team,growth_career,workload_pace,manager_support,tools_process,recognition,pay_fairness,plan_to_stay
- Percent of answers that were favorable on each pulse item. plan_to_stay is "I plan to be here in a year".

5. groups.csv (optional, only if I ask for the equity view). One row per team.
Header row: team,women,other,promoted_women,promoted_men,exits_women,exits_men,compa_women,compa_men,pulse_women,pulse_men,response_women,response_men,promoted_other,exits_other,compa_other,pulse_other,response_other
- women: number of women in the team. other: number of people who are another gender or have not said (0 if none). Never guess anyone's gender.
- promoted_women, promoted_men, exits_women, exits_men: counts over the last 12 months.
- promoted_other, exits_other, compa_other, pulse_other, response_other: the same figures for the people counted in other. Leave them empty when other is 0.
- compa_women, compa_men: average compa-ratio. pulse_women, pulse_men: percent favorable. response_women, response_men: percent who answered.

6. comments.csv (optional). One survey comment per row.
Header row: team,comment
- Remove names and anything that could identify a person before writing a comment.

WHEN YOU FINISH
Give each file in its own code block, with the file name above it, ready to save as a .csv file. After the files, list in plain words: what you assumed, which columns you left empty and why, and any team with fewer than 5 people.
```

## After you have the files

1. Save each answer as a `.csv` file, or copy the cells and paste them into the box on the page (the Paste button next to each file).
2. Press "Check and load my files". The page reports what is wrong, row by row.
3. Look at the settings and the numbers for two teams you know well. If they do not match what you expect, the file is wrong before the tool is.
