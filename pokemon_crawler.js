var fs = require('fs');
var request = require("request");
var cheerio = require("cheerio");


var minCrawlDelay = 0;

function crawlDelay(){
	var time = minCrawlDelay + Math.round( Math.random() * ( minCrawlDelay * 2/3 ) );
	return time;
}

var pokemonIndex = 0;
var pokemon = [];

var moveArray = [];
var moveIndex = 0;

var problemMoves = [];

var moveset = {};

var urlMissed = false;

var proxy = {
	currentProxy: {},
	index: 0,
	list: [	{"ip":"http://199.200.120.140:3127","misses":0},
			{"ip":"http://198.52.217.44:3127","misses":0},
			{"ip":"http://162.208.49.45:7808","misses":0},
			//{"ip":"http://107.182.16.221:7808","misses":0},
			{"ip":"http://204.12.235.23:7808","misses":0},
			{"ip":"http://23.89.198.161:7808","misses":0},
			{"ip":"http://38.109.218.156:7808","misses":0},
			{"ip":"http://23.226.130.130:80","misses":0} ]
}

function getProxy(){
	if(proxy.currentProxy && proxy.currentProxy.misses >= 3 && proxy.list.length > 1){
		
		var deletedProxy = false;
		for(var i = 0; i < proxy.list.length; i++){
			if(proxy.list[i].ip == proxy.currentProxy.ip){
				proxy.list.splice(i, 1);
				console.log("=========== Removing proxy " + proxy.currentProxy.ip + "===========");
				deletedProxy = true;
				proxy.index = 0;
				break;
			}
		}

		if( ! deletedProxy ){
			console.log("\t\t%%%%% Couldn't find the proxy we wanted to delete %%%%%");
		}
		
	}

	

	if(!urlMissed || deletedProxy){
		proxy.currentProxy = proxy.list[proxy.index];
		proxy.index = (proxy.index + 1 < proxy.list.length && proxy.index >= 0) ? proxy.index + 1 : 0;
		urlMissed = false;
	}

	return proxy.currentProxy.ip;
}
function proxyFailed(){
	urlMissed = true;
	proxy.currentProxy.misses++;
	console.log("\t\t\t Proxy " + proxy.currentProxy.ip + " stands at " + proxy.currentProxy.misses + " misses.");
}


function processRentPage(){
	url = 'http://www.serebii.net/stadium2/l100rental.shtml'
	request({
		uri: url,
		proxy: getProxy(),
		timeout: 3000,
	}, function(error, response, body) {
		if ( ! error ){

			var $ = cheerio.load(body);
			// scrape data from http://www.serebii.net/stadium2/l100rental.shtml

			$('.poketab').each(function(tab){
				var currentPokemon = {};

				// grab stats
				var statElements = $(this).first().find('.detailhead').parent().map(  function(){ return $(this).text().split( ":" )[1] }  );
				// grab name and number
				var nameAndNumber = $(this).find('font').text().split(" ");

				currentPokemon.number = 		nameAndNumber[0].substring(1);
				currentPokemon.name = 			nameAndNumber[1];
				currentPokemon.href = 			"http://www.serebii.net" + $(this).find('a').eq(1).attr('href');

				currentPokemon.hp = 			statElements[0];
				currentPokemon.attack = 		statElements[1];
				currentPokemon.defense = 		statElements[2];
				currentPokemon.specialAttack = 	statElements[3];
				currentPokemon.specialDefense = statElements[4];

				currentPokemon.attacks = []; // partially filled now, improved by later step
				currentPokemon.weakness = [];

				// fill attacks array
				$(this).find('table').eq(2).find('a').each(function(){
					var name = $(this).text().trim();
					if(name != ""){
						currentPokemon.attacks.push({
							name: name
						});

						moveArray.push({
							name: name,
							url: 'http://www.serebii.net' + $(this).attr('href').replace(/ /g, "")
						});
					}
					
				});

				currentPokemon.types = []; // filled out by later step
				
				pokemon.push(currentPokemon);
			});

			console.log('\t[Success] got pokemon list, move urls');
			setTimeout( processPokemon, crawlDelay() );

		} else {
			console.log("\t****[Error] failed to get pokemon list w/ " + proxy.currentProxy.ip);
			proxyFailed()
			processRentPage();
		}
	});
}




function processPokemon(){
	var currentPokemon = pokemon[pokemonIndex];
	console.log("==== Currently working on " + currentPokemon.name)

	// call function to retrieve the pokemon's information

	url = currentPokemon.href;
	request({
		uri: url,
		proxy: getProxy(),
		timeout: 3000,
	}, function(error, response, body) {
		if ( ! error ){
			var $ = cheerio.load(body);
			$('.dextable').eq(1).find('.fooinfo').eq(4).find('a').each(function(){
				var newType = $(this).attr('href').replace("/pokedex-bw/", "").replace(".shtml", "");
				currentPokemon.types.push( newType );
			});

			console.log('\t[Success] got dex information for ' + currentPokemon.name);
			//pokemon[pokemonIndex] = currentPokemon; // store back updated information
			pokemonIndex++;
			if(pokemonIndex < pokemon.length){
				setTimeout( processPokemon, crawlDelay() );
			} else {
				console.log("\t\tDone processing Pokemon's pages! On to movesets");
				pokemonIndex = 0;
				setTimeout( processMoveset, crawlDelay() );
			}
		} else {
			console.log("\t****[Error] failed to get pokemon types w/ " + proxy.currentProxy.ip);
			proxyFailed()
			processPokemon();
		}

	});
}





function processMoveset(){



	while( moveset.hasOwnProperty(moveArray[moveIndex].name) ){
		
		// already processed this move, skip
		moveIndex++;

		if(moveIndex >= moveArray.length){
			break;
		}
	}

	if(moveIndex >= moveArray.length){
		console.log("Done looking up moves, reconfiguring moveArray");
		moveArray = [];
		for(property in moveset){
			if( ! moveset.hasOwnProperty(property) ){
				continue;
			}
			moveArray.push(moveset[property]);
		}
		finishUp();
		return;
	}

	var currentMove = moveArray[moveIndex];

	console.log("==== Currently working on " + currentMove.name);

	url = currentMove.url;
	request({
		uri: url,
		proxy: getProxy(),
		timeout: 3000,
	}, function(error, response, body) {
		if ( ! error ){
			var $ = cheerio.load(body);

			var $table = $('.dextable');
			var $baseAndAccuracy = $table.find('tr').eq(3).children('td');

			try{
				var moveEntry = {
					name 		: currentMove.name,
					base 		: $baseAndAccuracy.eq(1).text().trim(),
					accuracy 	: $baseAndAccuracy.eq(2).text().trim(),
					type 		: $table.find('a').eq(0).attr('href').replace("/attackdex-bw/", "").replace(".shtml", ""),
					special 	: $table.find('a').eq(1).attr('href').replace("/attackdex-bw/", "").replace(".shtml", "") == "special"
				}

				moveset[currentMove.name] = moveEntry;
			} catch(e){
				console.log("Problem with " + currentMove.name);
				moveIndex++;
				problemMoves.push(currentMove.name);
			}

			setTimeout( processMoveset, crawlDelay() );

		} else {
			console.log("\t****[Error] failed to get move w/ " + proxy.currentProxy.ip);
			proxyFailed();
			processMoveset();
		}
	});
}



function finishUp(){
	console.log("Crawling process is finished.");
}



processRentPage();
