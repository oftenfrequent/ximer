app.directive('followingdirective', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/following/followingDirective.html',
		controller: 'FollowingDirectiveController'
	};
});

app.controller('FollowingDirectiveController', function($scope, $stateParams, $state, AuthService, userFactory){



		// AuthService.getLoggedInUser().then(function(loggedInUser){
  //        	$scope.loggedInUser = loggedInUser;
  //         	userFactory.getUserObj($stateParams.theID).then(function(user){
	 //            $scope.user = user;
	 //            console.log('user is', user);
	 //    	});
		// });

		$scope.goToFollowee = function(myFollowee){
	      console.log("clicked", myFollowee);
	      $state.go('userProfile', { theID: myFollowee});
	    }
	
});