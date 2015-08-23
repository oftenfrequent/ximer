'use strict';
app.factory('ToneTrackFct', function ($http, $q) {

	var createPlayer = function (url, doneFn) {
		var player  = new Tone.Player(url, doneFn);
		// TODO: remove toMaster
		player.toMaster();
		// player.sync();
		// player.loop = true;
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

	var effectsInitialize = function(arr) {


		var chorus = new Tone.Chorus();
		chorus.name = "Chorus";
		var phaser = new Tone.Phaser();
		phaser.name = "Phaser";
		var distort = new Tone.Distortion();
		distort.name = "Distortion";
		var pingpong = new Tone.PingPongDelay("4m");
		pingpong.name = "Ping Pong";

		if (arr.length) {
			chorus.wet.value = arr[0];
			phaser.wet.value = arr[1];
			distort.wet.value = arr[2];
			pingpong.wet.value = arr[3];
		}
		
		chorus.connect(phaser);
		phaser.connect(distort);
		distort.connect(pingpong);
		pingpong.toMaster();
		// pingpong.connect(volume);
		// volume.toMaster();

		return [chorus, phaser, distort, pingpong];
	};

	var createTimelineInstanceOfLoop = function(player, measure) {
		// console.log('JUST DROPPED', player, measure);
		return Tone.Transport.setTimeline(function() {
				player.stop();
				player.start();
			}, measure+"m");
	};

	var replaceTimelineLoop = function(player, oldTimelineId, newMeasure) {
		return new $q(function (resolve, reject) {
			console.log('old timeline id', oldTimelineId);
			Tone.Transport.clearTimeline(parseInt(oldTimelineId));
			// Tone.Transport.clearTimelines();
			resolve(createTimelineInstanceOfLoop(player, newMeasure));
		});
	};
	var deleteTimelineLoop = function(timelineId) {
		Tone.Transport.clearTimeline(parseInt(timelineId));
	};

    return {
        createPlayer: createPlayer,
        loopInitialize: loopInitialize,
        effectsInitialize: effectsInitialize,
        createTimelineInstanceOfLoop: createTimelineInstanceOfLoop,
        replaceTimelineLoop: replaceTimelineLoop,
        deleteTimelineLoop: deleteTimelineLoop
    };

});
