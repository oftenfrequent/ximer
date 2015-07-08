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
							angular.element(canvasRow[i]).append($compile("<canvas width='198' height='98' id='wavedisplay' class='item' style='position: absolute; background: url(data:image/png;base64," + scope.track.img + ");' draggable></canvas>")(scope));
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
				scope.track.location.push(position);
				scope.track.location.sort();
				var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
				angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  index + "-" + position + "' class='item trackLoop"+index+"' style='position: absolute; background: url(data:image/png;base64," + scope.track.img + ");' draggable></canvas>")(scope));
				
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

				if(scope.track.onTimeline) {
					if(loopIndex === -1) {
						var canvasRow = element[0].getElementsByClassName('canvas-box');
						scope.track.location.push(position);
						scope.track.location.sort();
						var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
						angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  trackIndex + "-" + position + "' class='item' style='position: absolute; background: url(data:image/png;base64," + scope.track.img + ");' draggable></canvas>")(scope));

					} else {
						var canvas = document.getElementById( "mdisplay" +  trackIndex + "-" + position );
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

			scope.reRecord = function (index) {
				console.log('RERECORD');
				console.log(scope.track);
				//change all params back as if empty track
				scope.track.empty = true;
				scope.track.onTimeline = false;
				scope.track.player = null;
				scope.track.silence = false;
				scope.track.rawAudio = null;
				scope.track.img = null;
				scope.track.previewing = false;
				//dispose of effectsRack
				scope.track.effectsRack.forEach(function (effect) {
					effect.dispose();
				});
				scope.track.effectsRack = ToneTrackFct.effectsInitialize([0,0,0,0]);
				scope.track.location = [];
				//remove all loops from UI
				var loopsUI = document.getElementsByClassName('trackLoop'+index.toString());
				while(loopsUI.length !== 0) {
					for(var i = 0; i < loopsUI.length;i++) {
						loopsUI[i].parentNode.removeChild(loopsUI[i]);
					}
					var loopsUI = document.getElementsByClassName('trackLoop'+index.toString());
				}
			};

			scope.solo = function () {
				var otherTracks = scope.$parent.tracks.map(function (track) {
					if(track !== scope.track) {
						track.silence = true;
						return track;
					}
				}).filter(function (track) {
					if(track && track.player) return true;
				})

				console.log(otherTracks);
				ToneTimelineFct.muteAll(otherTracks);
				scope.track.silence = false;
				scope.track.player.volume.value = 0;
			}

			scope.silence = function () {
				if(!scope.track.silence) {
					scope.track.player.volume.value = -100;
					scope.track.silence = true;
				} else {
					scope.track.player.volume.value = 0;
					scope.track.silence = false;
				}
			}

			scope.record = function (index) {
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
				scope.track.previewing = false;


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

				window.setTimeout(function() {
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
						scope.$parent.metronome.stop();
						window.clearInterval(click);

						scope.$parent.stop();
						ToneTimelineFct.unMuteAll(scope.$parent.tracks);
					});
				}, 4000);

				window.setTimeout(function() {
					RecorderFct.recordStart(recorder, index);
				}, 2000);
				scope.$parent.metronome.start();

				var click = window.setInterval(function () {
					scope.$parent.metronome.stop();
					scope.$parent.metronome.start();
				}, 500);

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