'use strict';
app.factory('TonePlayerFct', function ($http) {

	var createPlayer = function (url, doneFn) {
		var player  = new Tone.Player(url, doneFn);
		player.toMaster();
		player.loop = true;
		return player;
	};

    return {
        createPlayer: createPlayer
    };

});
