
app.controller('UserController', function ($scope, $state, AuthService, $stateParams, userFactory) {

    AuthService.getLoggedInUser().then(function(loggedInUser){
        
          $scope.loggedInUser = loggedInUser;

          userFactory.getUserObj($stateParams.theID).then(function(user){
            $scope.user = user;
            console.log('user is', user, $state);
          });
    });

    $scope.displaySettings = function(){
        if($scope.showSettings) $scope.showSettings = false;
        else $scope.showSettings = true;
        console.log($scope.showSettings);
    }

    $scope.follow = function(user){
      userFactory.follow(user, $scope.loggedInUser).then(function(response){
        console.log('Follow controller response', response);
      });
    }

    $scope.displayWeb = function(){
      console.log("clicked");
      $state.go('forkweb');
    }


});