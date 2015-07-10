app.factory('userFactory', function($http){
	return {
		getUserObj: function(userID){
			return $http.get('api/users', {params: {_id: userID}}).then(function(response){
				console.log('resoonse is', response.data)
				return response.data;
			});
		},

		follow: function(user, loggedInUser){
			return $http.put('api/users',{userToFollow: user, loggedInUser: loggedInUser}).then(function(response){
				console.log('FollowUser Factory response', response.data);
				return response.data;
			});
		},

		unFollow: function(followee, loggedInUser) {
			return $http.put('api/users', {userToUnfollow: followee, loggedInUser: loggedInUser}).then(function(response){
				console.log('unFollow response', response.data);
				return response.data;
			});
		}
	}

});