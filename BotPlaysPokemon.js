var irc = 				require('irc'),
	os = 				require('os'),
	exec = 				require('child_process').exec,
	fs = 				require('fs'),
    assert =            require('assert'),
	pokemonDictionary = require("./pokemon_array.json"),
	pokemonDatabase = 	require("./pokemon_database.json"),
	moveDatabase = 		require("./move_database.json"),
    app = require('express').createServer();
    io = require('socket.io')(app);

var mac = (os.platform().toLowerCase() == "darwin");


var screen = {
	widthRatio: process.argv[2] / 1920,
	heightRatio: process.argv[3] / 1080,
	width: process.argv[2],
	height: process.argv[3]
}
var heightOffset;
if(mac) heightOffset = .1777 * process.argv[3] / 2;
console.log(heightOffset);

console.log(screen);

function debug(){
	//if( debugging ){
		console.log( Array.prototype.slice.call(arguments).join(" ") );
	//}
}

function padToSize(string, size){
	while(string.length < size){
		string += " ";
	}
	return string;
}

function read(filename){
	return fs.readFileSync(filename, "utf8").trim()
}

function editDistance(a, b) {
  if(a.length === 0) return b.length; 
  if(b.length === 0) return a.length; 
 
  var matrix = [];
 
  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }
 
  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }
 
  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }
 
  return matrix[b.length][a.length];
};

function closestString(needle, haystack){
	var closestDistance = Number.MAX_VALUE;
	var bestName = "";
	haystack.forEach(function(element, index, array){
		var dist = editDistance(needle.toLowerCase(), element.toLowerCase());
		if(dist < closestDistance){
			closestDistance = dist;
			bestName = element;
		}
	});

	return {string: bestName, distance: closestDistance};
}

String.prototype.contains = function(frag) { return this.indexOf(frag) !== -1; };

var specialCases = {
	health: {
		"Metapod": 0,
		"Kakuna":  0
	},
	damageModifications: {
		"Transform": 50,
		"Solarbeam": 120,
		"Hyper Beam": 150 
	}
}

var User = {
	username: 	"daguava",
	oauth: 		"oauth:iazmm085g57yiy8m5bnswyxdfvjidt7",
	balance: 	NaN,
	wins: 		0,
	losses:		0
}

var Twitch = new irc.Client("irc.twitch.tv", User.username, {
    channels: [["#twitchplayspokemon"] + " " + User.oauth],
    port: 6667,
    debug: false,
    password: User.oauth,
    userName: User.username,
    realName: User.username,
    secure: false,
    showErrors: true,
	floodProtection: true,
	floodProtectionDelay: 500,
	state: {
		acceptingBalanceInquiries: false
	}
});

Twitch.addListener('message', function (from, to, message) {
	if( from == "tppinfobot" ){
		console.log(from + " " + message);
		if( message.contains("new match") ){
			setTimeout(function(){
				Twitch.say("#twitchplayspokemon", "!balance");
			}, ( Math.random()*5000 + 5000 ));
		}
		if( message.contains("20 seconds") ){
			Bot.canBet = true;	// may want to move to "new match" for slow connections that skip
		}
		if( message.contains("10 seconds") ){
			//Bot.canBet = false;
		}
		if( message.contains("time is now over") ){
			Bot.canBet = false;
		}
		if( message.contains("about to begin") ){
			setTimeout(function(){
				if(Bot.state == "place_bet"){
					Bot.canBet = false;
					Bot.state = "screenshot_team_data";
					Bot.busy = false;
				}
			}, 10000);
			
		}
	}

	if( from == "tppbankbot" ){
		if( message.toLowerCase().contains( User.username.toLowerCase() ) ){
			var prevBalance = User.balance;
			User.balance = Number( message.split(" ").pop() );
			if(User.balance > prevBalance && ! isNaN(prevBalance) ){
				User.wins++;
				console.log('A winner is us!: ', User.wins.toString() + " / " + User.losses.toString() );
			} else if(User.balance < prevBalance || ( User.balance == 100 && prevBalance == 100) ){
				User.losses--;
				console.log('Losers, we are it');
			} else if(User.balance == prevBalance, User.wins.toString() + " / " + User.losses.toString()){
				// do nothing
			}
			console.log("Updated User.balance to " + User.balance.toString() );
		}
	}

});

Twitch.bet = function(team, amount, callback){

	//if(Bot.canBet){
		
		var betString = "!bet " + parseInt(amount).toString() + " " + team;
		console.log("Betting!", betString);
		Twitch.say("#twitchplayspokemon", betString);
		Bot.canBet = false;
		callback();
		
	//} else {
	//	console.log("Skipped doing a bet");
	//}
	
	
}

