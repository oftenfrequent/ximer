
app.controller('UserController', function ($scope, $state, AuthService, $stateParams, userFactory) {
    AuthService.getLoggedInUser().then(function(loggedInUser){
        
          $scope.loggedInUser = loggedInUser;

          userFactory.getUserObj($stateParams.theID).then(function(user){
            $scope.user = user;
              var imgArr = [
                "https://i1.sndcdn.com/artworks-000121902503-djbqh6-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000103418932-te6hs4-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000121795778-cmq0x1-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000121925392-2hw3hg-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000122506583-ozzx85-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000123015713-wuuuy9-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000122546910-xmjb63-t500x500.jpg",
              ]

              $scope.user.projects.forEach(function(aProject){
                aProject.backgroundImg = imgArr[Math.floor(Math.random() * 9)];
              });

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
    };

    $scope.displayWeb = function(){
      $state.go('forkweb');
    };


});