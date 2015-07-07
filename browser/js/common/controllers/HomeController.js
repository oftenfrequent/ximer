
app.controller('HomeController', function($scope, AuthService, ProjectFct) {
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
    


});

