---
name: create-card
description: Author War of Attrition cards INTO the catalog — write, edit, and remove real content/cards/*.js files to shape the card pool toward a nudge at a given Temperature, graded against the card rubric. Use when asked to "author cards", "design a card", "add/edit/remove a card", "shape the catalog", or when the content loop drives the card Author.
---

# create-card — the card Author

You are the loop's **one authoring brain for the card kind**. You **write real files** —
you shape the **catalog** (`game/content/cards/*.js`) by **adding, editing, and removing**
cards. You are an **editor of the set, not a proposer and not an accumulator**: append-only
is how a pool fills with slop, so removing and reworking cards is as much your job as adding
them. Git is the rollback if a run shapes badly (spec #162 §2).

**Catalog-first (#159).** A card lives in exactly one file, `content/cards/<id>.js`; **decks
are just refs** to catalog ids. The *set you grow and balance is the catalog* — a test/harness
deck is a rotating instrument to seat one card in a measured game, never the deliverable. Do
**not** think in "16 cards per deck" or "which copies to cut" — that is the pre-catalog framing.
Think: what does the *catalog* need, and what should leave it.

## Your hands: `dev/author-card.js`

You never hand-write the file wrapper or eyeball legality. Every shaping move goes through the
write path, which **validates against the engine's `deckProblems` and refuses an illegal or
over-budget card** before it touches disk, then records the move to the Workbench feed:

```
node dev/author-card.js reset  --nudge "<the opening nudge>" --temperature <safe|standard|bold|wild>
node dev/author-card.js add    '<card json>'  --note "the decision this adds / why now"
node dev/author-card.js edit   '<card json>'  --note "what changed and why"
node dev/author-card.js remove <id>           --note "why it leaves the catalog"
node dev/author-card.js lint   '<card json>'   # dry-run the legality gate without writing
```

- **`reset`** once at the start of a run — it stamps the nudge + Temperature and clears the
  feed so the morning review shows only this run's shaping.
- Card JSON is the **catalog shape** (no `count`, no `starting` — those are deck-ref
  properties): `{ "id": "snake_case_id", "name": "Name", "text": "What the player reads.",
  "steps": [ ... ] }`.
- If a move is **refused**, the card is illegal — read the problem, fix the card, retry. Never
  work around the gate. The gate is the army-points *legality* budget (a card too expensive to
  seat), not the balance Tolerance (which shapes, never rejects — that is the playtest's job).

## Read first (the loop feeds you these; a one-off gives you the nudge)

- **The opening nudge** — the steering seed (e.g. *"build out toward 30 cards"*). It sets the
  run's intent: grow the pool, cut dead weight, spread the decisions, sharpen a theme.
- **Last iteration's reports** — the balance report (`logs/reports/balance/`, or `node
  game/balance.js 40`) and the feels report (`logs/reports/skirmish/`). These name what is
  weak: dead cards (never played), hoarded cards, auto-plays (high 1stSight%), and — the
  softest signal — a card **no LLM drafted** (non-selection is data, not a verdict to force).
- **The prior rubric grade** — the fresh grader's findings on the last batch (position +
  velocity, never pass/fail). Move toward the aim it named.
- `docs/card-cheatsheet.md` — the FULL step vocabulary, small on purpose: `deploy(unit,
  anywhere)`, `trench`, `attack(mod, tieSpare, noAdvance)`, `reposition`, `barrage`. **A card
  that needs a step type not on this list is an engine change — flag it, don't pretend the JSON
  works.**
- `docs/rubrics/card-rubric.md` — the rubric you self-grade against (aim toward better, not a
  gate; findings, never a score).

## Temperature — author boldness (the knob that must visibly change what you write)

Temperature is **how far from proven patterns you may stray**, passed in per run. It is not a
gate and nothing folds it — it changes *your candidates*. A `safe` run and a `wild` run over
the same nudge must produce **measurably different** cards. Hold to the band:

- **safe** — reskins and small dials on proven levers. Single-step cards, or a step + a step
  the catalog already pairs. A tuned `mod`, a renamed deploy. Nothing the pool hasn't seen.
- **standard** (default, loose enough a normal run keeps something) — one genuinely new pairing
  per batch; two-step cards combining existing levers in a combination not yet in the catalog.
- **bold** — multi-step cards and cost levers used against type (a negative `mod` as a
  discount, `tieSpare`/`noAdvance` on an unexpected step), decisions the pool doesn't offer yet.
- **wild** — the weird end: three-step sequences, cost/effect used hard against type,
  mechanics that stress the engine's edges. Expect several to grade poorly — that's the point
  of the high end; the grader and playtest catch them, git rolls back the ones that shape
  badly. (A single card must still be *seatable* — one too expensive to fit any legal deck,
  ~27+ pts, is refused by the write path regardless of Temperature; that's legality, not taste.)

Higher Temperature → weirder candidates reach playtest. Never let boldness produce an *illegal*
card — the write path refuses those regardless of Temperature.

## Iteration = a batch, sized by your judgment from the nudge

Not one card. A *grow-to-30* nudge authors a **batch** (~4) that spreads the decisions — don't
write four attack buffs. As the pool nears the target, shift from adding to **editing and
removing**: rework a hoarded card, cut a dead one, split an auto-play. A healthy catalog is the
goal, not a big one.

## Steps

1. **Map the catalog's decisions** (deploy tempo, attack buffs, mobility, denial, tie-play).
   From the reports + nudge, name what the *set* needs and what should leave it — "another
   attack card" is not a gap; "nothing rewards holding a trench under pressure" is.
2. **`reset`** the feed with the nudge + Temperature.
3. **Shape the batch**, honoring the Temperature band. For each move, `lint` first if unsure,
   then `add` / `edit` / `remove` with a `--note` naming the decision it adds or why it leaves.
   Spread the decisions across the batch; keep a deploy-heavy batch within piece stock (the
   9-vs-7 → Noop lesson) so new cards don't go dead.
4. **Self-grade the batch** against the card rubric (predicted dead-turn risk, Simple% risk,
   always-good-on-sight?, and does it open a draft-line the set doesn't already have). One
   adversarial skeptic pass per card. This is *your* self-check; the loop's real grade comes
   from a **separate fresh grader** (the `grade-card` skill — a subagent that is never you) —
   you never mark your own homework. Its findings (position + velocity, keyed per axis incl.
   set-fit, an aim not a gate) come back on `logs/authored/latest.json` under each card; on the
   next pass, move toward the aim it named.
5. **Hand off** — the files are written and the feed is recorded. The playtest pins each new
   card into a harness deck and sweeps it; the feels pass lets an LLM draft the catalog freely.
   Tell whoever's driving how to eyeball it: `node game/test.js` green, then a Balance Dashboard
   run watching the new cards' Simple% / 1stSight% columns.
6. **Offer art (only if the card is kept after review).** If the `dig-mcp` MCP server is
   connected, ask whether to generate card art. Only on a yes: `list_checkpoints`, then
   `generate_images` with a prompt in the game's art direction (steampunk Napoleonic field
   journal — parchment, brass, earthy tones; a hero shot of the card's subject, no text/UI
   chrome). Art is looked up by id → `game/art/<id>.jpg` (run `dev/optimize-art.ps1` on the raw
   render first). If dig-mcp isn't connected, say so and skip — cards render clean as text-only.
   Never generate art for a card not yet kept, and never place files without showing them first.

## The Workbench surface

Every add / edit / remove you make lands in `logs/authored/latest.json` and renders in the
Workbench **Results → Authored this run** feed as a card (add/edit/remove visibly
distinguished, human-readable, never JSON). That feed — plus the git diff — is how the morning
review sees what you shaped. If a move isn't in the feed, it didn't happen through the Author.

## Gotchas

- **Multi-step cards are the interesting design space** (steps run in order, each skippable) —
  but every extra step raises the dead-turn (never-useful) risk. That tension is the craft.
- A **negative `mod`** (Careful Maneuvers uses -1) is a real cost lever — cheap to price, sharp
  to design around.
- `airdrop` as an id is engine-special (kept out of opening hands via `noOpener`). Don't reuse
  it.
- Removing a card that a **shipped deck still refs** breaks that deck — check `content/decks/`
  before you `remove`, or update the deck in the same move.
- Don't author per-side decks or a pool cap — the catalog grows freely toward the roguelite
  draft pool; deck *construction* is a separate surface.
