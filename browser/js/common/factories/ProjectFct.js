'use strict';
app.factory('ProjectFct', function ($http) {

    var getProjectInfo = function (projectId) {
        return $http.get('/api/projects/' + projectId).then(function(response){
            return response.data;
        });
    };

    var createAFork = function(project){
    	return $http.post('/api/projects/', project).then(function(fork){
    		return $http.put('api/users/', fork.data).then(function(response){
    			return response.data;
    		});
    	});
    }

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork
    };

});
