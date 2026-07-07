# War of Attrition — "Black Forest" (seed 1234)

- rules version: **0.3**
- red: **haiku** · blue: **normal**
- 2026-07-07T05:55:07.013Z
- Result: **Blue** wins by hq after 16 turns
- Fallbacks (LLM reply unusable → engine chose): 6 of 25 decisions

## Decisions
- T1 red — card: "Deploy Infantry" — _mock: always the first option_
- T1 red — step-deploy: Deploy Infantry at A3 — _(fallback: choice failed)_  `(fallback)`
- T2 blue — card: "Deploy Cavalry"
- T3 red — card: "Ordered Withdraw" — _mock: always the first option_
- T4 blue — card: "Airdrop"
- T5 red — card: "Naval Barrage" — _mock: always the first option_
- T5 red — step-barrage: Skip this step — _mock: always the first option_
- T5 red — step-attack: Attack: Infantry at A3 strikes enemy Infantry at A1 through the HQ at A2 — power 2 vs 1: defender destroyed — _(fallback: choice failed)_  `(fallback)`
- T6 blue — card: "Reckless Maneuvers"
- T7 red — card: "Attack +1" — _mock: always the first option_
- T8 blue — card: "Deploy Artillery"
- T9 red — card: "Airdrop" — _mock: always the first option_
- T9 red — step-deploy: Deploy Infantry at A3 — _(fallback: choice failed)_  `(fallback)`
- T10 blue — card: "Deploy Infantry"
- T11 red — card: "Attack +1" — _mock: always the first option_
- T11 red — step-attack: Attack: Infantry at A1 strikes enemy Infantry at B3 through the HQ at A2 — power 4 vs 3: defender destroyed — _(fallback: choice failed)_  `(fallback)`
- T12 blue — card: "Conscription"
- T13 red — card: "Entrench" — _mock: always the first option_
- T13 red — step-deploy: Skip this step — _mock: always the first option_
- T13 red — step-trench: Dig a trench at A3 covering edges NW+W — _(fallback: choice failed)_  `(fallback)`
- T14 blue — card: "Attack +1"
- T15 red — card: "Careful Maneuvers" — _mock: always the first option_
- T15 red — step-reposition: Skip this step — _mock: always the first option_
- T15 red — step-attack: Attack: Infantry at A3 strikes enemy Infantry at B3 through the HQ at A2 — power 1 vs 4: your attacker is DESTROYED — _(fallback: choice failed)_  `(fallback)`
- T16 blue — card: "Naval Barrage"

## Campaign journal
- T1 Battle 1 — "Black Forest". Red moves first.
- T1 Red plays "Deploy Infantry".
- T1 Red deploys Infantry at A3.
- T2 Blue plays "Deploy Cavalry".
- T2 Blue deploys Cavalry at D3.
- T2 Blue deploys Cavalry at D2.
- T3 Red plays "Ordered Withdraw".
- T3 Red finds no opening — the order is spent to no effect.
- T4 Blue plays "Airdrop".
- T4 Blue deploys Infantry at A1.
- T5 Red plays "Naval Barrage".
- T5 Red Infantry attacks Blue Infantry at A1, striking through the HQ (2 vs 1): defender destroyed, attacker advances.
- T6 Blue plays "Reckless Maneuvers".
- T6 Blue swaps the units at D3 and D2.
- T7 Red plays "Attack +1".
- T7 Red finds no opening — the order is spent to no effect.
- T8 Blue plays "Deploy Artillery".
- T8 Blue deploys Artillery at C4.
- T9 Red plays "Airdrop".
- T9 Red deploys Infantry at A3.
- T10 Blue plays "Deploy Infantry".
- T10 Blue deploys Infantry at B3.
- T11 Red plays "Attack +1".
- T11 Red Infantry attacks Blue Infantry at B3, striking through the HQ (4 vs 3): defender destroyed, attacker advances.
- T12 Blue plays "Conscription".
- T12 Blue deploys Infantry at C3.
- T12 Blue deploys Infantry at B4.
- T13 Red plays "Entrench".
- T13 Red digs a trench at A3.
- T14 Blue plays "Attack +1".
- T14 Blue Infantry attacks Red Infantry at B3 (5 vs 3): defender destroyed, attacker advances.
- T15 Red plays "Careful Maneuvers".
- T15 Red Infantry attacks Blue Infantry at B3, striking through the HQ (1 vs 4): attack repelled, attacker destroyed.
- T16 Blue plays "Naval Barrage".
- T16 Blue's naval barrage obliterates a trench at A3.
- T16 Blue Infantry attacks Red HQ at A2 (2 vs 0): defender destroyed, attacker advances.
- T16 Blue wins the battle by capturing the headquarters!

## Felt-notes

### red (haiku)

Mock felt-notes: skipping every step felt weak; the countdown felt strong; nothing was luck-driven because I never rolled the dice. Suggested change: use a real model.
