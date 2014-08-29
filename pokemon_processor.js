var fs = 				require('fs');
var pokemonNames = 		require("./pokemon_array.json");
var exec = 				require('child_process').exec;

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
	firstPokemon.attacks.forEach(function(attack){
		var damage = calculateAttackDamage(firstPokemon, secondPokemon, attack.name);
		if(damage > maxDamage){
			maxDamage = damage;
		}
	});
	return maxDamage;
}

function loop(){
	setInterval(takeScreenshotAndProcess, 3000);
	// takeScreenshotAndProcess();
	//setTimeout(takeScreenshotAndProcess, 5000);
		//takeScreenshotAndProcess();
}

function takeScreenshotAndProcess(){
	exec('convert screenshot: ./screenshot.jpg', function (error, stdout, stderr){
	    //console.log("Grabbing the screen, looking for pokemon names...");
	    imageMagickAndTesseract();
	});
}

function imageMagickAndTesseract(){

    exec('convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\screenshot.jpg" -crop 8.6%x2.8%+493+245 ./temp.png && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" -fill black -fuzz 14% +opaque white ./temp.png && tesseract "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" ./blue_first bazaar && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\screenshot.jpg" -crop 8.6%x2.8%+661+245 ./temp.png && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" -fill black -fuzz 14% +opaque white ./temp.png && tesseract "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" ./blue_second bazaar && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\screenshot.jpg" -crop 8.6%x2.8%+828+245 ./temp.png && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" -fill black -fuzz 14% +opaque white ./temp.png && tesseract "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" ./blue_third bazaar && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\screenshot.jpg" -crop 8.6%x2.8%+930+640 ./temp.png && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" -fill black -fuzz 14% +opaque white ./temp.png && tesseract "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" ./red_first bazaar && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\screenshot.jpg" -crop 8.6%x2.8%+1095+640 ./temp.png && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" -fill black -fuzz 14% +opaque white ./temp.png && tesseract "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" ./red_second bazaar && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\screenshot.jpg" -crop 8.6%x2.8%+1265+640 ./temp.png && convert "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" -fill black -fuzz 14% +opaque white ./temp.png && tesseract "C:\\Users\\Mitchell Lutzke\\Documents\\Github\\BotPlaysPokemon\\temp.png" ./red_third bazaar', function(error, stdout, stderr){

		//console.log("finished imagemagick, tesseract pass");

		blue.ocr.push( fs.readFileSync("./blue_first.txt", "utf8").trim()  );
		blue.ocr.push( fs.readFileSync("./blue_second.txt", "utf8").trim() );
		blue.ocr.push( fs.readFileSync("./blue_third.txt", "utf8").trim()  );
		red.ocr.push(  fs.readFileSync("./red_first.txt", "utf8").trim()   );
		red.ocr.push(  fs.readFileSync("./red_second.txt", "utf8").trim()  );
		red.ocr.push(  fs.readFileSync("./red_third.txt", "utf8").trim()   );

		lookForPokemonNames();

	});
}

function lookForPokemonNames(){

	var successfulNames = 0;
	var blueEditDistance = 0;
	var redEditDistance = 0;

	blue.ocr.forEach(
		function(element){
			var closest = closestString(element, pokemonNames);
			//console.log( "Closest to " + element + " \n\t" + closest.string + " with edit ditance " + closest.distance.toString() );
			blueEditDistance += closest.distance;
			if( pokemonDistanceCheck(closest) ){
				blue.guess.push( pokemonDatabase[closest.string] );
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
				successfulNames++;
			}
		}
	);

	if(successfulNames == 6){
		console.log("Successfully identified 6 Pokemon")
		//console.log("BLUE: " + blue.guess.join(","));
		//console.log("RED : " + red.guess.join(","));

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

			blue.health = Number(blue.health) + Number(bluePokemon.hp) * 3; // we calculate each pkmn vs each, mult health by 3 (3 vs 3)
			red.health  = Number(red.health) + Number(redPokemon.hp) * 3;

		});
	});

	determineWinner();
}

function determineWinner(){
	var blueRatio = blue.attackDamage / red.health;
	var redRatio  = red.attackDamage / blue.health;

	//console.log(blue.attackDamage, red.health, red.attackDamage, blue.health);

	var prediction = "";
		prediction += (blueRatio > redRatio) ? "Bot predicts BLUE victorious" : "Bot predicts RED victorious";
		prediction += "\n Confidence level: " + ((blueRatio > redRatio) ? (redRatio / blueRatio).toString() : (blueRatio / redRatio).toString());

	console.log("Blue Ratio: ", blueRatio);
	console.log("Red Ratio : ", redRatio);


	console.log(prediction);

	return prediction;
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





loop();















