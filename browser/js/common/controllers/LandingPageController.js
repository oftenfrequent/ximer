app.controller('LandingPageController', function ($scope, AuthService, ToneTrackFct, $state) {
    $scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };
    if($scope.isLoggedIn()) $state.go('loggedInHome');
    // $('#fullpage').fullpage();
    document.getElementsByTagName('navbar')[0].style.display = "none";


    $scope.goToForms = function () {
    	function scrollToBottom(duration) {
		    if (duration <= 0) return;

			var difference = document.documentElement.scrollHeight - window.scrollY;
			var perTick = difference / duration * 10;

			setTimeout(function() {
				window.scroll(0, window.scrollY + perTick);
				scrollToBottom(duration - 10);
			}, 10);
		}

		scrollToBottom(1000);
    };

    

    $scope.sendLogin = function(loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('loggedInHome');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });

    };

    $scope.sendSignup = function(signupInfo) {

        $scope.error = null;
        console.log(signupInfo);
        AuthService.signup(signupInfo).then(function () {
            $state.go('loggedInHome');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });

    };

});