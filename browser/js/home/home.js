'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('loggedInHome', {
        url: '/home',
        templateUrl: 'js/home/home.html',
		controller: 'HomeController'
    })
	.state('home',{
		url: '/',
		templateUrl: 'js/home/landing.html',
		controller: 'LandingPageController',
		resolve: {
			 checkIfLoggedIn: function (AuthService, $state) {
			 	// console.log(AuthService.getLoggedInUser());
		        AuthService.getLoggedInUser().then(function (user) {
		        	if(user) $state.go('loggedInHome');
		        });
		    }
		}
	});
});
