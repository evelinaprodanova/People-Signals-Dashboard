// Run with: node tests/run.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let failed = 0;
const ok = (cond, name) => { console.log((cond ? 'ok   ' : 'FAIL ') + name); if (!cond) failed++; };

const D = require(path.join(root, 'src/data.js'));
const demo = {}; for (const k of Object.keys(D.SCHEMA)) demo[k] = read('demo-data/' + D.SCHEMA[k].file);

// 1. the demo data loads cleanly with every view on
let r = D.build(demo);
ok(r.ok && r.errors.length === 0, 'demo data loads with no errors');
ok(r.warnings.length === 0, 'demo data loads with no warnings');
ok(Object.values(r.dataset.has).every(Boolean), 'every optional view is switched on for the demo');
ok(r.dataset.teams.length === 15 && r.dataset.quarters.length === 4, 'demo has 15 teams and 4 quarters');

// 2. templates are valid files (header + one example)
const tpl = {}; for (const k of Object.keys(D.SCHEMA)) tpl[k] = read('templates/' + D.SCHEMA[k].file);
r = D.build(tpl);
ok(r.ok, 'the templates load as they are: ' + r.errors.join(' | '));

// 3. only the two required files
r = D.build({ teams: demo.teams, quarterly: demo.quarterly });
ok(r.ok && !r.dataset.has.eq && !r.dataset.has.items && !r.dataset.has.tenure, 'two files are enough; the optional views stay off');

// 4. errors are specific
r = D.build({ teams: demo.teams });
ok(!r.ok && /quarterly.csv.*required/.test(r.errors[0]), 'a missing required file is reported');
r = D.build({ teams: 'team,people\nA,5', quarterly: demo.quarterly });
ok(!r.ok && /missing column.*headcount/.test(r.errors.join()), 'a missing column is named');
r = D.build({ teams: demo.teams, quarterly: demo.quarterly.replace('Platform Engineering,Q4 25,78', 'Platform Engineering,Q4 25,178') });
ok(!r.ok && /pulse_favorable is 178/.test(r.errors.join()), 'a value outside its range is reported with its row');
r = D.build({ teams: demo.teams, quarterly: demo.quarterly.replace('Platform Engineering,Q4 25,78,88,4.1', 'Platform Engineering,Q4 25,abc,88,4.1') });
ok(!r.ok && /not a number/.test(r.errors.join()), 'text in a number column is reported');
r = D.build({ teams: demo.teams, quarterly: demo.quarterly + 'Ghost Team,Q3 26,70,80,4,80,10,60,0,0\n' });
ok(!r.ok && /Ghost Team.*not in teams.csv/.test(r.errors.join()), 'a team missing from teams.csv is reported');
r = D.build({ teams: demo.teams, quarterly: demo.quarterly.split('\n').filter(l => !/^Sales,Q2 26/.test(l)).join('\n') });
ok(!r.ok && /Sales.*last 4 quarters/.test(r.errors.join()), 'a team with a missing quarter is reported');

// 5. European exports: semicolons and decimal commas
const euro = demo.quarterly.split('\n').map(l => l.split(',').map(c => c.replace('.', ',')).join(';')).join('\n');
r = D.build({ teams: demo.teams, quarterly: euro });
ok(r.ok && r.dataset.teams[0].mgr[0] === 4.1, 'semicolon files with decimal commas are read');

// 6. quoted text and a byte order mark
const q = D.parseCSV('﻿team,comment\n"A","He said ""hello"", then left"\n');
ok(q.rows[0].comment === 'He said "hello", then left', 'quotes and a byte order mark are handled');

// 7. the page renders with the full demo, and with only the required files
function runApp(files) {
  const sandbox = { console };
  vm.createContext(sandbox);
  const els = require('./dom-stub.js')(sandbox);
  vm.runInContext(read('src/data.js'), sandbox);
  sandbox.PS_DEMO = files; sandbox.PS_TEMPLATES = {};
  vm.runInContext(read('src/app.js'), sandbox);
  return { els, text: k => (els[k].innerHTML || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() };
}
let sb;
try { sb = runApp(demo); ok(true, 'the page renders with the demo data'); ok(sb.text('stats').includes('Act / Slipping / Watch 3 / 2 / 1'), 'the demo gives 3 Act, 2 Slipping, 1 Watch'); } catch (e) { ok(false, 'the page renders with the demo data: ' + e.message); }
try {
  sb = runApp({ teams: demo.teams, quarterly: demo.quarterly });
  ok(true, 'the page renders with only the two required files');
  ok(sb.els.rows.innerHTML.length > 500, 'the team table has rows');
  ok(sb.els.equity.innerHTML === '' && sb.els.drivers.innerHTML === '', 'views whose files are missing stay empty');
} catch (e) { ok(false, 'the page renders with only the required files: ' + e.message); }
try {
  const bare = 'team,headcount\n' + demo.teams.split('\n').slice(1).filter(Boolean).map(l => l.split(',').slice(0, 2).join(',')).join('\n');
  sb = runApp({ teams: bare, quarterly: demo.quarterly });
  ok(true, 'the page renders with headcount only in teams.csv');
} catch (e) { ok(false, 'the page renders with headcount only: ' + e.message); }


// 9. team names and comments are escaped before they reach the page
try {
  const evil = '<img src=x onerror=alert(1)>&';
  const t2 = demo.teams.replace(/Platform Engineering/g, evil), q2 = demo.quarterly.replace(/Platform Engineering/g, evil);
  const it = demo.items.replace(/Platform Engineering/g, evil), gr = demo.groups.replace(/Platform Engineering/g, evil);
  const ex = demo.exits_by_tenure.replace(/Platform Engineering/g, evil);
  const cm = demo.comments.replace(/Platform Engineering/g, evil).replace('Two releases', '<script>alert(2)</script> Two releases');
  const sb2 = runApp({ teams: t2, quarterly: q2, items: it, groups: gr, exits_by_tenure: ex, comments: cm });
  const all = Object.values(sb2.els).map(e => e.innerHTML).join('');
  ok(!/<img src=x|<script>alert/.test(all) && /&lt;img/.test(all), 'HTML in team names and comments is shown as text, never as markup');
} catch (e) { ok(false, 'escaping test: ' + e.message); }

// 8. no network requests anywhere in the code
const code = read('index.html') + read('src/app.js') + read('src/data.js');
ok(!/(fetch\(|XMLHttpRequest|sendBeacon|WebSocket|https?:\/\/(?!www\.w3\.org))/.test(code.replace(/https?:\/\/(github\.com|opensource\.org)[^\s"'<]*/g, '')), 'the code contains no network calls or external links');

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
