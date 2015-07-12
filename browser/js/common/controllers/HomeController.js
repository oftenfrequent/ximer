app.controller('HomeController', function($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state, $mdToast) {
	var trackBucket = [];
    document.getElementsByTagName('navbar')[0].style.display = "block";

	$scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };

    $scope.projects = function (){
    	ProjectFct.getProjectInfo().then(function(projects){
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

    


});
