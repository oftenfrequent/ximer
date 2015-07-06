'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('project', {
        url: '/project/:projectID',
        templateUrl: 'js/project/project.html'
    });
});


app.controller('ProjectController', function ($scope, $stateParams, $localStorage, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AuthService) {
  
	var wavArray = [];

	$scope.numMeasures = [];
	for (var i = 0; i < 60; i++) {
		$scope.numMeasures.push(i);
	}

	//Initialize recorder on project load
	RecorderFct.recorderInit(function (recorder, analyserNode) {
		$scope.recorder = recorder;
		$scope.analyserNode = analyserNode;
	});

	$scope.measureLength = 1;
	$scope.tracks = [];
	$scope.loading = true;
	$scope.projectId = $stateParams.projectID;
	$scope.position = 0;

	ProjectFct.getProjectInfo($scope.projectId).then(function (project) {
		var loaded = 0;
		console.log('PROJECT', project);

		if (project.tracks.length) {
			project.tracks.forEach(function (track) {
				var doneLoading = function () {
					loaded++;
					if(loaded === project.tracks.length) {
						$scope.loading = false;
						// Tone.Transport.start();
					}
				};
				track.empty = false;
				track.recording = false;
				track.player = ToneTrackFct.createPlayer(track.url, doneLoading);
				ToneTimelineFct.addLoopToTimeline(track.player, track.locations);
				$scope.tracks.push(track);
			});
		} else {
			for (var i = 0; i < 6; i++) {
				var obj = {};
				obj.name = 'Track ' + (i+1);
				obj.location = [];
				$scope.tracks.push(obj);
			}
		}

		ToneTimelineFct.createTransport(project.endMeasure).then(function (metronome) {
			$scope.metronome = metronome;
		});
		ToneTimelineFct.changeBpm(project.bpm);

	});

  $scope.addTrack = function () {

  };

  $scope.play = function () {
	Tone.Transport.position = $scope.position.toString() + ":0:0";
  	Tone.Transport.start();
  }
  $scope.pause = function () {
  	$scope.metronome.stop();
  	ToneTimelineFct.stopAll($scope.tracks);
  	$scope.position = Tone.Transport.position.split(':')[0];
  	console.log('POS', $scope.position);
  	Tone.Transport.pause();
  }
  $scope.stop = function () {
  	$scope.metronome.stop();
  	ToneTimelineFct.stopAll($scope.tracks);
  	$scope.position = 0;
  	Tone.Transport.stop();
  }

  $scope.toggleMetronome = function () {
  	if($scope.metronome.volume.value === 0) {
  		$scope.metronome.volume.value = -100;
  	} else {
  		$scope.metronome.volume.value = 0;
  	}
  }

  $scope.sendToAWS = function () {

    RecorderFct.sendToAWS($scope.tracks).then(function (response) {
        // wave logic
        console.log('response from sendToAWS', response);

    });
  };
  $scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };
});