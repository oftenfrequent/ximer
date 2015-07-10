'use strict';
app.factory('ForkFactory', function($http){

    var getWeb = function () {

        //if coming from HomeController and no Id is passed, set it to 'all'
        return $http.get('/api/forks/').then(function(response){
            return response.data;
        });
    };

 

    return {
        getWeb: getWeb
    };

});