var Bot = {
	state: 	"initial_balance",
	canBet: false,
	balanceUpdated: false,
	busy: 	false,
	analysis: {
		valid: false,
		blue: {
			pokemon: [],
			ratio: 	0,
			damage: 0,
			health: 0
		},
		red: {
			pokemon: [],
			ratio: 	0,
			damage: 0,
			health: 0
		},
		guess: {
			team: "neither",
			confidence: 0
		}
	},
	analyzeScreenshot: 	function(callback){

		var x1 = 493,
			x2 = 661,
			x3 = 828,
			x4 = 930,
			x5 = 1095,
			x6 = 1265,
			x7,
			x8,
			x9;

		var y1 = 245,
			y2 = 245,
			y3 = 245,
			y4 = 640,
			y5 = 640,
			y6 = 640,
			y7,
			y8,
			y9;

		if( mac ){
			x1 = 334;
			x2 = 458;
			x3 = 570;
			x4 = 615;
			x5 = 735;
			x6 = 865;
		}

		var commands = [
			// take a screenshot
			( ! mac) ? "convert screenshot: ./screenshot.jpg" : "screencapture ./screenshot.jpg",
			// find first blue pokemon, crop, filter, ocr
			"convert screenshot.jpg -crop 8.6%x2.8%+" + x1 + "+" + y1 + " ./temp.png",
			"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
			"tesseract temp.png ./blue_first bazaar",	// semi-accurate blue_first pokemon name

			//find second blue pokemon, crop, filter, ocr
			"convert screenshot.jpg -crop 8.6%x2.8%+" + x2 + "+" + y2 + " ./temp.png",
			"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
			"tesseract temp.png ./blue_second bazaar",	// semi-accurate blue_second pokemon name

			// find third blue pokemon, crop, filter, ocr
			"convert screenshot.jpg -crop 8.6%x2.8%+" + x3 + "+" + y3 + " ./temp.png",
			"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
			"tesseract temp.png ./blue_third bazaar",	// semi-accurate blue_third pokemon name

			// find first red pokemon, crop, filter, ocr
			"convert screenshot.jpg -crop 8.6%x2.8%+" + x4 + "+" + y4 + " ./temp.png",
			"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
			"tesseract temp.png ./red_first bazaar",	// semi-accurate red_first pokemon name

			// find second red pokemon, crop, filter, ocr
			"convert screenshot.jpg -crop 8.6%x2.8%+" + x5 + "+" + y5 + " ./temp.png",
			"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
			"tesseract temp.png ./red_second bazaar",	// semi-accurate red_second pokemon name

			// find third red pokemon, crop, filter, ocr
			"convert screenshot.jpg -crop 8.6%x2.8%+" + x6 + "+" + y6 + " ./temp.png",
			"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
			"tesseract temp.png ./red_third bazaar",		// semi-accurate red_third pokemon name

			// find money bet on blue
			"convert screenshot.jpg -crop 8%x4%+" + 23 + " -channel red -threshold 100% -channel green -threshold 100% -channel blue -threshold 40% ./temp.png",
			"convert ./temp.png -threshold 20 ./temp.png",
			"tesseract temp.png ./blue_money_bet bazaar",

			// find money bet on red
			"convert screenshot.jpg -crop 8%x4%+" + 1766 + " -channel blue -threshold 100% -channel green -threshold 100% -channel red -threshold 40% ./temp.png",
			"convert ./temp.png -threshold 20 ./temp.png",
			"tesseract temp.png ./red_money_bet bazaar",

			// see if "place your bets" text is up
			"convert screenshot.jpg -crop 16.4%x6.7%+" + 330 + " -channel blue -threshold 100% -channel green -threshold 100% -channel red -threshold 40% ./temp.png",
			"convert ./temp.png -threshold 20 ./temp.png",
			"tesseract temp.png ./place_your_bets bazaar"
		];

		var consoleString = (mac) ? commands.join("; ") : commands.join(" && ");
        //console.log(consoleString);
		exec( consoleString, callback );

	},
	calculateAttackDamage: function(firstPokemon, secondPokemon, attack){
		// pokemon gen 2 damage formula
		attack = moveDatabase[ attack ];

		var attackBase;
			var level = 		100;
			var special = 		attack.special;
			var attackStat =  	( ! special ) ? firstPokemon.attack : firstPokemon.specialAttack;
				attackStat = 	Number(attackStat);
			var defenseStat = 	( ! special ) ? secondPokemon.defense : secondPokemon.specialDefense;
				defenseStat = 	Number(defenseStat);
			var base = 			Number(attack.base);
			if( specialCases.damageModifications.hasOwnProperty( attack.name ) ){
				base = specialCases.damageModifications[ attack.name ];
			}
			attackBase = ( ( (2 * level + 10) / 250 ) * (attackStat / defenseStat) * base + 2);

		var modifier;
			var STAB = 		( firstPokemon.types.indexOf( attack.type ) !== -1 ) ? 1.5 : 1;
			var typeMult = 	Number(secondPokemon.weakness[ attack.type ]);
			modifier = STAB * typeMult;

		var damage = 	 attackBase * modifier;

		var averageDamage = damage * (attack.accuracy / 100);

		return averageDamage;
	},
	pokemonFirstAttacksSecond: function(firstPokemon, secondPokemon){
		var maxDamage = 0;
		var bestAttack = "";
		firstPokemon.attacks.forEach(function(attack){
			var damage = Bot.calculateAttackDamage(firstPokemon, secondPokemon, attack.name);
			if(damage > maxDamage){
				maxDamage = Math.round(damage);
				bestAttack = attack.name;
			}
		});
		debug("\t" + padToSize(firstPokemon.name) + " attacks " + padToSize(secondPokemon.name) + " guess: (" + bestAttack + ":" + maxDamage + ")")

		return Math.min(maxDamage, secondPokemon.hp);
	},

    placeBet: function(callback){

        /* Only bet up to 10% of the User.balance */
        var baseBet = User.balance * 0.10;

        var blueScore = Bot.analysis.blue.damage / Bot.analysis.red.health;
        var redScore = Bot.analysis.red.damage / Bot.analysis.blue.health;

        var minScore = Math.min(blueScore, redScore);

        blueScore /= minScore;
        redScore /= minScore;

        Bot.analysis.blue.ratio = blueScore;
        Bot.analysis.red.ratio = redScore;

        var confidence = Math.max(blueScore, redScore);
        Bot.analysis.guess.confidence = confidence;

        console.log("blueScore: " + blueScore + " redScore: " + redScore);

        var team = (blueScore > redScore) ? "blue" : "red";


        var bet = 0;
		if(confidence > 1){
			bet = User.balance * 0.10;
		}
		if(confidence > 1.3){
			bet = User.balance * 0.15;
		}
		if(confidence > 1.5){
			bet = User.balance * 0.23;
		}
		if(confidence > 1.6){
			bet = User.balance * 0.3;
		}
		if(confidence > 2.1){
			bet = User.balance * 0.75
		}
		if(confidence > 3){
			bet = User.balance
		}
		
		//if(bet < 100 && User.balance > 300) bet = 100;
		if(bet > User.balance) bet = User.balance;
		if( User.balance == 100) bet = 100;

		bet = Math.min( Math.ceil(bet/10)*10, User.balance );

        Twitch.bet(team, bet, callback);

    }

}


