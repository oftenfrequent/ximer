app.factory('AnalyserFct', function() {

	var updateAnalysers = function (analyserContext, analyserNode, continueUpdate) {

		function update() {
			console.log('UPDATE')
			var SPACING = 3;
			var BAR_WIDTH = 1;
			var numBars = Math.round(300 / SPACING);
			var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

			analyserNode.getByteFrequencyData(freqByteData); 

			analyserContext.clearRect(0, 0, 300, 100);
			analyserContext.fillStyle = '#F6D565';
			analyserContext.lineCap = 'round';
			var multiplier = analyserNode.frequencyBinCount / numBars;

			// Draw rectangle for each frequency bin.
			for (var i = 0; i < numBars; ++i) {
				var magnitude = 0;
				var offset = Math.floor( i * multiplier );
				// gotta sum/average the block, or we miss narrow-bandwidth spikes
				for (var j = 0; j< multiplier; j++)
				    magnitude += freqByteData[offset + j];
				magnitude = magnitude / multiplier;
				var magnitude2 = freqByteData[i * multiplier];
				analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
				analyserContext.fillRect(i * SPACING, 100, BAR_WIDTH, -magnitude);
			}
			if(continueUpdate) {
				window.requestAnimationFrame( update );
			}
		}
		window.requestAnimationFrame( update );
	}


	var cancelAnalyserUpdates = function (analyserId) {
		window.cancelAnimationFrame( analyserId );
	}
	return {
		updateAnalysers: updateAnalysers,
		cancelAnalyserUpdates: cancelAnalyserUpdates
	}
});