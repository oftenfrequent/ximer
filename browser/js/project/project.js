'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('project', {
        url: '/project/:projectID',
        templateUrl: 'js/project/project.html'
    });
});


app.controller('ProjectController', function ($scope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AuthService) {

  // number of measures on the timeline
  $scope.numMeasures = _.range(0, 60);

  // length of the timeline
  $scope.measureLength = 1;


	//Initialize recorder on project load
	RecorderFct.recorderInit(function (recorder, analyserNode) {
		$scope.recorder = recorder;
		$scope.analyserNode = analyserNode;
	});

	$scope.measureLength = 1;
	$scope.tracks = [];
	$scope.loading = true;
	$scope.projectId = $stateParams.projectID;

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
    		    track.empty = true;
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

		ToneTimelineFct.getTransport(project.endMeasure);
		ToneTimelineFct.changeBpm(project.bpm);

	});

  $scope.addTrack = function () {

  };

  $scope.play = function () {
  	Tone.Transport.start();
  }
  $scope.pause = function () {
  	Tone.Transport.pause();
  }
  $scope.stop = function () {
  	Tone.Transport.stop();
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