/* UI-element glossary scanner (node-only, not in the browser chain). Enumerates the
   front-end's rendering primitives by definitional form (fn / class / obj / modifier)
   and reds on any not claimed by ROSTER. ROSTER is the authority; docs/context/ui.md is
   the vocabulary; test.ui.js is the gate. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');            // repo root (game/..)
const UI_DIR = path.join(__dirname, 'ui');
const CSS_FILE = path.join(__dirname, 'style.css');
const UI_VOCAB_DOC = path.join(ROOT, 'docs', 'context', 'ui.md');

// Role -> { home, form, match }. Base primitives match a precise name; each composite
// owns its home file (match `.`). `bases` = css classes whose modifiers are in scope.
const COMPOSITE_HOMES = [
  'dashboard.js', 'deck-editor.js', 'map-editor.js', 'maps-screen.js', 'manual.js',
  'pane-cards.js', 'pane-maps.js', 'pane-overview.js', 'pane-units.js', 'skirmish.js', 'workbench.js',
];
const ROSTER = {
  bases: ['card', 'art'],
  roles: [
    { id: 'card-face',      home: 'game/ui/app.js',              form: 'fn',       match: /^(cardFace|artImg)$/ },
    { id: 'card-face-mods', home: 'game/style.css',              form: 'modifier', match: /^(card\.(deal|disabled)|art\.placeholder)$/ },
    { id: 'chart-builders', home: 'game/ui/chart-primitives.js', form: 'fn',       match: /^(ch|ov)/ },
    { id: 'design-tokens',  home: 'game/ui/chart-primitives.js', form: 'obj',      match: /^CHART$/ },
    { id: 'svg-factory',    home: 'game/ui/board.js',            form: 'fn',       match: /^svgEl$/ },
    ...COMPOSITE_HOMES.map(f => ({ id: f.replace('.js', ''), home: 'game/ui/' + f, form: 'fn', match: /./ })),
  ],
};

// [{ rel, type:'js'|'css', src }]. `extra` lets a test inject fixture files.
function defaultSources(extra) {
  const out = [];
  for (const f of fs.readdirSync(UI_DIR).sort()) {
    if (!/\.js$/.test(f)) continue;
    out.push({ rel: 'game/ui/' + f, type: 'js', src: fs.readFileSync(path.join(UI_DIR, f), 'utf8') });
  }
  out.push({ rel: 'game/style.css', type: 'css', src: fs.readFileSync(CSS_FILE, 'utf8') });
  return out.concat(extra || []);
}

// ---- form detectors ----------------------------------------------------------------
// Balanced { ... } body starting at-or-after `from`.
function braceBody(s, from) {
  let depth = 0, start = -1;
  for (let j = from; j < s.length; j++) {
    const c = s[j];
    if (c === '{') { if (start < 0) start = j; depth++; }
    else if (c === '}') { if (--depth === 0) return s.slice(start, j + 1); }
  }
  return start < 0 ? '' : s.slice(start);   // no block body (e.g. arrow-expression) → nothing to scan
}
// A string literal opening an HTML/SVG tag (`<b>`, `<a href>` count; `a < b` does not).
const MARKUP_LITERAL = /['"`][^'"`]*<[a-zA-Z][\w-]*[\s/>]/;
// Mints a DOM node or holds a markup literal anywhere (covers `return html;` / ASI).
function buildsMarkup(body) {
  return /createElementNS/.test(body) || MARKUP_LITERAL.test(body);
}

// Enumerate the fn / obj / class / modifier definitions in one source. Anchored to
// module scope (column 0) so locals aren't taken for shared primitives.
function definitionsIn(entry) {
  const defs = [];
  if (entry.type === 'js') {
    const s = entry.src;
    let m;
    // fn, block body: `function NAME(){`, `NAME = function(){`, `NAME = (..)=>{`, `NAME = x=>{`
    const blockFn = /(?:^|\n)(?:function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)|(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function\s*\*?\s*\([^)]*\)|\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)\s*\{/g;
    while ((m = blockFn.exec(s))) {
      const body = braceBody(s, m.index + m[0].length - 1); // m[0] ends at the `{`
      if (buildsMarkup(body)) defs.push({ name: m[1] || m[2], form: 'fn', rel: entry.rel, body });
    }
    // fn, expression-bodied arrow `NAME = a => <expr>` — bounded so it can't slurp the next def
    const exprFn = /(?:^|\n)(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([^;\n]+)/g;
    while ((m = exprFn.exec(s))) {
      if (buildsMarkup(m[2])) defs.push({ name: m[1], form: 'fn', rel: entry.rel, body: m[2] });
    }
    const cls = /(?:^|\n)\s*class\s+([A-Za-z_$][\w$]*)/g;
    while ((m = cls.exec(s))) {
      defs.push({ name: m[1], form: 'class', rel: entry.rel, body: braceBody(s, m.index + m[0].length) });
    }
    // obj: token bag (>= 2 colour hexes, e.g. CHART) or a method that builds markup
    const obj = /(?:^|\n)(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
    while ((m = obj.exec(s))) {
      const body = braceBody(s, m.index + m[0].indexOf('{'));
      const hexes = (body.match(/['"`]#[0-9a-fA-F]{3,8}['"`]/g) || []).length;
      const methodBuildsMarkup = /[A-Za-z_$][\w$]*\s*(?:\([^)]*\)|:\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>))/.test(body) && MARKUP_LITERAL.test(body);
      if (hexes >= 2 || methodBuildsMarkup) defs.push({ name: m[1], form: 'obj', rel: entry.rel, body });
    }
  } else if (entry.type === 'css') {
    // modifier: every `.a.b(.c)` compound chain; scope (base in `bases`) applied by scan()
    const selectors = entry.src.replace(/\/\*[\s\S]*?\*\//g, '').split('{').map(chunk => {
      const i = chunk.lastIndexOf('}');
      return (i >= 0 ? chunk.slice(i + 1) : chunk).trim();
    });
    for (const sel of selectors) {
      for (const one of sel.split(',')) {
        const chains = one.match(/\.[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)+/g) || [];
        for (const ch of chains) {
          const classes = ch.replace(/:[\w-]+.*$/, '').slice(1).split('.'); // drop pseudo suffix
          defs.push({ classes, form: 'modifier', rel: entry.rel });
        }
      }
    }
  }
  return defs;
}

// { violations, defs }. A violation is a detected primitive no role claims.
function scan(opts) {
  opts = opts || {};
  const sources = opts.sources || defaultSources(opts.extra);
  const roster = opts.roster || ROSTER;
  const baseSet = new Set(roster.bases);
  const violations = [];
  const allDefs = [];
  for (const entry of sources) {
    for (const def of definitionsIn(entry)) {
      if (def.form === 'modifier') {
        // in scope if any class is a base; name it base-first so selector order can't hide it
        const base = def.classes.find(c => baseSet.has(c));
        if (!base) continue;
        def.name = base + '.' + def.classes.filter(c => c !== base).sort().join('.');
      }
      allDefs.push(def);
      const claimed = roster.roles.some(r =>
        r.form === def.form && r.home === def.rel && r.match.test(def.name));
      if (!claimed) violations.push(def);
    }
  }
  return { violations, defs: allDefs, roster };
}

// ---- register-or-extend (diff classifier, #194) ------------------------------------
// The general case of #190's route-through-base: given a *change* (before→after source
// lists plus the ui.md text it edits), every newly-added primitive must EITHER extend a
// registered role OR register a genuinely new role in docs/context/ui.md the same diff.
// #190 locks the one card-face home; this locks every base role and the new-role escape.
//
// Per-base-role fork signature: markup that IS an instance of the role's primitive. A
// new definition carrying it, outside the role's home, is a FORK — a red even when the
// diff adds a glossary entry, because the role is already served (extend, don't re-mint).
const FORK_SIGNATURES = [
  // `corner` need not be the first class token — a fork can list other classes first.
  { id: 'card-face',   home: 'game/ui/app.js',   sig: /class=["'`][^"'`]*\bcorner c[1-4]\b/ }, // #190 brass corners
  { id: 'svg-factory', home: 'game/ui/board.js', sig: /createElementNS\(/ },                    // mints raw SVG nodes
];
function defKey(d) { return d.form + ':' + d.name + '@' + d.rel; }
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Classify the primitives a change adds. Returns { added, violations } where each
// violation is { def, why:'fork'|'unregistered' }. Pure — the diff is the two source
// lists, so the gate exercises it on fixtures exactly as a PR-callout tool would on a
// real diff. "Extend" means a variant a registered role's match already claims — the
// same bar the whole-tree census in scan() holds, so the two gates never disagree.
function registerOrExtend(opts) {
  opts = opts || {};
  const roster = opts.roster || ROSTER;
  const before = opts.before || [];
  const after = opts.after || [];
  const uiAfter = opts.uiDocAfter || '';

  const beforeByKey = new Map(scan({ sources: before, roster }).defs.map(d => [defKey(d), d]));
  const afterDefs = scan({ sources: after, roster }).defs;

  const violations = [];
  const forked = new Set();
  // FORK — a base role's markup signature outside that role's home, INTRODUCED this diff:
  // a brand-new def, or an existing def mutated to add the signature (same key, new body).
  // A fork reds even when ui.md registers it — the role is served, so extend, don't re-mint.
  for (const def of afterDefs) {
    const fork = FORK_SIGNATURES.find(f => f.home !== def.rel && f.sig.test(def.body || ''));
    if (!fork) continue;
    const prev = beforeByKey.get(defKey(def));
    if (prev && fork.sig.test(prev.body || '')) continue; // already a fork before this diff — not introduced here
    forked.add(defKey(def));
    violations.push({ def, why: 'fork', role: fork.id });
  }
  // Everything the diff ADDS that isn't a fork must extend a registered role or register.
  for (const def of afterDefs) {
    if (beforeByKey.has(defKey(def)) || forked.has(defKey(def))) continue;
    // EXTEND — a variant a registered role's match already claims (an opts-driven variant
    // adds no def at all, so never reaches here). Same rule as the census: a genuinely new
    // modifier must widen its role's match, which is the register path, not a free pass.
    if (roster.roles.some(r => r.form === def.form && r.home === def.rel && r.match.test(def.name))) continue;
    // REGISTER — the new role is named in ui.md (word-bounded, so a short name can't ride
    // an incidental substring of unrelated prose; a role documented ahead of code is fine).
    if (new RegExp('\\b' + escRe(def.name) + '\\b').test(uiAfter)) continue;
    violations.push({ def, why: 'unregistered' });
  }
  return { added: afterDefs.filter(d => !beforeByKey.has(defKey(d))), violations };
}

module.exports = { scan, registerOrExtend, FORK_SIGNATURES, ROSTER, UI_VOCAB_DOC, definitionsIn, defaultSources, buildsMarkup };
