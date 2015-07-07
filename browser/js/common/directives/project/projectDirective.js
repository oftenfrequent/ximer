app.directive('projectdirective', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/project/projectDirective.html',
		controller: 'projectdirectiveController'
	};
});

app.controller('projectdirectiveController', function($scope, $stateParams, $state, ProjectFct, AuthService){

	$scope.displayAProject = function(something){
		console.log('THING', something);
		$state.go('project', {projectID: something._id});
		// console.log("displaying a project", projectID);
	}

	$scope.makeFork = function(project){

		AuthService.getLoggedInUser().then(function(loggedInUser){
			project.owner = loggedInUser._id;
			project.forkID = project._id;
			delete project._id;
			console.log(project);
			ProjectFct.createAFork(project).then(function(response){
				console.log('Fork response is', response)
			});
		})
	
		// $state.go('project')
	}
});