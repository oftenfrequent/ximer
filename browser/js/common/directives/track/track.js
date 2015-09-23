app.directive('ximTrack', function ($rootScope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AnalyserFct, $q) {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/track/track.html',
		link: function(scope, element, attrs) {
			// console.log("TRCK", scope.track);
			// TODO: not sure what this is
			scope.effectWetnesses = scope.track.effectsRack.map(function (effect) {
				return effect.wet.value * 1000;
			});
				scope.volume = new Tone.Volume();
				scope.volume.volume.value = 0;
			setTimeout(function () {
				scope.track.location.forEach(function (loc) {
					var trackIndex = scope.$parent.tracks.indexOf(scope.track);
					var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, loc);
					$('#measure' + loc + '.track' + trackIndex).first().append($compile("<canvas width='198' height='98' position='" + loc + "' timelineId='"+timelineId+"' id='mdisplay" +  trackIndex + "-" + loc + "' class='item trackLoop"+trackIndex+"' style='position: absolute; background: url(" + scope.track.img + ");' draggable></canvas>")(scope));
				});
			}, 0);

			scope.dropInTimeline = function (index, position) {
				scope.track.player.stop();
				scope.track.onTimeline = true;
				scope.track.previewing = false;
				// var position = 0;
				var canvasRow = element[0].getElementsByClassName('canvas-box');

				if (scope.track.location.length) {
					// drop the loop on the first available index				
					while (scope.track.location.indexOf(position) > -1) {
						position++;
					}					
				}

				//append canvas element
				scope.track.location.push(position);
				scope.track.location.sort();
				var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
				angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  index + "-" + position + "' class='item trackLoop"+index+"' style='position: absolute; background: url(" + scope.track.img + ");' draggable></canvas>")(scope));
				
			};

			scope.moveInTimeline = function (oldTimelineId, newMeasure) {
				return new $q(function (resolve, reject) {
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
						// angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  trackIndex + "-" + position + "' class='item trackLoop"+trackIndex+"' style='position: absolute; background: url(data:image/png;base64," + scope.track.img + ");' draggable></canvas>")(scope));
						angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  trackIndex + "-" + position + "' class='item trackLoop"+trackIndex+"' style='position: absolute; background: url(" + scope.track.img + ");' draggable></canvas>")(scope));
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
				console.log("LOOPS", loopsUI);
				while(loopsUI.length !== 0) {
					console.log('LOOPS ARR', loopsUI);
					for(var i = 0; i < loopsUI.length;i++) {
						loopsUI[i].parentNode.removeChild(loopsUI[i]);
					}
					loopsUI = document.getElementsByClassName('trackLoop'+index.toString());
				}
				Tone.Transport.stop();
			};

			scope.solo = function () {
				var otherTracks = scope.$parent.tracks.map(function (track) {
					if(track !== scope.track) {
						track.silence = true;
						return track;
					}
				}).filter(function (track) {
					if(track && track.player) return true;
				});
				ToneTimelineFct.muteAll(otherTracks);
				scope.track.silence = false;
				scope.track.player.volume.value = 0;
			};

			scope.silence = function () {
				if(!scope.track.silence) {
					scope.track.player.volume.value = -100;
					scope.track.silence = true;
				} else {
					scope.track.player.volume.value = 0;
					scope.track.silence = false;
				}
			};

			scope.record = function (index) {
				var recorder = $rootScope.recorder;

				var continueUpdate = true;

				//analyser stuff
		        var canvas = document.getElementById("analyser"+index);
		        var analyserContext = canvas.getContext('2d');
		        var analyserNode = $rootScope.analyserNode;
				var analyserId = window.requestAnimationFrame( update );

				scope.track.recording = true;
				scope.track.empty = true;
				RecorderFct.recordStart(recorder);
				scope.track.previewing = false;
				scope.$parent.currentlyRecording = true;


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

				function endRecording(position) {
					RecorderFct.recordStop(index, recorder).then(function (player) {
						//track variables
						scope.track.recording = false;
						scope.track.empty = false;
						scope.track.rawAudio = window.latestRecording;
						scope.track.img = window.latestRecordingImage;

						//create player
						scope.track.player = player;
						player.connect(scope.track.effectsRack[0]);

						//stop analyser
						continueUpdate = false;
						window.cancelAnimationFrame( analyserId );

						//set Project vars
						scope.$parent.metronome.stop();
						scope.$parent.currentlyRecording = false;
						// scope.$parent.stop();
						// ToneTimelineFct.unMuteAll(scope.$parent.tracks);
					});
				}

				if(Tone.Transport.state === "stopped") {
					Tone.Transport.position = "-1:0:0";
					scope.$parent.countNumber = 0;
					scope.$parent.countIn = true;
					Tone.Transport.start();
					var incCount = Tone.Transport.setInterval(function () {
						scope.$parent.countNumber = scope.$parent.countNumber + 1;
						scope.$parent.$digest();
						
					}, "4n");

					var recordingID = Tone.Transport.setTimeline(function () {
						scope.$parent.countIn = false;
						console.log(scope.$parent.countIn);
						scope.$parent.$digest();
						Tone.Transport.clearInterval(incCount);
						RecorderFct.recordStart(recorder, index);
						window.setTimeout(function () {
							RecorderFct.recordStart(recorder, index);
							window.setTimeout(function () {
								endRecording(0);
								Tone.Transport.clearTimeline(recordingID);

							}, 2000);
						}, 50);
					}, "0m");

				} else {
					var nextBar = parseInt(Tone.Transport.position.split(':')[0]) + 1;
					var endBar = nextBar + 1;

					var recId = Tone.Transport.setTimeline(function () {
						window.setTimeout(function () {
							RecorderFct.recordStart(recorder, index);
						}, 50);
					}, nextBar.toString() + "m");


					var recEndId = Tone.Transport.setTimeline(function () {
						Tone.Transport.clearTimeline(recId);
						Tone.Transport.clearTimeline(recEndId);
						endRecording(nextBar);

					}, endBar.toString() + "m");
				}
			};


			scope.preview = function(currentlyPreviewing) {
				var nextBar;
				if(!scope.$parent.previewingId) {
					scope.track.previewing = true;

					if(Tone.Transport.state === "stopped") {
						nextBar = parseInt(Tone.Transport.position.split(':')[0]);
						Tone.Transport.start();
					} else {
						nextBar = parseInt(Tone.Transport.position.split(':')[0]) + 1;
					}
					var playLaunch = Tone.Transport.setTimeline(function () {
							scope.track.player.start();
						var previewInteval = Tone.Transport.setInterval(function () {
							scope.track.player.stop();
							scope.track.player.start();
							Tone.Transport.clearTimeline(playLaunch);
						}, "1m");
						scope.$parent.previewingId = previewInteval;
					}, nextBar.toString() + "m");
				} else {
					console.log('ALREADY PREVIEWING');
				}
			};

			scope.changeWetness = function(effect, amount) {
				effect.wet.value = amount / 1000;
				effect.saveValue = amount / 1000;
			};

		}
		

	};
});