app.directive('projectdirective', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/project/projectDirective.html',
		controller: 'projectdirectiveController'
	};
});

app.controller('projectdirectiveController', function($scope, $stateParams, $state, ProjectFct, AuthService){



		AuthService.getLoggedInUser().then(function(loggedInUser){
			$scope.loggedInUser = loggedInUser;
			$scope.displayAProject = function(something){
				console.log('THING', something);
				if($scope.loggedInUser._id === $stateParams.theID){
					$state.go('project', {projectID: something._id});
				}
				console.log("displaying a project", $scope.parent);
			}

			$scope.makeFork = function(project){
				if(!project.forkOrigin) project.forkOrigin = project._id;
				project.forkID = project._id;
				project.owner = loggedInUser._id;
				delete project._id;
				// console.log(project);
				ProjectFct.createAFork(project).then(function(response){
					console.log('Fork response is', response);
				});
			}

			$scope.deleteProject = function(project){
				console.log('DeleteProject', project)
				ProjectFct.deleteProject(project).then(function(response){
					console.log('Delete request is', response);
				});
			}

			$scope.uploadProject = function(project){
				console.log('Uploading Project', project);
				ProjectFct.uploadProject(project).then(function(response){
					console.log('Upload Request is', response);
				})
			}
		});
	
});