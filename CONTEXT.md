# War of Attrition — the concept address book

The words we use for this system, and where each one is law. This page says which area a concept belongs to; the area pages hold the concepts.

The lexicon names things and never enumerates them. Which cards, maps and battalions exist is `ls game/content/`; what "good" currently measures is `docs/balance/`. A definition that would drift when the game is retuned belongs on neither this page nor an area page.

Every term carries a `_Home_:` — a file plus a greppable anchor where the concept is defined or enforced, never a line number. `node dev/check-context.js` fails when a home stops resolving.

## [Game concepts](docs/context/game-concepts-context.md)

Would this be in the rule book? The fight itself, and everything two people playing on a table would have to agree on before they could finish a game.

## [Interface](docs/context/interface-context.md)

How does a human drive this? The places someone goes, what they see and do while a Skirmish is on, what has to survive between visits, and the shared ink every screen is drawn with.

## [Integration](docs/context/integration-context.md)

How does one part talk to another? The agreed shapes at a handoff, where one side can change without telling the other.

## [Heuristic AI](docs/context/heuristic-ai-context.md)

Does it exist to fill a seat and choose a move where no human is choosing? What the bot is, and how it decides.

## [Dev-tooling](docs/context/dev-tooling-context.md)

Does it ship with the game, or is it built to help develop the game? Everything used to run games in bulk and judge what came back.
