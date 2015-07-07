app.controller('UserController', function ($scope, $state, AuthService, $stateParams, userFactory) {

    AuthService.getLoggedInUser().then(function(loggedInUser){
        console.log('getting')
        
          $scope.loggedInUser = loggedInUser;

          userFactory.getUserObj($stateParams.theID).then(function(user){
            $scope.user = user;
          })
        

    });

    $scope.displaySettings = function(){
        if($scope.showSettings) $scope.showSettings = false;
        else $scope.showSettings = true;
        console.log($scope.showSettings);
    }

    


});