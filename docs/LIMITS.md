# Limits and blind spots

Read this before you use the tool on real data. The page shows the ten limits that matter most; all 31 are listed here.

## What it is not

- **Not validated.** The signals and thresholds are reasoned, not tested against real exits. On the demo data they work because the data was built to show them.
- **Not a predictor.** A status is a prompt for a conversation. It does not say anyone will leave.
- **Not a verdict on people.** Never use it to judge a manager or a team. Manager scores are for offering support.
- **Not a compliance tool.** It cannot tell you whether your use is lawful. That depends on your country, your employees' notice, your purpose and your agreements.

## The ten that matter most

These are the ones shown on the page.

- **Untested on real data** *(Evidence)* The signals and thresholds are reasoned, not validated. On the demo data they work because it was built to show them. Whether they predict anything real is untested. Use the page to look at team data in a structured way, not as a prediction.
- **Small numbers are noisy** *(Statistics)* On a team of eight, one exit is 12.5% turnover. Hiding small teams protects privacy but hides places where trouble can sit. The page shows ranges, calls turnover high only when the whole range is above the reference, and tags a pulse move smaller than the margin of error.
- **Even team data can identify people** *(Privacy and law)* Filter by team, then tenure, then location, and a group of two appears. In the EU this needs a stated purpose, limited access, retention rules and sometimes a works council. Employees should know what is measured and why. Counts under 3 show as <3. A real build must also block combinations of cuts.
- **Manager scores on few reports** *(Privacy and fairness)* A manager with four reports can be identified from the score, and one unhappy person moves it a lot. The page hides a manager score below a minimum number of answers and drops it from every flag. Use scores to offer support, not to judge.
- **Equity data is sensitive** *(Privacy and law)* These cuts identify people fastest. They need a stated purpose, a data protection assessment, tight access and, in some countries, works council involvement. They stay with the people responsible for fairness, not line leaders.
- **Non-response is handled, not solved** *(Bias)* Response rates, ranges and the slider make the gap visible. They cannot tell me who stayed silent or why. A real version would compare who answered with who did not, by tenure, location and level.
- **Compa-ratio is not the same as fair pay** *(Pay data)* A low ratio can come from a recent promotion round or poor market data for a niche role. A high one can hide a gap inside the team. Level, location and tenure all move it. Use it to decide where to look first, as a question for Total Rewards, not as a pay equity review.
- **A warning can become a label** *(Behaviour)* A team marked early warning can be treated as a problem before anything is wrong, and a manager can be judged by it. The flag is a prompt to ask.
- **"Regretted" is a judgment** *(Definition)* It depends on who decides, and when, and can reflect bias in who managers want to keep. Counts inside one tenure band are very small, so they show as <3 below three. The weight of 2 is my judgment. Agree the definition before the first count.
- **It does not show whether the action worked** *(Scope)* The follow-through card logs an owner, action and date for each flag and compares the team's status then and now. In the demo it lives in your browser. A real version needs shared storage and a record of changes. It still cannot say the action caused the change.

## The other 21

Shorter-lived or narrower, but worth knowing before you rely on a number.

