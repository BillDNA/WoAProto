#spec
# Map roster deletion + custom board shapes

Two related map-editor asks: let the base maps be deleted (with a floor), and let the board
**shape** be edited hex-by-hex (not just terrain on a fixed shape).

## Roster: deletable base maps, floor of 5

Today the built-in maps can't be deleted. Let them be — but enforce a **minimum of 5 maps** so a
first-to-3 match always has enough distinct boards (`match.maps` pulls the pool; a match needs
enough maps to reach 3 wins on fresh boards).
- Enforce in `validateMaps` (or wherever the roster is validated) AND in the delete UI: the delete
  that would drop the roster below 5 is refused with a clear toast, same way the server refuses to
  blank a maps file unless `allowEmpty`.
- Deletion of built-ins uses the existing tombstone mechanism (`woa-deleted-maps`) that custom
  maps already have — extend it to built-ins rather than inventing a second path.

## Shapes: add / remove hexes

Today board shapes are `rows: [[r, qFrom, qTo], ...]` — contiguous runs per row. Bill wants to
add/remove individual hexes (irregular outlines), under the established **24-hex ceiling**
(laser-cutter max; Grand/Wide were removed for exceeding it).

The row model can't express a hole or a bump. Two options:
- **Store an explicit hex set** (`hexes: ['q,r', ...]`) as the source of truth; keep `rows` only
  as a compact encoding for the 5 regular built-ins. The engine's `setBoard`/hex-set build reads
  the hex list directly. This is the honest representation for irregular shapes.
- Keep `rows` and allow a `remove:[...]` / `add:[...]` delta. Cheaper diff but leaks the row model
  into every consumer. Prefer the explicit hex set unless the delta is clearly smaller.

## Grounding / gotchas

- `hexLabel` (grid refs A1…E4) derives row-letter-from-top + position-from-left **on the current
  board**. Irregular shapes must still produce sensible labels — the journal and every engine log
  message use them. Decide label rules for holes (skip? still count the column?) and test them.
- The rot180 centre (used for point-symmetric outlines / the editor's Mirror) is computed from the
  outline — recompute it from the hex set, and Mirror must round-trip on irregular shapes or be
  disabled when there's no symmetry.
- Enforce the 24-hex ceiling in the editor and `validateMaps`.
- Terrain pieces and trenches are keyed by hex (`sideKey`, `st.trenches[hex]`) — removing a hex
  must drop its terrain/trench data, and the editor must not let you paint terrain on a removed hex.
- Bump `SAVE_V` in `index.html` if the stored shape format changes, so old saves clear instead of
  crashing (existing invariant).

---
skipped: hex counts above 24 (physical ceiling — don't), non-hex tiles. This is the physical
board's editor, not a new geometry.
	*Bill* - part of why we want to limit the total number of hexes is so the map actually gets used big empty maps are not fun 
