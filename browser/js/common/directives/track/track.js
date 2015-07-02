app.directive('ximTrack', function ($rootScope, $stateParams, $localStorage, RecorderFct, ProjectFct, TonePlayerFct, ToneTimelineFct) {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/track/track.html',
		link: function(scope) {
			console.log('IN TRACK');
		}
	}
});