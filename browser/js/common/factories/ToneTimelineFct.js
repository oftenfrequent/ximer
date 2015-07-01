'use strict';
app.factory('ToneTimelineFct', function ($http) {

	var getTransport = function (loopEnd) {
		Tone.Transport.loop = true;
		Tone.Transport.loopStart = '0m';
		Tone.Transport.loopEnd = loopEnd.toString() + 'm';

		Tone.Transport.setInterval(function () {
			console.log(Tone.Transport.position);
		}, '4n');
		return Tone.Transport;
	};

	var changeBpm = function (bpm) {
		Tone.Transport.bpm.value = bpm;
		return Tone.Transport;
	};

	var stopAll = function (loopArray) {
		Tone.Transport.stop();
		loopArray.forEach(function (loop) {
			loop.stop();
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
        getTransport: getTransport,
        changeBpm: changeBpm,
        addLoopToTimeline: addLoopToTimeline
    };

});
