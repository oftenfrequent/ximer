'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('forkweb', {
        url: '/forkweb',
        templateUrl: 'js/forkweb/forkweb.html',
        controller: "ForkWebController"
    });

});

app.controller('ForkWebController', function($scope, $stateParams, $state, ProjectFct, AuthService, ForkFactory){

		// AuthService.getLoggedInUser().then(function(loggedInUser){
		// 	$scope.loggedInUser = loggedInUser;
		// 	$scope.displayAProject = function(something){
		// 		console.log('THING', something);
		// 		if($scope.loggedInUser._id === $stateParams.theID){
		// 			$state.go('project', {projectID: something._id});
		// 		}
		// 		console.log("displaying a project", $scope.parent);
		// 	}
		// });

		ForkFactory.getWeb().then(function(webs){
	        $scope.forks = webs;
	        console.log('webs are', $scope.forks);
	    	
	    	var dataset = [ 25, 7, 5, 26, 11 ];
	    	


	    	d3.select('#ui').selectAll("div").data(dataset)
	    	.enter()
	    	.append("div")
	    	// .text(function(d){return "I can count up to " + d;})
	    	.attr("class", "bar")
	    	.style({
			    'display': 'inline-block',
			    'width': '20px',
			    'margin-right': '2px',
			    'background-color': 'teal'
			})
			.style("height", function(d){
				return (d * 5) + "px";
			});

	    });


	
});