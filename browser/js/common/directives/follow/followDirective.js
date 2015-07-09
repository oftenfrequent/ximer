app.directive('followdirective', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/follow/followDirective.html',
		controller: 'FollowDirectiveController'
	};
});

app.controller('FollowDirectiveController', function($scope, $stateParams, $state, AuthService, userFactory){



		AuthService.getLoggedInUser().then(function(loggedInUser){
         	$scope.loggedInUser = loggedInUser;
          	userFactory.getUserObj($stateParams.theID).then(function(user){
	            $scope.user = user;
	            console.log('user is', user);

	            if($state.current.name === "userProfile.followers"){
	            	$scope.follows = user.followers;
	            } else{
	            	$scope.follows = user.following;
	            	if($stateParams.theID === loggedInUser._id) $scope.showButton = true;
	            }
	            console.log("followObj is", $scope.follows, $stateParams);

	    	});
		});

		$scope.goToFollow = function(follow){
	      console.log("clicked", follow);
	      $state.go('userProfile', { theID: follow._id});
	    }

	    $scope.unFollow = function(followee) {
	    	console.log("clicked", followee);
	    	userFactory.unFollow(followee, $scope.loggedInUser).then(function(response){
	    		console.log("succesful unfollow");
	    	});
	    }


	
});