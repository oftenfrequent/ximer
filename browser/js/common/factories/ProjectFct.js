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
    	return $http.post('/api/projects',{owner:user._id, name:'Untitled', bpm:120, endMeasure: 32}).then(function(response){
    		return response.data;
    	})
    }

    var deleteProject = function(project){
        return $http.delete('/api/projects/'+project._id).then(function(response){
            console.log('Delete Proj Fct', response.data);
            return response.data;
        })
    }

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork,
        newProject: newProject, 
        deleteProject: deleteProject
    };

});
