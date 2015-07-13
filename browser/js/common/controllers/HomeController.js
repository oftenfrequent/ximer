app.controller('HomeController', function($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state, $mdToast) {
	var trackBucket = [];
    document.getElementsByTagName('navbar')[0].style.display = "block";

	$scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };

    $scope.projects = function (){
    	ProjectFct.getProjectInfo().then(function(projects){
    		console.log('PROJCS', projects);
    		$scope.allProjects = projects;
    	});
    };
	$scope.projects();


	$scope.makeFork = function(project){
		AuthService.getLoggedInUser().then(function(loggedInUser){
			console.log('loggedInUser', loggedInUser);
			project.owner = loggedInUser._id;
			project.forkID = project._id;
			delete project._id;
			console.log(project);
			$mdToast.show({
				hideDelay: 2000,
				position: 'bottom right',
				template:"<md-toast> It's been forked </md-toast>"
			});

			ProjectFct.createAFork(project).then(function(response){
				console.log('Fork response is', response);
			});
		})
	
	}
		
	var stop =false;


	$scope.sampleTrack = function(track){

		if(stop===true){
			$scope.player.stop();
		}

		ToneTrackFct.createPlayer(track.url, function(player){
			$scope.player = player;
			if(stop === false){
				stop = true;
				$scope.player.start();
			}
			else{
				stop = false;
			}
		});
	}


	$scope.getUserProfile = function(user){
	    // console.log("clicked", user);
	    $state.go('userProfile', {theID: user._id});
	}




	var activeUrl = null;

    $scope.paused = true;

    $scope.$on('wavesurferInit', function (e, wavesurfer) {
        $scope.wavesurfer = wavesurfer;

        $scope.wavesurfer.on('play', function () {
            $scope.paused = false;
        });

        $scope.wavesurfer.on('pause', function () {
            $scope.paused = true;
        });

        $scope.wavesurfer.on('finish', function () {
            $scope.paused = true;
            $scope.wavesurfer.seekTo(0);
            $scope.$apply();
        });
    });

    $scope.play = function (url) {
        if (!$scope.wavesurfer) {
            return;
        }

        activeUrl = url;

        $scope.wavesurfer.once('ready', function () {
            $scope.wavesurfer.play();
            $scope.$apply();
        });

        $scope.wavesurfer.load(activeUrl);
    };

    $scope.isPlaying = function (url) {
        return url == activeUrl;
    };

    


});

app.directive('wavesurfer', function () {
    return {
        restrict: 'E',

        link: function ($scope, $element, $attrs) {
            $element.css('display', 'block');

            var options = angular.extend({ container: $element[0] }, $attrs);
            var wavesurfer = WaveSurfer.create(options);

            if ($attrs.url) {
                wavesurfer.load($attrs.url, $attrs.data || null);
            }

            $scope.$emit('wavesurferInit', wavesurfer);
        }
    };
});