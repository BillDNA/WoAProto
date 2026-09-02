---
name: balance-loop
description: Run the whole balance-iteration loop unattended, start to graded report — the sweep + one LLM match (generate-reports), then the graded analysis (review-reports), in one invocation with no interactive prompts. Suitable to kick off and walk away from (e.g. overnight). Use when asked to "run the balance loop", "balance-loop", "generate and review overnight", or to refresh + grade the data in one go.
---

# balance-loop

The **unattended** driver for the balance loop (issue #20 / M1): one invocation runs
**sweep → LLM match → graded analysis** and reports where the analysis landed. This is
just an orchestrator — it reimplements nothing. It runs the two existing skills back to
back, and adds the one thing they don't do on their own: it **waits for the match** so the
analysis can grade it, **degrades** (doesn't abort) if the match fails, and **prints the
paths** at the end.

Suggestions only, like the skills it drives — it never edits maps.js, cards, rules, or code.

## Contract (why this exists, don't break it)

- **No interactive prompts.** Pin every default up front (below); never stop to ask. This
  is the walk-away run.
- **Degrade, don't abort.** A failed LLM match still yields a graded analysis of the
  balance sweep. Only a failed *sweep* is fatal (no data = nothing to grade).
- **Leave a findable pointer.** The last thing printed is the analysis path and the sweep's
  `SAVED:` path.

## Defaults (settle silently, never ask)

- **Content slot:** the ACTIVE deck + mapset. If the caller passed `--deck <id>` / `--mapset <id>`,
  thread the SAME ids through both the sweep and the match; otherwise omit the flags (active pair).
- **Version / scope:** newest rules version (`Engine.VERSION`), both report types, T0 unless the
  slot is a candidate change (then review-reports picks T1 per its §Scope) — all its own defaults,
  so just don't override them.

## Steps

1. **Sweep (blocking, fatal on failure).** Run `generate-reports` **Step 1 only**:

   ```
   node dev/balance-report.js 100 hard hard --once --parallel [--deck <id>] [--mapset <id>]
   ```

   Capture the `SAVED:` path. If this command errors, **stop** and report the failure —
   there's no data to grade.

2. **LLM match (blocking, non-fatal).** Run `generate-reports` Step 3, but **in the
   foreground and wait for it** (generate-reports detaches and returns; the loop must not —
   the analysis has to cover the transcript):

   ```
   node dev/claude-plays.js --match 3 --red haiku --blue haiku --effort low --seed 1001 [--deck <id>] [--mapset <id>]
   ```

   Same `--deck`/`--mapset` as Step 1; seed 1001 is fixed (the apples-to-apples anchor —
   never change it). ~40–90 min wall-clock. If it exits non-zero, crashes, or is offline,
   **note "LLM match failed/skipped — grading the sweep alone" and continue** — do not abort.
   (Step 2 skill-premium and the optional 2002/3003 seeds stay out of the unattended loop.)

3. **Grade (invoke review-reports).** Run the `review-reports` skill against what Steps 1–2
   just produced (newest version, both report types, its own defaults — no prompts). It reads
   the sweep + the match transcript (or just the sweep, if Step 2 degraded), grades against the
   rubrics, and writes `logs/reports/analysis/<version>/<YYYY-MM-DD>-<version>-analysis.md`.

4. **Report back (the findable pointer).** Print, on completion:
   - the **analysis path** written in Step 3,
   - the sweep's **`SAVED:` path** from Step 1,
   - and, if the match degraded, one line saying so and that the analysis grades the sweep only.

## Notes

- Cost: sweep ~2–4 min; the match ~40–90 min real tokens (haiku + low effort). The blocking
  match is what makes this an overnight run — that's the point.
- Scheduling is the harness's job, not this skill's — `/loop`, cron, or a background job kicks
  it off; the skill just runs start-to-finish once when invoked.
- Everything files by rules version; the deck/mapset ids in the report meta lines distinguish
  content slots within a version.
- This is the loop's **gather+grade** half. Guiding `create-card`/`create-map` from the findings
  and adopting winners stays Bill's call (generate-reports § The v2 loop) — out of scope here.
