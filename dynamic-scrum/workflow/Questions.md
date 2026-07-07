# Questions

Open questions needing a decision before related work proceeds. Reference as `Q.N`. Resolved questions
move to `Decisions.md` (and out of here).

1. **(Q.1) What is a "run"?** The roguelite loop — the actual product — is undesigned, and it gates the
   shell, the save system, the content targets, and the pitch. Blocks M3 (and shapes M1). Expected to
   resolve via a one-page paper design + physical playtest of three candidate shapes (M0 / [[run-design]])
   before any code. `[dynamic-scrum/docs/steam-roadmap.md]`
2. **(Q.2) Adopt the weight-tuner sweep #1 suggestions?** (advance 2.2→3.3, enemyDist 1.6→2.4,
   fsDiff 8→4, myThreatKill 3→1.5, threatTie 2.5→3.75.) Filed, **not adopted — Bill decides**. Wants the
   firmer verification recipe first (`node dev/tune-weights.js --n 40 --iters 2`, a "tuned" personality
   that WINS a matchup, then a rules-version bump). `[logs/reports/analysis/2026-07-06-weight-tuner-sweep-1.md]`
3. **(Q.3) Is "tie-goes-to-2nd decides ~26% of battles" the biggest open balance lever — and how to
   address it?** Named the biggest 0.x complaint; the tuner surfaced threatTie↑ as one lever. Ties into
   Q.2. `[CLAUDE.md baselines / weight-tuner-sweep-1.md]`

## Related

[[Decisions]].

#questions
