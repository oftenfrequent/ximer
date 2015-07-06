app.controller('NewProjectController', function($scope, AuthService, ProjectFct, $state){
	$scope.user;

	 AuthService.getLoggedInUser().then(function(user){
	 	$scope.user = user;
        console.log('user is', $scope.theUser.username)
    });

	 $scope.newProjectBut = function(){
	 	ProjectFct.newProject($scope.user).then(function(projectId){
	 		console.log('Success is', projectId)
			$state.go('project', {projectID: projectId});	 	
		})

	 }

})