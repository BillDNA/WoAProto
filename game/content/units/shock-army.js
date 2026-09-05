/* EXPERIMENTAL unit variant — NOT ACTIVE (active:false). A worked example of
   the units content lever: a units file fully replaces maps.js's default unit
   block, so composition (counts), worth, and atk/def/sup are all editable as data.
   To try it in a balance run:  node dev/balance-report.js 20 hard hard --once --units shock-army
   Guardrail: the counts must still total 10 (the engine throws at load if not),
   and every type named here must have a room in engine/unit/ (it throws if not).
   This one trades infantry for a heavier cavalry wing (6/3/1) and gives the
   artillery a little armour and bounty (def 0->1, worth 3->4) to show value edits. */
(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],battalions:[],mapsets:[],units:[]};(c.units=c.units||[]).push(
{
 "id": "shock-army",
 "name": "Shock Army (experimental)",
 "experimental": true,
 "active": false,
 "units": {
  "infantry":  { "name": "Infantry",  "atk": 1, "def": 1, "sup": 1, "worth": 1, "count": 6 },
  "cavalry":   { "name": "Cavalry",   "atk": 3, "def": 0, "sup": 0, "worth": 2, "count": 3 },
  "artillery": { "name": "Artillery", "atk": 0, "def": 1, "sup": 2, "worth": 4, "count": 1 }
 }
}
);})(typeof window!=='undefined'?window:globalThis);
