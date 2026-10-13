/* People Signals: reading and checking the CSV files.
   Pure functions, no page access, so they can be tested in Node.
   Nothing here makes a network request. */
(function (root) {
  'use strict';

  /* ---------- CSV ---------- */
  function detectDelimiter(line) {
    const c = [',', ';', '\t'].map(d => [d, line.split(d).length - 1]);
    c.sort((a, b) => b[1] - a[1]);
    return c[0][1] > 0 ? c[0][0] : ',';
  }

  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const d = detectDelimiter(first);
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === d) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(c => c.trim() !== '')) rows.push(row);
        row = [];
      } else cell += ch;
    }
    row.push(cell);
    if (row.some(c => c.trim() !== '')) rows.push(row);
    if (!rows.length) return { headers: [], rows: [], delimiter: d };
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const out = rows.slice(1).map((r, i) => {
      const o = { __line: i + 2 };
      headers.forEach((h, k) => { o[h] = (r[k] === undefined ? '' : r[k]).trim(); });
      return o;
    });
    return { headers, rows: out, delimiter: d };
  }

  /* a number, null for a blank cell, NaN when it is not a number. A decimal comma is accepted. */
  function num(v) {
    if (v === undefined || v === null) return null;
    let s = String(v).trim().replace(/\s/g, '').replace(/%$/, '');
    if (s === '') return null;
    if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  /* ---------- what each file may contain ---------- */
  const SCHEMA = {
    teams: {
      file: 'teams.csv', required: true,
      need: ['team', 'headcount'],
      optional: ['rating_1', 'rating_2', 'rating_3', 'rating_4', 'rating_5', 'compa_ratio', 'share_below_090', 'avg_salary',
        'manager_spans', 'manager_change_pct', 'manager_months', 'stalled_promo_pct', 'open_roles_pct', 'overtime_hours', 'leave_unused_pct']
    },
    quarterly: {
      file: 'quarterly.csv', required: true,
      need: ['team', 'quarter', 'pulse_favorable', 'pulse_response', 'manager_score', 'manager_response', 'enps', 'pace_favorable', 'exits'],
      optional: ['regretted_exits']
    },
    exits_by_tenure: { file: 'exits_by_tenure.csv', required: false, need: ['team', 'under_6m', 'm6_12', 'm12_18', 'over_18'], optional: [] },
    items: { file: 'items.csv', required: false, need: ['team', 'growth_career', 'workload_pace', 'manager_support', 'tools_process', 'recognition', 'pay_fairness', 'plan_to_stay'], optional: [] },
    groups: {
      file: 'groups.csv', required: false,
      need: ['team', 'women', 'promoted_women', 'promoted_men', 'exits_women', 'exits_men', 'compa_women', 'compa_men', 'pulse_women', 'pulse_men', 'response_women', 'response_men'],
      optional: ['other']
    },
    comments: { file: 'comments.csv', required: false, need: ['team', 'comment'], optional: [] }
  };

  /* ---------- build ---------- */
  function build(files) {
    const errors = [], warnings = [];
    const err = (f, line, msg) => errors.push(`${f}${line ? ', row ' + line : ''}: ${msg}`);
    const warn = msg => warnings.push(msg);

    const T = {};
    for (const key of Object.keys(SCHEMA)) {
      const sc = SCHEMA[key];
      const text = files[key];
      if (text === undefined || text === null || String(text).trim() === '') {
        if (sc.required) err(sc.file, 0, 'this file is required');
        continue;
      }
      const p = parseCSV(text);
      const miss = sc.need.filter(h => p.headers.indexOf(h) < 0);
      if (miss.length) { err(sc.file, 0, 'missing column' + (miss.length > 1 ? 's' : '') + ': ' + miss.join(', ')); continue; }
      const known = sc.need.concat(sc.optional);
      const extra = p.headers.filter(h => h && known.indexOf(h) < 0);
      if (extra.length) warn(`${sc.file}: ignoring unknown column${extra.length > 1 ? 's' : ''}: ${extra.join(', ')}`);
      if (!p.rows.length) { err(sc.file, 0, 'no data rows'); continue; }
      T[key] = p;
    }
    if (errors.length) return { ok: false, errors, warnings, dataset: null };

    /* a numeric cell with a range */
    const val = (file, row, col, lo, hi, opts) => {
      opts = opts || {};
      const v = num(row[col]);
      if (v === null) { if (opts.required) err(file, row.__line, `${col} is empty`); return null; }
      if (Number.isNaN(v)) { err(file, row.__line, `${col} is not a number ("${row[col]}")`); return null; }
      if (v < lo || v > hi) { err(file, row.__line, `${col} is ${v}, outside ${lo} to ${hi}`); return null; }
      if (opts.int && !Number.isInteger(v)) { err(file, row.__line, `${col} must be a whole number (${v})`); return null; }
      return v;
    };

    /* teams */
    const teams = [], byName = {};
    T.teams.rows.forEach(r => {
      const n = r.team;
      if (!n) { err('teams.csv', r.__line, 'team name is empty'); return; }
      if (byName[n]) { err('teams.csv', r.__line, `team "${n}" appears twice`); return; }
      const f = 'teams.csv';
      const t = { n, hc: val(f, r, 'headcount', 1, 100000, { required: true, int: true }) };
      const rt = [1, 2, 3, 4, 5].map(i => 'rating_' + i in r ? val(f, r, 'rating_' + i, 0, 100) : null);
      t.rt = rt.every(v => v !== null) ? rt : null;
      if (t.rt) { const s = rt.reduce((a, b) => a + b, 0); if (Math.abs(s - 100) > 3) warn(`teams.csv: ratings for "${n}" add up to ${s.toFixed(0)}, not 100`); }
      t.compa = 'compa_ratio' in r ? val(f, r, 'compa_ratio', 0.5, 2) : null;
      t.below = 'share_below_090' in r ? val(f, r, 'share_below_090', 0, 100) : null;
      t.sal = 'avg_salary' in r ? val(f, r, 'avg_salary', 1, 1e8) : null;
      t.mc = 'manager_change_pct' in r ? val(f, r, 'manager_change_pct', 0, 100) : null;
      t.mnew = 'manager_months' in r ? val(f, r, 'manager_months', 0, 600) : null;
      t.stale = 'stalled_promo_pct' in r ? val(f, r, 'stalled_promo_pct', 0, 100) : null;
      t.vac = 'open_roles_pct' in r ? val(f, r, 'open_roles_pct', 0, 100) : null;
      t.ot = 'overtime_hours' in r ? val(f, r, 'overtime_hours', 0, 400) : null;
      t.leave = 'leave_unused_pct' in r ? val(f, r, 'leave_unused_pct', 0, 100) : null;
      t.spans = null;
      if ('manager_spans' in r && r.manager_spans) {
        const parts = r.manager_spans.split(/[;|]/).map(x => num(x)).filter(x => x !== null);
        if (parts.length && parts.every(x => Number.isInteger(x) && x >= 0)) {
          t.spans = parts;
          const s = parts.reduce((a, b) => a + b, 0);
          if (t.hc && s > t.hc) warn(`teams.csv: spans for "${n}" add up to ${s}, more than the headcount of ${t.hc}`);
        } else err(f, r.__line, 'manager_spans must be whole numbers separated by ";" (for example 8;6;5)');
      }
      byName[n] = t; teams.push(t);
    });

    /* quarterly */
    const qOrder = [];
    T.quarterly.rows.forEach(r => { if (r.quarter && qOrder.indexOf(r.quarter) < 0) qOrder.push(r.quarter); });
    if (qOrder.length < 4) err('quarterly.csv', 0, `needs at least 4 quarters, found ${qOrder.length}`);
    const quarters = qOrder.slice(-4);
    if (qOrder.length > 4) warn(`quarterly.csv: ${qOrder.length} quarters found, using the last 4 (${quarters.join(', ')})`);
    const hasRegret = T.quarterly.headers.indexOf('regretted_exits') >= 0;
    const seen = {};
    T.quarterly.rows.forEach(r => {
      const t = byName[r.team];
      if (!t) { err('quarterly.csv', r.__line, `team "${r.team}" is not in teams.csv`); return; }
      const qi = quarters.indexOf(r.quarter);
      if (qi < 0) return;
      const key = r.team + '|' + r.quarter;
      if (seen[key]) { err('quarterly.csv', r.__line, `${r.team}, ${r.quarter} appears twice`); return; }
      seen[key] = 1;
      const f = 'quarterly.csv';
      ['pulse', 'resp', 'mgr', 'mresp', 'enps', 'pace', 'exq', 'reg'].forEach(k => { if (!t[k]) t[k] = [null, null, null, null]; });
      t.pulse[qi] = val(f, r, 'pulse_favorable', 0, 100, { required: true });
      t.resp[qi] = val(f, r, 'pulse_response', 0, 100, { required: true });
      t.mgr[qi] = val(f, r, 'manager_score', 1, 5, { required: true });
      t.mresp[qi] = val(f, r, 'manager_response', 0, 100, { required: true });
      t.enps[qi] = val(f, r, 'enps', -100, 100, { required: true });
      t.pace[qi] = val(f, r, 'pace_favorable', 0, 100, { required: true });
      t.exq[qi] = val(f, r, 'exits', 0, 10000, { required: true, int: true });
      t.reg[qi] = hasRegret ? (val(f, r, 'regretted_exits', 0, 10000, { int: true }) || 0) : 0;
      if (t.reg[qi] > t.exq[qi]) err(f, r.__line, 'regretted_exits is larger than exits');
    });
    teams.forEach(t => {
      if (!t.pulse || t.pulse.some(v => v === null) || t.exq.some(v => v === null)) {
        if (!errors.length || !errors.some(e => e.indexOf(`"${t.n}"`) >= 0)) err('quarterly.csv', 0, `team "${t.n}" does not have all of the last 4 quarters (${quarters.join(', ')})`);
      }
      Object.keys(t).forEach(() => {});
    });
    /* pulse response very low: scores say little */
    teams.forEach(t => { if (t.resp && t.resp.every(v => v !== null) && t.resp[3] < 40) warn(`"${t.n}": only ${t.resp[3]}% answered the latest pulse, read its scores with great care`); });
    teams.forEach(t => { if (t.hc < 3) warn(`"${t.n}" has ${t.hc} people. Teams this small are always hidden.`); });

    /* optional files */
    const has = { pay: false, ratings: false, lead: false, spans: false, cost: false, items: false, eq: false, tenure: false, comments: false, regretted: hasRegret };
    const allHave = (fn) => teams.every(fn);
    const partial = (label, fn) => {
      const anyHave = teams.some(fn);
      if (anyHave && !allHave(fn)) warn(`${label} is missing for ${teams.filter(t => !fn(t)).map(t => `"${t.n}"`).slice(0, 4).join(', ')}${teams.filter(t => !fn(t)).length > 4 ? ' and others' : ''}, so that view is switched off`);
    };
    has.pay = allHave(t => t.compa !== null && t.below !== null); partial('Pay data (compa_ratio, share_below_090)', t => t.compa !== null && t.below !== null);
    has.ratings = allHave(t => t.rt !== null); partial('Rating distribution', t => t.rt !== null);
    has.spans = allHave(t => t.spans !== null); partial('manager_spans', t => t.spans !== null);
    has.cost = allHave(t => t.sal !== null); partial('avg_salary', t => t.sal !== null);
    has.lead = teams.some(t => t.mc !== null || t.mnew !== null || t.stale !== null || t.vac !== null || t.leave !== null);
    if (!has.pay) teams.forEach(t => { t.compa = null; t.below = null; });
    if (!has.ratings) teams.forEach(t => { t.rt = null; });
    if (!has.spans) teams.forEach(t => { t.spans = null; });
    if (!has.cost) teams.forEach(t => { t.sal = null; });

    teams.forEach(t => { t.ex = [0, 0, 0, 0]; t.eq = null; t.drv = null; t.stay = null; t.xr = t.reg ? t.reg.reduce((a, b) => a + b, 0) : 0; });

    if (T.exits_by_tenure) {
      const got = {};
      T.exits_by_tenure.rows.forEach(r => {
        const t = byName[r.team]; if (!t) { warn(`exits_by_tenure.csv, row ${r.__line}: team "${r.team}" is not in teams.csv`); return; }
        const f = 'exits_by_tenure.csv';
        t.ex = ['under_6m', 'm6_12', 'm12_18', 'over_18'].map(c => val(f, r, c, 0, 10000, { required: true, int: true }) || 0); got[t.n] = 1;
      });
      has.tenure = teams.every(t => got[t.n]);
      if (!has.tenure) warn('exits_by_tenure.csv does not cover every team, so the tenure view is switched off');
      teams.forEach(t => { if (got[t.n] && t.exq && t.exq.every(v => v !== null)) { const a = t.ex.reduce((x, y) => x + y, 0), b = t.exq.reduce((x, y) => x + y, 0); if (a !== b) warn(`"${t.n}": exits by tenure add up to ${a}, but quarterly exits add up to ${b}`); } });
      if (!has.tenure) teams.forEach(t => { t.ex = [0, 0, 0, 0]; });
    }

    if (T.items) {
      const got = {};
      T.items.rows.forEach(r => {
        const t = byName[r.team]; if (!t) { warn(`items.csv, row ${r.__line}: team "${r.team}" is not in teams.csv`); return; }
        const f = 'items.csv';
        const v = ['growth_career', 'workload_pace', 'manager_support', 'tools_process', 'recognition', 'pay_fairness', 'plan_to_stay'].map(c => val(f, r, c, 0, 100, { required: true }));
        if (v.every(x => x !== null)) { t.drv = v.slice(0, 6); t.stay = v[6]; got[t.n] = 1; }
      });
      has.items = teams.every(t => got[t.n]);
      if (!has.items) { warn('items.csv does not cover every team, so the driver view is switched off'); teams.forEach(t => { t.drv = null; t.stay = null; }); }
    }

    if (T.groups) {
      const got = {};
      T.groups.rows.forEach(r => {
        const t = byName[r.team]; if (!t) { warn(`groups.csv, row ${r.__line}: team "${r.team}" is not in teams.csv`); return; }
        const f = 'groups.csv';
        const g = {
          w: val(f, r, 'women', 0, 100000, { required: true, int: true }), o: val(f, r, 'other', 0, 100000, { int: true }) || 0,
          pw: val(f, r, 'promoted_women', 0, 100000, { required: true, int: true }), pm: val(f, r, 'promoted_men', 0, 100000, { required: true, int: true }),
          xw: val(f, r, 'exits_women', 0, 100000, { required: true, int: true }), xm: val(f, r, 'exits_men', 0, 100000, { required: true, int: true }),
          cw: val(f, r, 'compa_women', 0.5, 2, { required: true }), cm: val(f, r, 'compa_men', 0.5, 2, { required: true }),
          qw: val(f, r, 'pulse_women', 0, 100, { required: true }), qm: val(f, r, 'pulse_men', 0, 100, { required: true }),
          rw: val(f, r, 'response_women', 0, 100, { required: true }), rm: val(f, r, 'response_men', 0, 100, { required: true })
        };
        if (Object.keys(g).every(k => g[k] !== null)) {
          if (g.w + g.o > t.hc) err(f, r.__line, `women (${g.w}) and other (${g.o}) are more than the headcount of ${t.hc}`);
          else { t.eq = g; got[t.n] = 1; }
        }
      });
      has.eq = teams.every(t => got[t.n]);
      if (!has.eq) { warn('groups.csv does not cover every team, so the equity view is switched off'); teams.forEach(t => { t.eq = null; }); }
    }

    const comments = [];
    if (T.comments) {
      has.comments = true;
      T.comments.rows.forEach(r => { if (!byName[r.team]) { warn(`comments.csv, row ${r.__line}: team "${r.team}" is not in teams.csv`); return; } if (r.comment) comments.push([r.team, r.comment]); });
    }

    if (errors.length) return { ok: false, errors, warnings, dataset: null };
    teams.forEach(t => { t.pulse = t.pulse.slice(); });
    return { ok: true, errors: [], warnings, dataset: { teams, comments, quarters, has } };
  }

  root.PSData = { parseCSV, num, build, SCHEMA };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PSData;
})(typeof window !== 'undefined' ? window : globalThis);
