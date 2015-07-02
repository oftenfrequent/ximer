app.config(function($stateProvider) {

    $stateProvider.state('userProfile', {
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
    AuthService.getLoggedInUser().then(function(aUser){
        $scope.theUser = aUser;
    });

    $scope.displaySettings = function(){
        if($scope.showSettings) $scope.showSettings = false;
        else $scope.showSettings = true;
        console.log($scope.showSettings);
    }

    $scope.displayProjects = function(){
        userFactory.getAllProjects($scope.theUser._id).then(function(data){
            $scope.projects = data;
            if($scope.showProjects) $scope.showProjects = false;
            else $scope.showProjects = true;
            console.log($scope.projects);
        });
    }

    $scope.displayForks = function(){
        userFactory.getForks($scope.theUser._id).then(function(data){
            $scope.forks = data;
            console.log($scope.forks);
        });
    }

    $scope.createAProject = function(){
        
    }

});