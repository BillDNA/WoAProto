# Bug Log

Bugs captured mid-work via `make-ticket bug`, kept out of the feature `Backlog.md` so the backlog
stays feature-focused. Triage drains these into a sprint or fixes them inline. Same ticket format as
`Sprint.md`.

---

### WOA-041 — balance-report --parallel runs persist a runs row but ZERO battle rows — battles-to-db doctrine violation
**Area:** dev-tools · **Status:** Todo · **Type:** bug · **Docs:** data-and-reports

Found during WOA-040's verify (2026-07-18, runner-reproduced): every `dev/balance-report.js` run in woa.db (runs 92/93/94, incl. the WOA-039 rules-1.2 n=60 measurement, run 92) has a runs-table row but ZERO persisted battles — `SELECT COUNT(*) FROM battles WHERE run_id IN (92,93,94)` = 0 — while every `balance.js` run persists all its battles (e.g. runs 88/89/95/96: 144 each). Likely the `--parallel` process-per-map workers never wire their battles to the parent run id (or never call insertBattle at all). Violates `D.A:battles-to-db` ("every battle from every source lands as a per-battle row") and means measurement runs — the most important runs — are invisible to the dashboard's A/B pickers. The WOA-039 baseline itself is safe (the committed markdown report is the record) but its battles can't be drilled into.

**Acceptance criteria:**
- [ ] balance-report (both --parallel and serial) persists every battle row under its run id; a fresh small run shows battles == n*maps in woa.db
- [ ] Root cause noted (worker wiring vs never-persisted); existing empty runs 92-94 either backfilled or noted as unpersistable
- [ ] User confirms done

---

<!-- WOA-036 pulled into Sprint M2 · Metrics v2 + dashboard, phase 2 (2026-07-18) with the decided
     shape: empty the checked-in custom-deck.js + visible override badge. -->

_Empty._

## Related

[[Backlog]] · [[Sprint]].

#bugs
