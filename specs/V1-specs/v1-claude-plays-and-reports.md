#spec
# V1 — Claude Plays: persistent session, first-to-3 matches & the generate-reports rewrite — first impressions & questions

Feedback Round 5, the "major upgrades to Claude plays" + "skills" clusters:
- *"can we have it open a shell and pipe the msgs back and forth (we are doing something in
  dynamic scrum, can give you a brief md on how that project is doing it)"* — goals: **(a)** a
  better view of how playing multiple battles feels (a rush draw feels luck-driven, but first-to-3
  should mitigate that), **(b)** faster responses because we're not starting a fresh session and
  re-piping the rules each time — just the state.
- *"change generate-reports to just run the balance and start the claude plays (updating that to a
  first to 3), probably open a new shell to run, no need to have Claude listening to it waiting for
  reports to come back."*

A **thinking doc, not an implementation plan.** Nothing here is committed.

> **Blocking input from Bill:** you offered *"a brief md on how [dynamic scrum] is doing it"* for
> the pipe-a-persistent-session pattern. That md is the reference implementation for the transport
> below — please drop it in (e.g. `specs/V1-specs/reference/dynamic-scrum-session.md`) and I'll
> align the design to it. Everything under "Persistent session" is my best guess until then.

## The problem with today's transport

`dev/claude-plays.js` spawns a **cold `claude -p` process for every single decision**
(`llm-client.js`). No memory between moves; each call re-sends the **entire rules prompt**
(`RULES`, a distilled README baked into the file) plus the full state. Two costs fall out of that:

- **Tokens.** The rules ride along on every volley — the dominant, most repetitive part of each
  prompt. Over a battle that's the rules paid for ~30–60 times.
- **Latency.** Every move pays cold-process startup + full-context ingest. A battle is slow, so
  we run few of them, so the sample is small — which is exactly why a rush draw "feels luck-driven"
  (we don't play enough games to see the distribution).

## Persistent session (pending Bill's dynamic-scrum md)

Replace per-decision spawns with **one long-lived `claude` process per side, kept alive for the
whole match**:

- **Rules sent once**, at session open, as the system/first prompt. Each turn sends only the
  **delta** — current honest state + the (now pruned, see [[v1-ai-search-and-tuning]]) legal-move
  list. The model keeps the rules and its own prior turns in context.
- **Transport options:** (1) the `claude` CLI in an interactive/streaming mode over stdin/stdout
  JSON lines — stays dependency-light and matches the zero-dep ethos; (2) the Agent SDK managing
  a session object. My lean is **(1) a piped interactive process**, pending the dynamic-scrum md
  which may already prescribe one. Prompt caching amortizes the rules further on top of send-once.
- **Expected wins:** rules paid ~once instead of per-move (big token cut, compounding with the
  option-list prune); much faster per-move (warm context, no cold start); and continuity — the
  model can reason "last turn I pushed left, so…", which should read as more human play and give
  richer felt-notes.

### Honesty invariant MUST survive the memory

The current design's whole credibility is that the model **never sees the opponent's hidden hand**
(only public counts). Persistent context makes leakage easier — the state delta each turn must
*still* be honest-info-only, and nothing from the engine's full state may enter the session.
Call this out as a test: assert the session prompt stream never contains opponent hand contents.
Keep the cold-`-p` path as a fallback (and for `--mock`).

## First-to-3 matches

The engine already has matches (`match.maps`, first to 3 battle wins) — claude-plays just doesn't
use them; it plays **one** battle. Add a **match mode** (best-of-5, first to 3):

- One persistent session spans the **whole match** — another reason to go persistent (don't re-pipe
  rules 3–5 times).
- The transcript aggregates: per-battle result + a **match summary** + a measured answer to Bill's
  actual question — **does first-to-3 smooth the rush-draw luck?** (e.g. report how often the
  match winner differs from the game-1 winner; if matches are decided by early luck as often as
  single games, first-to-3 isn't doing its job and that's a finding).
- Felt-notes at **match** end (across all games) in addition to / instead of per-battle, so the
  qualitative read is about the *set*, not one deal.

## The generate-reports rewrite

Today the skill runs balance, then runs **two single-battle** claude-plays and **waits** for them,
reporting back. Bill wants it to **fire the LLM match and walk away**:

- **Step 1 unchanged:** run the balance report, capture `BEST_MAP:`.
- **Step 2 becomes fire-and-forget:** launch **one first-to-3 match** on the best-balance map in a
  **detached/new shell** (`node dev/claude-plays.js --match ... &` / nohup), and **return
  immediately**. No Claude babysitting, no polling the LLM output. The match writes its own
  transcript to `logs/reports/battle/<version>/` when it finishes.
- **The skill reports:** the balance result + best map now, plus "match running in background,
  transcript will land at `<path>`." Bill (or `review-reports` later) reads it when it's done.
- Open sub-question: fully fire-and-forget, or write a tiny **status file** (`logs/reports/battle/
  <version>/<match>.status`) the skill/Bill can glance at to see "in progress / done / failed"
  without tailing a log?

## Questions for Bill

1. **The dynamic-scrum md** — can you drop it in? It's the reference for the persistent-session
   transport and unblocks the concrete spec. (Everything above is provisional without it.)
	1. [[claude-session-hub-pipeline]]
2. **Transport:** piped interactive `claude` process (dep-light, my lean) vs the Agent SDK? Any
   constraint from how dynamic-scrum does it?
	1. no constraint also dose not have to be done the same way as dynamic scrum i was just saying i had something similar working in another project.
3. **Match format:** first-to-3 (best-of-5) confirmed as the default — configurable via a flag, or
   fixed? Single-battle mode still kept for quick one-offs?
	1. configurable via flag, also should be able to flag card deck and map deck.
4. **Session memory shape:** keep the **full** match history in context (grows over 5 games) or a
   **rolling summary** per battle to bound context? (Full is simpler and probably fine for 5 games;
   flag if you'd rather cap it.)
	1. i would rather not cap it but we might have to if the context of 5 games is close to filling the context window of a haiku on low.
5. **generate-reports detachment:** pure fire-and-forget, or write a status file we can glance at?
	1. fire and forget is probably fine.
6. **Felt-notes grain:** per-battle, per-match, or both? (Per-match answers "how did the *set*
   feel", which is the point of moving to first-to-3.)
	1. both, cause they can 

Answer 1–3 and I can spec the transport + match loop concretely, with the honest-info assertion as
the acceptance test.
