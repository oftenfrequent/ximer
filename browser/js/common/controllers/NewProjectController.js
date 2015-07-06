app.controller('NewProjectController', function($scope, AuthService, ProjectFct){
	$scope.user;

	 AuthService.getLoggedInUser().then(function(user){
	 	$scope.user = user;
        console.log('user is', $scope.theUser.username)
    });

	 $scope.newProjectBut = function(){
	 	ProjectFct.newProject($scope.user).then(function(success){
	 		console.log('Success is', success)
	 	})

	 }

})