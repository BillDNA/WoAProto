/* War of Attrition — the UI-element glossary scanner (ADR-0004, #187).

   Node-only helper (never in the browser script chain — like game/test.helpers.js).
   It enumerates every UI *rendering primitive* the front-end defines and checks each
   against ROSTER below, so the roster stays a COMPLETE census: an unregistered
   primitive reds. #190 (route-through-base) and #194 (register-or-extend) build their
   asserts on this same enumeration — one definition of "what a primitive is", reused,
   per the one-fact-one-file rule.

   ROSTER (the machine-checkable catalog of role -> home/form/matcher) is the AUTHORITY
   and lives here with the code, not in the doc. docs/context/ui.md carries the shared
   *vocabulary* (what a base primitive / role is) and points here; test.ui.js keeps the
   two from drifting by asserting the doc names every home ROSTER registers.

   A primitive is detected by its DEFINITIONAL FORM, not by a hand-maintained list, so
   the scan cannot be a hollow oracle that only finds what the happy path matches:

     fn        function-returning-markup  — a function whose body returns HTML/SVG
                                            markup (a string with a `<tag`) or builds a
                                            DOM node via createElementNS
     obj       design-token object        — a module-scope object literal carrying the
                                            shared style tokens (>= 2 colour hexes: CHART)
     class     class                       — an ES class (none today; the form is still
                                            detected so a future one cannot slip in)
     modifier  modifier class             — a compound `.base.mod` selector in style.css
                                            that varies a registered BASE primitive class
                                            (the card face's `.card` / `.art`); a new
                                            modifier on a base is the register-or-extend
                                            event #194 wants visible.

   Each role names where it lives and how it is matched: `{ id, home, form, match }`,
   where `match` is a regex over the definition's name (or the base-first `base.mod`
   token for a modifier). A role's regex claims a family (`^(ch|ov)` = every chart
   builder; `.` = every markup primitive in a composite's home file), so adding a
   sibling under an existing role EXTENDS it (stays green); a primitive no role claims
   REDS. `bases` names the base-primitive css classes whose modifiers are in scope. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');            // repo root (game/..)
const UI_DIR = path.join(__dirname, 'ui');
const CSS_FILE = path.join(__dirname, 'style.css');
const UI_VOCAB_DOC = path.join(ROOT, 'docs', 'context', 'ui.md');

// The authoritative role-keyed roster the scan enforces. Base primitives are matched
// precisely so each stays a distinct role; each composite renderer owns every markup
// primitive in its home file (match `.`), so a sibling extends it while a primitive in
// a new home — or a new class / design-token object / base modifier — is unclaimed and
// reds. Register a genuinely new role by adding a line here AND naming it in ui.md.
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

// ---- source set the scan enumerates over -------------------------------------------
// Returns [{ rel, type:'js'|'css', src }]. `extra` lets a test inject fixture files
// (each { rel, type, src }) so the exhaustiveness red can add an unregistered factory.
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
// A string literal in `src` that opens an HTML/SVG tag: `<name` then whitespace, `/`,
// or `>` (so single-letter tags like `<a href>` / `<b>` count, but `a < b` does not).
const MARKUP_LITERAL = /['"`][^'"`]*<[a-zA-Z][\w-]*[\s/>]/;
// Builds markup if its body mints a DOM node or holds a markup string literal anywhere
// (a factory that stashes markup in a var before returning it still counts — the
// `;`/return-statement shape is not relied on, so ASI and `return html;` are covered).
function buildsMarkup(body) {
  return /createElementNS/.test(body) || MARKUP_LITERAL.test(body);
}

// Enumerate every fn / obj / class / modifier definition in one source. Detection is
// anchored to MODULE SCOPE (definitions at column 0 of a classic script) so a
// function-local helper or throwaway object cannot be mistaken for a shared primitive
// (that would be a false-fail); a genuinely new module-scope primitive is the event the
// register-or-extend gate wants to see.
function definitionsIn(entry) {
  const defs = [];
  if (entry.type === 'js') {
    const s = entry.src;
    let m;
    // function-returning-markup, block body: `function NAME(...) {`,
    // `NAME = function(...) {`, `NAME = (...) => {`, `NAME = ident => {`.
    const blockFn = /(?:^|\n)(?:function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)|(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function\s*\*?\s*\([^)]*\)|\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)\s*\{/g;
    while ((m = blockFn.exec(s))) {
      const body = braceBody(s, m.index + m[0].length - 1); // m[0] ends at the `{`
      if (buildsMarkup(body)) defs.push({ name: m[1] || m[2], form: 'fn', rel: entry.rel });
    }
    // function-returning-markup, expression-bodied arrow (no brace): `NAME = a => <expr>`.
    // Bounded to the single expression so it cannot slurp a later definition's body.
    const exprFn = /(?:^|\n)(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([^;\n]+)/g;
    while ((m = exprFn.exec(s))) {
      if (buildsMarkup(m[2])) defs.push({ name: m[1], form: 'fn', rel: entry.rel });
    }
    // class (any UI class; none today — the form is still detected so one can't slip in)
    const cls = /(?:^|\n)\s*class\s+([A-Za-z_$][\w$]*)/g;
    while ((m = cls.exec(s))) defs.push({ name: m[1], form: 'class', rel: entry.rel });
    // object-literal builder / design-token object: a MODULE-SCOPE object literal that
    // is a shared style/markup source — either >= 2 colour hexes (the CHART tokens) or a
    // method that builds markup (an object-method-shorthand builder).
    const obj = /(?:^|\n)(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
    while ((m = obj.exec(s))) {
      const body = braceBody(s, m.index + m[0].indexOf('{'));
      const hexes = (body.match(/['"`]#[0-9a-fA-F]{3,8}['"`]/g) || []).length;
      const methodBuildsMarkup = /[A-Za-z_$][\w$]*\s*(?:\([^)]*\)|:\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>))/.test(body) && MARKUP_LITERAL.test(body);
      if (hexes >= 2 || methodBuildsMarkup) defs.push({ name: m[1], form: 'obj', rel: entry.rel });
    }
  } else if (entry.type === 'css') {
    // modifier class: adjacent `.a.b(.c)` chain in a selector — a compound variant.
    // Emit the `a.b` token for every such chain; scope (base in `bases`) is applied
    // by the caller so the css scan itself stays purely structural.
    const selectors = entry.src.replace(/\/\*[\s\S]*?\*\//g, '').split('{').map(chunk => {
      const i = chunk.lastIndexOf('}');
      return (i >= 0 ? chunk.slice(i + 1) : chunk).trim();
    });
    for (const sel of selectors) {
      for (const one of sel.split(',')) {
        // maximal runs of `.class.class...` with no whitespace/combinator between
        const chains = one.match(/\.[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)+/g) || [];
        for (const ch of chains) {
          // strip any pseudo/state suffix, then keep the class list of the compound
          const classes = ch.replace(/:[\w-]+.*$/, '').slice(1).split('.');
          defs.push({ classes, form: 'modifier', rel: entry.rel });
        }
      }
    }
  }
  return defs;
}

// ---- the scan ----------------------------------------------------------------------
// Returns { violations, defs }. A violation is a detected primitive no role claims.
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
        // in scope when the compound varies a registered base class, wherever it sits in
        // the selector (`.selected.card` counts too); name it base-first, canonically,
        // so ordering in the CSS can't hide it from the roster regex.
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

module.exports = { scan, ROSTER, UI_VOCAB_DOC, definitionsIn, defaultSources, buildsMarkup };
