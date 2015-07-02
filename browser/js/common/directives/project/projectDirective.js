app.directive('projectdirective', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/project/projectDirective.html',
		controller: 'projectdirectiveController'
	};
});

app.controller('projectdirectiveController', function($scope, $stateParams, $state, ProjectFct){

	$scope.displayAProject = function(something){
		$state.go('project', {projectID: something._id});
		console.log("displaying a project", projectID);
	}
});