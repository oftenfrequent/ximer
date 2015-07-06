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
        controller: 'UserInfoController'
    })
    .state('userProfile.project', {
        url: '/projects',
        templateUrl: 'js/user/projects.html',
        controller: 'UserProjectController'
    });

});

app.controller('UserController', function ($scope, $state, AuthService, userFactory, $stateParams) {
    AuthService.getLoggedInUser().then(function(aUser){
        $scope.theUser = aUser;
    });

    $scope.displaySettings = function(){
        if($scope.showSettings) $scope.showSettings = false;
        else $scope.showSettings = true;
        console.log($scope.showSettings);
    }

    $scope.displayForks = function(){
        userFactory.getForks($scope.theUser._id).then(function(data){
            $scope.forks = data;
            console.log($scope.forks);
        });
    }

});
app.controller('UserInfoController', function ($scope, $state, AuthService, userFactory, $stateParams) {

        // $scope.onFileSelect = function(image) {
        //     if (angular.isArray(image)) {
        //         image = image[0];
        //     }

        //     // This is how I handle file types in client side
        //     if (image.type !== 'image/png' && image.type !== 'image/jpeg') {
        //         alert('Only PNG and JPEG are accepted.');
        //         return;
        //     }

        //     $scope.uploadInProgress = true;
        //     $scope.uploadProgress = 0;

        //     $scope.upload = $upload.upload({
        //         url: '/upload/image',
        //         method: 'POST',
        //         file: image
        //     }).progress(function(event) {
        //         $scope.uploadProgress = Math.floor(event.loaded / event.total);
        //         $scope.$apply();
        //     }).success(function(data, status, headers, config) {
        //         $scope.uploadInProgress = false;
        //         // If you need uploaded file immediately 
        //         $scope.uploadedImage = JSON.parse(data);      
        //     }).error(function(err) {
        //         $scope.uploadInProgress = false;
        //         console.log('Error uploading file: ' + err.message || err);
        //     });
        // };
});

app.controller('UserProjectController', function ($scope, $stateParams, AuthService, userFactory) {

    $scope.projects;

    //turn this into a promise so you get logged in user and then the projects of that user
    AuthService.getLoggedInUser().then(function(aUser){
        $scope.theUser = aUser;
        userFactory.getAllProjects($scope.theUser._id).then(function(data){
            $scope.projects = data;
            if($scope.showProjects) $scope.showProjects = false;
            else $scope.showProjects = true;
            console.log($scope.projects);
    });
    });
        
  
    

});