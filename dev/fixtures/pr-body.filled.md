<!-- CALLOUT:START -->
## Callout — by-exception dashboard

*Read this instead of asking "are you sure?". Fill every field (`none` / `n/a` are valid answers) and replace each `<!-- FILL: ... -->` — a leftover sentinel or a dropped field reds `dev/pr-lint.test.js` (ADR-0004 §3, #196).*

- **New UI primitives + roles:** none — extends the existing `card` base with a `.card.compact` modifier
- **Invariants changed:** none
- **Pins pruned:** dropped the stale mat-slot count pin, rides the RULES_VERSION bump below
- **Rules-version bump:** 1.2 -> 1.3
- **dev/ui-review.js result:** Phase-1 pass; shots on pr-shots/woa-999
<!-- CALLOUT:END -->

---

Adds a compact card variant. Closes #999.
