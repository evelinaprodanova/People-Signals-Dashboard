// A very small stand-in for the browser, enough to run src/app.js in Node and check that it renders without errors.
const defaults = { minGroup: 5, drop: 8, mdrop: 0.2, delta: 5, minResp: 60, payT: 0.93, payHi: 1.05, skew: 0.35, bench: 15, wl: 55, stale: 40, minMgr: 6, eqpay: 5, span: 12, repl: 50, rw: 2 };
module.exports = function install(g) {
  const els = {};
  const mk = id => ({ id, innerHTML: '', textContent: '', className: '', value: defaults[id] !== undefined ? String(defaults[id]) : '', files: [], style: {},
    addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll() { return []; }, querySelector() { return mk(); },
    setAttribute() {}, appendChild() {}, scrollIntoView() {}, dataset: {} });
  g.window = g;
  g.document = { getElementById: id => els[id] || (els[id] = mk(id)), querySelectorAll: () => [], querySelector: () => mk(), addEventListener() {},
    createElement: () => mk(), documentElement: mk(), body: mk() };
  g.localStorage = { getItem() { return null; }, setItem() {} };
  return els;
};
