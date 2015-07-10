'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('forkweb', {
        url: '/',
        templateUrl: 'js/forkweb/forkweb.html'
    });

});

app.controller('ForkWebController', function($scope, $stateParams, $state, ProjectFct, AuthService, ForkFactory){

		AuthService.getLoggedInUser().then(function(loggedInUser){
			$scope.loggedInUser = loggedInUser;
			$scope.displayAProject = function(something){
				console.log('THING', something);
				if($scope.loggedInUser._id === $stateParams.theID){
					$state.go('project', {projectID: something._id});
				}
				console.log("displaying a project", $scope.parent);
			}
		});

		ForkFactory.getWeb().then(function(webs){
	        $scope.forks = webs;
	        console.log('webs are', user);
	    });
	
});