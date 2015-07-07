app.factory('userFactory', function($http){
	return {
		getAllProjects: function(userID){
			return $http.get('api/users', {
				params: {_id: userID}
			}).then(function(response){
				return response.data;
			});
		},	
	}

})