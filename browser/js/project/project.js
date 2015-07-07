'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('project', {
        url: '/project/:projectID',
        templateUrl: 'js/project/project.html'
    });
});

app.controller('ProjectController', function ($scope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AuthService) {

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
	$scope.nameChanging = false;
	$scope.tracks = [];
	$scope.loading = true;
	$scope.projectId = $stateParams.projectID;
	$scope.position = 0;

	ProjectFct.getProjectInfo($scope.projectId).then(function (project) {
		var loaded = 0;
		console.log('PROJECT', project);
		$scope.projectName = project.name;

		if (project.tracks.length) {
			project.tracks.forEach(function (track) {
				var doneLoading = function () {
					loaded++;
					if(loaded === project.tracks.length) {
						$scope.loading = false;
						// Tone.Transport.start();
					}
				};
				var max = Math.max.apply(null, track.locations);
				if(max + 2 > maxMeasure) maxMeasure = max + 2;
				
				track.empty = false;
				track.recording = false;
				track.player = ToneTrackFct.createPlayer(track.url, doneLoading);
				//init effects, connect, and add to scope
				track.effectsRack = ToneTrackFct.effectsInitialize();
				track.player.connect(track.effectsRack[0]);

				if(track.locations.length) {
					ToneTimelineFct.addLoopToTimeline(track.player, track.locations);
					track.onTimeline = true;
				} else {
					track.onTimeline = false;
				}

				$scope.tracks.push(track);
			});
		} else {
			$scope.maxMeasure = 17;
  			for (var i = 0; i < 6; i++) {
				var obj = {};
				obj.empty = true;
				obj.recording = false;
				obj.onTimeline = false;
				obj.name = 'Track ' + (i+1);
				obj.location = [];
				$scope.tracks.push(obj);
  			}
		}

		//dynamically set measures
		//if less than 16 set 18 as minimum
		$scope.numMeasures = [];
		if(maxMeasure < 16) maxMeasure = 18;
		for (var i = 0; i < maxMeasure; i++) {
			$scope.numMeasures.push(i);
		}
		console.log('MEASURES', $scope.numMeasures);



		ToneTimelineFct.createTransport(project.endMeasure).then(function (metronome) {
			$scope.metronome = metronome;
		});
		ToneTimelineFct.changeBpm(project.bpm);

	});

	$scope.dropInTimeline = function (index) {
		var track = scope.tracks[index];

		console.log(track);
	}

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
		var playHead = document.getElementById('playbackHead');
		playHead.style.left = ($scope.position * 200 + 300).toString()+'px';
		Tone.Transport.pause();
	}
	$scope.stop = function () {
		$scope.metronome.stop();
		ToneTimelineFct.stopAll($scope.tracks);
		$scope.position = 0;
		var playHead = document.getElementById('playbackHead');
		playHead.style.left = '300px';
		Tone.Transport.stop();
	}
	$scope.nameChange = function(newName) {
		console.log('SHOW INPUT', newName);
		$scope.nameChanging = false;
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