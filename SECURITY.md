# Security and data

People Signals runs entirely in the browser. It does not send data anywhere, and `tests/run.js` checks that the code contains no network calls.

If you find a way for data to leave the page, or a way a crafted CSV can run code, please open an issue marked "security" without including any real data.

The follow-through log can be downloaded as CSV. Text that starts with `=`, `+`, `-` or `@` is prefixed so a spreadsheet will not treat it as a formula.
