
app.controller('HomeController', function($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state) {
	console.log('in Home controller');
	var trackBucket = [];
	$scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };

    $scope.projects = function (){
    	console.log('in here')
    	ProjectFct.getProjectInfo().then(function(projects){
    		$scope.allProjects=projects;
    		console.log('All Projects are', projects)
    	})
    }
$scope.projects();

	$scope.makeFork = function(project){

		console.log('The project is', project);
		// AuthService.getLoggedInUser(function(user){

		// 	ProjectFct.createAFork(project).then(function(response){
		// 	console.log('Response is', response);
		// });
		// })
		// $state.go('project')
	}
	var stop =false;

	$scope.sampleTrack = function(track){

		if(stop===true){
			$scope.player.stop()
		}

		ToneTrackFct.createPlayer(track.url, function(player){
			$scope.player = player;
			if(stop===false){
				stop=true
				$scope.player.start();
			}
			else{
				stop=false;
			}
		})
	}

	$scope.for
    


});

