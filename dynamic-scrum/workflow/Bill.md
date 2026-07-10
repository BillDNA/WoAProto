# Bill — scratchpad

Numbered, freeform thoughts. Reference items as `B.N` elsewhere (where `B` is Bill's initial).
Strike through (~~like this~~) when addressed; the next `session-start` clears struck items.

> Ephemeral input, not a durable citation: when an idea is promoted into a ticket or `Decisions`, its
> *substance* is captured there so the artifact stands alone — a `B.N` pointer is never load-bearing
> (it's cleared once struck).

1. before you start doing a balance iteration pass on your own, lets make sure a could things are true
	1. the Claude plays is a full game of 1st to 3 victories with different maps drawn from the passed in map set and the deck set is respected as well
	2. confirm that running the balance report respects the card deck and map set selects
2. keep deck 1 as is; Based on the balance and battle reports you will work through this general loop (you can make commits between each loop).
	1. collect data - run a balance report (100), run 3 full games haiku low vs haiku low (these 3 jobs can be run in parallel, also probably want to maintain the seeds for the Claude plays seeds for an apples to apples across iterations) (note this is not the generate - reports skill but it's what it will be after this probably)
	2. do a analysis on the data generated
	3.  take the suggest 3 cards to be deleted and 3 cards to be made and the  suggest 3 maps to be deleted and 3 to be made, make a judgment call on which to chose and why this is the new deck and map set for the next iteration
	4. we have 5 decks the 1st is our current one so we will do this loop 4 times
3. constraints
	1. no rules changes or support / attack / defense value changes
	2. card deck must maintain 16 cards and all 10 infantry 2 calvary 1 artillery and 3 trenches must be theoretically deployable 
	3. map set must maintain exactly 12 cards
4. results - put a full report in /logs/reports/analysis by the end i should be able to go back and select each of the decks / map sets and play because we have the 5 slots 
