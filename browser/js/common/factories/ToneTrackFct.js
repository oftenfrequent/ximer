'use strict';
app.factory('ToneTrackFct', function ($http, $q) {

	var createPlayer = function (url, doneFn) {
		var player  = new Tone.Player(url, doneFn);
		//TODO - remove toMaster
		player.toMaster();
		// player.sync();
		player.loop = true;
		return player;
	};

	var loopInitialize = function(blob, index, filename) {
		return new $q(function (resolve, reject) {
			//PASSED A BLOB FROM RECORDERJSFACTORY - DROPPED ON MEASURE 0
			var url = (window.URL || window.webkitURL).createObjectURL(blob);
			var link = document.getElementById("save"+index);
			link.href = url;
			link.download = filename || 'output'+index+'.wav';
			window.latestRecording = blob;
			window.latestRecordingURL = url;
			var player;
			// TODO: remove toMaster
			player = new Tone.Player(link.href, function () {
				resolve(player);
			});
		});
	};

	var effectsInitialize = function() {
		var chorus = new Tone.Chorus();
		var phaser = new Tone.Phaser();
		var distort = new Tone.Distortion();
		var pingpong = new Tone.PingPongDelay();
		chorus.wet.value = 0;
		phaser.wet.value = 0;
		distort.wet.value = 0;
		pingpong.wet.value = 0;
		chorus.connect(phaser);
		phaser.connect(distort);
		distort.connect(pingpong);
		pingpong.toMaster();

		return [chorus, phaser, distort, pingpong];
	}

	var createTimelineInstanceOfLoop = function(player, measure) {
		return Tone.Transport.setTimeline(function() {
				player.start();
			}, measure+"m");
	}

    return {
        createPlayer: createPlayer,
        loopInitialize: loopInitialize,
        effectsInitialize: effectsInitialize,
        createTimelineInstanceOfLoop: createTimelineInstanceOfLoop
    };

});
