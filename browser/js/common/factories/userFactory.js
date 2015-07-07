app.factory('userFactory', function($http){
	return {
		getUserObj: function(userID){
			return $http.get('api/users', {params: {_id: userID}}).then(function(response){
				console.log('resoonse is', response.data)
				return response.data;
			});
		}
	}

})