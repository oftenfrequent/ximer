'use strict';
app.factory('ForkFactory', function($http){

    var getWeb = function () {
        return $http.get('/api/forks').then(function(response){
            return response.data;
        });
    };

    return {
        getWeb: getWeb
    };

});