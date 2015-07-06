'use strict';
app.factory('ToneTrackFct', function ($http) {

	var createPlayer = function (url, doneFn) {
		var player  = new Tone.Player(url, doneFn);
		player.toMaster();
		player.sync();
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

		player = new Tone.Player(link.href, doneLoadingCb).toMaster();
	};

    return {
        createPlayer: createPlayer,
        loopInitialize: loopInitialize
    };

});
