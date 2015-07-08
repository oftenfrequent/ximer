'use strict';
app.factory('HomeFct', function($http){


    return {
        getUser: function(user){
            return $http.get('/api/user', {params: {_id: user}})
            .then(function(success){
                return success.data;
            });
        }
    };

});