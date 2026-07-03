#spec
# Better, more varied heuristic AIs

More AI personalities, defined as **data not code**, along two axes Bill named. Fits the standing
goal ("prefer data files + small tools over hardcoding") and feeds the luck-vs-skill meter — a
spread of strengths makes `balance.js matchup` a finer instrument.

## The two axes

1. **Search space** — how far and how wide the AI looks.
   - *Depth* (plies): today easy/normal are greedy 1-step; hard searches **one reply deep** on a
     sampled enemy hand.
   - *Breadth* (candidates): hard re-scores the **top-3** candidates. More breadth / more depth =
     stronger + slower.
2. **Heuristic weights** — the numbers in `evalState` (attrition projection, support, HQ threat,
   noise, the -80 noop penalty, -10 anti-shuffle). Different weightings = different temperaments
   (aggressive, turtly, HQ-rushing).

## The idea: parameterize `aiPlanTurn`

Turn the three hardcoded levels into one engine that takes a **config**:
`{ depth, breadth, weights:{...}, noise }`. Personalities become entries in `maps.js`-style data
(or a small `ai.js` data table), so a new AI is a new row, not new code. easy/normal/hard become
three presets of the same engine.

Then `balance.js matchup` can pit any two configs and chart the strength curve; [[claude-plays]]
sits at the top of that curve as a non-heuristic reference.

## Grounding / guardrails (don't regress the Round 5–6 fixes)

- **Never peek** at the real enemy hand — deeper search still resamples the hidden hand from public
  deck+hand contents (`sampledReplyScore`'s honesty). This is load-bearing for the luck meter.
- **Common random numbers** when comparing candidates (fresh same-seeded rng per candidate) —
  Round 6's fix; without it deeper/wider search re-introduces the "one candidate ate an
  Airdrop-sample another never saw" unfairness.
- Keep the anti-degeneracy terms (noop -80, attrition-if-decks-ran-out projection, anti-shuffle
  -10) — a new config must not quietly drop them or the swap-dance stalemate returns. The
  Behaviour/Decisiveness metrics in `balance.js` are the regression check.
- **Live-usable budget**: a hard battle sims in ~1s. A deeper config must stay in that ballpark to
  be playable live and cheap in the lab — measure before shipping a slow one.

---
skipped: full minimax / alpha-beta / MCTS — exhaust the parameterized greedy-with-sampled-replies
first; it's cheap and honest. Add a real search only if the weight/depth knobs plateau.