- **Thresholds from the data are relative** *(Statistics)* A line set from what is normal across teams beats a guess, but it flags the top quarter even when everyone is fine, and treats a bad year as normal if every team had one. Add absolute floors from past exits. The defaults are my judgment, not a standard.
- **The backtest is a first look, not a result** *(Evidence)* Four quarters give two test windows, and only signals with a history can be tested. The demo exits are invented. A real backtest needs many more quarters, a range on every rate, and quarters held aside.
- **Some leading signals are still missing** *(Coverage)* Manager changes, promotions and load are in. Still out: internal moves, reorgs and layoffs, how recently pay was reviewed, and whether earlier flags were acted on. This is an early warning, not a prediction.
- **Two surveys, same people** *(Method)* The same person answers both, so their mood on the day can colour both and inflate the link between manager score and pulse. Question order can too. I would vary the order and treat the link as softer than it looks.
- **Survey fatigue** *(Behaviour)* Two surveys a quarter is more to ask. If response drops, the picture weakens. Keep them short, and let people see something change because of their answers.
- **Across-team links rest on few teams** *(Statistics)* With few teams and quarters, one team can swing a correlation. Each carries a 95% range, which is too narrow because team-quarters are not independent. The numbers show a pattern worth a question, not that managers cause the other results. The cause can run the other way.
- **People feel pay, not ratios** *(Perception)* Most people do not know their compa-ratio. What drives eNPS is what they believe about fairness and hear from peers and recruiters. The link between actual pay and engagement is often weaker than leaders expect, and this tool will show that if it is true.
- **Pay data is sensitive and slow** *(Governance)* It needs Total Rewards' agreement and strict access, and in the EU care around pay transparency rules. It changes at review cycles, so it is a snapshot beside quarterly scores.
- **Early signals are proxies** *(Measurement)* Overtime, open roles and leave not taken stand in for workload. They miss unrecorded effort and can reflect habits, not load. The pace question in the pulse is the check.
- **Early signals still overlap** *(Statistics)* A manager change often arrives with a reorg, which arrives with a heavy quarter. I count each group once and keep exits out of the load index, which reduces double counting but does not remove it. A real test must show each signal adds something on its own.
- **A gap between groups is not proof** *(Equity)* Level, role, tenure and location can create a gap with no unfair treatment, and a pooled figure can hide a gap inside a team. Small groups give noisy rates. The view uses one attribute and two groups. It is a prompt for a proper analysis by the people who own pay.
- **Items that move together** *(Statistics)* A strong team scores well on every pulse item, so they all link with plans to stay. The ranking is weak evidence and cannot show cause. It needs person-level data, kept confidential, and a method that separates overlapping items.
- **Cost is an assumption** *(Measurement)* A flat share of a year's pay per exit ignores role, seniority, lost knowledge and how long the role stays empty. It shows scale, not a forecast.
- **Span is not quality** *(Interpretation)* A wide span can work for experienced people doing similar work, and a narrow one often means a manager doing the work too. Only widest and average are shown, so no single manager's team can be picked out.
- **Activity data crosses a line** *(Privacy)* After-hours messages or calendar load would measure workload more directly, but they turn a team tool into surveillance and need legal and employee-representative agreement. I left them out on purpose.
- **Public benchmarks are coarse** *(Context)* Industry turnover ignores company stage, role mix, country and seniority. A robotics team in Sofia and a sales team in London have different normal rates. The benchmark is a reference point, not a verdict.
- **A rating gap can be fair** *(Interpretation)* A team may rate higher because it performs higher. The flag asks for a look in calibration, not a verdict on the manager.
- **People adjust once measured** *(Behaviour)* If managers learn that a rating gap or manager score draws attention, answers and ratings drift to the middle, and a pulse score that becomes a target gets managed. Sharing the brief widely, or tying it to reviews, makes this worse.
- **Text analysis can mislead** *(AI)* A model can invent themes, miss sarcasm, or handle other languages poorly. It would read comments for a person to check, never as the last step.
- **Real systems are harder** *(Engineering)* This page does not connect to an HRIS or a survey tool, handle access rights, or deal with messy exports. That work is real and I have not shown it here.
- **Tools like this already exist** *(Position)* Survey and people-analytics platforms already offer much of this. The value of a project like mine is the judgment in what to show, what to hide and what to leave to people, not the features.

## What it does not cover

Why people left, internal moves, reorgs and layoffs on the timeline, hiring and onboarding data, key-person risk, business outcomes, external benchmarks, role-based access, shared action tracking, and connections to an HRIS or survey tool.

## Before you rely on it

1. Test each signal against past exits, hold some quarters aside, and drop the ones that do not hold up.
2. Agree purpose, access and retention with legal and employee representatives.
3. Start with one leader and one quarter, then ask whether the page changed what they did.
