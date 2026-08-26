/* DATA-ONLY commander stub (wayfinder #88, map #58). A commander binds a side to
   a piloting PERSONALITY and a theme, and reserves an inert `abilities` slot for
   the future rules-bending gameplay (#24). It is LOADED by the content loader
   (01-core.js reads content/kinds.js and globs each kind) but WIRED INTO NOTHING
   — the rules engine never reads WOA_CONTENT.commanders yet, so the symmetric
   golden path is untouched. The one deliberate execution ticket on the map: a
   stub with a load/schema test, no gameplay effect.

   Schema:
     id          unique slug
     name        display name
     side        'red' | 'blue' | null   (null = usable by either side; fits the
                                           asymmetric per-side deck path #55)
     theme       free string — the flavour axis (e.g. 'woods'); user-story 11
                 links it to the piloting personality
     personality the heuristic AI temperament this commander pilots with — an
                 `aiConfig` value (see engine/05-ai.js), one of:
                   • a STRING: a named preset / maps.js `ai` row today, a
                     personality-panel entry once #86 lands (a pointer, unresolved
                     here — the panel it points into doesn't exist yet), OR
                   • an OBJECT: an inline AI_WEIGHTS override row — the commander
                     HOLDS its own weights, projecting its "personality" straight
                     into the heuristic evaluation (see the woods-baiter below).
                 NOTE: difficulty (search DEPTH — `breadth`/`replySamples` in the
                 config) is a SEPARATE run-time dial, NOT stored on the commander;
                 at pilot time the run merges the commander's weights under the
                 chosen difficulty (aiConfig({ weights, breadth })). Personality =
                 what it values; difficulty = how deep it searches.
     abilities   []  — the #24 rules-bending hook. Stays EMPTY/INERT today. */
(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[],mapsets:[],units:[],commanders:[]};(c.commanders=c.commanders||[]).push(
{
 "id": "forestier",
 "name": "Forestier",
 "side": null,
 "theme": "woods",
 "personality": "hard",
 "abilities": []
}
);})(typeof window!=='undefined'?window:globalThis);
