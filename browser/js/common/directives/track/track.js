app.directive('ximTrack', function ($rootScope, $stateParams, $localStorage, RecorderFct, ProjectFct, TonePlayerFct, ToneTimelineFct) {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/track/track.html',
		link: function(scope) {

			scope.dropInTimeline = function (startMeasure) {

			}

			scope.record = function (e, index) {

				//CALLS RECORD IN RECORD FCT with THIS RUNNING
				//ADDS Recording scope var to TRUE
				console.log('e', e, e.toElement);
				e = e.toElement;
			    // start recording
			    console.log('start recording');
			    
			    if (!audioRecorder)
			        return;

			    e.classList.add("recording");
			    audioRecorder.clear();
			    audioRecorder.record();

			    window.setTimeout(function() {
				audioRecorder.stop();
				e.classList.remove("recording");
				audioRecorder.getBuffers( gotBuffers );

				window.setTimeout(function () {
					scope.tracks[index].rawAudio = window.latestRecording;
					scope.tracks[index].rawImage = window.latestRecordingImage;
					console.log('trackss', scope.tracks);
					// wavArray.push(window.latestRecording);
					// console.log('wavArray', wavArray);
				}, 500);
			      
			    }, 2000);

			}
		}
	}
});