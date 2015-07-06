'use strict';
app.factory('ProjectFct', function ($http) {

    var getProjectInfo = function (projectId) {
        return $http.get('/api/projects/' + projectId).then(function(response){
            return response.data;
        });
    };

    var newProject = function(user){
    	return $http.post('/api/projects',{owner:user._id}).then(function(response){
    		return $http.post('/api/users',{owner: user._id, project:response.data}).then(function(user){
    			console.log(user.data)
    		})
    	})
    }

    return {
        getProjectInfo: getProjectInfo,
        newProject: newProject
    };

});
