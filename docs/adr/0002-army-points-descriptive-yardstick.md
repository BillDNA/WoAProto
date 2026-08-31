# ADR-0002 — Army-points is a descriptive yardstick, not a predictive proxy

Status: Accepted (2026-08-25)

## Context

The move to an asymmetric deck-builder needs a way to say two different Decks
"carry the same capabilities" — a shared budget Decks are built under, in the
Warhammer-40k sense where units cost points toward an army value. Cards that do
more should count for more.

There are two ways such a score could be defined:

- **Descriptive** — points measure *capability*, and balance is still proven by
  measured win-rate. Points are a cheap, static, simulation-free army-points
  budget ceiling you build under.
- **Predictive** — points are calibrated to *correlate with win-rate*, so a
  higher-pointed Deck should measurably win more.

The predictive framing is tempting (it sounds more rigorous) but it couples the
score to the simulator, makes every reprice a sweep, and quietly asserts the
score is truth — when the balance scorer has known blind spots (the Timing
blind spot: held-value Cards read weak without being weak). It would also make
army-points redundant with the win-rate the loop already measures.

## Decision

Army-points is a **descriptive capability yardstick**, not a predictive
win-rate proxy. It is computed additively from a Card's steps via a single
weight table (`cardPoints` / `deckPoints`), hand-seeded and then calibrated
against measured play as an *advisory* nudge — never fitted to reproduce
win-rate.

Measured balance always overrules the points score. The Mispricing residual
(measured contribution − points cost) is a **soft flag**, never a hard gate: a
Card the numbers dislike may be correctly priced and simply timing-dependent.

## Consequences

- The score stays cheap and static: a Deck's legality is a sum against a cap,
  checkable without simulation — which is what makes phase-0 LLM deckbuilding
  and large exploratory (Exploration-temperature) jumps practical.
- Calibration is a one-way advisory pass (hand-seed → nudge from measured
  per-Card contribution), not a solver fitting points to outcomes.
- A future reader who expects points to predict win-rate should not "fix" the
  weights to chase that correlation — the divergence between points and
  measured balance is the *signal* (the residual), not a bug.
- If a genuinely predictive power-rating is ever wanted, it is a *separate*
  concept layered on top, not a redefinition of army-points.
