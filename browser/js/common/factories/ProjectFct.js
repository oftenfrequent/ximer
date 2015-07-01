'use strict';
app.factory('ProjectFct', function ($http) {


    var getProjectInfo = function (projectId) {
        return $http.get('/api/project/'+projectId, function (data){
            return data.data;
        });
    }

    return {
        getProjectInfo: getProjectInfo
    };

});
