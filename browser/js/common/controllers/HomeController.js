app.controller('HomeController', function($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state, $mdToast) {
	var trackBucket = [];
    document.getElementsByTagName('navbar')[0].style.display = "block";
    AuthService.getLoggedInUser().then(function(user){
    	$scope.loggedInUser = user;


    	$scope.myfollowers = $scope.loggedInUser.followers.length;
    	$scope.myfollowing = $scope.loggedInUser.following.length;
    	$scope.myprojects = $scope.loggedInUser.projects.length;

    });

	$scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };

    $scope.projects = function (){
    	ProjectFct.getProjectInfo().then(function(projects){
    		console.log('PROJCS', projects);
    		$scope.allProjects = projects;
          	var imgArr = [
                "https://i1.sndcdn.com/artworks-000121902503-djbqh6-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000103418932-te6hs4-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000121795778-cmq0x1-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000121925392-2hw3hg-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000122506583-ozzx85-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000123015713-wuuuy9-t500x500.jpg",
                "https://i1.sndcdn.com/artworks-000122546910-xmjb63-t500x500.jpg",
              ]

              $scope.allProjects.forEach(function(aProject){
                aProject.backgroundImg = imgArr[Math.floor(Math.random() * 9)];
              });
    	});
    };
	$scope.projects();


	$scope.makeFork = function(project){
		AuthService.getLoggedInUser().then(function(loggedInUser){
			console.log('loggedInUser', loggedInUser);
			project.owner = loggedInUser._id;
			project.forkID = project._id;
			delete project._id;
			console.log(project);
			$mdToast.show({
				hideDelay: 2000,
				position: 'bottom right',
				template:"<md-toast> It's been forked </md-toast>"
			});

			ProjectFct.createAFork(project).then(function(response){
				console.log('Fork response is', response);
			});
		});
	
	};
		
	var stop =false;


	$scope.sampleTrack = function(track){

		if(stop===true){
			$scope.player.stop();
		}

		ToneTrackFct.createPlayer(track.url, function(player){
			$scope.player = player;
			if(stop === false){
				stop = true;
				$scope.player.start();
			}
			else{
				stop = false;
			}
		});
	};

	$scope.getUserProfile = function(user){
	    // console.log("clicked", user);
	    $state.go('userProfile', {theID: user._id});
	};

    


});