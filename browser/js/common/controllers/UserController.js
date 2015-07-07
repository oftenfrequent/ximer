app.controller('UserController', function ($scope, $state, AuthService, userFactory, $stateParams) {
    AuthService.getLoggedInUser().then(function(aUser){
         if(aUser._id !== $stateParams.theID){
            console.log("IDS", aUser._id, $stateParams.theID);
        } else {
            $scope.theUser = aUser;
            console.log($scope.theUser, "I hit else");
        }
    });
    
    userFactory.getAllProjects($scope.theUser._id).then(function(data){
        $scope.projects = data;
        if($scope.showProjects) $scope.showProjects = false;
        else $scope.showProjects = true;
        console.log($scope.projects);
    });

    // $scope.displaySettings = function(){
    //     if($scope.showSettings) $scope.showSettings = false;
    //     else $scope.showSettings = true;
    //     console.log($scope.showSettings);
    // }


    // AuthService.getLoggedInUser().then(function(aUser){
    //     if(aUser._id !== $stateParams){
    //         console.log("IDS", aUser._id, $stateParams);
    //     } else {
    //         $scope.theUser = aUser;
    //     }
    // });
    console.log($scope.$parent);
        // $scope.onFileSelect = function(image) {
        //     if (angular.isArray(image)) {
        //         image = image[0];
        //         console.log(image);
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