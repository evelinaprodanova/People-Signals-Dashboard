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

// 5b. cells pasted from a spreadsheet are tab-separated, and the page's AI prompts match the templates
const tabs = s => s.split('\n').map(l => l.split(',').join('\t')).join('\n');
r = D.build({ teams: tabs(demo.teams), quarterly: tabs(demo.quarterly) });
ok(r.ok && r.dataset.teams.length === D.build({ teams: demo.teams, quarterly: demo.quarterly }).dataset.teams.length, 'cells pasted from a spreadsheet (tab-separated) are read');
{
  const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const page = unesc(read('index.html')), guide = read('docs/PREPARE_WITH_AI.md');
  const names = ['teams', 'quarterly', 'exits_by_tenure', 'items', 'groups', 'comments'];
  const miss = names.filter(n => { const hd = read('templates/' + n + '.csv').split('\n')[0].trim(); return !page.includes('Header row: ' + hd) || !guide.includes('Header row: ' + hd); });
  ok(!miss.length, 'both AI prompts list the exact header of every template' + (miss.length ? ' (out of date: ' + miss.join(', ') + ')' : ''));
  const pr = /<pre class="prompt" id="promptA"[^>]*>([\s\S]*?)<\/pre>/.exec(page);
  ok(pr && guide.includes(pr[1]), 'the prompt on the page is the same text as in docs/PREPARE_WITH_AI.md');
}

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
  return { els, sandbox, text: k => (els[k].innerHTML || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() };
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


// 9. regretted exits: validation, tenure split, and the heavier weight
{
  const exT = (fn) => demo.exits_by_tenure.split('\n').map((l, i) => i === 0 || !l ? l : fn(l.split(','))).join('\n');
  let r2 = D.build(Object.assign({}, demo, { exits_by_tenure: exT(c => c[0] === 'Sales' ? [c[0], c[1], c[2], c[3], c[4], '3', '0', '0', '0'].join(',') : c.join(',')) }));
  ok(!r2.ok && /regretted count is larger than the exits in the same tenure band/.test(r2.errors.join()), 'a regretted count above the exits in its band is rejected');
  const partial = exT(c => c.slice(0, 6).join(',')).replace('reg_m6_12,reg_m12_18,reg_over_18', '').replace(/,+$/gm, '');
  r2 = D.build(Object.assign({}, demo, { exits_by_tenure: partial }));
  ok(r2.ok && !r2.dataset.has.regTenure && /only some of the regretted columns/.test(r2.warnings.join()), 'only some regretted columns: warned, and the split is switched off');
  ok(D.build(demo).dataset.has.regTenure === true, 'the demo has the regretted split by tenure');
  const noQ = demo.quarterly.split('\n').map(l => l.split(',').slice(0, 9).join(',')).join('\n');
  r2 = D.build(Object.assign({}, demo, { quarterly: noQ }));
  ok(r2.ok && r2.dataset.has.regretted && r2.dataset.teams.find(t => t.n === 'Platform Engineering').xr === 3, 'regretted exits are taken from the tenure file when quarterly.csv has none');
  /* a cluster that only shows up when regretted exits count more */
  const qa = Object.assign({}, demo, { exits_by_tenure: exT(c => c[0] === 'Quality Assurance' ? [c[0], c[1], c[2], c[3], c[4], '0', '0', '0', '1'].join(',') : c.join(',')) });
  const sbw = runApp(qa);
  const hasCliff = rw => vm.runInContext(`(function(){const s=Object.assign(state(),{rw:${rw}});return analyse(TEAMS.filter(t=>t.hc>=s.min),s).find(r=>r.t.n==='Quality Assurance').f.some(x=>x.k==='cliff')})()`, sbw.sandbox);
  ok(!hasCliff(1) && hasCliff(2), 'a regretted exit counts more: the exit cluster appears at weight 2 and not at weight 1');
  const rateAt = rw => vm.runInContext(`(function(){const s=Object.assign(state(),{rw:${rw}});return analyse(TEAMS.filter(t=>t.hc>=s.min),s).find(r=>r.t.n==='Sales').rate})()`, sbw.sandbox);
  const plain = vm.runInContext(`(function(){const t=TEAMS.find(t=>t.n==='Sales');return exits(t)/t.hc*100})()`, sbw.sandbox);
  ok(rateAt(2) > rateAt(1) && Math.abs(rateAt(1) - plain) < 1e-9, 'weighted turnover rises with the weight, and weight 1 is the plain rate');
  const noReg = Object.assign({}, demo, { quarterly: noQ, exits_by_tenure: exT(c => c.slice(0, 5).join(',')).replace(/,reg_[^\n]*/, '') });
  const sbn = runApp(noReg);
  const same = vm.runInContext(`(function(){const a=analyse(TEAMS.filter(t=>t.hc>=5),Object.assign(state(),{rw:1})),b=analyse(TEAMS.filter(t=>t.hc>=5),Object.assign(state(),{rw:3}));return a.every((x,i)=>x.rate===b[i].rate&&x.status===b[i].status)})()`, sbn.sandbox);
  ok(same && vm.runInContext('HAS.regretted', sbn.sandbox) === false, 'with no regretted data the weight changes nothing');
  ok(/regretted/.test(sbw.text('facts')) && /regretted/.test(sbw.text('cost')), 'the page shows regretted exits in the team detail and in the tenure bars');
}

// 9b. one-team view, equity third group, action plan title
{
  const r = runApp(demo);
  const one = r.text('one');
  ok(/Platform Engineering/.test(one) && /against the company/.test(one) && !/Field Deployment/.test(one), 'the one-team view shows the chosen team against the company and no other team');
  ok(!/Equity lens|Women \/ men/.test(one), 'the one-team view leaves out the equity view');
  const eq = r.text('equity');
  ok(/Other or not stated/.test(eq) && /Three groups/.test(eq), 'the equity view shows a third group (other or not stated), pooled');
  ok(/Action plan - Follow through/.test(r.text('actions')), 'the action card is titled Action plan - Follow through');
  const sbx = r.sandbox;
  const tiny = vm.runInContext(`(function(){const s=Object.assign(state(),{min:5});const vis=TEAMS.filter(t=>t.hc>=s.min);return vis.reduce((q,t)=>q+t.eq.o,0)})()`, sbx);
  ok(tiny === 5, 'the demo has 5 people in the third group across visible teams');
}

// 10. every flag has a plain-language explanation, and the table filter works
{
  const app = read('src/app.js');
  const tags = [...app.matchAll(/tag:'([^']+)'/g)].map(m => m[1]).concat(['Ratings high', 'Ratings low']);
  const sbx = runApp(demo).sandbox;
  const known = vm.runInContext('Object.keys(SIG_TIP)', sbx);
  const missing = [...new Set(tags)].filter(x => !known.includes(x.toLowerCase()));
  ok(!missing.length, 'every signal the page can raise is explained in the legend' + (missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''));
  const counts = vm.runInContext(`(function(){const s=state(),res=analyse(TEAMS.filter(t=>t.hc>=s.min),s),o={};['all','act','slip','watch','stable'].forEach(k=>{FILTER=k;o[k]=viewRows(res).length});FILTER='all';QUERY='data';o.q=viewRows(res).length;QUERY='';SORT={k:'team',dir:1};o.first=viewRows(res)[0].t.n;SORT={k:null,dir:1};return o})()`, sbx);
  ok(counts.all === 14 && counts.act === 3 && counts.slip === 2 && counts.watch === 1 && counts.stable === 8 && counts.q === 1 && counts.first === 'Applied Robotics', 'the Teams table filters by status, searches by name and sorts');
}

// 11. no element id is used twice (a link or a lookup would hit the wrong one)
{
  const ids = [...read('index.html').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  ok(!dup.length, 'no id is used twice in index.html' + (dup.length ? ' (' + dup.join(', ') + ')' : ''));
}

// 8. no network requests anywhere in the code
const code = read('index.html') + read('src/app.js') + read('src/data.js');
ok(!/(fetch\(|XMLHttpRequest|sendBeacon|WebSocket|https?:\/\/(?!www\.w3\.org))/.test(code.replace(/https?:\/\/(github\.com|opensource\.org)[^\s"'<]*/g, '')), 'the code contains no network calls or external links');

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
