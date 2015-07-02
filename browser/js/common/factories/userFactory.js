app.factory('userFactory', function($http){
	return {
		getAllProjects: function(userID){
			return $http.get('api/users', {
				params: {_id: userID}
			}).then(function(response){
				return response.data;
			});
		},	
		getForks: function(userID){
			return $http.get('api/projects', {
				params: {user: userID}
			}).then(function(response){
				return response.data;
			});
		},

		getUserSettings: function(){
			return $http.get('api/users', {
				params: {_id: userID}
			}).then(function(response){
				return response.data;
			});
		}
	}

})