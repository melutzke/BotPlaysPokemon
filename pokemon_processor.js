var fs = 				require('fs');
var pokemonNames = 		require("./pokemon_array.json");
var exec = 				require('child_process').exec;

var balance = 100;
var state = "";

var irc = require('irc');
var settings = {
	channels : ["#twitchplayspokemon"],
	server : "irc.twitch.tv",
	port: 6667,
	secure: false,
	nick : "daguava",
	password : "oauth:iazmm085g57yiy8m5bnswyxdfvjidt7"
}

var client = new irc.Client(settings.server, settings.nick, {
    channels: [settings.channels + " " + settings.password],
    port: settings.port,
    debug: true,
    password: settings.password,
    userName: settings.nick,
    realName: settings.nick,
    secure: settings.secure,
    showErrors: true,
	floodProtection: true,
	floodProtectionDelay: 500,
});

client.addListener('message', function (from, to, message) {

	if(from == "tppinfobot"){
		console.log(from + ": " + message);
		if( message.indexOf("new match") !== -1 ){
			askForBalance();
			state = "normal";
		}
	}
	if(from == "tppbankbot" && message.toLowerCase().indexOf(settings.nick.toLowerCase()) !== -1){
		var newBalance = Number( message.split(" ").pop() );
		console.log("Updated balance to " + newBalance.toString() );
		if(newBalance > balance){
			console.log("\t\t\t( ͡° ͜ʖ ͡°) you won your last bet!");
		}
		balance = newBalance;
		console.log("==========================================================");
	}

});

var pokemonDatabase = 	require("./pokemon_database.json");
var moveDatabase = 		require("./move_database.json");


var blue = {
	ocr: [],
	guess: [],
	attackDamage: 0,
	health: 0
};
var red = {
	ocr: [],
	guess: [],
	attackDamage: 0,
	health: 0
};

var uselessPokemon = [
	"Metapod",
	"Kakuna"
]

function padToSize(string, size){
	while(string.length < size){
		string += " ";
	}
	return string;
}

