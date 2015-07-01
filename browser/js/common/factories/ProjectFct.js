'use strict';
app.factory('ProjectFct', function ($http) {


    var getProjectInfo = function (projectId) {
        return $http.get('/api/projects/'+projectId, function (data){
            return data.data;
        });
    }

    return {
        getProjectInfo: getProjectInfo
    };

});
