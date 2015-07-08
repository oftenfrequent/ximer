app.directive('ximTrack', function ($rootScope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AnalyserFct, $q) {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/track/track.html',
		link: function(scope, element, attrs) {
			scope.effectWetnesses = [0,0,0,0];
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

				scope.track.player.loop = false;
				scope.track.player.stop();
				scope.track.onTimeline = true;
				var position = 0;
				var canvasRow = element[0].getElementsByClassName('canvas-box');

				if (scope.track.location.length) {
					// drop the loop on the first available index				
					while (scope.track.location.indexOf(position) > -1) {
						position++;
					}					
				}

				// adding raw image to db
				if (!scope.track.img) {
					scope.track.img = window.latestRecordingImage.replace(/^data:image\/png;base64,/, "");
				}
				console.log('pushing', position);
				scope.track.location.push(position);
				scope.track.location.sort();
				var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
				angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  index + "-" + position + "' class='item' style='position: absolute;' draggable></canvas>")(scope));
				var canvas = document.getElementById( "mdisplay" +  index + "-" + position );
                drawBuffer( 198, 98, canvas.getContext('2d'), scope.track.buffer );
				console.log('track', scope.track);
			}

			scope.moveInTimeline = function (oldTimelineId, newMeasure) {
				return new $q(function (resolve, reject) {
					// console.log('ELEMENT', oldTimelineId, newMeasure);
					ToneTrackFct.replaceTimelineLoop(scope.track.player, oldTimelineId, newMeasure).then(resolve);
				});
			};


			scope.appearOrDisappear = function(position) {
				var trackIndex = scope.$parent.tracks.indexOf(scope.track);
				var loopIndex = scope.track.location.indexOf(position);
				console.log('IND, POS', trackIndex, position);
				console.log(scope.track.location.indexOf(position));
				if(scope.track.onTimeline) {
					if(loopIndex === -1) {
						console.log('APPEAR');
						var canvasRow = element[0].getElementsByClassName('canvas-box');
						scope.track.location.push(position);
						scope.track.location.sort();
						console.log(scope.track.location);
						var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
						console.log('TIMELINE_ID', timelineId);
						angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  trackIndex + "-" + position + "' class='item' style='position: absolute;' ng-dblclick='dupelicate()' draggable></canvas>")(scope));
						// console.log('track', scope.track);
						var canvas = document.getElementById( "mdisplay" +  trackIndex + "-" + position );
		                drawBuffer( 198, 98, canvas.getContext('2d'), scope.track.buffer );
					} else {
						var canvas = document.getElementById( "mdisplay" +  trackIndex + "-" + position );
						console.log('DISAPPEAR');
						//remove from locations array
						scope.track.location.splice(loopIndex, 1);
						//remove timelineId
						ToneTrackFct.deleteTimelineLoop( canvas.attributes.timelineid.value );
						//remove canvas item
						function removeElement(element) {
						    element && element.parentNode && element.parentNode.removeChild(element);
						}
						removeElement( canvas );
					}
				} else {
					console.log('NO DROP');
				}
			};

			scope.record = function (index) {
				// console.log('TRACKS', scope.$parent.tracks);
				ToneTimelineFct.muteAll(scope.$parent.tracks);
				var recorder = scope.recorder;

				var continueUpdate = true;

				//analyser stuff
		        var canvas = document.getElementById("analyser"+index);
		        var analyserContext = canvas.getContext('2d');
		        var analyserNode = scope.analyserNode;
				var analyserId = window.requestAnimationFrame( update );

				scope.track.recording = true;
				scope.track.empty = true;
				RecorderFct.recordStart(recorder);
				scope.track.empty = true;


				function update() {
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

				//RECORDING STARTS AT MEASURE 1
				var micStartID = Tone.Transport.setTimeline(function () {
					RecorderFct.recordStart(recorder, index);
				}, "1m");


				//RECORDING ENDS AT MEASURE 2
				var micEndID = Tone.Transport.setTimeline(function () {
					RecorderFct.recordStop(index, recorder).then(function (player) {
						scope.track.recording = false;
						scope.track.empty = false;
						continueUpdate = false;
						window.cancelAnimationFrame( analyserId );
						scope.track.player = player;
						scope.track.player.loop = true;
						scope.track.buffer = window.latestBuffer;
						scope.track.rawAudio = window.latestRecording;
						player.connect(scope.track.effectsRack[0]);
						console.log('player', player);
						console.log('IN STOPPPPPPP');
						Tone.Transport.clearTimeline(micStartID);
						Tone.Transport.clearTimeline(micEndID);
						scope.$parent.stop();
						ToneTimelineFct.unMuteAll(scope.$parent.tracks);
					});
				}, "2m");

				Tone.Transport.start();

			}
			scope.preview = function(currentlyPreviewing) {
				console.log(currentlyPreviewing);
				if(currentlyPreviewing) {
					scope.track.player.stop();
					scope.track.previewing = false;
				} else {
					scope.track.player.start();
					scope.track.previewing = true;
				}
			};

			scope.changeWetness = function(effect, amount) {
				console.log(effect);
				console.log(amount);

				effect.wet.value = amount / 1000;
			};

		}
		

	}
});