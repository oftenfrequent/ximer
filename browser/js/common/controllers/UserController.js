
app.controller('UserController', function ($scope, $state, AuthService, $stateParams, userFactory) {
    AuthService.getLoggedInUser().then(function(loggedInUser){
        
          $scope.loggedInUser = loggedInUser;

          userFactory.getUserObj($stateParams.theID).then(function(user){
            $scope.user = user;
            if(!$scope.user.profpic){
              $scope.user.profpic = "https://www.mdr101.com/wp-content/uploads/2014/05/placeholder-user.jpg";
            }

            for(var i = 0; i < user.followers.length; i ++){
              console.log($stateParams.theID, user.followers[i]._id);
              if(user.followers[i]._id === loggedInUser._id){
                $scope.followStatus = true;
              } 
            }


          });
    });



    // $scope.displaySettings = function(){
    //     if($scope.showSettings) $scope.showSettings = false;
    //     console.log($scope.showSettings);
    // }

    $scope.follow = function(user){
      userFactory.follow(user, $scope.loggedInUser).then(function(response){
        console.log('Follow controller response', response);
      });
      
      $scope.followStatus = true;
    }

    $scope.displayWeb = function(){
      $state.go('forkweb');
    }


});