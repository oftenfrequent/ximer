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
		controller: 'LandingPageController'
	});
});
