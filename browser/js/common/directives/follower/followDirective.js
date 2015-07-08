app.directive('followdirective', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/follow/followDirective.html',
		controller: 'FollowDirectiveController'
	};
});

app.controller('FollowDirectiveController', function($scope, $stateParams, $state, AuthService, userFactory){



		// AuthService.getLoggedInUser().then(function(loggedInUser){
  //        	$scope.loggedInUser = loggedInUser;
  //         	userFactory.getUserObj($stateParams.theID).then(function(user){
	 //            $scope.user = user;
	 //            console.log('user is', user);
	 //    	});
		// });

		$scope.goToFollower = function(myFollower){
	      console.log("clicked", myFollower);
	      $state.go('userProfile', { theID: myFollower});
	    }
	
});