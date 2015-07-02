'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });
});


app.controller('HomeController', function($scope, AuthService) {
	
	$scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };

    


});


