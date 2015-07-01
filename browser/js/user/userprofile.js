app.config(function($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/userprofile/:theID/',
        templateUrl: 'js/user/userprofile.html',
        controller: 'UserController',
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });

});

app.controller('UserController', function($scope, $state, AuthService, userFactory, $stateParams) {
    console.log("scope", $scope);
    AuthService.getLoggedInUser().then(function(aUser){
        $scope.theUser = aUser;
        // $stateParams.theID = aUser._id
        console.log("id", $stateParams);
    });

    $scope.displaySettings = function(){
        
    }

    $scope.displayProjects = function(){
        userFactory.getAllProjects($scope.theUser._id).then(function(data){
            $scope.projects = data;
            console.log($scope.projects);
        });
    }

    $scope.displayForks = function(){
        userFactory.getForks($scope.theUser._id).then(function(data){
            $scope.forks = data;
            console.log($scope.projects);
        });
    }

});