app.directive('ximTrack', function ($rootScope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AnalyserFct) {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/track/track.html',
		link: function(scope, element, attrs) {

			setTimeout(function () {
				var canvasRow = element[0].getElementsByClassName('canvas-box');

				for (var i = 0; i < canvasRow.length; i++) {

					var canvasClasses = canvasRow[i].parentNode.classList;
	
					for (var j = 0; j < canvasClasses.length; j++) {
						if (canvasClasses[j] === 'taken') {
							angular.element(canvasRow[i]).append($compile("<canvas width='198' height='98' id='wavedisplay' class='item' style='position: absolute;' draggable></canvas>")(scope));
						}
					}
				}
			}, 0)
			scope.dropInTimeline = function (index) {
				var track = scope.tracks[index];

				console.log("locations", track.locations);
			}

			scope.record = function (e, index, recorder) {
				scope.tracks[index].recording = true;
				scope.tracks[index].empty = true;
				RecorderFct.recordStart(recorder, index);
				var continueUpdate = true;


		        var canvas = document.getElementById("analyser"+index);
		        var analyserContext = canvas.getContext('2d');
		        var analyserNode = scope.analyserNode;
				var analyserId = window.requestAnimationFrame( update );

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


				setTimeout(function () {
					// console.log('SCOPE', scope);
					console.log('SCOPE', scope.tracks[index].player);

					RecorderFct.recordStop(index, recorder, function (player) {
						scope.tracks[index].recording = false;
						scope.tracks[index].empty = false;
						continueUpdate = false;
						window.cancelAnimationFrame( analyserId );
						scope.tracks[index].player = player;
						console.log('player', player);
						scope.$digest();
						// scope.tracks[index].player.start();
					});
				}, 2000);



				// //CALLS RECORD IN RECORD FCT with THIS RUNNING
				// //ADDS Recording scope var to TRUE
				// console.log('e', e, e.toElement);
				// e = e.toElement;
			 //    // start recording
			 //    console.log('start recording');
			    
			 //    if (!audioRecorder)
			 //        return;

			 //    e.classList.add("recording");
			 //    audioRecorder.clear();
			 //    audioRecorder.record();

			 //    window.setTimeout(function() {
				// audioRecorder.stop();
				// e.classList.remove("recording");
				// audioRecorder.getBuffers( gotBuffers );

				// window.setTimeout(function () {
				// 	scope.tracks[index].rawAudio = window.latestRecording;
				// 	scope.tracks[index].rawImage = window.latestRecordingImage;
				// 	console.log('trackss', scope.tracks);
				// 	// wavArray.push(window.latestRecording);
				// 	// console.log('wavArray', wavArray);
				// }, 500);
			      
			 //    }, 2000);

			}
		}
	}
});