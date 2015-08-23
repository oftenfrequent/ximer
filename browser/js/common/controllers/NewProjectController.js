app.controller('NewProjectController', function($scope, AuthService, ProjectFct, $state){
	 AuthService.getLoggedInUser().then(function(user){
	 	$scope.user = user;
    });

	$scope.newProjectBut = function(){
		ProjectFct.newProject($scope.user).then(function(projectId){
			$state.go('project', {projectID: projectId});	 	
		});

	};

});