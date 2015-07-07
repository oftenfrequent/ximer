'use strict';
app.factory('ProjectFct', function($http){

    var getProjectInfo = function (projectId) {

        //if coming from HomeController and no Id is passed, set it to 'all'
        var projectid= projectId || 'all'
        return $http.get('/api/projects/' + projectid || projectid).then(function(response){
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
    	return $http.post('/api/projects',{owner:user._id}).then(function(response){

    		return response.data;
    		// return $http.put('/api/projects/userproject',{owner: user._id, project:response.data}).then(function(user){
    		// 	console.log(user.data)
    		// })
    	})
    }

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork,
        newProject: newProject
    };

});
