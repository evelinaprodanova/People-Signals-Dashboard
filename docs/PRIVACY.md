# Privacy

## What the tool does with data

- It reads the files you choose, in your browser, on your computer.
- It makes no network requests. There are no fonts, scripts, analytics or images loaded from elsewhere. `tests/run.js` checks the code for network calls.
- It stores nothing. With your own data, even the action plan log is kept in memory only and disappears when you reload the page. Only the demo remembers its practice entries, in your browser's local storage.
- You can download the action plan log as a CSV. That file is then yours to protect.

Feedback goes through a link, not through the page. The Feedback button opens a form on GitHub, where it is public and tied to the visitor's GitHub account. The page does not send, store or read anything about it. Please do not put real employee data in feedback.

## What you are responsible for

The tool being local does not remove your obligations. Before loading real people data:

- **Purpose and legal basis.** Write down why you are measuring, and what decisions the results will and will not be used for.
- **Notice.** Tell employees what is measured and why. In some countries a works council or employee representatives must agree.
- **Data protection assessment.** In the EU, analysis of employee data at this level usually calls for one. The equity view needs particular care.
- **Access.** Decide who can see what. Line leaders should not see the equity view. Nobody should see a ranked list of other leaders' teams.
- **Retention.** Delete the files you loaded once you no longer need them. Do not keep real data in a shared folder, an email thread or this repository.
- **Team level only.** Use one row per team. Teams under the minimum group size are hidden, but the files you load still contain them, so protect the files too.

This is general information, not legal advice.

## Design choices that protect people

- No individual-level data or predictions.
- Minimum group sizes, a separate minimum for manager scores, and `<3` for small cells.
- Only the widest and average manager span are shown, never one per manager.
- The action plan log asks for a role as owner, not a name, and warns against employee names.
