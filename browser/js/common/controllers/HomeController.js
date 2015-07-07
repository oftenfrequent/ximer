
app.controller('HomeController', function($scope, AuthService, ProjectFct, $stateParams, $state) {
	console.log('in Home controller');
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
		console.log($stateParams.theID);
		project.owner = $stateParams.theID;
		project.forkID = project._id;
		project.isForked = true;
		delete project._id;
		console.log(project);
		ProjectFct.createAFork(project);
		// $state.go('project')
	}
    


});

