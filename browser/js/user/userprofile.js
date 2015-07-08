app.config(function($stateProvider) {

    $stateProvider.state('userProfile', {
        url: '/userprofile/:theID',
        templateUrl: 'js/user/userprofile.html',
        controller: 'UserController',
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    })
    .state('userProfile.artistInfo', {
        url: '/info',
        templateUrl: 'js/user/info.html',
        controller: 'UserController'
    })
    .state('userProfile.project', {
        url: '/projects',
        templateUrl: 'js/user/projects.html',
        controller: 'UserController'
    })
    .state('userProfile.followers', {
        url: '/followers',
        templateUrl: 'js/user/followers.html',
        controller: 'UserController'
    })
    .state('userProfile.following', {
        url: '/following',
        templateUrl: 'js/user/following.html',
        controller: 'UserController'
    });

});

