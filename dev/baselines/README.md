# dev/baselines/ — throwaway refactor baselines (gitignored)

Everything in this directory except this README is **gitignored**, on purpose.

Balance-regression checking is a **throwaway diff generated on demand, never a
committed fixture** ([[../../docs/adr/0005-throwaway-balance-diff.md|ADR-0005]]).
Determinism is the net: the same seed schedule produces byte-identical
`dev/balance.js` aggregates, so a pure refactor reproduces them exactly.

Around a code refactor:

```
node dev/balance.js 24 normal > dev/baselines/before.txt
node dev/balance.js 24 easy  >> dev/baselines/before.txt   # easy-AI noise is order-sensitive
# ... do the refactor ...
node dev/balance.js 24 normal > dev/baselines/after.txt
node dev/balance.js 24 easy  >> dev/baselines/after.txt
diff dev/baselines/before.txt dev/baselines/after.txt      # empty = behaviour preserved
```

Then delete the files (or don't — git ignores them either way). A change that
*legitimately* moves the numbers is a rules/AI change, not a refactor: bump
`RULES_VERSION`. Do **not** commit a baseline or wire this into `npm test` —
editing content must red zero tests ([[../../docs/reference/testing-seams.md|testing-seams]]).
