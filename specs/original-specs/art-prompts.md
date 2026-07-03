#spec
# Art Prompt Kit — War of Attrition digital prototype

Prompts ready to paste into an image AI (Midjourney / DALL-E / Stable Diffusion etc.).

**The pipeline (now live, June 2026):** drop raw renders into `game/art/` named
`<card-id>.png` (bare id, e.g. `naval_barrage.png` — no prefix), then run
`powershell -ExecutionPolicy Bypass -File dev\optimize-art.ps1`. It sweeps the
heavy originals into `design-docs/art-originals/` (gitignored), trims transparent
margins, and writes web-weight versions back into `game/art/`. The game looks art
up **by card id** (`art/<id>.jpg`, then `.png`) and quietly falls back to the
text-only card face when nothing matches — new cards in maps.js just need a
matching filename, and missing art never breaks anything.

Status: all 13 card illustrations + title plaque + table felt + board parchment
are in. The Priority-1 unit emblems were skipped (the drawn glyphs read fine).

These extend the card frame kit in `Player Card Art direction drafts.md` — same
world: **steampunk Napoleonic-era field journal**. Aged parchment, ink, brass and
copper, earthy browns/olives/creams, matte patina, no gloss, no neon, no modern UI.

**Shared negative prompt (append to everything):**
> photorealism, 3D render, neon, sci-fi chrome, glossy highlights, modern UI elements,
> watermark, text, logo, drop shadow, perspective view, cropped edges

---

## Priority 1 — unit emblems (the biggest at-a-glance win)

Used on the board pieces and the player-mat slots, so they must read at **32 px**.
One prompt per unit, run twice: once with "deep crimson red" and once with
"prussian blue" — or better, ask for **ink-black silhouette** and I'll tint them
in-game (preferred; matches the laser-cut pieces).

Format for all four: **square, flat 2D emblem, centered, plain white background**
(I'll knock the background out), thick confident silhouette shapes like the
laser-cut wooden pieces. Save as `inf.png`, `cav.png`, `art.png`, `hq.png`.

- **Infantry** (`inf.png`)
  > Flat 2D military emblem of a Napoleonic line infantryman silhouette, standing
  > with musket at the ready, side profile, shako hat, bold solid ink-black shape
  > with minimal interior cutouts, steampunk field-journal style, small brass gear
  > accent at the base, white background, high contrast, reads clearly at small size

- **Cavalry** (`cav.png`)
  > Flat 2D military emblem of a Napoleonic cavalry rider silhouette, horse in full
  > gallop, raised saber, side profile, bold solid ink-black shape, steampunk
  > field-journal style, small copper rivet accents at the base, white background,
  > high contrast, reads clearly at small size

- **Artillery** (`art.png`)
  > Flat 2D military emblem of a Napoleonic field cannon silhouette, side profile,
  > large spoked wheel, bold solid ink-black shape, steampunk field-journal style,
  > a single brass gear as the wheel hub, white background, high contrast, reads
  > clearly at small size

- **Headquarters** (`hq.png`)
  > Flat 2D military emblem of a command tent with a regimental standard flag,
  > front view, bold solid ink-black silhouette, steampunk field-journal style,
  > crossed sabers behind the tent, small compass rose accent, white background,
  > high contrast, reads clearly at small size

## Priority 2 — card illustrations (13, one per order)

These fill the blank **artwork window** of the card fronts from your existing kit.
**Landscape 5:3**, painted-sketch style. Save as `<id>.png` using the ids below.

Shared style line (prepend to each):
> Hand-painted field-journal illustration, ink and muted watercolor on aged
> parchment, steampunk Napoleonic war scene, earthy browns olives and creams with
> brass accents, loose confident brushwork, no text, no border

| id                   | scene prompt                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `deploy_inf_start`   | a column of infantry marching out of a fortified camp at dawn, sergeant pointing the way                         |
| `deploy_artillery`   | a gun crew heaving a brass-fitted field cannon into position, mud and rope, steam pressure gauge on the carriage |
| `deploy_inf_trench`  | soldiers digging a trench line with picks and shovels while one stands watch, earth thrown high                  |
| `airdrop`            | infantrymen descending under canvas-and-brass dirigible parachutes through clouds, one steadying his rifle       |
| `conscription`       | a recruiting officer at a village square table, a ragged line of new men, drum and banner                        |
| `deploy_cavalry`     | two cavalry squadrons wheeling out of camp at a trot, pennants flying, dust rising                               |
| `attack_plus1`       | an officer with a brass spyglass directing a bayonet charge, signal flags raised                                 |
| `mass_assault`       | a wide battle line surging forward in two waves across broken ground, smoke and standards                        |
| `careful_maneuvers`  | troops slipping along a hedgerow at dusk in single file, officer checking a pocket watch                         |
| `reckless_maneuvers` | cavalry leaping a stone wall directly into musket smoke, rider standing in the stirrups                          |
| `ordered_withdraw`   | a disciplined fighting retreat, rear rank firing while the front rank steps back through them                    |
| `naval_barrage`      | a distant ironclad's broadside flash on the horizon, shells bursting in a forest, trees splintering              |
| `forced_march`       | exhausted infantry marching hard down a sunken road at night, lantern light, one man asleep walking              |

## Priority 3 — table dressing

- **Menu title plaque** (`title.png`, wide 4:1, transparency)
  > An engraved brass nameplate banner with rivets and patina, empty center field
  > for text, scrollwork ends, slight verdigris, steampunk Napoleonic field-journal
  > style, isolated on white
- **Felt table / page background** (`table.jpg`, 16:9, tileable if possible)
  > Top-down view of a war-room campaign table surface: dark green wool felt with
  > scattered faint compass construction lines and old coffee rings, very low
  > contrast, suitable as a quiet UI background, no objects
- **Parchment hex-map texture** (`board.jpg`, square)
  > Aged blank parchment sheet for a military map, fibrous texture, light creases
  > and fox spots, faint iron-gall ink margin ruling, no drawings, no text

## What I'll do with them

1. Unit emblems replace the abstract circle glyphs on board + mats (tinted red/blue).
2. Card illustrations slot into the card faces and the play-card dialog.
3. Title plaque + textures dress the menu and board background.

Nothing blocks on art — the game stays fully playable with the drawn glyphs until
these arrive.
