# **Player Card Prompt Kit (Front \+ Back)**

## **Global Constraints (apply to both fronts and backs)**

* **Format:** portrait, poker size **2.5×3.5 in** (ratio **5:7**).

* **Print specs:** include **⅛″ bleed** on all sides → full canvas **2.75×3.75 in** at **300 dpi** (**825×1125 px**). Keep critical elements inside a **⅛″ safe margin**.

* **Camera/view:** **orthographic, straight-on, face-on**; **no perspective**; **single card**, fully visible; centered; **do not crop off any edge**; **no surrounding objects, hands, or table**; neutral plain background only.

* **Aesthetic:** **steampunk Napoleonic-era field journal**; aged yellowed parchment with creases, ink stains, smudges, subtle coffee rings; earthy tones (browns, olives, creams) with **brass** and **copper** accents; subtle filigree \+ light mechanical motifs (gears, rivets), tasteful, not overpowering.

* **Negative prompt (strong):** extra cards, stacks, angled views, perspective, drop shadows, hands, tables, backgrounds, logos, watermarks, text content, barcodes, QR codes, skulls, neon, sci-fi chrome, modern sans-serif UI elements, glossy TCG holographics.

  # 

# Front Prompt

**Prompt (fill the braces):**

Create a **single** poker-sized **card front** in a **steampunk Napoleonic-era field journal** style.  
 **Dimensions:** 2.75×3.75 in with ⅛″ bleed (825×1125 px at 300 dpi).  
 **View:** orthographic, straight-on, centered, full rectangular card visible, no cropping.  
 **Background material:** aged parchment with realistic fibers, light creases, faint ink stains, soft coffee rings; muted earthy palette with brass and copper accents.  
 **Layout (top-to-bottom):**

1. **Artwork Window** occupying \~{art\_area\_height%} of card height, at the **top**, fully unobstructed and central. Add a subtle inner border (ledger-line or stitched edge). **Leave it blank for art to be placed later.**

2. **Title Banner** immediately below the artwork window: an **expanded ornate banner** with {banner\_style: e.g., “brass cartouche with rivets” | “scrollwork ribbon” | “regimental plaque”}. The interior of the banner is empty for text later; ensure high legibility and generous width for long titles.

3. **Subtext Panel** below the title: a **larger blank section** for annotations/actions, bordered distinctly from the title; {subtext\_texture: “very faint ledger lines” | “plain parchment”}, keep contrast subtle so handwritten text will read later.  
    **Ornamentation:** corner filigree and small mechanical details (thin gear outlines, compass rose needles) framing the card edges, density {filigree\_density: low|medium}. Avoid overpowering the three sections.  
    **Spacing:** maintain a ⅛″ safe margin inside the trim for all borders and ornaments.  
    **Color & finish:** earthy browns/olives/creams; metallic accents in brass/copper with matte patina; avoid glossy highlights.  
    **Clarity:** no text, no icons inside the blank areas; no unit art; just the frame.  
    **Export:** crisp edges, print-safe contrast, minimal grain.  
    **Negative prompt:** perspective view, multiple cards, hands, table, glare, holographic foil, neon, modern UI, sci-fi chrome, over-crowded gears.

**Variables to dial:**

* `{art_area_height%}` \= 58–65 (start at 62).

* `{banner_style}` \= “brass cartouche with four rivets” | “scroll ribbon with copper clamps” | “enameled regimental plaque.”

* `{subtext_texture}` \= “plain parchment (no lines)” | “faint ledger lines” | “faint grid.”

* `{filigree_density}` \= low (recommended) | medium.

  # 

# Back Prompt

**Goal:** richly decorated back with a dominant emblem that looks the same upside-down.

**Prompt (fill the braces):**

Create a **single** poker-sized **card back** in a **steampunk Napoleonic-era field journal** style.  
 **Dimensions:** 2.75×3.75 in with ⅛″ bleed (825×1125 px at 300 dpi).  
 **View:** orthographic, straight-on, centered, full rectangular card visible, no cropping.  
 **Field:** full-bleed parchment background (aged, creased, faint ink stains, subtle coffee rings), earthy palette with brass/copper accents.  
 **Central Emblem/Seal:** a large, symmetrical {emblem\_motif: “laurel-wreathed gear \+ crossed sabers” | “crown-topped cog \+ compass rose” | “eagle-on-gear heraldic seal”} with **perfect 180° rotational symmetry** so the back reads identically upside-down. No text.  
 **Framing:** dense but balanced filigree and mechanical tracery filling the card field; include {corner\_style: “copper corner braces” | “brass photo-corners”} and subtle {stripe\_motif: “ledger ruling” | “rope border”} inside the safe margin.  
 **Composition constraints:** keep all critical lines within the safe margin; avoid any directional markers; no title areas.  
 **Finish:** matte patina metals, subtle engraving lines, no heavy gloss.  
 **Negative prompt:** text, numbers, logos, perspective, multiple cards, orientation arrows, modern decals.

**Variables to dial:**

* `{emblem_motif}` \= pick one per set for consistency.

* `{corner_style}` \= braces | photo-corners | screw plates.

* `{stripe_motif}` \= ledger lines | rope | braided ribbon.

Create a **single** poker-sized **card back** in a **steampunk Napoleonic-era field journal** style.  
 **Dimensions:** 2.75×3.75 in with ⅛″ bleed (825×1125 px at 300 dpi).  
 **View:** orthographic, straight-on, centered, full rectangular card visible, no cropping.  
 **Field:** full-bleed parchment background (aged, creased, faint ink stains, subtle coffee rings), earthy palette with brass/copper accents.  
 **Central Emblem/Seal:** a large, lion-on-gear heraldic seal

**rotational symmetry** so the back reads identically upside-down. No text.  
 **Framing:** dense but balanced filigree and mechanical tracery filling the card field; include copper corner braces and subtle edger ruling” inside the safe margin.  
 **Composition constraints:** keep all critical lines within the safe margin; avoid any directional markers; no title areas.  
 **Finish:** matte patina metals, subtle engraving lines, no heavy gloss.  
 **Negative prompt:** text, numbers, logos, perspective, multiple cards, orientation arrows, modern decals.