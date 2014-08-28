var fs = 			require('fs');
var pokemonNames = 	require("./pokemon_array.json");
var exec = 			require('child_process').exec;


var blue = {
	ocr: [],
	guess: []
};
var red = {
	ocr: [],
	guess: []
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
	var closestDistance = 999999;
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

function loop(){
	takeScreenshotAndProcess();
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
			blue.guess.push(closest.string);
			//console.log( "Closest to " + element + " \n\t" + closest.string + " with edit ditance " + closest.distance.toString() );
			blueEditDistance += closest.distance;
			if( pokemonDistanceCheck(closest) ){
				successfulNames++;
			}
		}
	);

	red.ocr.forEach(
		function(element){
			var closest = closestString(element, pokemonNames);
			red.guess.push(closest.string);
			//console.log( "Closest to " + element + " \n\t" + closest.string + " with edit ditance " + closest.distance.toString() );
			redEditDistance += closest.distance;
			if( pokemonDistanceCheck(closest) ){
				successfulNames++;
			}
		}
	);

	if(successfulNames == 6){
		console.log("Successfully identified 6 Pokemon")
		console.log("BLUE: " + blue.guess.join(","));
		console.log("RED : " + red.guess.join(","));
	} else {
		console.log("Name test failed! Only received " + successfulNames + " successfulNames!");
		
	}
	cleanupForNextRun()
	setTimeout(loop, 5000)
}

function cleanupForNextRun(){
	blue.guess.length = 0;
	red.guess.length = 0;
	red.ocr.length = 0;
	blue.ocr.length = 0;
}





loop();















