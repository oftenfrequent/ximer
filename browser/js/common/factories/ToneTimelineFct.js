'use strict';
app.factory('ToneTimelineFct', function ($http, $q) {

	var createTransport = function (loopEnd) {
        return new $q(function (resolve, reject) {
			Tone.Transport.loop = true;
			Tone.Transport.loopStart = '0m';
			Tone.Transport.loopEnd = loopEnd.toString() + 'm';

			createMetronome().then(function (metronome) {
				Tone.Transport.setInterval(function () {
					console.log(Tone.Transport.position);
					metronome.start();
				}, '4n');
				return resolve(metronome);
			});
        });
	};

	var changeBpm = function (bpm) {
		Tone.Transport.bpm.value = bpm;
		return Tone.Transport;
	};

	var stopAll = function (tracks) {
		tracks.forEach(function (track) {
			track.player.stop();
		});
	};
	var createMetronome = function () {
        return new $q(function (resolve, reject) {
	        var met = new Tone.Player("/api/wav/Click1.wav", function () {
	        	console.log('LOADED');
				return resolve(met);
	        }).toMaster();
        });
	};

	var addLoopToTimeline = function (player, startTimeArray) {

		if(startTimeArray.indexOf(0) === -1) {
			Tone.Transport.setTimeline(function() {
				player.stop();
			}, "0m")

		}

		startTimeArray.forEach(function (startTime) {

			var startTime = startTime.toString() + 'm';

			Tone.Transport.setTimeline(function () {
				console.log('Start', Tone.Transport.position);
				player.stop();
				player.start();
			}, startTime);

			// var stopTime = parseInt(startTime.substr(0, startTime.length-1)) + 1).toString() + startTime.substr(-1,1);
			//// console.log('STOP', stop);
			//// transport.setTimeline(function () {
			//// 	player.stop();
			//// }, stopTime);

		});

	};
	
    return {
        createTransport: createTransport,
        changeBpm: changeBpm,
        addLoopToTimeline: addLoopToTimeline,
        createMetronome: createMetronome,
        stopAll: stopAll
    };

});
