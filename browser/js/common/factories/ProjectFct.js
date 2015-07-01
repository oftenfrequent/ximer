'use strict';
app.factory('ProjectFct', function ($http) {

    var getProjectInfo = function (projectId) {
        return $http.get('/api/project/' + projectId).then(function(response){
            return response.data;
        });
    }

    return {
        getProjectInfo: getProjectInfo
    };

});