/* 
	mainLoop
		Run by an interval, checks for current bot state and if bot is busy.
		Based on state, will call several other functions to perform bot tasks.
		Interval calls can overlap, busy flag makes sure one instance at a time at nice interval.
		Use of interval prevents possability of stack overflow, since mainLoop will not call itself.
*/
function mainLoop(){

    var debugging = process.argv[4] == "-d";

	if( Bot.busy ){
		debug("Bot busy, skipping mainLoop");
		return;
	}

	Bot.busy = true;

	if( Bot.state == "initial_balance" ){
		Twitch.say("#twitchplayspokemon", "!balance");
		debug("Waiting for intial User.balance... (requires certain time window)");
		var balanceUpdateInterval = setInterval(function(){
			debug("Inside interval");
			if( ! isNaN(User.balance) ){
				Bot.state = "screenshot_team_data";
				Bot.busy = false;
				clearInterval(balanceUpdateInterval);
			}
		}, 250);
	} else if( Bot.state == "screenshot_team_data" ){
		debug("Getting screenshot team data");
		Bot.analyzeScreenshot(function(){ // callback
			Bot.state = "check_team_data";
			Bot.busy = false;
		});	// analyze and parse screenshot
	} else if( Bot.state == "check_team_data" ){
		debug("Checking team data");
		Bot.analysis.valid = false;

		var bluePokemonInaccurate = [ read( "./blue_first.txt" ), read( "./blue_second.txt" ), read( "./blue_third.txt" ) ];
		var redPokemonInaccurate  = [ read( "./red_first.txt"  ), read( "./red_second.txt"  ), read( "./red_third.txt"  ) ];

		var bluePokemon = [],
			redPokemon  = [];

		bluePokemonInaccurate.forEach(function( name ){
			if(name){
				var closeObj = closestString( name, pokemonDictionary );
				if( closeObj.distance < ( 1/2 * closeObj.string.length ) ){	// if( name close enough to signify decent lookup )
					bluePokemon.push( pokemonDatabase[ closeObj.string ] );
				}
			}
		});

		redPokemonInaccurate.forEach(function( name ){
			if(name){
				var closeObj = closestString( name, pokemonDictionary );
				if( closeObj.distance < ( 1/2 * closeObj.string.length ) ){	// if( name close enough to signify decent lookup )
					redPokemon.push( pokemonDatabase[closeObj.string ] );
				}	
			}
			
		});

		if( bluePokemon.length + redPokemon.length === 6 ){
			// successfully found all six names, set names and change state to prevent a do-over
			Bot.analysis.blue.pokemon = bluePokemon;
			Bot.analysis.red.pokemon  = redPokemon;
			Bot.state = "populate_team_data";
		} else {
			// if condition not met, had trouble parsing names, either we aren't on the correct screen, or OCR had a tough time on a name. Do it again!
			Bot.state = "screenshot_team_data";
		}

		Bot.busy = false;

	} else if( Bot.state == "populate_team_data" ){
		debug("Populating team data");

		Bot.analysis.blue.damage = 0;
		Bot.analysis.red.damage = 0;
		Bot.analysis.blue.health = 0;
		Bot.analysis.red.health = 0;

		Bot.analysis.blue.pokemon.forEach(function( bluePokemon ){
			Bot.analysis.red.pokemon.forEach(function( redPokemon ){

				Bot.analysis.blue.damage += Bot.pokemonFirstAttacksSecond( bluePokemon, redPokemon );
				Bot.analysis.red.damage  += Bot.pokemonFirstAttacksSecond( redPokemon, bluePokemon );

			});
		});

		Bot.analysis.blue.pokemon.forEach(function( pokemon ){
			if( specialCases.health.hasOwnProperty( pokemon.name ) ){
				Bot.analysis.blue.health += specialCases.health[ pokemon.name ];
			} else {
				Bot.analysis.blue.health += Number( pokemon.hp );
			}
		});

		Bot.analysis.red.pokemon.forEach(function( pokemon ){
			if( specialCases.health.hasOwnProperty( pokemon.name ) ){
				Bot.analysis.red.health += specialCases.health[ pokemon.name ];
			} else {
				Bot.analysis.red.health += Number( pokemon.hp );
			}
		});

		// if all is well to this point
		Bot.analysis.valid = true;
		Bot.state = "place_bet";
		Bot.busy = false;

	} else if( Bot.state == "place_bet" ){

		debug("Placing bet");
		console.log("Betting phase");

        Bot.placeBet(function(){
        	Bot.state = "screenshot_team_data";
        	setTimeout(function(){
        		Bot.busy = false;
        	}, 60 * 2 * 1000); // wait 2 minutes before looking for the next team
        	
        	console.log("Callback happened");
        });
        
	}
}













