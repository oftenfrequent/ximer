app.directive('projectdirective', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/project/projectDirective.html',
		controller: 'projectdirectiveController'
	};
});

app.controller('projectdirectiveController', function($scope, $stateParams, $state, ProjectFct){

	$scope.displayAProject = function(something){
		console.log('THING', something);
		$state.go('project', {projectID: something._id});
		// console.log("displaying a project", projectID);
	}

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