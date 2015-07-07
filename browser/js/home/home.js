'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });

    $stateProvider.state('home.landing',{
    	url: '/landing',
    	templateUrl: 'js/home/landing.html'
    })
});
