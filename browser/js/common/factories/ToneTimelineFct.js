'use strict';
app.factory('ToneTimelineFct', function ($http) {

	var transport = function (loopEnd) {
		var transport = Tone.Transport;
		transport.loop = true;
		transport.loopStart = '0m';
		transport.loopEnd = loopEnd.toString() + 'm';
		console.log(transport)
		return transport;
	}

	var changeBpm = function (transport, bpm) {
		transport.bpm = bpm;
		return transport;
	}

	var stopAll = function (transport, loopArray) {
		transport.stop();
		loopArray.forEach(function (loop) {
			loop.stop();
		});
	}

	var addLoopToTimeline = function (transport, player, startTimeArray) {
		// console.log('PLAYER', player);
		// player.start();
		startTimeArray.forEach(function (startTime) {
			var startTime = startTime.toString() + 'm';
			console.log(player, startTime);
			console.log("TIMELINE", transport);
			
			Tone.Transport.setTimeline(function () {
				console.log('SET');
				player.stop();
				player.start();
			}, startTime);
			// var stopTime = parseInt(startTime.substr(0, startTime.length-1)) + 1).toString() + startTime.substr(-1,1);
			// console.log('STOP', stop);
			// transport.setTimeline(function () {
			// 	player.stop();
			// }, stopTime);
		});
	}
    return {
        transport: transport,
        changeBpm: changeBpm,
        addLoopToTimeline: addLoopToTimeline
    };

});
