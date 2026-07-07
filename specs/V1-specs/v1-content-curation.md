#spec
# V1 — Content curation: trim to 12 maps + a map-set "deck" mechanic — first impressions & questions

Feedback Round 5, "game content": *"trim down to 12 maps — might also want a similar deck mechanic
like we do for the action cards."*

A **thinking doc, not an implementation plan.** Nothing here is committed.

## Where the roster stands

**17 maps today** in `content/maps/` — 5 over the target of 12:

```
black-forest  causeway  frontier  highwater  killing-ground  long-march  open-mountain-pass
riverbend  saber-ridge  the-bulge  the-cockpit  the-ford  the-marshes  the-narrows  the-void
twin-gates  twin-woods
```

Each is a deletable file (Round-4 Pass-2 content system); "delete a map = delete its file"
(`/api/deletemap`). Which maps are in the *match pool* is currently a per-browser preference
(`woa-disabled-maps`) — the crude, un-named version of the "deck" mechanic Bill is asking for.

## Trimming to 12 — method, not a guess

I won't hand-name 5 cuts from stale signals — the code-overview balance notes reference map names
that predate this roster (Thornfield/Vanguard/Long March/etc.), so the roster has already turned
over. **The honest way to pick the 5 is data + coverage:**

- **Run a fresh balance report** (the `generate-reports` / `dev/balance-report.js` path) over the
  current 17 to get each map's Red% / 1st-mover% / HQ% / Drag / Swings / **Balance score**.
- **Cut on two axes:**
  1. **Broken/uninteresting** — worst Balance scores (side- or mover-biased, or attrition-only
     grinds with no lead swings). [[graphs-spec]] #1 (fairness scatter) + #2 (tension profile) are
     literally the pictures that make these pop.
  2. **Redundant** — maps that occupy the same niche (distance band + terrain mix + shape). If two
     maps play the same and both are fine, the roster only needs one; keep the better-balanced.
- **Preserve coverage.** The 12 should still span the distance bands, each terrain type
  (forest/mountain/river), and the shape variety — don't let the cut collapse the roster onto one
  archetype. `run-tournament` / the rubrics' map coverage view is the check.

→ Deliverable when Bill's ready: a fresh report + a ranked cut list ("these 5, because…") for Bill
to approve before any file is deleted. Deleting is one `/api/deletemap` (or `rm`) per map once he
signs off.

## The "map-set deck" mechanic

Bill wants "a similar deck mechanic like we do for the action cards." The action-card system has:
**named deck slots, one active, file-backed** (`content/decks/<slug>.js`, `active:true`; 5 editing
slots in localStorage). Mirror that for maps:

- **`content/mapsets/<slug>.js`** — a named set that `push`es a list of map ids into `WOA_CONTENT`
  (same pattern as decks), one flagged `active`. E.g. a 12-map **"Tournament"** set, a themed
  **"Rivers"** set, a small **"Rush test"** set.
- The **active map-set drives the match pool**, replacing the per-browser `woa-disabled-maps`
  hack with a real, shareable, file-backed object (so LAN joins and the lab agree on the roster —
  today `woa-disabled-maps` is per-browser and invisible to `balance.js`).
- **Curation parity with the Deck Editor:** switch active set, edit membership, save — same UX and
  the same `/api/save…`+manifest-regen plumbing. `balance.js` / `balance-report.js` gain a
  `--mapset <slug>` filter so a report runs exactly the active competitive set, not "all 17 files
  on disk."

### Two readings — which one?

1. **Curated playlists (my read of the V1 ask):** named sets you switch between; the active set is
   the roster for play + reports. This is the direct "like the action-card decks" parallel and it
   *supersedes* the `woa-disabled-maps` pref cleanly.
2. **Map draft / deck-in-play (roguelite adjacency):** draw maps for a match from a shuffled
   map-deck. This is the post-V0 roguelite direction in the Vision, not obviously what "trim to 12"
   wants. I'd hold it unless Bill says otherwise.

## Questions for Bill

1. **Trim method:** run a fresh report and bring you a ranked "cut these 5, because…" list to
   approve (my plan), or do you already know the 5 you want gone?
	1. use the reports we have already generated and use your best judgment
2. **Map-set = curated playlists** (reading #1 — named sets, one active, drives the pool + reports)?
   Or are you picturing the roguelite draw-from-a-map-deck (reading #2)?
	1. map-set is so i can easily group ones i'm working on so playing but in the future i do se them growing into some sort of part for the roguelite's game creation think campaign decks 
3. **How many set slots?** Mirror the decks' 5 editing slots, or just 1 active "competitive set"
   + the full library?
	   + 5 is great
1. **Replace `woa-disabled-maps`?** OK to retire the per-browser disabled-maps pref in favor of a
   file-backed active set (one shared roster across play modes + the lab), or keep both?
	1. yes
2. **Timing:** delete the 5 files now (after you approve the cut list), or keep all 17 on disk and
   just ship a 12-map active "Tournament" set that the pool/reports use — so nothing is lost, the
   competitive roster is just curated to 12? (My lean: the map-set approach means you may not need
   to delete at all — the set *is* the trim.). 
	1. i would like to trim down first then we can start expanding again.

Note #5 is the nice synergy: **the map-set mechanic may make the "trim to 12" a curation act, not a
deletion** — keep the library, run/play the active 12. Answer 1–2 and I'll spec the `mapsets/` file
format + editor + the `--mapset` report filter, and bring the cut list.
