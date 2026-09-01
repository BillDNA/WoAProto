<!-- CALLOUT:START -->
## Callout — by-exception dashboard

- **New UI primitives + roles:** none — extends the existing `card` base with a `.card.compact` modifier
- **Invariants changed:** none
- **Pins pruned:** dropped the stale mat-slot count pin, rides the RULES_VERSION bump below
- **Rules-version bump:** 1.2 -> 1.3
- **dev/ui-review.js result:** Phase-1 pass; shots on pr-shots/woa-999
<!-- CALLOUT:END -->

---

Adds a compact card variant. Closes #999.
