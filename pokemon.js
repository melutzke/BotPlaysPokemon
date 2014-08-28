// scrape data from http://www.serebii.net/stadium2/l100rental.shtml
var pokemon = [];
$('.poketab').each(function(tab){
	var currentPokemon = {};

	// grab stats
	var statElements = $(this).first().find('.detailhead').parent().map(  function(){ return $(this).text().split( ":" )[1] }  );
	// grab name and number
	var nameAndNumber = $(this).find('font').text().split(" ");

	currentPokemon.number = 		nameAndNumber[0].substring(1);
	currentPokemon.name = 			nameAndNumber[1];

	currentPokemon.hp = 			statElements[0];
	currentPokemon.attack = 		statElements[1];
	currentPokemon.defense = 		statElements[2];
	currentPokemon.specialAttack = 	statElements[3];
	currentPokemon.specialDefense = statElements[4];

	currentPokemon.attacks = [];
	// fill attacks array
	$(this).find('tbody').last().find('a').each(function(){
		currentPokemon.attacks.push({
			name: $(this).text(),
			url: 'http://www.serebii.net' + $(this).attr('href').replace(" ", "")
		});
	});
	
	pokemon.push(currentPokemon);
});