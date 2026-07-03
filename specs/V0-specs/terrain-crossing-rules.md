#spec
# Terrain crossing rules: trench support-block + river

Two rules changes of the **same shape** — an edge feature that blocks something from crossing it.
Both touch the hottest path (combat resolution / adjacency), so they share a spec, share the
directional-edge machinery already in the engine, and share the "ask Bill to pin the exact
geometry before coding" requirement (game/CLAUDE.md: when code and rule book disagree, ask Bill).
	*Bill* - I think that's backwards and after the rules changes we do for v0 we should update that rulebook to reflect how the game is implemented

## Change 1 — trenches block attacker support (not flat defense)

**Today:** a trench gives +1 defense across its covered edges and helps any defender.
**New:** a trench stops being a defense buff and becomes **support denial** —
- an attacker's support may **not cross** a trench edge to reach the battle hex;
- a unit *in* a trenched hex can still support an attack out;
- an attack can still move **into** a trench.

Engine: attacker support today = allied units adjacent to the battle hex. Add a per-support-path
trench check: support from hex S into battle hex B crosses the S–B border; if that border carries a
trench, the support is dropped. Defender support is unaffected.

**Pin with Bill first:** does *any* trench on the S–B edge block, or only an enemy-owned one?
(`owner` is currently UI-only bookkeeping the rules ignore — this change may promote it to a real
rule, or may not.) And confirm the +1-defense removal is total, not additive.
	*Bill* - correct no ownership if you lose a trench the opponent can use it just fine
	*Bill* - correct remove the defense the mountains already do that

## Change 2 — river (control doesn't count across it)

New terrain type living on an edge: **a hex you control does not count across a river.**

**Pin with Bill first: what does "count" mean here?** Candidates — support cannot cross a river
(like a wall for adjacency), and/or through-HQ-style far-side reach stops at a river, and/or a
board-control metric doesn't count the far hex. The rule text is short but the engine surface
depends entirely on which of these it is. Get the one-sentence ruling before touching combat.
	*Bill* - for example if red controls B3 and C2 and orders an attack from B3 to C3 normally red would receive support from c2 but if there is a river between c2 and c3 then no support comes through.  but c2 can attack c3 and still receive support from b3 cause there is no river between b3 and c3

## Grounding (both changes)

- River reuses the existing **hex-owned directional terrain** machinery: a river is another
  edge piece (`{t:'river', edges:[[q,r,d]]}`), so `sideKey`, `buildTerrain`, `pieceProblem`, and
  the editor's per-side painting already exist. Add the type, its stock, and its combat/adjacency
  effect; don't invent a new geometry.
- Both are rules changes: update `engine.js`, `design-docs/card-cheatsheet.md`, the README
  rulings, the `War Of Attrition rule book.md`, and **extend `node game/test.js`** with the exact
  repro (pin `TESTMAP` like the other controlled tests). Re-run `balance.js` — the trench change
  especially will move Behaviour numbers.
- The editor must paint the river piece and validate its stock (`validateMaps`, `splitRun` grouping
  rules apply as for forest/mountain/trench).

---
skipped: rivers interacting with cards (Barrage, Airdrop) beyond the base ruling, multi-tile
rivers — do the single-edge base rule first, then see what playtests ask for.
	*Bill* - rivers no they act like mountains, air dop totally fine beyond a river
