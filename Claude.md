
we are taking a board game prototype and turning it into a playable prototype in the web browser,  the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

* look at design-doc/visualADJ
	* bug with terrain - edged should all live inside one hex, see yellow lines 
	* Red & blue - the player cards make more square and use icons / images in addition to the label for the.  If you look at the physical player mat since each unit has a slot on the mat it becomes easy to see at a glance what has been played and what hasn't
	* purple - adjust the sizing of the campaign journal.  Also some the actual text needs a design pass, for example the cardiants of the hex are not very human readable, and it is hard to understand at a glance which hex is being talked about.  
	* teal - center the campaign score card.

Other updates
* some simple animation - it's up to you how complex 
* A way to see which cards have already been removed from the game, not just from my deck but also the enemy
* Updates to the save map system
	* what i really want is a json file,  maybe for the for set of  maps or individual (up to you understanding my goal is rapid prototyping here)
	* I think there is a Ballance issue with maps larger previously i let you design map layouts 20-30 hexes in size.  so rethink the initial set of maps and the available sizes / shapes of maps you can get creative with the shapes but keep in mind due to the number of units there can only ever be 22 controlled hexes at an upper limit (that's all units deployed on both sides).
* Version control - I made a git hub repo (https://github.com/BillDNA/WoAProto.git) so set up git
* Multiplayer and hosting 
	* thoughts on using git hub pages to be able to put this in front of people seems like a simple win. Obviously some one would still have to run the server on their machine to get PvP but this seems like it gives us single player for free and available as a simple link.

Art
* I know you can't generate images but maybe you want to create a md file with prompts for other ai's, I can then run those and hand them off to you.
* in design-docs/protoArt you will find some of the old art attempts i was making, their is an .xcs file not sure if you can read those but this is what i sent to my laser cutter to make the prototype.  Some of them are just silhouettes (for making a good shape to laser cut), some are initial attempts to design cards I haven't gone through the psd files but non of the stuff in this folder can be considered done but i think it might give you directional intent


Questions 
* just curious about getting a general overview of your approach to the ai, i want some understanding of how it 'thinks'
* your opinions on the game its self
* Keeping in mind my goal with this prototype is to be able to do rapid prototyping and balancing iterations what are some things we should add.  if they are a no brainer simple win you can just do it, 