function askForBalance(){
	
	console.log("Requesting balance, adding randomized delay");
	setTimeout(function(){
		client.say(settings.channels[0], "!balance");
	}, ( Math.random()*5000 + 5000 ));
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

function pokemonDistanceCheck(closeObj){
	// only allow name to be less than half wrong before we reject a distance conversion
	return closeObj.distance < (1/2 * closeObj.string.length) 
}

function calculateAttackDamage(firstPokemon, secondPokemon, attack){
	// pokemon gen 2 damage formula

	attack = moveDatabase[attack];

	var attackBase;
		var level = 		100;
		var special = 		attack.special;
		var attackStat =  	( ! special ) ? firstPokemon.attack : firstPokemon.specialAttack;
			attackStat = 	Number(attackStat);
		var defenseStat = 	( ! special ) ? secondPokemon.defense : secondPokemon.specialDefense;
			defenseStat = 	Number(defenseStat);
		var base = 			Number(attack.base);
		attackBase = ( ( (2 * level + 10) / 250 ) * (attackStat / defenseStat) * base + 2);

	var modifier;
		var STAB = 		( firstPokemon.types.indexOf( attack.type ) !== -1 ) ? 1.5 : 1;
		var typeMult = 	Number(secondPokemon.weakness[ attack.type ]);
		modifier = STAB * typeMult;

	var damage = 	 attackBase * modifier;

	var averageDamage = damage * (attack.accuracy / 100);

	return averageDamage;
}

function pokemonFirstAttacksSecond(firstPokemon, secondPokemon){
	var maxDamage = 0;
	var attacksWithSpecialHandling = ["Solarbeam", "Hyper Beam"];

	if( uselessPokemon.indexOf( secondPokemon.name ) !== -1 ){
		return 50;
	} else if( firstPokemon.name == "Ditto" ){
		return 50; // a low estimate of decent damage?
	}

	if( ! firstPokemon || ! secondPokemon ){
		console.log("WARNING: Pokemon database lookup may have failed");
	} else {
		var bestAttack = "";
		firstPokemon.attacks.forEach(function(attack){
			var damage = calculateAttackDamage(firstPokemon, secondPokemon, attack.name);

			if( attacksWithSpecialHandling.indexOf( attack.name ) !== -1 ){
				damage /= 2;  // attack happens every two turns
			}

			if(damage > maxDamage){
				maxDamage = Math.round(damage);
				bestAttack = attack.name;
			}
		});
		console.log("\t" + padToSize(firstPokemon.name) + " attacks " + padToSize(secondPokemon.name) + " guess: (" + bestAttack + ":" + maxDamage + ")")
	}

	return Math.min(maxDamage, secondPokemon.hp);
}

function loop(){
	setInterval(takeScreenshotAndProcess, 15000);
}

function takeScreenshotAndProcess(){
	try{
		exec('convert screenshot: ./screenshot.jpg', function (error, stdout, stderr){
		    //console.log("Grabbing the screen, looking for pokemon names...");
		    imageMagickAndTesseract();
		});
	} catch(e){
		
	}
	
}

function imageMagickAndTesseract(){

	var commands = [
		// find first blue pokemon, crop, filter, ocr
		"convert screenshot.jpg -crop 8.6%x2.8%+493+245 ./temp.png",
		"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
		"tesseract temp.png ./blue_first bazaar",	// semi-accurate blue_first pokemon name

		//find second blue pokemon, crop, filter, ocr
		"convert screenshot.jpg -crop 8.6%x2.8%+661+245 ./temp.png",
		"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
		"tesseract temp.png ./blue_second bazaar",	// semi-accurate blue_second pokemon name

		// find third blue pokemon, crop, filter, ocr
		"convert screenshot.jpg -crop 8.6%x2.8%+828+245 ./temp.png",
		"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
		"tesseract temp.png ./blue_third bazaar",	// semi-accurate blue_third pokemon name

		// find first red pokemon, crop, filter, ocr
		"convert screenshot.jpg -crop 8.6%x2.8%+930+640 ./temp.png",
		"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
		"tesseract temp.png ./red_first bazaar",	// semi-accurate red_first pokemon name

		// find second red pokemon, crop, filter, ocr
		"convert screenshot.jpg -crop 8.6%x2.8%+1095+640 ./temp.png",
		"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
		"tesseract temp.png ./red_second bazaar",	// semi-accurate red_second pokemon name

		// find third red pokemon, crop, filter, ocr
		"convert screenshot.jpg -crop 8.6%x2.8%+1265+640 ./temp.png",
		"convert temp.png -fill black -fuzz 14% +opaque white ./temp.png",
		"tesseract temp.png ./red_third bazaar"		// semi-accurate red_third pokemon name
	]

    exec(commands.join(" && "), function(error, stdout, stderr){

		//console.log("finished imagemagick, tesseract pass");

		blue.ocr.push( fs.readFileSync("./blue_first.txt", "utf8").trim()  );
		blue.ocr.push( fs.readFileSync("./blue_second.txt", "utf8").trim() );
		blue.ocr.push( fs.readFileSync("./blue_third.txt", "utf8").trim()  );
		red.ocr.push(  fs.readFileSync("./red_first.txt", "utf8").trim()   );
		red.ocr.push(  fs.readFileSync("./red_second.txt", "utf8").trim()  );
		red.ocr.push(  fs.readFileSync("./red_third.txt", "utf8").trim()   );

		if(state != "bet_placed"){
			lookForPokemonNames();
		} else {
			//console.log("Stopping process, bet already placed...");
		}
		

	});
}

function lookForPokemonNames(){

	var successfulNames = 0;
	var blueEditDistance = 0;
	var redEditDistance = 0;

	var redNames = [];
	var blueNames = [];

	blue.ocr.forEach(
		function(element){
			var closest = closestString(element, pokemonNames);
			//console.log( "Closest to " + element + " \n\t" + closest.string + " with edit ditance " + closest.distance.toString() );
			blueEditDistance += closest.distance;
			if( pokemonDistanceCheck(closest) ){
				blue.guess.push( pokemonDatabase[closest.string] );
				blueNames.push( closest.string );
				successfulNames++;
			}
		}
	);

	red.ocr.forEach(
		function(element){
			var closest = closestString(element, pokemonNames);
			//console.log( "Closest to " + element + " \n\t" + closest.string + " with edit ditance " + closest.distance.toString() );
			redEditDistance += closest.distance;
			if( pokemonDistanceCheck(closest) ){
				red.guess.push( pokemonDatabase[closest.string] );
				redNames.push( closest.string );
				successfulNames++;
			}
		}
	);

	if(successfulNames == 6){
		console.log("Successfully identified 6 Pokemon")
		var blueString = "";
		var redString = "";

		blueNames.forEach(function(name){
			blueString += padToSize(name, 14);
		})

		redNames.forEach(function(name){
			redString += padToSize(name, 14);
		})

		console.log("\tBLUE: " + blueString);
		console.log("\tRED : " + redString);

		calculateTeamStatistics();
		cleanupForNextRun();
	} else {
		//console.log("Name test failed! Only identified " + successfulNames + " names, starting new loop...");
		cleanupForNextRun();
		
	}
}

function calculateTeamStatistics(){
	blue.guess.forEach(function(bluePokemon){
		red.guess.forEach(function(redPokemon){

			var bestAttackDamageTotalBlue = pokemonFirstAttacksSecond(bluePokemon, redPokemon);
			var bestAttackDamageTotalRed  = pokemonFirstAttacksSecond(redPokemon, bluePokemon);

			blue.attackDamage += bestAttackDamageTotalBlue;
			red.attackDamage  += bestAttackDamageTotalRed;

			

		});
	});

	blue.guess.forEach(function(bluePokemon){
		if( uselessPokemon.indexOf( bluePokemon.name ) === -1 ){
			blue.health = Number(blue.health) + Number(bluePokemon.hp);
		}	
	})

	red.guess.forEach(function(redPokemon){
		if( uselessPokemon.indexOf( redPokemon.name ) === -1 ){
			red.health  = Number(red.health) + Number(redPokemon.hp);
		}
	})

	okToBet = true;

	determineWinner();
}

function determineWinner(){
	var blueRatio = blue.attackDamage / red.health;
	var redRatio  = red.attackDamage / blue.health;

	console.log("Blue attack damage, health: " + blue.attackDamage + ", " + blue.health);
	console.log("Red  attack damage, health: " + red.attackDamage  + ", " + red.health );

	var lowest = Math.min(blueRatio, redRatio);

		blueRatio /= lowest;
		redRatio  /= lowest;

	var highest = Math.max(blueRatio, redRatio);

	var prediction = "";
		prediction += (blueRatio > redRatio) ? "Bot predicts BLUE victorious" : "Bot predicts RED victorious";
		prediction += "\n\tConfidence level: " + highest.toString();

	console.log("Blue Ratio: ", blueRatio);
	console.log("Red Ratio : ", redRatio);


	console.log(prediction);


	////// instead, set flag arming our bet
	placeBet( (blueRatio > redRatio) ? "blue" : "red", highest);

	//return prediction;
}

function placeBet(team, confidence){
	var bet = 0;
	if(confidence > 1){
		bet = balance * 0.10;
	}
	if(confidence > 1.3){
		bet = balance * 0.15;
	}
	if(confidence > 1.5){
		bet = balance * 0.23;
	}
	if(confidence > 1.6){
		bet = balance * 0.3;
	}
	if(confidence > 2.1){
		bet = balance * 0.75
	}
	if(confidence > 3){
		bet = balance
	}
	
	//if(bet < 100 && balance > 300) bet = 100;
	if(bet > balance) bet = balance;
	if( balance == 100) bet = 100;

	bet = Math.min( Math.ceil(bet/10)*10, balance );

	var betString = "!bet " + bet.toString() + " " + team;

	console.log("Placing bet of " + betString + " with confidence of " + confidence.toString() );

	client.say(settings.channels[0], "!bet " + parseInt(bet).toString() + " " + team);
	state = "bet_placed";
	cleanupForNextRun();
}

function cleanupForNextRun(){
	blue.guess.length = 0;
	red.guess.length = 0;
	red.ocr.length = 0;
	blue.ocr.length = 0;
	blue.attackDamage = 0;
	red.attackDamage = 0;
	blue.health = 0;
	red.health = 0;
}




askForBalance();
loop();















