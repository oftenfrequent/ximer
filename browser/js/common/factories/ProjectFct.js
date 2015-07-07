'use strict';
app.factory('ProjectFct', function($http){

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
    var newProject = function(user){
    	return $http.post('/api/projects',{owner:user._id, name:'Untitled', bpm:120, endMeasure: 32}).then(function(response){
    		return response.data;
    	})
    }

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork,
        newProject: newProject
    };

});
