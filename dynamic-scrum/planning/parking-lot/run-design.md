# Parking Lot — The run design

**Status:** not started · captured 2026-07-07 (adopt) · graduates to [[Roadmap]] M0 when brainstormed

> "There is no run. The roguelite loop — the actual product — is undesigned."
> — `dynamic-scrum/planning/parking-lot/steam-roadmap.md`

The load-bearing design decision the whole Steam trajectory waits on. Everything downstream (the shell,
the save system, the content targets, the store pitch) is gated by it, so it earns a real brainstorm
before it becomes buildable — this is a **brainstorming/parking-lot** item, not a ticket.

## The question

What *is* a run? Candidate shapes to argue and **physically playtest on the board** before any code:

- **Campaign decks** — the map-set mechanic becoming a campaign (Bill's own words in the V1 spec answers).
- **Drafting cards between battles** — the deck grows across a run.
- **Commander choice up front** — a run-defining pick (ties to the post-V1 "side asymmetry / Commander
  abilities" vision).
- **Lose-condition** — lose-a-battle-lose-the-run vs attrition-of-resources across the campaign.

## Bill's tentative loop (2026-07-15)

A first sketch to argue with (from `Questions.md` Q.1) — establishes the vocabulary **battle < operation < campaign**:

1. **Select commander** (the run-defining pick — see [[commander-traits]]).
2. **Select the 1st operation** — term TBD ("operation" needs noodling), loosely the current first-to-3.
3. **Play the battles.**
4. **Rewards / update your deck** — unit upgrades or new unit types? (the meta-progression step — see [[metaprogression]]).
5. **Select the next operation.**
6. A **campaign** = a series of operations.

Still tentative ("needs noodling"), so Q.1 stays open — but it's the leading candidate, and it already resolves the deck-evolution cadence (between operations, not between battles).

## When it graduates

One page, three candidate shapes, each physically playtested, one chosen and written as the M3 spec.
See `brainstorming` when ready.

#parking-lot #project-direction 
