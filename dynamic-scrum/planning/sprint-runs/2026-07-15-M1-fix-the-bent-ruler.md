# Sprint run — 2026-07-15 · M1 "Fix the bent ruler"

Single-session autonomous run of all 6 sprint cards (WOA-016…021). **The headline is that the flagship
(WOA-018) refuted the sprint's own premise** — see Findings 1.

## Protocol

`run-sprint` → per-card ceremony, **serial** (file conflicts on the report pipeline + the 018→016
dependency force it). Dispatch via the **Agent tool, `run_in_background:false`** (model per card `Type:`:
sonnet, opus for the flagship), runner-verified gates, one commit per ticket, board **direct-edit** (the
`ds-board-hub` MCP was started detached at session top but its tools attach next session, not this one).
Two cards (WOA-020 map-data + measure, WOA-021 doc) were completed **inline** by the runner under the same
verify gate (the no-logic-surface carve-out). One steer question raised up front → Bill chose **full
autonomy** (adopt whatever the verify gate passes).

## Pre-flight

- Tree clean; suite green at baseline — **230 assertions**, `ALL TESTS PASSED`; link-checker 0 dead / 44 pages.
- Deck clean (the session's own prior commits already pushed; no stray WIP).
- No gitignored-runtime-dependency hits. CRLF: **none** this run — the `reconnect-scrum` DS-211 re-checkout
  at session top pre-empted the recurring CRLF staging warnings the S3 run fought (a cross-skill win).

## Findings

1. **The flagship refuted the sprint's premise. (WOA-018)** The balance-loop-v2 §5a.1 claim — the AI's
   `unitOnBoard 22 > unitReserve 16` eval "encodes a losing strategy" — **does not survive AI-vs-AI
   measurement.** Neither lever beats current `hard` on core7: narrow-gap (`unitReserve`→19) is a coin-flip
   (**50.7% of 672**, build agent; **49.5% of 196**, independent runner re-check), and urgency-scaling
   (a golden-diff-safe `unitReserveUrgent`, default 0) is monotonically *weaker* (uu6 38% → uu12 4% — it
   turtles into a loss). Root cause: **deploy-on-sight is ~correct for this attrition dynamic** —
   `fieldScore` counts only DEPLOYED units and the attrition projection already punishes undeployment — so
   the eval is at worst neutral, **not distorting the ruler**. The LLM's hold-reserve edge doesn't transfer
   to the greedy heuristic (the LLM springs reserves with timing the heuristic lacks). Correctly rejected +
   reverted (mirror of WOA-012). **Recorded `D.D:ai-reserve-eval-rejected`; WOA-024 re-framed** (the
   reserve-timing question is now human/LLM + rules/content, not AI-eval).
2. **The report's suggested repair made The Void worse. (WOA-020)** Filling the donut hole per §5b.4
   ((-1,0)/(0,0)) created a straight 3-hex HQ-rush lane — **1st-mover 84% / HQ 78% / 0-kill 42%** at n50,
   far worse than the broken donut (Atk 4.9 / Drag 2.6). The HQs are fundamentally too close; a real fix is
   a redesign, not a hole-fill. **Cut per the ticket's fallback** → core7 now 6 maps. Note: the-void's
   balanceScore 4.4 was a *false-good* (healthy aggregate metrics masking a geometric pathology) — the pool
   is more honest without it, which serves the sprint's actual goal (a trustworthy measuring instrument).
3. **Inline carve-out extended usefully to map-data + balance-measurement.** WOA-020 is pure map *data*
   (no logic surface) whose real work is a balance re-measure the runner must do anyway — completing it
   inline **avoided a redundant hard-sweep** (a dispatched agent measures + the runner re-verifies = 2× the
   expensive sim). This is a genuine efficiency case beyond the doc-only framing.
4. **The `default` deck saturates unit stock exactly (7/7·2/2·1/1). (WOA-017)** Zero headroom — the new
   deploy-step-budget guard trips on *any* future card that adds a deploy step. Useful constraint to know
   before the M4 content push.
5. **Steering the adopt-policy up front paid off.** The single steer question (full autonomy on the two
   balance-baseline cards) is exactly what let WOA-018/020 resolve to reject/cut without a mid-run stall.

## Per-ticket log

| Ticket | Outcome | cost |
|---|---|---|
| WOA-016 | Done — reserve-held-at-end metric (additive, golden-diff-safe; DB migrated) | ~187k tok / 81 tools / ~20 min |
| WOA-017 | Done — deploy-step-budget test assertion (failing-first proven) | ~104k / 20 / ~4 min |
| WOA-018 | **Done/REJECTED** — no lever beats `hard`; §5a.1 refuted, eval reverted, no version bump | ~127k / 33 / ~43 min sim |
| WOA-019 | Done — dead per-card Win% dropped from reports (DB intact) | ~84k / 22 / ~7 min |
| WOA-020 | **Done/CUT** — The Void cut from core7 (repair-first tried, HQ-rush disaster) | inline (runner) / ~4 hard sweeps |
| WOA-021 | Done — `starting:true` documented as a tunable lever in grading-rubrics | inline (runner) / doc |

6/6 dispositioned: **4 built+closed, 1 measured-and-rejected, 1 measured-and-cut.** 0 bounced, 0 blocked.
Suite 230→237 green at every gate. 6 ticket commits (`90e4682`, `f2562af`, `cc91506`, `45d153a`,
`861418c`, `a4929e1`), no push (end-session integrates).

## Held-over human steps

- **Bill — review the WOA-018 refutation; it's a roadmap-level finding.** M1 is literally named "Fix the
  bent ruler," and the flagship found the ruler isn't meaningfully bent in AI-vs-AI. The reserve-timing
  question the felt-note raised is now a **human/LLM + rules/content** question (WOA-024, re-framed), not
  an AI-eval one. M1's remaining rationale (autonomous loop half) stands; the "bent ruler" framing needs
  your revisit.
- **Bill — core7 is now 6 maps** (`name`→"Core Six"; id `core7` stays, it's a frozen reference). Restore
  to 7 by redesigning The Void (HQs farther apart) or promoting the-cockpit (next-ranked, balanceScore
  6.0) — a roster/taste call. `the-void.js` is reverted + preserved on disk. **Core7 sweeps are no longer
  directly comparable to the 7-map baselines.**
- **Dashboard parity follow-ons** (both out of this sprint's scope, both in `game/ui/dashboard.js`):
  WOA-016's reserve-held tile and WOA-019's live winPct column/Win-share bar. Consider a small follow-on
  ticket to bring the live in-browser dashboard in line with the saved reports.

## Git-policy friction

- **None.** Per-ticket commits clean; the DS-211 CRLF fix at session top eliminated the staging warnings.
  Board direct-edit worked (no hub MCP this session). No push, per policy.

## Recommendations for these skills (route to canonical via the refine pass / send-report)

- **run-ticket / run-sprint — dispatch mechanism.** This run used the **Agent tool (`run_in_background:false`)
  rather than the Workflow primitive** the skill prescribes. For a serial per-ticket loop where the runner
  verifies between each card, synchronous Agent dispatch is simpler and keeps the loop coherent in one
  session; the tradeoff is it does **not** expose `effort:xhigh` (subagents inherit session effort). The
  skill should sanction the Agent-tool path alongside Workflow, naming the effort-control tradeoff.
- **run-ticket — inline carve-out.** Extend the carve-out's framing beyond "doc-only/mechanical" to the
  **data-edit-whose-verification-is-a-runner-measurement** case (WOA-020): pure data (no logic surface) +
  an expensive re-measure the runner owns → inline avoids a redundant sub-agent measurement. Name the
  efficiency rule.
- **run-sprint — scorecard semantics for measured-rejections.** Two of six cards resolved to "measured,
  not adopted" (reject + cut). A raw "6/6 closed" hides that. The scorecard should distinguish
  **built-and-closed vs measured-and-rejected/cut** as a first-class category (the Done/REJECTED,
  Done/CUT board markers + Decisions entry worked well — mirror of WOA-012).

## Scorecard

- **6/6 dispositioned** — 4 built+closed, 1 measured-and-rejected (WOA-018), 1 measured-and-cut (WOA-020).
- 0 bounced, 0 blocked, 0 wasted dispatches; suite green at every gate (230→237).
- ~502k sub-agent tokens across 4 dispatches + 2 runner-inline cards; 6 ticket commits; no push.

## Verdict

The sprint is **mechanically complete** (all 6 cards dispositioned, suite green, all committed) — but its
**central premise was refuted by its own flagship.** The "bent ruler" is not bent in AI-vs-AI: the AI-eval
route to the reserve-timing finding is closed. What the sprint *did* deliver is real and on-theme — a more
**trustworthy instrument**: a reserve-held-at-end metric, a deploy-step-budget guard, dead per-card Win%
removed from the corpus, a geometrically-broken map cut from the measuring pool, and the guaranteed-opener
lever documented. **Roadmap implication for Bill:** M1's "Fix the bent ruler" framing needs revisiting, and
the reserve-timing question should be re-routed to WOA-024 (rules/content + a fresh human/LLM signal).

#sprint-run
