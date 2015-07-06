'use strict';
app.factory('ToneTrackFct', function ($http) {

	var createPlayer = function (url, doneFn) {
		var player  = new Tone.Player(url, doneFn);
		//TODO - remove toMaster
		player.toMaster();
		// player.sync();
		player.loop = true;
		return player;
	};

	var loopInitialize = function(blob, index, filename, cb) {
		//PASSED A BLOB FROM RECORDERJSFACTORY - DROPPED ON MEASURE 0
		var url = (window.URL || window.webkitURL).createObjectURL(blob);
		var link = document.getElementById("save"+index);
		link.href = url;
		link.download = filename || 'output'+index+'.wav';
		window.latestRecording = blob;
		window.latestRecordingURL = url;
		var player;

		var doneLoadingCb = function() {
			return cb(player);
		};
		//TODO - remove toMaster
		player = new Tone.Player(link.href, doneLoadingCb).toMaster();
	};

	var effectsInitialize = function() {
		var chorus = new Tone.Chorus();
		var phaser = new Tone.Phaser();
		var distort = new Tone.Distortion();
		var pingpong = new Tone.PingPongDelay();
		chorus.connect(phaser);
		phaser.connect(distort);
		distort.connect(pingpong);
		pingpong.toMaster();

		return [chorus, phaser, distort, pingpong];
	}

	var changeWetness = function(effect, amount) {
		effect.wet.value = amount;
	}

    return {
        createPlayer: createPlayer,
        loopInitialize: loopInitialize,
        effectsInitialize: effectsInitialize,
        changeWetness: changeWetness
    };

});
