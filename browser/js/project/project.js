'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('project', {
        url: '/project/:projectID',
        templateUrl: 'js/project/project.html'
    });
});

app.controller('ProjectController', function ($scope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AuthService) {

	//window events
	window.onblur = function () {
        $scope.stop();
		$scope.$digest();
    };
    window.onbeforeunload = function() {
		return "Are you sure you want to leave this page before saving your work?";
	};
	window.onunload = function () {
		Tone.Transport.clearTimelines();
	}
	$('.timeline-container').scroll(function(){
	    $('.trackMainSection').css({
	        'left': $(this).scrollLeft()
	    });
	});



	var maxMeasure = 0;

	// number of measures on the timeline
	$scope.numMeasures = _.range(0, 60);

	// length of the timeline
	$scope.measureLength = 1;

	//Initialize recorder on project load
	RecorderFct.recorderInit().then(function (retArr) {
		$scope.recorder = retArr[0];
		$scope.analyserNode = retArr[1];
	}).catch(function (e){
        alert('Error getting audio');
        console.log(e);
    });

	$scope.measureLength = 1;
	$scope.tracks = [];
	$scope.loading = true;
	$scope.projectId = $stateParams.projectID;
	$scope.position = 0;
	$scope.playing = false;
	$scope.currentlyRecording = false;
	$scope.previewingId = null;
	$scope.zoom = 100;

	ProjectFct.getProjectInfo($scope.projectId).then(function (project) {
		var loaded = 0;
		console.log('PROJECT', project);
		$scope.projectName = project.name;

		if (project.tracks.length) {

			console.log('project.tracks.length', project.tracks.length);

			project.tracks.forEach(function (track) {

				var loadableTracks = [];

				project.tracks.forEach(function (track) {
					if (track.url) {
						loadableTracks++;
					}
				});

				if (track.url) {

					var doneLoading = function () {

						loaded++;

						if(loaded === loadableTracks) {
							$scope.loading = false;
							$scope.$digest();
						}
					};

					var max = Math.max.apply(null, track.location);
					if(max + 2 > maxMeasure) maxMeasure = max + 2;
					
					track.empty = false;
					track.recording = false;
					// TODO: this is assuming that a player exists
					track.player = ToneTrackFct.createPlayer(track.url, doneLoading);
					//init effects, connect, and add to scope

					track.effectsRack = ToneTrackFct.effectsInitialize(track.effectsRack);
					track.player.connect(track.effectsRack[0]);

					if(track.location.length) {
						ToneTimelineFct.addLoopToTimeline(track.player, track.location);
						track.onTimeline = true;
					} else {
						track.onTimeline = false;
					}
					$scope.tracks.push(track);
				} else {
					track.empty = true;
					track.recording = false;
    				track.onTimeline = false;
    				track.previewing = false;
    				track.effectsRack = ToneTrackFct.effectsInitialize([0, 0, 0, 0]);
    				track.player = null;
    				$scope.tracks.push(track);
				}
			});
		} else {
			$scope.maxMeasure = 32;
  			for (var i = 0; i < 8; i++) {
    				var obj = {};
    				obj.empty = true;
    				obj.recording = false;
    				obj.onTimeline = false;
    				obj.previewing = false;
    				obj.silence = false;
    				obj.effectsRack = ToneTrackFct.effectsInitialize([0, 0, 0, 0]);
    				obj.player = null;
    				obj.name = 'Track ' + (i+1);
    				obj.location = [];
    				$scope.tracks.push(obj);
  			}
  			$scope.loading = false;
		}

		//dynamically set measures
		//if less than 16 set 18 as minimum
		$scope.numMeasures = [];
		if(maxMeasure < 32) maxMeasure = 32;
		for (var i = 0; i < maxMeasure; i++) {
			$scope.numMeasures.push(i);
		}
		// console.log('MEASURES', $scope.numMeasures);



		ToneTimelineFct.createTransport(project.endMeasure).then(function (metronome) {
			$scope.metronome = metronome;
			$scope.metronome.on = true;
		});
		ToneTimelineFct.changeBpm(project.bpm);

	});

	$scope.jumpToMeasure = function(measure) {
		if(maxMeasure > measure) {
			$scope.position = measure;
			Tone.Transport.position = measure.toString() + ":0:0";
			$scope.movePlayhead(measure);
		}
	}

	$scope.movePlayhead = function (numberMeasures) {
		var playHead = document.getElementById('playbackHead');
		$('#timelinePosition').val(Tone.Transport.position.substr(1));
		playHead.style.left = (numberMeasures * 200 + 300).toString()+'px';
	}

	$scope.zoomOut = function() {
		$scope.zoom -= 10;
		var zoom = ($scope.zoom - 10).toString() + "%";
		$('.timeline-container').css('zoom', zoom);
		console.log('OUT', $scope.zoom);
	};

	$scope.zoomIn = function() {
		$scope.zoom += 10;
		var zoom = ($scope.zoom + 10).toString() + "%";
		$('.timeline-container').css('zoom', zoom);
		console.log('IN', $scope.zoom);
	};

	$scope.dropInTimeline = function (index) {
		var track = scope.tracks[index];
	};

	$scope.addTrack = function () {

	};


	$scope.play = function () {
		$scope.playing = true;
		Tone.Transport.position = $scope.position.toString() + ":0:0";
		Tone.Transport.start();
	};
	$scope.pause = function () {
		$scope.playing = false;
		$scope.metronome.stop();
		ToneTimelineFct.stopAll($scope.tracks);
		$scope.position = Tone.Transport.position.split(':')[0];
		var playHead = document.getElementById('playbackHead');
		$('#timelinePosition').val(":0:0");
		playHead.style.left = ($scope.position * 200 + 300).toString()+'px';
		Tone.Transport.pause();
	};
	$scope.stop = function () {
		$scope.playing = false;
		$scope.metronome.stop();
		ToneTimelineFct.stopAll($scope.tracks);
		$scope.position = 0;
		var playHead = document.getElementById('playbackHead');
		playHead.style.left = '300px';
		Tone.Transport.stop();
		$('#timelinePosition').val(":0:0");
		$('#positionSelector').val("0");
		//stop and track currently being previewed
		if($scope.previewingId) {
			Tone.Transport.clearInterval($scope.previewingId);
			$scope.previewingId = null;
		}
	}
	$scope.nameChange = function(newName) {
		console.log('NEW', newName);
		if(newName) {
			$scope.nameError = false;
			ProjectFct.nameChange(newName, $scope.projectId).then(function (response) {
				console.log("RES", response);
			});
		} else {
			$scope.nameError = "You must set a name!";
			$scope.projectName = "Untitled";
			document.getElementById('projectNameInput').focus();
		}
	}

	$scope.toggleMetronome = function () {
		if($scope.metronome.volume.value === 0) {
			$scope.metronome.volume.value = -100;
			$scope.metronome.on = false;
		} else {
			$scope.metronome.volume.value = 0;
			$scope.metronome.on = true;

		}
	}

  $scope.sendToAWS = function () {

    RecorderFct.sendToAWS($scope.tracks, $scope.projectId, $scope.projectName).then(function (response) {
        // wave logic
        console.log('response from sendToAWS', response);

    });
  };
  
  $scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };
});