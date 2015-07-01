'use strict';
var app = angular.module('FullstackGeneratedApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt']);

app.controller('DragDropCtrl', function ($scope, ProjectFct, TonePlayerFct, ToneTimelineFct) {
  // $scope.handleDrop = function() {
  //   alert('Item has been dropped');
  // };
    $scope.tracks = [];
    $scope.loading = true;
    $scope.transport;

    ProjectFct.getProjectInfo(1234).then(function (data) {
        var loaded = 0;
        var project = data.data;
        console.log('PROJECT', project);

        $scope.transport = ToneTimelineFct.transport(project.endMeasure);
        ToneTimelineFct.changeBpm($scope.transport, project.bpm);



        project.tracks.forEach(function (track) {
            var doneLoading = function () {
                loaded++;
                ToneTimelineFct.addLoopToTimeline($scope.transport, track.player, track.locations);
                if(loaded === project.tracks.length) {
                    $scope.loading = false;
                    console.log('STARTING');
                    $scope.transport.start();
                }
            };
            track.player = TonePlayerFct.createPlayer(track.url, doneLoading);
            $scope.tracks.push(track);
        });
    });
});


app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function (state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });

    });

});