//Very "easy" test cases. Bot should predict these 100% correctly.
function easyTests(){
    //Initialize blue team's dummy data
    Bot.analysis.blue.pokemon.push(pokemonDatabase.Squirtle);
    assert.equal("Squirtle", Bot.analysis.blue.pokemon[0].name, "Failed to add Squirtle to team Blue.");

    Bot.analysis.blue.pokemon.push(pokemonDatabase.Wartortle);
    assert.equal("Wartortle", Bot.analysis.blue.pokemon[1].name, "Failed to add Wartortle to team Blue.");

    Bot.analysis.blue.pokemon.push(pokemonDatabase.Blastoise);
    assert.equal("Blastoise", Bot.analysis.blue.pokemon[2].name, "Failed to add Blastoise to team Blue.");


    //Initialize red team's dummy data
    Bot.analysis.red.pokemon.push(pokemonDatabase.Charmander);
    assert.equal("Charmander", Bot.analysis.red.pokemon[0].name, "Failed to add Charmander to team Red.");

    Bot.analysis.red.pokemon.push(pokemonDatabase.Charmeleon);
    assert.equal("Charmeleon", Bot.analysis.red.pokemon[1].name, "Failed to add Charmeleon to team Red.");

    Bot.analysis.red.pokemon.push(pokemonDatabase.Charizard);
    assert.equal("Charizard", Bot.analysis.red.pokemon[2].name, "Failed to add Charizard to team Red.");

    Bot.state = "populate_team_data";
    mainLoop(); //call the main loop with dummy data, and the state set to "populate_team_data"
    mainLoop(); //Should place the bet this time, after all of the team data has been populated.
}

function debugMain(){
    var assert = require('assert');

    //Run a few unit tests
    easyTests();

    //TODO: Test the betting

}

var debugging = process.argv[4] == "-d";

if(!debugging){
    setInterval( mainLoop, 3000 );
}

else{
    debug("Debugging!")
    debugMain();

    debug("All tests succeeded! Exiting...")
    process.exit(0); //Exit cleanly
}
