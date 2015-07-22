'use strict';
var app = angular.module('FullstackGeneratedApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'ngStorage', 'ngMaterial', 'ngKnob', 'plangular']);

app.config(function (plangularConfigProvider) {
	plangularConfigProvider.clientId = '45c5e6212ac58c73e7d05f8636a9bf22';
});

app.config(function ($urlRouterProvider, $locationProvider) {
	// This turns off hashbang urls (/#about) and changes it to something normal (/about)
	$locationProvider.html5Mode(true);
	// If we go to a URL that ui-router doesn't have registered, go to the "/" url.
	$urlRouterProvider.otherwise('/');
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state, RecorderFct) {

	// The given state requires an authenticated user.
	var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
		return state.data && state.data.authenticate;
	};

	//Initialize recorder on project load
	RecorderFct.recorderInit().then(function (retArr) {
		console.log('ROOT SCOPE', $rootScope);
		$rootScope.recorder = retArr[0];
		$rootScope.analyserNode = retArr[1];
	})['catch'](function (e) {
		alert('Error getting audio');
		console.log(e);
	});

	// $stateChangeStart is an event fired
	// whenever the process of changing a state begins.
	$rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

		if (!destinationStateRequiresAuth(toState)) {
			// The destination state does not require authentication
			// Short circuit with return.
			return;
		}

		if (AuthService.isAuthenticated()) {
			// The user is authenticated.
			// Short circuit with return.
			return;
		}

		// Cancel navigating to new state.
		event.preventDefault();

		AuthService.getLoggedInUser().then(function (user) {
			// If a user is retrieved, then renavigate to the destination
			// (the second time, AuthService.isAuthenticated() will work)
			// otherwise, if no user is logged in, go to "login" state.
			if (user) {
				$state.go(toState.name, toParams);
			} else {
				$state.go('login');
			}
		});
	});
});
(function () {

	'use strict';

	// Hope you didn't forget Angular! Duh-doy.
	if (!window.angular) throw new Error('I can\'t find Angular!');

	var app = angular.module('fsaPreBuilt', []);

	app.factory('Socket', function ($location) {
		if (!window.io) throw new Error('socket.io not found!');
		return window.io(window.location.origin);
	});

	// AUTH_EVENTS is used throughout our app to
	// broadcast and listen from and to the $rootScope
	// for important events about authentication flow.
	app.constant('AUTH_EVENTS', {
		loginSuccess: 'auth-login-success',
		loginFailed: 'auth-login-failed',
		logoutSuccess: 'auth-logout-success',
		sessionTimeout: 'auth-session-timeout',
		notAuthenticated: 'auth-not-authenticated',
		notAuthorized: 'auth-not-authorized'
	});

	app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
		var statusDict = {
			401: AUTH_EVENTS.notAuthenticated,
			403: AUTH_EVENTS.notAuthorized,
			419: AUTH_EVENTS.sessionTimeout,
			440: AUTH_EVENTS.sessionTimeout
		};
		return {
			responseError: function responseError(response) {
				$rootScope.$broadcast(statusDict[response.status], response);
				return $q.reject(response);
			}
		};
	});

	app.config(function ($httpProvider) {
		$httpProvider.interceptors.push(['$injector', function ($injector) {
			return $injector.get('AuthInterceptor');
		}]);
	});

	app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

		// Uses the session factory to see if an
		// authenticated user is currently registered.
		this.isAuthenticated = function () {
			return !!Session.user;
		};

		this.getLoggedInUser = function () {

			// If an authenticated session exists, we
			// return the user attached to that session
			// with a promise. This ensures that we can
			// always interface with this method asynchronously.
			if (this.isAuthenticated()) {
				return $q.when(Session.user);
			}

			// Make request GET /session.
			// If it returns a user, call onSuccessfulLogin with the response.
			// If it returns a 401 response, we catch it and instead resolve to null.
			return $http.get('/session').then(onSuccessfulLogin)['catch'](function () {
				return null;
			});
		};

		this.login = function (credentials) {
			return $http.post('/login', credentials).then(onSuccessfulLogin)['catch'](function (response) {
				return $q.reject({ message: 'Invalid login credentials.' });
			});
		};

		this.logout = function () {
			return $http.get('/logout').then(function () {
				Session.destroy();
				$rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
			});
		};

		function onSuccessfulLogin(response) {
			var data = response.data;
			Session.create(data.id, data.user);
			$rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
			return data.user;
		}

		this.signup = function (credentials) {
			console.log(credentials);
			return $http.post('/signup', credentials).then(onSuccessfulLogin)['catch'](function (response) {
				return $q.reject({ message: 'Invalid signup credentials.' });
			});
		};
	});

	app.service('Session', function ($rootScope, AUTH_EVENTS) {

		var self = this;

		$rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
			self.destroy();
		});

		$rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
			self.destroy();
		});

		this.id = null;
		this.user = null;

		this.create = function (sessionId, user) {
			this.id = sessionId;
			this.user = user;
		};

		this.destroy = function () {
			this.id = null;
			this.user = null;
		};
	});
})();
// var w = 900;
// var h = 500;

// var svg = d3.select('#ui')
//       .append('svg')
//       .attr('width', w)
//       .attr('height', h);

// // create force layout in memory
// var force = d3.layout.force()
//       .nodes(nodes)
//       .links(links)
//       .size([900, 500])
//       .linkDistance([w /(nodeArr.length)]);

// var fisheye = d3.fisheye.circular()
//     			.radius(200)
//     			.distortion(5);

// // append a group for each data element
// var node = svg.selectAll('circle')
//       .data(nodes).enter()
//       .append('g')
//       .call(force.drag)
//       .attr("class", "nodeObj");

// // append circle onto each 'g' node
// node.append('circle')
//       .attr('fill', "green")
//       .attr('r', 10);

// svg.on("mousemove", function() {
//   fisheye.focus(d3.mouse(this));

//     node.selectAll("circle").each(function(d) { d.fisheye = fisheye(d); })
//         .attr("cx", function(d) { return d.fisheye.x; })
// 	        .attr("cy", function(d) { return d.fisheye.y; })
//         .attr("r", function(d) { return d.fisheye.z * 4.5; });

//     link.attr("x1", function(d) { return d.source.fisheye.x; })
//         .attr("y1", function(d) { return d.source.fisheye.y; })
//         .attr("x2", function(d) { return d.target.fisheye.x; })
//         .attr("y2", function(d) { return d.target.fisheye.y; });
// 	force.on('tick', function(e) {
//       node.attr('transform', function(d, i) {
//             return 'translate('+ d.x +', '+ d.y +')';
//       })

//       link
//             .attr('x1', function(d) { return d.source.x })
//             .attr('y1', function(d) { return d.source.y })
//             .attr('x2', function(d) { return d.target.x })
//             .attr('y2', function(d) { return d.target.y })
// 	});
// });

// var link = svg.selectAll('line')
//       .data(links).enter()
//       .append('line')
//       .attr('stroke', "grey");

// force.start();
'use strict';
app.config(function ($stateProvider) {
	$stateProvider.state('forkweb', {
		url: '/forkweb',
		templateUrl: 'js/forkweb/forkweb.html',
		controller: 'ForkWebController'
	});
});

app.controller('ForkWebController', function ($scope, $stateParams, $state, ProjectFct, AuthService, ForkFactory) {

	ForkFactory.getWeb().then(function (webs) {
		$scope.nodes = [];
		var linkArr = [];
		webs.forEach(function (node) {
			var arr = [];
			arr.push(node);
			var newarr = arr.concat(node.branch);
			$scope.nodes.push(newarr);
		});

		console.log('network', $scope.nodes);
		var testA = [];
		var counter = 0;
		$scope.nodes.forEach(function (nodeArr) {
			for (var j = 1; j < nodeArr.length; j++) {
				var aLink = {
					'source': counter,
					'target': j + counter,
					'weight': 3
				};
				linkArr.push(aLink);
			};
			counter += nodeArr.length;
		});

		var nodeArr = [];
		nodeArr = nodeArr.concat.apply(nodeArr, $scope.nodes);
		console.log('PLEASE', linkArr, nodeArr);
		var nodes = nodeArr;
		var links = linkArr;

		var width = 960,
		    height = 500;

		var color = d3.scale.category20();

		var fisheye = d3.fisheye.circular().radius(120);

		var force = d3.layout.force().charge(-240).linkDistance(40).size([width, height]);

		var svg = d3.select('#ui').append('svg').attr('width', width).attr('height', height);

		svg.append('rect').attr('class', 'background').attr('width', width).attr('height', height);

		var n = nodes.length;

		force.nodes(nodes).links(links);

		// Initialize the positions deterministically, for better results.
		nodes.forEach(function (d, i) {
			d.x = d.y = width / n * i;
		});

		// Run the layout a fixed number of times.
		// The ideal number of times scales with graph complexity.
		// Of course, don't run too long—you'll hang the page!
		force.start();
		for (var i = n; i > 0; --i) force.tick();
		force.stop();

		// Center the nodes in the middle.
		var ox = 0,
		    oy = 0;
		nodes.forEach(function (d) {
			ox += d.x, oy += d.y;
		});
		ox = ox / n - width / 2, oy = oy / n - height / 2;
		nodes.forEach(function (d) {
			d.x -= ox, d.y -= oy;
		});

		var link = svg.selectAll('.link').data(links).enter().append('line').attr('class', 'link').attr('x1', function (d) {
			return d.source.x;
		}).attr('y1', function (d) {
			return d.source.y;
		}).attr('x2', function (d) {
			return d.target.x;
		}).attr('y2', function (d) {
			return d.target.y;
		}).style('stroke-width', function (d) {
			return 2;
		});

		var node = svg.selectAll('.node').data(nodes).enter().append('circle').attr('class', 'node').attr('cx', function (d) {
			return d.x;
		}).attr('cy', function (d) {
			return d.y;
		}).attr('r', 4.5).style('fill', function (d) {
			return 'blue';
		}).call(force.drag);

		svg.on('mousemove', function () {
			fisheye.focus(d3.mouse(this));

			node.each(function (d) {
				d.fisheye = fisheye(d);
			}).attr('cx', function (d) {
				return d.fisheye.x;
			}).attr('cy', function (d) {
				return d.fisheye.y;
			}).attr('r', function (d) {
				return d.fisheye.z * 4.5;
			});

			link.attr('x1', function (d) {
				return d.source.fisheye.x;
			}).attr('y1', function (d) {
				return d.source.fisheye.y;
			}).attr('x2', function (d) {
				return d.target.fisheye.x;
			}).attr('y2', function (d) {
				return d.target.fisheye.y;
			});
		});
	});
});
'use strict';
app.config(function ($stateProvider) {
	$stateProvider.state('loggedInHome', {
		url: '/home',
		templateUrl: 'js/home/home.html',
		controller: 'HomeController'
	}).state('home', {
		url: '/',
		templateUrl: 'js/home/landing.html',
		controller: 'LandingPageController',
		resolve: {
			checkIfLoggedIn: function checkIfLoggedIn(AuthService, $state) {
				// console.log(AuthService.getLoggedInUser());
				AuthService.getLoggedInUser().then(function (user) {
					if (user) $state.go('loggedInHome');
				});
			}
		}
	});
});

app.config(function ($stateProvider) {

	$stateProvider.state('login', {
		url: '/login',
		templateUrl: 'js/login/login.html',
		controller: 'LoginCtrl'
	});
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

	$scope.login = {};
	$scope.error = null;

	$scope.sendLogin = function (loginInfo) {

		$scope.error = null;

		AuthService.login(loginInfo).then(function () {
			$state.go('loggedInHome');
		})['catch'](function () {
			$scope.error = 'Invalid login credentials.';
		});
	};
});
'use strict';
app.config(function ($stateProvider) {
	$stateProvider.state('project', {
		url: '/project/:projectID',
		templateUrl: 'js/project/project.html'
	});
});

app.controller('ProjectController', function ($scope, $rootScope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AuthService) {
	var initLoad = 0;
	//window events
	window.onblur = function () {
		if (initLoad) {
			$scope.stop();
			$scope.$digest();
		} else {
			initLoad++;
		}
	};
	window.onbeforeunload = function () {
		return 'Are you sure you want to leave this page before saving your work?';
	};
	window.onunload = function () {
		Tone.Transport.clearTimelines();
	};
	$('.timeline-container').scroll(function () {
		$('.trackMainSection').css({
			'left': $(this).scrollLeft()
		});
	});

	var maxMeasure = 0;

	// number of measures on the timeline
	$scope.numMeasures = _.range(0, 60);

	// length of the timeline
	$scope.measureLength = 1;

	//Initialize recorder on project load
	// RecorderFct.recorderInit().then(function (retArr) {
	// 	console.log("ROOT SCOPE", $rootScope)
	// 	$scope.recorder = retArr[0];
	// 	$scope.analyserNode = retArr[1];
	// }).catch(function (e){
	//        alert('Error getting audio');
	//        console.log(e);
	//    });

	$scope.measureLength = 1;
	$scope.tracks = [];
	$scope.loading = true;
	$scope.projectId = $stateParams.projectID;
	$scope.position = 0;
	$scope.playing = false;
	$scope.currentlyRecording = false;
	$scope.previewingId = null;
	$scope.zoom = 100;
	$scope.countIn = false;
	$scope.countNumber = 1;

	ProjectFct.getProjectInfo($scope.projectId).then(function (project) {
		var loaded = 0;
		$scope.projectName = project.name;
		console.log('PROJECT', project);
		if (project.tracks.length) {

			project.tracks.forEach(function (track) {

				var loadableTracks = [];

				project.tracks.forEach(function (track, i) {
					if (track.url) {
						loadableTracks++;
					}
				});

				if (track.url) {

					var doneLoading = function doneLoading() {

						loaded++;

						if (loaded === loadableTracks) {
							$scope.loading = false;
							$scope.$digest();
						}
					};

					var max = Math.max.apply(null, track.location);
					if (max + 2 > maxMeasure) maxMeasure = max + 2;

					track.empty = false;
					track.recording = false;
					// TODO: this is assuming that a player exists
					track.player = ToneTrackFct.createPlayer(track.url, doneLoading);
					//init effects, connect, and add to scope

					track.effectsRack = ToneTrackFct.effectsInitialize(track.effectsRack);
					track.player.connect(track.effectsRack[0]);

					if (track.location.length) {
						track.location.forEach(function (loc) {
							console.log('TRACK', track, loc);
							var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(track.player, loc);
							$('#measure' + loc + '.track' + i).first().append($compile('<canvas width=\'198\' height=\'98\' position=\'' + loc + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + i + '-' + loc + '\' class=\'item trackLoop' + i + '\' style=\'position: absolute; background: url(' + track.img + ');\' draggable></canvas>'));
						});
						// ToneTimelineFct.addLoopToTimeline(track.player, track.location);
						//add loop to UI
						track.onTimeline = true;
					} else {
						track.onTimeline = false;
					}
					$scope.tracks.push(track);
				} else {
					track.empty = true;
					track.recording = false;
					track.onTimeline = false;
					track.previewing = false;
					track.effectsRack = ToneTrackFct.effectsInitialize([0, 0, 0, 0]);
					track.player = null;
					$scope.tracks.push(track);
				}
			});
		} else {
			$scope.maxMeasure = 32;
			for (var i = 0; i < 8; i++) {
				var obj = {};
				obj.empty = true;
				obj.recording = false;
				obj.onTimeline = false;
				obj.previewing = false;
				obj.silence = false;
				obj.effectsRack = ToneTrackFct.effectsInitialize([0, 0, 0, 0]);
				obj.player = null;
				obj.name = 'Track ' + (i + 1);
				obj.location = [];
				$scope.tracks.push(obj);
			}
			$scope.loading = false;
		}

		//dynamically set measures
		//if less than 16 set 18 as minimum
		$scope.numMeasures = [];
		if (maxMeasure < 32) maxMeasure = 32;
		for (var i = 0; i < maxMeasure; i++) {
			$scope.numMeasures.push(i);
		}

		ToneTimelineFct.createTransport(project.endMeasure).then(function (metronome) {
			$scope.metronome = metronome;
			$scope.metronome.on = true;
		});
		ToneTimelineFct.changeBpm(project.bpm);
	});

	$scope.jumpToMeasure = function (measure) {
		if (maxMeasure > measure) {
			$scope.position = measure;
			Tone.Transport.position = measure.toString() + ':0:0';
			$scope.movePlayhead(measure);
		}
	};

	$scope.movePlayhead = function (numberMeasures) {
		var playHead = document.getElementById('playbackHead');
		$('#timelinePosition').val('0:0');
		playHead.style.left = (numberMeasures * 200 + 300).toString() + 'px';
	};

	$scope.zoomOut = function () {
		$scope.zoom -= 10;
		var zoom = ($scope.zoom - 10).toString() + '%';
		$('.timeline-container').css('zoom', zoom);
	};

	$scope.zoomIn = function () {
		$scope.zoom += 10;
		var zoom = ($scope.zoom + 10).toString() + '%';
		$('.timeline-container').css('zoom', zoom);
	};

	$scope.addTrack = function () {};

	$scope.play = function () {
		$scope.playing = true;
		Tone.Transport.position = $scope.position.toString() + ':0:0';
		Tone.Transport.start();
	};
	$scope.pause = function () {
		$scope.playing = false;
		$scope.metronome.stop();
		ToneTimelineFct.stopAll($scope.tracks);
		$scope.position = Tone.Transport.position.split(':')[0];
		var playHead = document.getElementById('playbackHead');
		$('#timelinePosition').val('0:0');
		playHead.style.left = ($scope.position * 200 + 300).toString() + 'px';
		Tone.Transport.pause();
	};
	$scope.stop = function () {
		$scope.playing = false;
		$scope.metronome.stop();
		ToneTimelineFct.stopAll($scope.tracks);
		$scope.position = 0;
		var playHead = document.getElementById('playbackHead');
		playHead.style.left = '300px';
		Tone.Transport.stop();
		$('#timelinePosition').val('0:0');
		$('#positionSelector').val('0');
		//stop and track currently being previewed
		if ($scope.previewingId) {
			Tone.Transport.clearInterval($scope.previewingId);
			$scope.previewingId = null;
		}
	};
	$scope.nameChange = function (newName) {
		if (newName) {
			$scope.nameError = false;
			ProjectFct.nameChange(newName, $scope.projectId).then(function (response) {});
		} else {
			$scope.nameError = 'You must set a name!';
			$scope.projectName = 'Untitled';
			document.getElementById('projectNameInput').focus();
		}
	};

	$scope.toggleMetronome = function () {
		if ($scope.metronome.volume.value === 0) {
			$scope.metronome.volume.value = -100;
			$scope.metronome.on = false;
		} else {
			$scope.metronome.volume.value = 0;
			$scope.metronome.on = true;
		}
	};

	$scope.sendToAWS = function () {

		RecorderFct.sendToAWS($scope.tracks, $scope.projectId, $scope.projectName).then(function (response) {
			// wave logic
			console.log('response from sendToAWS', response);
		});
	};

	$scope.isLoggedIn = function () {
		return AuthService.isAuthenticated();
	};
});

app.config(function ($stateProvider) {

	$stateProvider.state('signup', {
		url: '/signup',
		templateUrl: 'js/signup/signup.html',
		controller: 'SignupCtrl'
	});
});

app.controller('SignupCtrl', function ($scope, AuthService, $state) {

	$scope.signup = {};
	$scope.error = null;

	$scope.sendSignup = function (signupInfo) {

		$scope.error = null;
		console.log(signupInfo);
		AuthService.signup(signupInfo).then(function () {
			$state.go('loggedInHome');
		})['catch'](function () {
			$scope.error = 'Invalid login credentials.';
		});
	};
});
app.config(function ($stateProvider) {

	$stateProvider.state('userProfile', {
		url: '/userprofile/:theID',
		templateUrl: 'js/user/userprofile.html',
		controller: 'UserController',
		// The following data.authenticate is read by an event listener
		// that controls access to this state. Refer to app.js.
		data: {
			authenticate: true
		}
	}).state('userProfile.artistInfo', {
		url: '/info',
		templateUrl: 'js/user/info.html',
		controller: 'UserController'
	}).state('userProfile.project', {
		url: '/projects',
		templateUrl: 'js/user/projects.html',
		controller: 'UserController'
	}).state('userProfile.followers', {
		url: '/followers',
		templateUrl: 'js/user/followers.html',
		controller: 'UserController'
	}).state('userProfile.following', {
		url: '/following',
		templateUrl: 'js/user/following.html',
		controller: 'UserController'
	});
});

app.controller('HomeController', function ($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state, $mdToast) {
	var trackBucket = [];
	document.getElementsByTagName('navbar')[0].style.display = 'block';
	AuthService.getLoggedInUser().then(function (user) {
		$scope.loggedInUser = user;

		$scope.myfollowers = $scope.loggedInUser.followers.length;
		$scope.myfollowing = $scope.loggedInUser.following.length;
		$scope.myprojects = $scope.loggedInUser.projects.length;
	});

	$scope.isLoggedIn = function () {
		return AuthService.isAuthenticated();
	};

	$scope.projects = function () {
		ProjectFct.getProjectInfo().then(function (projects) {
			console.log('PROJCS', projects);
			$scope.allProjects = projects;
			var imgArr = ['https://i1.sndcdn.com/artworks-000121902503-djbqh6-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000121795778-cmq0x1-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000123015713-wuuuy9-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000121925392-2hw3hg-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000122546910-xmjb63-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000122506583-ozzx85-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000103418932-te6hs4-t500x500.jpg'];

			$scope.allProjects.forEach(function (aProject) {
				aProject.backgroundImg = imgArr[Math.floor(Math.random() * 9)];
			});
		});
	};
	$scope.projects();

	$scope.makeFork = function (project) {
		AuthService.getLoggedInUser().then(function (loggedInUser) {
			console.log('loggedInUser', loggedInUser);
			project.owner = loggedInUser._id;
			project.forkID = project._id;
			delete project._id;
			console.log(project);
			$mdToast.show({
				hideDelay: 2000,
				position: 'bottom right',
				template: '<md-toast> It\'s been forked </md-toast>'
			});

			ProjectFct.createAFork(project).then(function (response) {
				console.log('Fork response is', response);
			});
		});
	};

	var stop = false;

	$scope.sampleTrack = function (track) {

		if (stop === true) {
			$scope.player.stop();
		}

		ToneTrackFct.createPlayer(track.url, function (player) {
			$scope.player = player;
			if (stop === false) {
				stop = true;
				$scope.player.start();
			} else {
				stop = false;
			}
		});
	};

	$scope.getUserProfile = function (user) {
		// console.log("clicked", user);
		$state.go('userProfile', { theID: user._id });
	};
});
app.controller('LandingPageController', function ($scope, AuthService, ToneTrackFct, $state) {
	// $('#fullpage').fullpage();
	document.getElementsByTagName('navbar')[0].style.display = 'none';

	$scope.goToForms = function () {
		function scrollToBottom(duration) {
			if (duration <= 0) return;

			var difference = document.documentElement.scrollHeight - window.scrollY;
			var perTick = difference / duration * 10;

			setTimeout(function () {
				window.scroll(0, window.scrollY + perTick);
				scrollToBottom(duration - 10);
			}, 10);
		}

		scrollToBottom(1000);
	};

	$scope.sendLogin = function (loginInfo) {

		$scope.error = null;

		AuthService.login(loginInfo).then(function () {
			$state.go('loggedInHome');
		})['catch'](function () {
			$scope.error = 'Invalid login credentials.';
		});
	};

	$scope.sendSignup = function (signupInfo) {

		$scope.error = null;
		console.log(signupInfo);
		AuthService.signup(signupInfo).then(function () {
			$state.go('loggedInHome');
		})['catch'](function () {
			$scope.error = 'Invalid login credentials.';
		});
	};
});
app.controller('NewProjectController', function ($scope, AuthService, ProjectFct, $state) {
	AuthService.getLoggedInUser().then(function (user) {
		$scope.user = user;
	});

	$scope.newProjectBut = function () {
		ProjectFct.newProject($scope.user).then(function (projectId) {
			$state.go('project', { projectID: projectId });
		});
	};
});
app.controller('TimelineController', function ($scope, $stateParams, $localStorage, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct) {

	var wavArray = [];

	$scope.numMeasures = [];
	for (var i = 0; i < 60; i++) {
		$scope.numMeasures.push(i);
	}

	$scope.measureLength = 1;
	$scope.tracks = [];
	$scope.loading = true;

	ProjectFct.getProjectInfo('5594c20ad0759cd40ce51e14').then(function (project) {

		var loaded = 0;
		console.log('PROJECT', project);

		if (project.tracks.length) {
			project.tracks.forEach(function (track) {
				var doneLoading = function doneLoading() {
					loaded++;
					if (loaded === project.tracks.length) {
						$scope.loading = false;
						// Tone.Transport.start();
					}
				};
				track.player = ToneTrackFct.createPlayer(track.url, doneLoading);
				ToneTimelineFct.addLoopToTimeline(track.player, track.location);
				$scope.tracks.push(track);
			});
		} else {
			for (var i = 0; i < 6; i++) {
				var obj = {};
				obj.name = 'Track ' + (i + 1);
				obj.location = [];
				$scope.tracks.push(obj);
			}
		}

		ToneTimelineFct.getTransport(project.endMeasure);
		ToneTimelineFct.changeBpm(project.bpm);
	});

	// AuthService.getLoggedInUser().then(function(aUser){
	//     $scope.theUser = aUser;
	//     // $stateParams.theID = aUser._id
	//     console.log("id", $stateParams);
	// });

	$scope.record = function (e, index) {

		e = e.toElement;

		// start recording
		console.log('start recording');

		if (!audioRecorder) return;

		e.classList.add('recording');
		audioRecorder.clear();
		audioRecorder.record();

		window.setTimeout(function () {
			audioRecorder.stop();
			e.classList.remove('recording');
			audioRecorder.getBuffers(gotBuffers);

			window.setTimeout(function () {
				$scope.tracks[index].rawAudio = window.latestRecording;
				// $scope.tracks[index].rawImage = window.latestRecordingImage;
			}, 500);
		}, 2000);
	};

	$scope.addTrack = function () {};

	$scope.sendToAWS = function () {

		var awsTracks = $scope.tracks.filter(function (track, index) {
			if (track.rawAudio) {
				return true;
			}
		});
		RecorderFct.sendToAWS(awsTracks, '5595a7faaa901ad63234f920').then(function (response) {
			// wave logic
			console.log('response from sendToAWS', response);
		});
	};
});

app.controller('UserController', function ($scope, $state, AuthService, $stateParams, userFactory) {
	AuthService.getLoggedInUser().then(function (loggedInUser) {

		$scope.loggedInUser = loggedInUser;

		userFactory.getUserObj($stateParams.theID).then(function (user) {
			$scope.user = user;
			var imgArr = ['https://i1.sndcdn.com/artworks-000121902503-djbqh6-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000103418932-te6hs4-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000121795778-cmq0x1-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000121925392-2hw3hg-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000122506583-ozzx85-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000123015713-wuuuy9-t500x500.jpg', 'https://i1.sndcdn.com/artworks-000122546910-xmjb63-t500x500.jpg'];

			$scope.user.projects.forEach(function (aProject) {
				aProject.backgroundImg = imgArr[Math.floor(Math.random() * 9)];
			});

			if (!$scope.user.profpic) {
				$scope.user.profpic = 'https://www.mdr101.com/wp-content/uploads/2014/05/placeholder-user.jpg';
			}

			for (var i = 0; i < user.followers.length; i++) {
				console.log($stateParams.theID, user.followers[i]._id);
				if (user.followers[i]._id === loggedInUser._id) {
					$scope.followStatus = true;
				}
			}
		});
	});

	// $scope.displaySettings = function(){
	//     if($scope.showSettings) $scope.showSettings = false;
	//     console.log($scope.showSettings);
	// }

	$scope.follow = function (user) {
		userFactory.follow(user, $scope.loggedInUser).then(function (response) {
			console.log('Follow controller response', response);
		});

		$scope.followStatus = true;
	};

	$scope.displayWeb = function () {
		$state.go('forkweb');
	};
});
app.factory('AnalyserFct', function () {

	var updateAnalysers = function updateAnalysers(analyserContext, analyserNode, continueUpdate) {

		function update() {
			var SPACING = 3;
			var BAR_WIDTH = 1;
			var numBars = Math.round(300 / SPACING);
			var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

			analyserNode.getByteFrequencyData(freqByteData);

			analyserContext.clearRect(0, 0, 300, 100);
			analyserContext.fillStyle = '#F6D565';
			analyserContext.lineCap = 'round';
			var multiplier = analyserNode.frequencyBinCount / numBars;

			// Draw rectangle for each frequency bin.
			for (var i = 0; i < numBars; ++i) {
				var magnitude = 0;
				var offset = Math.floor(i * multiplier);
				// gotta sum/average the block, or we miss narrow-bandwidth spikes
				for (var j = 0; j < multiplier; j++) magnitude += freqByteData[offset + j];
				magnitude = magnitude / multiplier;
				var magnitude2 = freqByteData[i * multiplier];
				analyserContext.fillStyle = 'hsl( ' + Math.round(i * 360 / numBars) + ', 100%, 50%)';
				analyserContext.fillRect(i * SPACING, 100, BAR_WIDTH, -magnitude);
			}
			if (continueUpdate) {
				window.requestAnimationFrame(update);
			}
		}
		window.requestAnimationFrame(update);
	};

	var cancelAnalyserUpdates = function cancelAnalyserUpdates(analyserId) {
		window.cancelAnimationFrame(analyserId);
	};
	return {
		updateAnalysers: updateAnalysers,
		cancelAnalyserUpdates: cancelAnalyserUpdates
	};
});
'use strict';
app.factory('ForkFactory', function ($http) {

	var getWeb = function getWeb() {
		return $http.get('/api/forks').then(function (response) {
			return response.data;
		});
	};

	return {
		getWeb: getWeb
	};
});
'use strict';
app.factory('HomeFct', function ($http) {

	return {
		getUser: function getUser(user) {
			return $http.get('/api/user', { params: { _id: user } }).then(function (success) {
				return success.data;
			});
		}
	};
});
'use strict';
app.factory('ProjectFct', function ($http) {

	var getProjectInfo = function getProjectInfo(projectId) {

		//if coming from HomeController and no Id is passed, set it to 'all'
		var projectid = projectId || 'all';
		return $http.get('/api/projects/' + projectid || projectid).then(function (response) {
			return response.data;
		});
	};

	var createAFork = function createAFork(project) {
		return $http.post('/api/projects/', project).then(function (fork) {
			return fork.data;
		});
	};
	var newProject = function newProject(user) {
		return $http.post('/api/projects', { owner: user._id, name: 'Untitled', bpm: 120, endMeasure: 32 }).then(function (response) {
			return response.data;
		});
	};
	var nameChange = function nameChange(newName, projectId) {
		return $http.put('/api/projects/' + projectId, { name: newName }).then(function (response) {
			return response.data;
		});
	};

	var deleteProject = function deleteProject(project) {
		return $http['delete']('/api/projects/' + project._id).then(function (response) {
			console.log('Delete Proj Fct', response.data);
			return response.data;
		});
	};

	var uploadProject = function uploadProject(project) {
		return $http.post('api/projects/soundcloud', { project: project }).then(function (response) {
			return response.data;
		});
	};

	return {
		getProjectInfo: getProjectInfo,
		createAFork: createAFork,
		newProject: newProject,
		deleteProject: deleteProject,
		nameChange: nameChange,
		uploadProject: uploadProject
	};
});

app.factory('RecorderFct', function ($http, AuthService, $q, ToneTrackFct, AnalyserFct) {

	var recorderInit = function recorderInit() {

		return $q(function (resolve, reject) {
			var Context = window.AudioContext || window.webkitAudioContext;
			var audioContext = new Context();
			var recorder;

			var navigator = window.navigator;
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
			if (!navigator.cancelAnimationFrame) navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
			if (!navigator.requestAnimationFrame) navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

			// ask for permission
			navigator.getUserMedia({
				'audio': {
					'mandatory': {
						'googEchoCancellation': 'false',
						'googAutoGainControl': 'false',
						'googNoiseSuppression': 'false',
						'googHighpassFilter': 'false'
					},
					'optional': []
				}
			}, function (stream) {
				var inputPoint = audioContext.createGain();

				// create an AudioNode from the stream.
				var realAudioInput = audioContext.createMediaStreamSource(stream);
				var audioInput = realAudioInput;
				audioInput.connect(inputPoint);

				// create analyser node
				var analyserNode = audioContext.createAnalyser();
				analyserNode.fftSize = 2048;
				inputPoint.connect(analyserNode);

				//create recorder
				recorder = new Recorder(inputPoint);
				var zeroGain = audioContext.createGain();
				zeroGain.gain.value = 0.0;
				inputPoint.connect(zeroGain);
				zeroGain.connect(audioContext.destination);

				resolve([recorder, analyserNode]);
			}, function (e) {
				alert('Error getting audio');
				// console.log(e);
				reject(e);
			});
		});
	};

	var recordStart = function recordStart(recorder) {
		recorder.clear();
		recorder.record();
	};

	var recordStop = function recordStop(index, recorder) {
		recorder.stop();
		return new $q(function (resolve, reject) {
			// e.classList.remove("recording");
			recorder.getBuffers(function (buffers) {
				//display wav image
				var canvas = document.getElementById('wavedisplay' + index);
				var canvasLoop = document.getElementById('waveForLoop' + index);
				drawBuffer(300, 100, canvas.getContext('2d'), buffers[0]);
				drawBuffer(198, 98, canvasLoop.getContext('2d'), buffers[0]);
				window.latestBuffer = buffers[0];
				window.latestRecordingImage = canvasLoop.toDataURL('image/png');

				// the ONLY time gotBuffers is called is right after a new recording is completed -
				// so here's where we should set up the download.
				recorder.exportWAV(function (blob) {
					//needs a unique name
					// Recorder.setupDownload( blob, "myRecording0.wav" );
					//create loop time
					ToneTrackFct.loopInitialize(blob, index, 'myRecording0.wav').then(resolve);
				});
			});
		});
	};

	var convertToBase64 = function convertToBase64(track) {
		console.log('each track', track);
		return new $q(function (resolve, reject) {
			var reader = new FileReader();

			if (track.rawAudio) {
				reader.readAsDataURL(track.rawAudio);
				reader.onloadend = function (e) {
					resolve(reader.result);
				};
			} else {
				resolve(null);
			}
		});
	};

	return {
		sendToAWS: function sendToAWS(tracksArray, projectId, projectName) {

			var readPromises = tracksArray.map(convertToBase64);

			return $q.all(readPromises).then(function (storeData) {

				tracksArray.forEach(function (track, i) {
					if (storeData[i]) {
						track.rawAudio = storeData[i];
						track.effectsRack = track.effectsRack.map(function (effect) {
							console.log('EFFECT', effect, effect.wet.value);
							return effect.wet.value;
						});
					}
				});

				return $http.post('/api/aws/', { tracks: tracksArray, projectId: projectId, projectName: projectName }).then(function (response) {
					console.log('response in sendToAWSFactory', response);
					return response.data;
				});
			});
		},
		recorderInit: recorderInit,
		recordStart: recordStart,
		recordStop: recordStop
	};
});
'use strict';

'use strict';
app.factory('ToneTimelineFct', function ($http, $q) {

	var createTransport = function createTransport(loopEnd) {
		return new $q(function (resolve, reject) {
			Tone.Transport.loop = true;
			Tone.Transport.loopStart = '0m';
			Tone.Transport.loopEnd = loopEnd.toString() + 'm';
			var playHead = document.getElementById('playbackHead');

			createMetronome().then(function (metronome) {
				Tone.Transport.setInterval(function () {
					var posArr = Tone.Transport.position.split(':');
					var leftPos = (parseInt(posArr[0]) * 200 + parseInt(posArr[1]) * 50 + 500).toString() + 'px';
					playHead.style.left = leftPos;
					metronome.start();
				}, '1m');
				Tone.Transport.setInterval(function () {
					var posArr = Tone.Transport.position.split(':');
					if (posArr.length === 3) {
						$('#timelinePosition').val(posArr[1] + ':' + posArr[2]);
						$('#positionSelector').val(posArr[0]);
					} else {
						$('#timelinePosition').val(posArr[1] + ':' + posArr[2]);
						$('#positionSelector').val(posArr[0]);
					}
					metronome.start();
				}, '4n');
				return resolve(metronome);
			});
		});
	};

	var changeBpm = function changeBpm(bpm) {
		Tone.Transport.bpm.value = bpm;
		return Tone.Transport;
	};

	var stopAll = function stopAll(tracks) {
		tracks.forEach(function (track) {
			if (track.player) track.player.stop();
		});
	};

	var muteAll = function muteAll(tracks) {
		tracks.forEach(function (track) {
			if (track.player) track.player.volume.value = -100;
		});
	};

	var unMuteAll = function unMuteAll(tracks) {
		tracks.forEach(function (track) {
			if (track.player) track.player.volume.value = 0;
		});
	};

	var createMetronome = function createMetronome() {
		return new $q(function (resolve, reject) {
			var met = new Tone.Player('/api/wav/Click1.wav', function () {
				return resolve(met);
			}).toMaster();
		});
	};

	// var addLoopToTimeline = function (player, startTimeArray) {

	// 	if(startTimeArray.indexOf(0) === -1) {
	// 		Tone.Transport.setTimeline(function() {
	// 			player.stop();
	// 		}, "0m")

	// 	}

	// 	startTimeArray.forEach(function (startTime) {

	// 		var startTime = startTime.toString() + 'm';

	// 		Tone.Transport.setTimeline(function () {
	// 			console.log('Start', Tone.Transport.position);
	// 			player.stop();
	// 			player.start();
	// 		}, startTime);

	// 		// var stopTime = parseInt(startTime.substr(0, startTime.length-1)) + 1).toString() + startTime.substr(-1,1);
	// 		//// console.log('STOP', stop);
	// 		//// transport.setTimeline(function () {
	// 		//// 	player.stop();
	// 		//// }, stopTime);

	// 	});

	// };

	return {
		createTransport: createTransport,
		changeBpm: changeBpm,
		// addLoopToTimeline: addLoopToTimeline,
		createMetronome: createMetronome,
		stopAll: stopAll,
		muteAll: muteAll,
		unMuteAll: unMuteAll
	};
});

'use strict';
app.factory('ToneTrackFct', function ($http, $q) {

	var createPlayer = function createPlayer(url, doneFn) {
		var player = new Tone.Player(url, doneFn);
		// TODO: remove toMaster
		player.toMaster();
		// player.sync();
		// player.loop = true;
		return player;
	};

	var loopInitialize = function loopInitialize(blob, index, filename) {
		return new $q(function (resolve, reject) {
			//PASSED A BLOB FROM RECORDERJSFACTORY - DROPPED ON MEASURE 0
			var url = (window.URL || window.webkitURL).createObjectURL(blob);
			var link = document.getElementById('save' + index);
			link.href = url;
			link.download = filename || 'output' + index + '.wav';
			window.latestRecording = blob;
			window.latestRecordingURL = url;
			var player;
			// TODO: remove toMaster
			player = new Tone.Player(link.href, function () {
				resolve(player);
			});
		});
	};

	var effectsInitialize = function effectsInitialize(arr) {

		var chorus = new Tone.Chorus();
		chorus.name = 'Chorus';
		var phaser = new Tone.Phaser();
		phaser.name = 'Phaser';
		var distort = new Tone.Distortion();
		distort.name = 'Distortion';
		var pingpong = new Tone.PingPongDelay('4m');
		pingpong.name = 'Ping Pong';

		if (arr.length) {
			chorus.wet.value = arr[0];
			phaser.wet.value = arr[1];
			distort.wet.value = arr[2];
			pingpong.wet.value = arr[3];
		}

		chorus.connect(phaser);
		phaser.connect(distort);
		distort.connect(pingpong);
		pingpong.toMaster();
		// pingpong.connect(volume);
		// volume.toMaster();

		return [chorus, phaser, distort, pingpong];
	};

	var createTimelineInstanceOfLoop = function createTimelineInstanceOfLoop(player, measure) {
		// console.log('JUST DROPPED', player, measure);
		return Tone.Transport.setTimeline(function () {
			player.stop();
			player.start();
		}, measure + 'm');
	};

	var replaceTimelineLoop = function replaceTimelineLoop(player, oldTimelineId, newMeasure) {
		return new $q(function (resolve, reject) {
			console.log('old timeline id', oldTimelineId);
			Tone.Transport.clearTimeline(parseInt(oldTimelineId));
			// Tone.Transport.clearTimelines();
			resolve(createTimelineInstanceOfLoop(player, newMeasure));
		});
	};
	var deleteTimelineLoop = function deleteTimelineLoop(timelineId) {
		Tone.Transport.clearTimeline(parseInt(timelineId));
	};

	return {
		createPlayer: createPlayer,
		loopInitialize: loopInitialize,
		effectsInitialize: effectsInitialize,
		createTimelineInstanceOfLoop: createTimelineInstanceOfLoop,
		replaceTimelineLoop: replaceTimelineLoop,
		deleteTimelineLoop: deleteTimelineLoop
	};
});

app.factory('userFactory', function ($http) {
	return {
		getUserObj: function getUserObj(userID) {
			return $http.get('api/users', { params: { _id: userID } }).then(function (response) {
				// console.log('resoonse is', response.data)
				return response.data;
			});
		},

		follow: function follow(user, loggedInUser) {
			return $http.put('api/users', { userToFollow: user, loggedInUser: loggedInUser }).then(function (response) {
				console.log('FollowUser Factory response', response.data);
				return response.data;
			});
		},

		unFollow: function unFollow(followee, loggedInUser) {
			return $http.put('api/users', { userToUnfollow: followee, loggedInUser: loggedInUser }).then(function (response) {
				console.log('unFollow response', response.data);
				return response.data;
			});
		}
	};
});
app.directive('draggable', function () {
	return function (scope, element, attrs) {
		// this gives us the native JS object
		var el = element[0];

		el.draggable = true;

		el.addEventListener('dragstart', function (e) {

			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('Text', this.id);
			this.classList.add('drag');

			var idx = scope.track.location.indexOf(parseInt(attrs.position));
			scope.track.location.splice(idx, 1);

			return false;
		}, false);

		el.addEventListener('dragend', function (e) {
			this.classList.remove('drag');
			return false;
		}, false);
	};
});

app.directive('droppable', function () {
	return {
		scope: {
			drop: '&' // parent
		},
		link: function link(scope, element) {
			// again we need the native object
			var el = element[0];

			el.addEventListener('dragover', function (e) {
				e.dataTransfer.dropEffect = 'move';
				// allows us to drop
				if (e.preventDefault) e.preventDefault();
				this.classList.add('over');
				return false;
			}, false);

			el.addEventListener('dragenter', function (e) {
				this.classList.add('over');
				return false;
			}, false);

			el.addEventListener('dragleave', function (e) {
				this.classList.remove('over');
				return false;
			}, false);

			el.addEventListener('drop', function (e) {
				// Stops some browsers from redirecting.
				if (e.stopPropagation) e.stopPropagation();

				this.classList.remove('over');

				// upon drop, changing position and updating track.location array on scope
				var item = document.getElementById(e.dataTransfer.getData('Text'));
				var rowId, trackIndex;

				//get trackId of droppable container
				this.classList.forEach(function (name) {
					if (name.includes('track')) {
						trackIndex = name.split('track')[1];
					}
				});
				//get trackId of draggable container
				item.classList.forEach(function (name) {
					if (name.includes('trackLoop')) {
						console.log(name.split('trackLoop')[1]);
						rowId = name.split('trackLoop')[1];
					}
				});
				var xposition = parseInt(this.attributes.xposition.value);
				var childNodes = this.childNodes;
				var oldTimelineId;
				var theCanvas;

				//if rowId = track.indexOf()
				// if()
				console.log('ROWID', rowId, 'trackIndex', trackIndex);
				if (parseInt(rowId) === parseInt(trackIndex)) {
					for (var i = 0; i < childNodes.length; i++) {
						if (childNodes[i].className === 'canvas-box') {

							this.childNodes[i].appendChild(item);
							scope.$parent.$parent.track.location.push(xposition);
							scope.$parent.$parent.track.location.sort();

							var canvasNode = this.childNodes[i].childNodes;

							for (var j = 0; j < canvasNode.length; j++) {

								if (canvasNode[j].nodeName === 'CANVAS') {
									canvasNode[j].attributes.position.value = xposition;
									oldTimelineId = canvasNode[j].attributes.timelineId.value;
									// oldTimelineId = canvasNode[j].dataset.timelineId;
									console.log('OLD TIMELINE', oldTimelineId);
									theCanvas = canvasNode[j];
								}
							}
						}
					}

					console.log('oldTimelineId', oldTimelineId);
					scope.$parent.$parent.moveInTimeline(oldTimelineId, xposition).then(function (newTimelineId) {
						theCanvas.attributes.timelineid.value = newTimelineId;
					});
				}

				// call the drop passed drop function
				scope.$apply('drop()');

				return false;
			}, false);
		}
	};
});

'use strict';
app.directive('fullstackLogo', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
	};
});
app.directive('followdirective', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/follow/followDirective.html',
		controller: 'FollowDirectiveController'
	};
});

app.controller('FollowDirectiveController', function ($scope, $stateParams, $state, AuthService, userFactory) {

	AuthService.getLoggedInUser().then(function (loggedInUser) {
		$scope.loggedInUser = loggedInUser;
		userFactory.getUserObj($stateParams.theID).then(function (user) {
			$scope.user = user;

			if ($state.current.name === 'userProfile.followers') {
				$scope.follows = user.followers;
			} else {
				$scope.follows = user.following;
				if ($stateParams.theID === loggedInUser._id) $scope.showButton = true;
			}
			// console.log("followObj is", $scope.follows, $stateParams);
		});
	});

	$scope.goToFollow = function (follow) {
		console.log('clicked', follow);
		$state.go('userProfile', { theID: follow._id });
	};

	$scope.unFollow = function (followee) {
		console.log($scope.follows);
		for (var i = 0; i < $scope.follows.length; i++) {
			if ($scope.follows[i]._id === followee._id) {
				var del = $scope.follows.splice(i, 1);
				console.log('delete', del, $scope.follows);
			}
		}
		userFactory.unFollow(followee, $scope.loggedInUser).then(function (response) {
			console.log('succesful', response);
			$scope.$digest();
		});
	};
});
// app.directive('knob', function () {
// 	return {
// 		restrict: 'E',
// 		templateUrl: 'js/common/directives/knob/knob.html',
// 		link: function(scope, element, attrs) {
// 			// var knob = $('.knob');
// 			var angle = 0;
// 			var minangle = 0;
// 			var maxangle = 270;

// 			function moveKnob(direction) {

// 			  if(direction == 'up') {
// 			    if((angle + 2) <= maxangle) {
// 			      angle = angle + 2;
// 			      setAngle();
// 			    }
// 			  }

// 			  else if(direction == 'down') {
// 			    if((angle - 2) >= minangle) {
// 			      angle = angle - 2;
// 			      setAngle();
// 			    }
// 			  }

// 			}

// 			function setAngle() {

// 			  // rotate knob
// 			  element.css({
// 			    '-moz-transform':'rotate('+angle+'deg)',
// 			    '-webkit-transform':'rotate('+angle+'deg)',
// 			    '-o-transform':'rotate('+angle+'deg)',
// 			    '-ms-transform':'rotate('+angle+'deg)',
// 			    'transform':'rotate('+angle+'deg)'
// 			  });

// 			  // highlight ticks
// 			  var activeTicks = (Math.round(angle / 10) + 1);
// 			  $('.tick').removeClass('activetick');
// 			  $('.tick').slice(0,activeTicks).addClass('activetick');

// 			  // update % value in text
// 			  var pc = Math.round((angle/270)*100);
// 			  $('.current-value').text(pc+'%');

// 			}

// 			// mousewheel event - firefox
// 			element.bind('DOMMouseScroll', function(e){
// 			  if(e.originalEvent.detail > 0) {
// 			    moveKnob('down');
// 			  } else {
// 			    moveKnob('up');
// 			  }
// 			  return false;
// 			});

// 			// mousewheel event - ie, safari, opera
// 			element.bind('mousewheel', function(e){
// 			  if(e.originalEvent.wheelDelta < 0) {
// 			    moveKnob('down');
// 			  } else {
// 			    moveKnob('up');
// 			  }
// 			  return false;
// 			});
// 		}
// 	}
// });
app.directive('loadingGif', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/loading-gif/loading.html'
	};
});
'use strict';
app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state, ProjectFct) {

	return {
		restrict: 'E',
		scope: {},
		templateUrl: 'js/common/directives/navbar/navbar.html',
		link: function link(scope) {

			var setNavbar = function setNavbar() {
				AuthService.getLoggedInUser().then(function (user) {
					if (user) {
						scope.userId = user._id;
						scope.items = [{ label: 'Home', state: 'home' }, { label: 'Profile', state: 'userProfile({theID: userId})', auth: true }];
					}
				});
			};
			setNavbar();

			// scope.items = [
			//     // { label: 'Home', state: 'project' },
			//     // { label: 'Sign Up', state: 'signup' },
			//     { label: 'Members Only', state: 'userProfile', auth: true }
			// ];

			scope.user = null;

			scope.isLoggedIn = function () {
				return AuthService.isAuthenticated();
			};

			scope.logout = function () {
				AuthService.logout().then(function () {
					$state.go('home');
				});
			};

			var setUser = function setUser() {
				AuthService.getLoggedInUser().then(function (user) {
					scope.user = user;
				});
			};

			var removeUser = function removeUser() {
				scope.user = null;
			};

			scope.newProjectBut = function () {
				ProjectFct.newProject(scope.user).then(function (projectId) {
					$state.go('project', { projectID: projectId });
				});
			};

			setUser();

			$rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
			$rootScope.$on(AUTH_EVENTS.loginSuccess, setNavbar);
			$rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
			$rootScope.$on(AUTH_EVENTS.logoutSuccess, setNavbar);
			$rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
		}

	};
});
app.directive('projectdirective', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/project/projectDirective.html',
		controller: 'projectdirectiveController'
	};
});

app.controller('projectdirectiveController', function ($scope, $stateParams, $state, ProjectFct, AuthService, $mdToast) {

	AuthService.getLoggedInUser().then(function (loggedInUser) {
		$scope.loggedInUser = loggedInUser;
		$scope.displayAProject = function (something) {
			console.log('THING', something);
			if ($scope.loggedInUser._id === $stateParams.theID) {
				$state.go('project', { projectID: something._id });
			}
		};

		$scope.makeFork = function (project) {
			if (!project.forkOrigin) project.forkOrigin = project._id;
			$mdToast.show({
				hideDelay: 2000,
				position: 'bottom right',
				template: '<md-toast> It\'s been forked </md-toast>'
			});

			project.forkID = project._id;
			project.owner = loggedInUser._id;
			delete project._id;
			// console.log(project);
			ProjectFct.createAFork(project).then(function (response) {
				console.log('Fork response is', response);
			});
		};

		$scope.deleteProject = function (project) {
			console.log($scope.user.projects);
			for (var i = 0; i < $scope.user.projects.length; i++) {
				if ($scope.user.projects[i]._id === project._id) {
					var del = $scope.user.projects.splice(i, 1);
					console.log('delete', del, $scope.user.projects);
				}
			};
			console.log('DeleteProject', project);
			ProjectFct.deleteProject(project).then(function (response) {
				console.log('Delete request is', response);
			});
		};

		$scope.postToSoundcloud = function (project) {
			console.log('Uploading Project', project);
			ProjectFct.uploadProject(project).then(function (response) {
				console.log('Upload Request is', response);
			});
		};
	});
});
app.directive('ximTrack', function ($rootScope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AnalyserFct, $q) {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/track/track.html',
		link: function link(scope, element, attrs) {
			scope.effectWetnesses = scope.track.effectsRack.map(function (effect) {
				return effect.wet.value * 1000;
			});
			scope.volume = new Tone.Volume();
			scope.volume.volume.value = 0;
			setTimeout(function () {
				scope.track.location.forEach(function (loc) {
					var trackIndex = scope.$parent.tracks.indexOf(scope.track);
					var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, loc);
					$('#measure' + loc + '.track' + trackIndex).first().append($compile('<canvas width=\'198\' height=\'98\' position=\'' + loc + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + trackIndex + '-' + loc + '\' class=\'item trackLoop' + trackIndex + '\' style=\'position: absolute; background: url(' + scope.track.img + ');\' draggable></canvas>')(scope));
				});
			}, 0);

			scope.dropInTimeline = function (index, position) {
				scope.track.player.stop();
				scope.track.onTimeline = true;
				scope.track.previewing = false;
				// var position = 0;
				var canvasRow = element[0].getElementsByClassName('canvas-box');

				if (scope.track.location.length) {
					// drop the loop on the first available index				
					while (scope.track.location.indexOf(position) > -1) {
						position++;
					}
				}

				//append canvas element
				scope.track.location.push(position);
				scope.track.location.sort();
				var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
				angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + index + '-' + position + '\' class=\'item trackLoop' + index + '\' style=\'position: absolute; background: url(' + scope.track.img + ');\' draggable></canvas>')(scope));
			};

			scope.moveInTimeline = function (oldTimelineId, newMeasure) {
				return new $q(function (resolve, reject) {
					ToneTrackFct.replaceTimelineLoop(scope.track.player, oldTimelineId, newMeasure).then(resolve);
				});
			};

			scope.appearOrDisappear = function (position) {

				var trackIndex = scope.$parent.tracks.indexOf(scope.track);
				var loopIndex = scope.track.location.indexOf(position);

				if (scope.track.onTimeline) {
					if (loopIndex === -1) {
						var canvasRow = element[0].getElementsByClassName('canvas-box');
						scope.track.location.push(position);
						scope.track.location.sort();
						var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
						// angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  trackIndex + "-" + position + "' class='item trackLoop"+trackIndex+"' style='position: absolute; background: url(data:image/png;base64," + scope.track.img + ");' draggable></canvas>")(scope));
						angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + trackIndex + '-' + position + '\' class=\'item trackLoop' + trackIndex + '\' style=\'position: absolute; background: url(' + scope.track.img + ');\' draggable></canvas>')(scope));
					} else {
						//remove canvas item

						var removeElement = function removeElement(element) {
							element && element.parentNode && element.parentNode.removeChild(element);
						};

						var canvas = document.getElementById('mdisplay' + trackIndex + '-' + position);
						//remove from locations array
						scope.track.location.splice(loopIndex, 1);
						//remove timelineId
						ToneTrackFct.deleteTimelineLoop(canvas.attributes.timelineid.value);
						removeElement(canvas);
					}
				} else {
					console.log('NO DROP');
				}
			};

			scope.reRecord = function (index) {
				//change all params back as if empty track
				scope.track.empty = true;
				scope.track.onTimeline = false;
				scope.track.player = null;
				scope.track.silence = false;
				scope.track.rawAudio = null;
				scope.track.img = null;
				scope.track.previewing = false;
				//dispose of effectsRack
				scope.track.effectsRack.forEach(function (effect) {
					effect.dispose();
				});
				scope.track.effectsRack = ToneTrackFct.effectsInitialize([0, 0, 0, 0]);
				scope.track.location = [];
				//remove all loops from UI
				var loopsUI = document.getElementsByClassName('trackLoop' + index.toString());
				console.log('LOOPS', loopsUI);
				while (loopsUI.length !== 0) {
					console.log('LOOPS ARR', loopsUI);
					for (var i = 0; i < loopsUI.length; i++) {
						loopsUI[i].parentNode.removeChild(loopsUI[i]);
					}
					loopsUI = document.getElementsByClassName('trackLoop' + index.toString());
				}
				Tone.Transport.stop();
			};

			scope.solo = function () {
				var otherTracks = scope.$parent.tracks.map(function (track) {
					if (track !== scope.track) {
						track.silence = true;
						return track;
					}
				}).filter(function (track) {
					if (track && track.player) return true;
				});
				ToneTimelineFct.muteAll(otherTracks);
				scope.track.silence = false;
				scope.track.player.volume.value = 0;
			};

			scope.silence = function () {
				if (!scope.track.silence) {
					scope.track.player.volume.value = -100;
					scope.track.silence = true;
				} else {
					scope.track.player.volume.value = 0;
					scope.track.silence = false;
				}
			};

			scope.record = function (index) {
				var recorder = $rootScope.recorder;

				var continueUpdate = true;

				//analyser stuff
				var canvas = document.getElementById('analyser' + index);
				var analyserContext = canvas.getContext('2d');
				var analyserNode = $rootScope.analyserNode;
				var analyserId = window.requestAnimationFrame(update);

				scope.track.recording = true;
				scope.track.empty = true;
				RecorderFct.recordStart(recorder);
				scope.track.previewing = false;
				scope.$parent.currentlyRecording = true;

				function update() {
					var SPACING = 3;
					var BAR_WIDTH = 1;
					var numBars = Math.round(300 / SPACING);
					var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

					analyserNode.getByteFrequencyData(freqByteData);

					analyserContext.clearRect(0, 0, 300, 100);
					analyserContext.fillStyle = '#F6D565';
					analyserContext.lineCap = 'round';
					var multiplier = analyserNode.frequencyBinCount / numBars;

					// Draw rectangle for each frequency bin.
					for (var i = 0; i < numBars; ++i) {
						var magnitude = 0;
						var offset = Math.floor(i * multiplier);
						// gotta sum/average the block, or we miss narrow-bandwidth spikes
						for (var j = 0; j < multiplier; j++) magnitude += freqByteData[offset + j];
						magnitude = magnitude / multiplier;
						var magnitude2 = freqByteData[i * multiplier];
						analyserContext.fillStyle = 'hsl( ' + Math.round(i * 360 / numBars) + ', 100%, 50%)';
						analyserContext.fillRect(i * SPACING, 100, BAR_WIDTH, -magnitude);
					}
					if (continueUpdate) {
						window.requestAnimationFrame(update);
					}
				}

				function endRecording(position) {
					RecorderFct.recordStop(index, recorder).then(function (player) {
						//track variables
						scope.track.recording = false;
						scope.track.empty = false;
						scope.track.rawAudio = window.latestRecording;
						scope.track.img = window.latestRecordingImage;

						//create player
						scope.track.player = player;
						player.connect(scope.track.effectsRack[0]);

						//stop analyser
						continueUpdate = false;
						window.cancelAnimationFrame(analyserId);

						//set Project vars
						scope.$parent.metronome.stop();
						scope.$parent.currentlyRecording = false;
						// scope.$parent.stop();
						// ToneTimelineFct.unMuteAll(scope.$parent.tracks);
					});
				}

				if (Tone.Transport.state === 'stopped') {
					Tone.Transport.position = '-1:0:0';
					scope.$parent.countNumber = 0;
					scope.$parent.countIn = true;
					Tone.Transport.start();
					var incCount = Tone.Transport.setInterval(function () {
						scope.$parent.countNumber = scope.$parent.countNumber + 1;
						scope.$parent.$digest();
					}, '4n');

					var recordingID = Tone.Transport.setTimeline(function () {
						scope.$parent.countIn = false;
						console.log(scope.$parent.countIn);
						scope.$parent.$digest();
						Tone.Transport.clearInterval(incCount);
						RecorderFct.recordStart(recorder, index);
						window.setTimeout(function () {
							RecorderFct.recordStart(recorder, index);
							window.setTimeout(function () {
								endRecording(0);
								Tone.Transport.clearTimeline(recordingID);
							}, 2000);
						}, 50);
					}, '0m');
				} else {
					var nextBar = parseInt(Tone.Transport.position.split(':')[0]) + 1;
					var endBar = nextBar + 1;

					var recId = Tone.Transport.setTimeline(function () {
						window.setTimeout(function () {
							RecorderFct.recordStart(recorder, index);
						}, 50);
					}, nextBar.toString() + 'm');

					var recEndId = Tone.Transport.setTimeline(function () {
						Tone.Transport.clearTimeline(recId);
						Tone.Transport.clearTimeline(recEndId);
						endRecording(nextBar);
					}, endBar.toString() + 'm');
				}
			};

			scope.preview = function (currentlyPreviewing) {
				var nextBar;
				if (!scope.$parent.previewingId) {
					scope.track.previewing = true;

					if (Tone.Transport.state === 'stopped') {
						nextBar = parseInt(Tone.Transport.position.split(':')[0]);
						Tone.Transport.start();
					} else {
						nextBar = parseInt(Tone.Transport.position.split(':')[0]) + 1;
					}
					var playLaunch = Tone.Transport.setTimeline(function () {
						scope.track.player.start();
						var previewInteval = Tone.Transport.setInterval(function () {
							scope.track.player.stop();
							scope.track.player.start();
							Tone.Transport.clearTimeline(playLaunch);
						}, '1m');
						scope.$parent.previewingId = previewInteval;
					}, nextBar.toString() + 'm');
				} else {
					console.log('ALREADY PREVIEWING');
				}
			};

			scope.changeWetness = function (effect, amount) {
				console.log(effect);
				console.log(amount);

				effect.wet.value = amount / 1000;
			};
		}

	};
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZm9ya3dlYi9mb3Jrd2ViLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9MYW5kaW5nUGFnZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTmV3UHJvamVjdENvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVGltZWxpbmVDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1VzZXJDb250cm9sbGVyLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9BbmFseXNlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRm9ya0ZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0hvbWVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1Byb2plY3RGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2ZvbGxvdy9mb2xsb3dEaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9sb2FkaW5nLWdpZi9sb2FkaW5nLWdpZi5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSx1QkFBQSxFQUFBO0FBQ0Esd0JBQUEsQ0FBQSxRQUFBLEdBQUEsa0NBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxHQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBOzs7QUFHQSxLQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtFQUNBLENBQUE7OztBQUlBLFlBQUEsQ0FBQSxZQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOzs7O0FBSUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsTUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLFVBQUE7R0FDQTs7QUFFQSxNQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsVUFBQTtHQUNBOzs7QUFHQSxPQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLE9BQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2xFQSxDQUFBLFlBQUE7O0FBRUEsYUFBQSxDQUFBOzs7QUFHQSxLQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLE1BQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsc0JBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxNQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7Ozs7O0FBS0EsSUFBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsb0JBQUE7QUFDQSxhQUFBLEVBQUEsbUJBQUE7QUFDQSxlQUFBLEVBQUEscUJBQUE7QUFDQSxnQkFBQSxFQUFBLHNCQUFBO0FBQ0Esa0JBQUEsRUFBQSx3QkFBQTtBQUNBLGVBQUEsRUFBQSxxQkFBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLE1BQUEsVUFBQSxHQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLE1BQUEsRUFBQSxXQUFBLENBQUEsYUFBQTtBQUNBLE1BQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtBQUNBLE1BQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtHQUNBLENBQUE7QUFDQSxTQUFBO0FBQ0EsZ0JBQUEsRUFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsVUFBQSxTQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTtHQUNBLENBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7OztBQUlBLE1BQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTs7Ozs7O0FBTUEsT0FBQSxJQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0lBQ0E7Ozs7O0FBS0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FFQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBOztBQUVBLFdBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxPQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0E7O0FBRUEsTUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw2QkFBQSxFQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLE1BQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxFQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxFQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3hJQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsVUFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtBQUNBLFlBQUEsRUFBQSxtQkFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLE9BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsT0FBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsS0FBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTtBQUNBLFVBQUEsSUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsT0FBQSxDQUFBOztBQUVBLE1BQUEsS0FBQSxHQUFBLEdBQUE7TUFBQSxNQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLE1BQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLEdBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsQ0FDQSxNQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxLQUFBLEdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FDQSxNQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FDQSxZQUFBLENBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLENBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxLQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxZQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7O0FBR0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFBQSxJQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7R0FBQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7OztBQUdBLE1BQUEsRUFBQSxHQUFBLENBQUE7TUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLEtBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUFBO0FBQ0EsSUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLENBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0dBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUNBLEtBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQTtHQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLElBQUEsR0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FDQSxLQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7R0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FDQSxLQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsVUFBQSxNQUFBLENBQUE7R0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxFQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxHQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsQ0FBQTtJQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtJQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsV0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDeEhBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxPQUFBO0FBQ0EsYUFBQSxFQUFBLG1CQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxzQkFBQTtBQUNBLFlBQUEsRUFBQSx1QkFBQTtBQUNBLFNBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEseUJBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7RUFDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDcEJBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsUUFBQTtBQUNBLGFBQUEsRUFBQSxxQkFBQTtBQUNBLFlBQUEsRUFBQSxXQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsT0FBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLHFCQUFBO0FBQ0EsYUFBQSxFQUFBLHlCQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsS0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsUUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0dBQ0EsTUFBQTtBQUNBLFdBQUEsRUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLGNBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxtRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsRUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsU0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxVQUFBLEVBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBSUEsS0FBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7O0FBWUEsT0FBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsR0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxXQUFBLEdBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsV0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLFNBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBOztBQUVBLFlBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsTUFBQSxLQUFBLGNBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO09BQ0E7TUFDQSxDQUFBOztBQUVBLFNBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBLENBQ0EsS0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLEdBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLDJCQUFBLEdBQUEsQ0FBQSxHQUFBLGlEQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSwwQkFBQSxDQUFBLENBQUEsQ0FBQTtPQUNBLENBQUEsQ0FBQTs7O0FBR0EsV0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7TUFDQSxNQUFBO0FBQ0EsV0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7TUFDQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsU0FBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0lBQ0E7QUFDQSxTQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtHQUNBOzs7O0FBSUEsUUFBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLFVBQUEsR0FBQSxFQUFBLEVBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtHQUNBOztBQUlBLGlCQUFBLENBQUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxjQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxNQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxHQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxNQUFBLENBQUEsWUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7R0FDQTtFQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsTUFBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUEsRUFDQSxDQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsR0FBQSxzQkFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFdBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsY0FBQSxDQUFBLGtCQUFBLENBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxNQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLEVBQUEsR0FBQSxLQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtHQUVBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsYUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7R0FFQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFNBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNuUUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxTQUFBO0FBQ0EsYUFBQSxFQUFBLHVCQUFBO0FBQ0EsWUFBQSxFQUFBLFlBQUE7RUFDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzNCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLHFCQUFBO0FBQ0EsYUFBQSxFQUFBLDBCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBOzs7QUFHQSxNQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsSUFBQTtHQUNBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx3QkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsbUJBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHFCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsV0FBQTtBQUNBLGFBQUEsRUFBQSx1QkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxZQUFBO0FBQ0EsYUFBQSxFQUFBLHdCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx1QkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFlBQUE7QUFDQSxhQUFBLEVBQUEsd0JBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDakNBLEdBQUEsQ0FBQSxVQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLEtBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxvQkFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLFFBQUEsQ0FBQSxXQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFdBQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxTQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFdBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxPQUFBLE1BQUEsR0FBQSxDQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLENBQ0EsQ0FBQTs7QUFFQSxTQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxhQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLFlBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLGFBQUEsRUFBQSxJQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUE7QUFDQSxZQUFBLEVBQUEsMENBQUE7SUFDQSxDQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLGtCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBOztBQUVBLEtBQUEsSUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFHQSxPQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLE1BQUEsSUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7R0FDQTs7QUFFQSxjQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxLQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0lBQ0EsTUFDQTtBQUNBLFFBQUEsR0FBQSxLQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBR0EsT0FBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLElBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7Q0FLQSxDQUFBLENBQUE7QUN6RkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSx1QkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFNBQUEsQ0FBQSxvQkFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsTUFBQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsY0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLE9BQUEsUUFBQSxJQUFBLENBQUEsRUFBQSxPQUFBOztBQUVBLE9BQUEsVUFBQSxHQUFBLFFBQUEsQ0FBQSxlQUFBLENBQUEsWUFBQSxHQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLE9BQUEsR0FBQSxVQUFBLEdBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtJQUNBLEVBQUEsRUFBQSxDQUFBLENBQUE7R0FDQTs7QUFFQSxnQkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFJQSxPQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDL0NBLEdBQUEsQ0FBQSxVQUFBLENBQUEsc0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ1pBLEdBQUEsQ0FBQSxVQUFBLENBQUEsb0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQTs7QUFFQSxLQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsV0FBQSxDQUFBLGNBQUEsQ0FBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLE1BQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBOztNQUVBO0tBQ0EsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7SUFDQTtHQUNBOztBQUVBLGlCQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7Ozs7Ozs7QUFRQSxPQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFNBQUEsQ0FBQTs7O0FBR0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLGFBQUEsRUFDQSxPQUFBOztBQUVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxJQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxlQUFBLENBQUE7O0lBR0EsRUFBQSxHQUFBLENBQUEsQ0FBQTtHQUVBLEVBQUEsSUFBQSxDQUFBLENBQUE7RUFFQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxZQUFBOztBQUVBLE1BQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLE9BQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsSUFBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsRUFBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxHQUFBLENBQUEseUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtFQUNBLENBQUE7Q0FNQSxDQUFBLENBQUE7O0FDdEdBLEdBQUEsQ0FBQSxVQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxNQUFBLEdBQUEsQ0FDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxDQUNBLENBQUE7O0FBRUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsR0FBQSx3RUFBQSxDQUFBO0lBQ0E7O0FBRUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxLQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtLQUNBO0lBQ0E7R0FHQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7Ozs7Ozs7QUFTQSxPQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsNEJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7Q0FHQSxDQUFBLENBQUE7QUN6REEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsWUFBQTs7QUFFQSxLQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsWUFBQSxFQUFBLGNBQUEsRUFBQTs7QUFFQSxXQUFBLE1BQUEsR0FBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxZQUFBLEdBQUEsSUFBQSxVQUFBLENBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLE9BQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFFBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLEdBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0lBQ0E7QUFDQSxPQUFBLGNBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQTtBQUNBLFFBQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFHQSxLQUFBLHFCQUFBLEdBQUEsU0FBQSxxQkFBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLFFBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUE7QUFDQSx1QkFBQSxFQUFBLHFCQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzVDQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxLQUFBLE1BQUEsR0FBQSxTQUFBLE1BQUEsR0FBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLFFBQUE7QUFDQSxRQUFBLEVBQUEsTUFBQTtFQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNiQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFHQSxRQUFBO0FBQ0EsU0FBQSxFQUFBLGlCQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLEtBQUEsY0FBQSxHQUFBLFNBQUEsY0FBQSxDQUFBLFNBQUEsRUFBQTs7O0FBR0EsTUFBQSxTQUFBLEdBQUEsU0FBQSxJQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxnQkFBQSxHQUFBLFNBQUEsSUFBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxnQkFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxLQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsZUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLFVBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxLQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxPQUFBLEVBQUEsU0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGdCQUFBLEdBQUEsU0FBQSxFQUFBLEVBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLGFBQUEsR0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsVUFBQSxDQUFBLGdCQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSx5QkFBQSxFQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFHQSxRQUFBO0FBQ0EsZ0JBQUEsRUFBQSxjQUFBO0FBQ0EsYUFBQSxFQUFBLFdBQUE7QUFDQSxZQUFBLEVBQUEsVUFBQTtBQUNBLGVBQUEsRUFBQSxhQUFBO0FBQ0EsWUFBQSxFQUFBLFVBQUE7QUFDQSxlQUFBLEVBQUEsYUFBQTtFQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDbkRBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxLQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsR0FBQTs7QUFFQSxTQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLE9BQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxJQUFBLE1BQUEsQ0FBQSxrQkFBQSxDQUFBO0FBQ0EsT0FBQSxZQUFBLEdBQUEsSUFBQSxPQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsUUFBQSxDQUFBOztBQUVBLE9BQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsWUFBQSxHQUNBLFNBQUEsQ0FBQSxZQUFBLElBQ0EsU0FBQSxDQUFBLGtCQUFBLElBQ0EsU0FBQSxDQUFBLGVBQUEsSUFDQSxTQUFBLENBQUEsY0FBQSxBQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLG9CQUFBLEVBQ0EsU0FBQSxDQUFBLG9CQUFBLEdBQUEsU0FBQSxDQUFBLDBCQUFBLElBQUEsU0FBQSxDQUFBLHVCQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLHFCQUFBLEVBQ0EsU0FBQSxDQUFBLHFCQUFBLEdBQUEsU0FBQSxDQUFBLDJCQUFBLElBQUEsU0FBQSxDQUFBLHdCQUFBLENBQUE7OztBQUdBLFlBQUEsQ0FBQSxZQUFBLENBQ0E7QUFDQSxXQUFBLEVBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0EsNEJBQUEsRUFBQSxPQUFBO0FBQ0EsMkJBQUEsRUFBQSxPQUFBO0FBQ0EsNEJBQUEsRUFBQSxPQUFBO0FBQ0EsMEJBQUEsRUFBQSxPQUFBO01BQ0E7QUFDQSxlQUFBLEVBQUEsRUFBQTtLQUNBO0lBQ0EsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTs7O0FBR0EsUUFBQSxjQUFBLEdBQUEsWUFBQSxDQUFBLHVCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxRQUFBLFlBQUEsR0FBQSxZQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOzs7QUFHQSxZQUFBLEdBQUEsSUFBQSxRQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFFBQUEsR0FBQSxZQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxDQUFBLENBQUEsUUFBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBLENBQUE7SUFFQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFdBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsUUFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxVQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsb0JBQUEsR0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOzs7O0FBSUEsWUFBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLGlCQUFBLENBQUEsY0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsa0JBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBSUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsTUFBQSxHQUFBLElBQUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsT0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLGFBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7SUFDQSxNQUFBO0FBQ0EsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUtBLFFBQUE7QUFDQSxXQUFBLEVBQUEsbUJBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsT0FBQSxZQUFBLEdBQUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsU0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsUUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsTUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUE7T0FDQSxDQUFBLENBQUE7TUFDQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsOEJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUVBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxhQUFBLEVBQUEsV0FBQTtBQUNBLFlBQUEsRUFBQSxVQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQy9JQSxZQUFBLENBQUE7O0FDQUEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxLQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsQ0FBQSxNQUFBLEtBQUEsQ0FBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0EsTUFBQTtBQUNBLE9BQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtNQUVBO0FBQ0EsY0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsT0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsT0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxHQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLEdBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEscUJBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBK0JBLFFBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUE7QUFDQSxXQUFBLEVBQUEsU0FBQTs7QUFFQSxpQkFBQSxFQUFBLGVBQUE7QUFDQSxTQUFBLEVBQUEsT0FBQTtBQUNBLFNBQUEsRUFBQSxPQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3hHQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsS0FBQSxZQUFBLEdBQUEsU0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOzs7QUFHQSxTQUFBLE1BQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLElBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLGVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxHQUFBLFFBQUEsSUFBQSxRQUFBLEdBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxlQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLGtCQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsT0FBQSxNQUFBLENBQUE7O0FBRUEsU0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsR0FBQSxFQUFBOztBQUdBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxNQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsSUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLE1BQUEsUUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsV0FBQSxDQUFBOztBQUVBLE1BQUEsR0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFFBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7OztBQUlBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLFNBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtHQUNBLEVBQUEsT0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLG1CQUFBLEdBQUEsU0FBQSxtQkFBQSxDQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsYUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxLQUFBLGtCQUFBLEdBQUEsU0FBQSxrQkFBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxRQUFBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxFQUFBLGNBQUE7QUFDQSxtQkFBQSxFQUFBLGlCQUFBO0FBQ0EsOEJBQUEsRUFBQSw0QkFBQTtBQUNBLHFCQUFBLEVBQUEsbUJBQUE7QUFDQSxvQkFBQSxFQUFBLGtCQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUN2RkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBO0FBQ0EsWUFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxXQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQTs7QUFFQSxRQUFBLEVBQUEsZ0JBQUEsSUFBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsSUFBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsNkJBQUEsRUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQTs7QUFFQSxVQUFBLEVBQUEsa0JBQUEsUUFBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxjQUFBLEVBQUEsUUFBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQTtFQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUN4QkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxNQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBOztBQUVBLElBQUEsQ0FBQSxZQUFBLENBQUEsYUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLElBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLEtBQUEsQ0FBQTtHQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsSUFBQSxDQUFBLGdCQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQTtHQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7RUFFQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsT0FBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLEdBQUE7QUFBQSxHQUNBO0FBQ0EsTUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTs7QUFFQSxPQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsS0FBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLEdBQUEsTUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7O0FBR0EsUUFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxLQUFBLEVBQUEsVUFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLFdBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQTtBQUNBLFFBQUEsYUFBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLENBQUE7Ozs7QUFJQSxXQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUEsWUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxVQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxTQUFBLEtBQUEsWUFBQSxFQUFBOztBQUVBLFdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBOztBQUVBLFdBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBOztBQUVBLFlBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBOztBQUVBLFlBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFFBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLHNCQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxDQUFBOztBQUVBLGdCQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1NBRUE7UUFDQTtPQUNBO01BQ0E7O0FBRUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxhQUFBLENBQUE7TUFDQSxDQUFBLENBQUE7S0FFQTs7O0FBR0EsU0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7R0FDQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDdklBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEseURBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsa0RBQUE7QUFDQSxZQUFBLEVBQUEsMkJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsMkJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsS0FBQSx1QkFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0lBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFFBQUEsWUFBQSxDQUFBLEtBQUEsS0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO0lBQ0E7O0dBR0EsQ0FBQSxDQUFBO0FBSEEsRUFJQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLE9BQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsUUFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7SUFDQTtHQUNBO0FBQ0EsYUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTtDQUdBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2pEQSxHQUFBLENBQUEsU0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLCtDQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ0xBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQTs7QUFFQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxPQUFBLEVBQUEsRUFBQTtBQUNBLGFBQUEsRUFBQSx5Q0FBQTtBQUNBLE1BQUEsRUFBQSxjQUFBLEtBQUEsRUFBQTs7QUFFQSxPQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsR0FBQTtBQUNBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLFNBQUEsRUFBQSxLQUFBLEVBQUEsOEJBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLENBQ0EsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTtBQUNBLFlBQUEsRUFBQSxDQUFBOzs7Ozs7OztBQVFBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxPQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsT0FBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxTQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGFBQUEsR0FBQSxZQUFBO0FBQ0EsY0FBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUVBLENBQUE7O0FBRUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0dBRUE7O0VBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ3JFQSxHQUFBLENBQUEsU0FBQSxDQUFBLGtCQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxvREFBQTtBQUNBLFlBQUEsRUFBQSw0QkFBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSw0QkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxRQUFBLEVBQUE7O0FBSUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLEdBQUEsS0FBQSxZQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxFQUFBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLEVBQUEsSUFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBO0FBQ0EsWUFBQSxFQUFBLDBDQUFBO0lBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsa0JBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQSxPQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxHQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGdCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7RUFHQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUM5REEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSx1Q0FBQTtBQUNBLE1BQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLGVBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxTQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsS0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLEdBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLDJCQUFBLEdBQUEsVUFBQSxHQUFBLGlEQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsWUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsQ0FBQTtNQUNBO0tBQ0E7OztBQUdBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxRQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsR0FBQSwyQkFBQSxHQUFBLEtBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO0lBRUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsYUFBQSxFQUFBLFVBQUEsRUFBQTtBQUNBLFdBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUdBLFFBQUEsQ0FBQSxpQkFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLFNBQUEsU0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLFFBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLDJCQUFBLEdBQUEsVUFBQSxHQUFBLGlEQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxNQUFBOzs7VUFPQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsY0FBQSxJQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7T0FDQTs7QUFSQSxVQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxrQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBS0EsbUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsTUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxTQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxzQkFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsTUFBQSxLQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtNQUNBO0FBQ0EsWUFBQSxHQUFBLFFBQUEsQ0FBQSxzQkFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsQ0FBQTtLQUNBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxLQUFBLENBQUE7TUFDQTtLQUNBLENBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsSUFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxPQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtLQUNBLE1BQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtLQUNBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxRQUFBLEdBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxJQUFBLENBQUE7OztBQUdBLFFBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxlQUFBLEdBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsWUFBQSxHQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxNQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLElBQUEsQ0FBQTs7QUFHQSxhQUFBLE1BQUEsR0FBQTtBQUNBLFNBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxZQUFBLEdBQUEsSUFBQSxVQUFBLENBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLG9CQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxTQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsR0FBQSxPQUFBLENBQUE7OztBQUdBLFVBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxHQUFBLFNBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSxVQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxTQUFBLEdBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtNQUNBO0FBQ0EsU0FBQSxjQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtNQUNBO0tBQ0E7O0FBRUEsYUFBQSxZQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsZUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsTUFBQSxDQUFBLG9CQUFBLENBQUE7OztBQUdBLFdBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7O0FBR0Esb0JBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7O0FBR0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLGtCQUFBLEdBQUEsS0FBQSxDQUFBOzs7TUFHQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxRQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLFFBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtNQUVBLEVBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxXQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLG9CQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtRQUVBLEVBQUEsSUFBQSxDQUFBLENBQUE7T0FDQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO01BQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtLQUVBLE1BQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxNQUFBLEdBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLEtBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO09BQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtNQUNBLEVBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUdBLFNBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtNQUVBLEVBQUEsTUFBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUdBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsVUFBQSxtQkFBQSxFQUFBO0FBQ0EsUUFBQSxPQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSxhQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtNQUNBLE1BQUE7QUFDQSxhQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtNQUNBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtPQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsR0FBQSxjQUFBLENBQUE7TUFDQSxFQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTtLQUNBLE1BQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLG9CQUFBLENBQUEsQ0FBQTtLQUNBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBO0dBRUE7O0VBR0EsQ0FBQTtDQUNBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnbmdTdG9yYWdlJywgJ25nTWF0ZXJpYWwnLCAnbmdLbm9iJywgJ3BsYW5ndWxhciddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbihwbGFuZ3VsYXJDb25maWdQcm92aWRlcil7XG4gICAgcGxhbmd1bGFyQ29uZmlnUHJvdmlkZXIuY2xpZW50SWQgPSAnNDVjNWU2MjEyYWM1OGM3M2U3ZDA1Zjg2MzZhOWJmMjInO1xufSk7XG5cblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIFJlY29yZGVyRmN0KSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cblxuICAgIC8vSW5pdGlhbGl6ZSByZWNvcmRlciBvbiBwcm9qZWN0IGxvYWRcbiAgICBSZWNvcmRlckZjdC5yZWNvcmRlckluaXQoKS50aGVuKGZ1bmN0aW9uIChyZXRBcnIpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJST09UIFNDT1BFXCIsICRyb290U2NvcGUpXG4gICAgICAgICRyb290U2NvcGUucmVjb3JkZXIgPSByZXRBcnJbMF07XG4gICAgICAgICRyb290U2NvcGUuYW5hbHlzZXJOb2RlID0gcmV0QXJyWzFdO1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKXtcbiAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfSk7XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCRsb2NhdGlvbikge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNpZ251cCA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coY3JlZGVudGlhbHMpO1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbiggb25TdWNjZXNzZnVsTG9naW4gKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIHNpZ251cCBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTsiLCIndXNlIHN0cmljdCc7XG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3Jrd2ViJywge1xuICAgICAgICB1cmw6ICcvZm9ya3dlYicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ya3dlYi9mb3Jrd2ViLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiBcIkZvcmtXZWJDb250cm9sbGVyXCJcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb3JrV2ViQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlLCBGb3JrRmFjdG9yeSl7XG5cblx0Rm9ya0ZhY3RvcnkuZ2V0V2ViKCkudGhlbihmdW5jdGlvbih3ZWJzKXtcblx0XHQkc2NvcGUubm9kZXMgPSBbXTtcbiAgICBcdHZhciBsaW5rQXJyID0gW107XG4gICAgICAgIHdlYnMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcbiAgICAgICAgXHR2YXIgYXJyID0gW107XG4gICAgICAgIFx0YXJyLnB1c2gobm9kZSk7XG4gICAgICAgIFx0dmFyIG5ld2FyciA9IGFyci5jb25jYXQobm9kZS5icmFuY2gpO1xuICAgICAgICBcdCRzY29wZS5ub2Rlcy5wdXNoKG5ld2Fycik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwibmV0d29ya1wiLCAkc2NvcGUubm9kZXMpO1xuXHRcdHZhciB0ZXN0QSA9IFtdO1xuXHRcdHZhciBjb3VudGVyID0gMDtcblx0XHQkc2NvcGUubm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlQXJyKXtcblx0XHRcdGZvciAodmFyIGogPSAxOyBqIDwgbm9kZUFyci5sZW5ndGg7IGorKykge1xuICAgICAgICBcdFx0dmFyIGFMaW5rID0ge1xuICAgICAgICBcdFx0XHQnc291cmNlJzogY291bnRlcixcbiAgICAgICAgXHRcdFx0J3RhcmdldCc6IGogKyBjb3VudGVyLFxuICAgICAgICBcdFx0XHQnd2VpZ2h0JzogM1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdFx0bGlua0Fyci5wdXNoKGFMaW5rKTtcbiAgICAgICAgXHR9O1xuICAgIFx0XHRjb3VudGVyICs9IChub2RlQXJyLmxlbmd0aCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgbm9kZUFyciA9IFtdO1xuXHRcdG5vZGVBcnIgPSBub2RlQXJyLmNvbmNhdC5hcHBseShub2RlQXJyLCAkc2NvcGUubm9kZXMpO1xuXHRcdGNvbnNvbGUubG9nKFwiUExFQVNFXCIsIGxpbmtBcnIsIG5vZGVBcnIpO1xuXHRcdHZhciBub2RlcyA9IG5vZGVBcnI7XG5cdFx0dmFyIGxpbmtzID0gbGlua0FycjtcblxuXHRcdCAgdmFyIHdpZHRoID0gOTYwLCBoZWlnaHQgPSA1MDA7XG5cblx0XHQgIHZhciBjb2xvciA9IGQzLnNjYWxlLmNhdGVnb3J5MjAoKTtcblxuXHRcdCAgdmFyIGZpc2hleWUgPSBkMy5maXNoZXllLmNpcmN1bGFyKClcblx0XHQgICAgICAucmFkaXVzKDEyMCk7XG5cblx0XHQgIHZhciBmb3JjZSA9IGQzLmxheW91dC5mb3JjZSgpXG5cdFx0ICAgICAgLmNoYXJnZSgtMjQwKVxuXHRcdCAgICAgIC5saW5rRGlzdGFuY2UoNDApXG5cdFx0ICAgICAgLnNpemUoW3dpZHRoLCBoZWlnaHRdKTtcblxuXHRcdCAgdmFyIHN2ZyA9IGQzLnNlbGVjdChcIiN1aVwiKS5hcHBlbmQoXCJzdmdcIilcblx0XHQgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHRcdCAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XG5cblx0XHQgIHN2Zy5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0ICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImJhY2tncm91bmRcIilcblx0XHQgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHRcdCAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XG5cblx0XHQgICAgdmFyIG4gPSBub2Rlcy5sZW5ndGg7XG5cblx0XHQgICAgZm9yY2Uubm9kZXMobm9kZXMpLmxpbmtzKGxpbmtzKTtcblxuXHRcdCAgICAvLyBJbml0aWFsaXplIHRoZSBwb3NpdGlvbnMgZGV0ZXJtaW5pc3RpY2FsbHksIGZvciBiZXR0ZXIgcmVzdWx0cy5cblx0XHQgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkLCBpKSB7IGQueCA9IGQueSA9IHdpZHRoIC8gbiAqIGk7IH0pO1xuXG5cdFx0ICAgIC8vIFJ1biB0aGUgbGF5b3V0IGEgZml4ZWQgbnVtYmVyIG9mIHRpbWVzLlxuXHRcdCAgICAvLyBUaGUgaWRlYWwgbnVtYmVyIG9mIHRpbWVzIHNjYWxlcyB3aXRoIGdyYXBoIGNvbXBsZXhpdHkuXG5cdFx0ICAgIC8vIE9mIGNvdXJzZSwgZG9uJ3QgcnVuIHRvbyBsb25n4oCUeW91J2xsIGhhbmcgdGhlIHBhZ2UhXG5cdFx0ICAgIGZvcmNlLnN0YXJ0KCk7XG5cdFx0ICAgIGZvciAodmFyIGkgPSBuOyBpID4gMDsgLS1pKSBmb3JjZS50aWNrKCk7XG5cdFx0ICAgIGZvcmNlLnN0b3AoKTtcblxuXHRcdCAgICAvLyBDZW50ZXIgdGhlIG5vZGVzIGluIHRoZSBtaWRkbGUuIFxuXHRcdCAgICB2YXIgb3ggPSAwLCBveSA9IDA7XG5cdFx0ICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBveCArPSBkLngsIG95ICs9IGQueTsgfSk7XG5cdFx0ICAgIG94ID0gb3ggLyBuIC0gd2lkdGggLyAyLCBveSA9IG95IC8gbiAtIGhlaWdodCAvIDI7XG5cdFx0ICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkLnggLT0gb3gsIGQueSAtPSBveTsgfSk7XG5cblx0XHQgICAgdmFyIGxpbmsgPSBzdmcuc2VsZWN0QWxsKFwiLmxpbmtcIilcblx0XHQgICAgICAgIC5kYXRhKGxpbmtzKVxuXHRcdCAgICAgIC5lbnRlcigpLmFwcGVuZChcImxpbmVcIilcblx0XHQgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG5cdFx0ICAgICAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLng7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLnk7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0Lng7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInkyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0Lnk7IH0pXG5cdFx0ICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gMjsgfSk7XG5cblx0XHQgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiLm5vZGVcIilcblx0XHQgICAgICAgIC5kYXRhKG5vZGVzKVxuXHRcdCAgICAgIC5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuXHRcdCAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcblx0XHQgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54OyB9KVxuXHRcdCAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnk7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInJcIiwgNC41KVxuXHRcdCAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcImJsdWVcIjsgfSlcblx0XHQgICAgICAgIC5jYWxsKGZvcmNlLmRyYWcpO1xuXG5cdFx0ICAgIHN2Zy5vbihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbigpIHtcblx0XHQgICAgICBmaXNoZXllLmZvY3VzKGQzLm1vdXNlKHRoaXMpKTtcblxuXHRcdCAgICAgIG5vZGUuZWFjaChmdW5jdGlvbihkKSB7IGQuZmlzaGV5ZSA9IGZpc2hleWUoZCk7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5maXNoZXllLng7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5maXNoZXllLnk7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmZpc2hleWUueiAqIDQuNTsgfSk7XG5cblx0XHQgICAgICBsaW5rLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnNvdXJjZS5maXNoZXllLng7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zb3VyY2UuZmlzaGV5ZS55OyB9KVxuXHRcdCAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0LmZpc2hleWUueDsgfSlcblx0XHQgICAgICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5maXNoZXllLnk7IH0pO1xuXHRcdCAgICB9KTtcblx0XHRcblx0fSk7XG5cdFxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9nZ2VkSW5Ib21lJywge1xuICAgICAgICB1cmw6ICcvaG9tZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcidcbiAgICB9KVxuXHQuc3RhdGUoJ2hvbWUnLHtcblx0XHR1cmw6ICcvJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbGFuZGluZy5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnTGFuZGluZ1BhZ2VDb250cm9sbGVyJyxcblx0XHRyZXNvbHZlOiB7XG5cdFx0XHQgY2hlY2tJZkxvZ2dlZEluOiBmdW5jdGlvbiAoQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXHRcdFx0IFx0Ly8gY29uc29sZS5sb2coQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkpO1xuXHRcdCAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuXHRcdCAgICAgICAgXHRpZih1c2VyKSAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuXHRcdCAgICAgICAgfSk7XG5cdFx0ICAgIH1cblx0XHR9XG5cdH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbihsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2plY3QnLCB7XG4gICAgICAgIHVybDogJy9wcm9qZWN0Lzpwcm9qZWN0SUQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2plY3QvcHJvamVjdC5odG1sJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRyb290U2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQXV0aFNlcnZpY2UpIHtcblx0dmFyIGluaXRMb2FkID0gMDtcblx0Ly93aW5kb3cgZXZlbnRzXG5cdHdpbmRvdy5vbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG5cdGlmKGluaXRMb2FkKSB7XG4gICAgICAgIFx0JHNjb3BlLnN0b3AoKTtcblx0XHQkc2NvcGUuJGRpZ2VzdCgpO1xuXHR9IGVsc2Uge1xuXHRcdGluaXRMb2FkKys7XG5cdH1cbiAgICB9O1xuICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBsZWF2ZSB0aGlzIHBhZ2UgYmVmb3JlIHNhdmluZyB5b3VyIHdvcms/XCI7XG5cdH07XG5cdHdpbmRvdy5vbnVubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lcygpO1xuXHR9XG5cdCQoJy50aW1lbGluZS1jb250YWluZXInKS5zY3JvbGwoZnVuY3Rpb24oKXtcblx0ICAgICQoJy50cmFja01haW5TZWN0aW9uJykuY3NzKHtcblx0ICAgICAgICAnbGVmdCc6ICQodGhpcykuc2Nyb2xsTGVmdCgpXG5cdCAgICB9KTtcblx0fSk7XG5cblxuXG5cdHZhciBtYXhNZWFzdXJlID0gMDtcblxuXHQvLyBudW1iZXIgb2YgbWVhc3VyZXMgb24gdGhlIHRpbWVsaW5lXG5cdCRzY29wZS5udW1NZWFzdXJlcyA9IF8ucmFuZ2UoMCwgNjApO1xuXG5cdC8vIGxlbmd0aCBvZiB0aGUgdGltZWxpbmVcblx0JHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xuXG5cdC8vSW5pdGlhbGl6ZSByZWNvcmRlciBvbiBwcm9qZWN0IGxvYWRcblx0Ly8gUmVjb3JkZXJGY3QucmVjb3JkZXJJbml0KCkudGhlbihmdW5jdGlvbiAocmV0QXJyKSB7XG5cdC8vIFx0Y29uc29sZS5sb2coXCJST09UIFNDT1BFXCIsICRyb290U2NvcGUpXG5cdC8vIFx0JHNjb3BlLnJlY29yZGVyID0gcmV0QXJyWzBdO1xuXHQvLyBcdCRzY29wZS5hbmFseXNlck5vZGUgPSByZXRBcnJbMV07XG5cdC8vIH0pLmNhdGNoKGZ1bmN0aW9uIChlKXtcbiAvLyAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcbiAvLyAgICAgICAgY29uc29sZS5sb2coZSk7XG4gLy8gICAgfSk7XG5cblx0JHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xuXHQkc2NvcGUudHJhY2tzID0gW107XG5cdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcblx0JHNjb3BlLnByb2plY3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9qZWN0SUQ7XG5cdCRzY29wZS5wb3NpdGlvbiA9IDA7XG5cdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XG5cdCRzY29wZS5jdXJyZW50bHlSZWNvcmRpbmcgPSBmYWxzZTtcblx0JHNjb3BlLnByZXZpZXdpbmdJZCA9IG51bGw7XG5cdCRzY29wZS56b29tID0gMTAwO1xuXHQkc2NvcGUuY291bnRJbiA9IGZhbHNlO1xuXHQkc2NvcGUuY291bnROdW1iZXIgPSAxO1xuXG5cdFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJHNjb3BlLnByb2plY3RJZCkudGhlbihmdW5jdGlvbiAocHJvamVjdCkge1xuXHRcdHZhciBsb2FkZWQgPSAwO1xuXHRcdCRzY29wZS5wcm9qZWN0TmFtZSA9IHByb2plY3QubmFtZTtcblx0XHRjb25zb2xlLmxvZygnUFJPSkVDVCcscHJvamVjdCk7XG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xuXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuXG5cdFx0XHRcdHZhciBsb2FkYWJsZVRyYWNrcyA9IFtdO1xuXG5cdFx0XHRcdHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XG5cdFx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xuXHRcdFx0XHRcdFx0bG9hZGFibGVUcmFja3MrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGlmICh0cmFjay51cmwpIHtcblxuXHRcdFx0XHRcdHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0XHRcdFx0bG9hZGVkKys7XG5cblx0XHRcdFx0XHRcdGlmKGxvYWRlZCA9PT0gbG9hZGFibGVUcmFja3MpIHtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRkaWdlc3QoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0dmFyIG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIHRyYWNrLmxvY2F0aW9uKTtcblx0XHRcdFx0XHRpZihtYXggKyAyID4gbWF4TWVhc3VyZSkgbWF4TWVhc3VyZSA9IG1heCArIDI7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dHJhY2suZW1wdHkgPSBmYWxzZTtcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGFzc3VtaW5nIHRoYXQgYSBwbGF5ZXIgZXhpc3RzXG5cdFx0XHRcdFx0dHJhY2sucGxheWVyID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGRvbmVMb2FkaW5nKTtcblx0XHRcdFx0XHQvL2luaXQgZWZmZWN0cywgY29ubmVjdCwgYW5kIGFkZCB0byBzY29wZVxuXG5cdFx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUodHJhY2suZWZmZWN0c1JhY2spO1xuXHRcdFx0XHRcdHRyYWNrLnBsYXllci5jb25uZWN0KHRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcblxuXHRcdFx0XHRcdGlmKHRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0dHJhY2subG9jYXRpb24uZm9yRWFjaChmdW5jdGlvbiAobG9jKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdUUkFDSycsIHRyYWNrLCBsb2MpO1xuXHRcdFx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHRyYWNrLnBsYXllciwgbG9jKTtcblx0XHRcdFx0XHRcdFx0JCgnI21lYXN1cmUnICsgbG9jICsgJy50cmFjaycgKyBpIClcblx0XHRcdFx0XHRcdFx0XHQuZmlyc3QoKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIGxvYyArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICBpICsgXCItXCIgKyBsb2MgKyBcIicgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIraStcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgdHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKSk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdC8vIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcblx0XHRcdFx0XHRcdC8vYWRkIGxvb3AgdG8gVUlcblx0XHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dHJhY2suZW1wdHkgPSB0cnVlO1xuXHRcdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xuICAgIFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xuICAgIFx0XHRcdFx0dHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xuICAgIFx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoWzAsIDAsIDAsIDBdKTtcbiAgICBcdFx0XHRcdHRyYWNrLnBsYXllciA9IG51bGw7XG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHNjb3BlLm1heE1lYXN1cmUgPSAzMjtcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICBcdFx0XHRcdHZhciBvYmogPSB7fTtcbiAgICBcdFx0XHRcdG9iai5lbXB0eSA9IHRydWU7XG4gICAgXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XG4gICAgXHRcdFx0XHRvYmoub25UaW1lbGluZSA9IGZhbHNlO1xuICAgIFx0XHRcdFx0b2JqLnByZXZpZXdpbmcgPSBmYWxzZTtcbiAgICBcdFx0XHRcdG9iai5zaWxlbmNlID0gZmFsc2U7XG4gICAgXHRcdFx0XHRvYmouZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoWzAsIDAsIDAsIDBdKTtcbiAgICBcdFx0XHRcdG9iai5wbGF5ZXIgPSBudWxsO1xuICAgIFx0XHRcdFx0b2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xuICAgIFx0XHRcdFx0b2JqLmxvY2F0aW9uID0gW107XG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcbiAgXHRcdFx0fVxuICBcdFx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vZHluYW1pY2FsbHkgc2V0IG1lYXN1cmVzXG5cdFx0Ly9pZiBsZXNzIHRoYW4gMTYgc2V0IDE4IGFzIG1pbmltdW1cblx0XHQkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcblx0XHRpZihtYXhNZWFzdXJlIDwgMzIpIG1heE1lYXN1cmUgPSAzMjtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1heE1lYXN1cmU7IGkrKykge1xuXHRcdFx0JHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XG5cdFx0fVxuXG5cblxuXHRcdFRvbmVUaW1lbGluZUZjdC5jcmVhdGVUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcblx0XHRcdCRzY29wZS5tZXRyb25vbWUgPSBtZXRyb25vbWU7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcblx0XHR9KTtcblx0XHRUb25lVGltZWxpbmVGY3QuY2hhbmdlQnBtKHByb2plY3QuYnBtKTtcblxuXHR9KTtcblxuXHQkc2NvcGUuanVtcFRvTWVhc3VyZSA9IGZ1bmN0aW9uKG1lYXN1cmUpIHtcblx0XHRpZihtYXhNZWFzdXJlID4gbWVhc3VyZSkge1xuXHRcdFx0JHNjb3BlLnBvc2l0aW9uID0gbWVhc3VyZTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uID0gbWVhc3VyZS50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0XHQkc2NvcGUubW92ZVBsYXloZWFkKG1lYXN1cmUpO1xuXHRcdH1cblx0fVxuXG5cdCRzY29wZS5tb3ZlUGxheWhlYWQgPSBmdW5jdGlvbiAobnVtYmVyTWVhc3VyZXMpIHtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCIwOjBcIik7XG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IChudW1iZXJNZWFzdXJlcyAqIDIwMCArIDMwMCkudG9TdHJpbmcoKSsncHgnO1xuXHR9XG5cblx0JHNjb3BlLnpvb21PdXQgPSBmdW5jdGlvbigpIHtcblx0XHQkc2NvcGUuem9vbSAtPSAxMDtcblx0XHR2YXIgem9vbSA9ICgkc2NvcGUuem9vbSAtIDEwKS50b1N0cmluZygpICsgXCIlXCI7XG5cdFx0JCgnLnRpbWVsaW5lLWNvbnRhaW5lcicpLmNzcygnem9vbScsIHpvb20pO1xuXHR9O1xuXG5cdCRzY29wZS56b29tSW4gPSBmdW5jdGlvbigpIHtcblx0XHQkc2NvcGUuem9vbSArPSAxMDtcblx0XHR2YXIgem9vbSA9ICgkc2NvcGUuem9vbSArIDEwKS50b1N0cmluZygpICsgXCIlXCI7XG5cdFx0JCgnLnRpbWVsaW5lLWNvbnRhaW5lcicpLmNzcygnem9vbScsIHpvb20pO1xuXHR9O1xuXG5cdCRzY29wZS5hZGRUcmFjayA9IGZ1bmN0aW9uICgpIHtcblxuXHR9O1xuXG5cdCRzY29wZS5wbGF5ID0gZnVuY3Rpb24gKCkge1xuXHRcdCRzY29wZS5wbGF5aW5nID0gdHJ1ZTtcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcblx0fTtcblx0JHNjb3BlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xuXHRcdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXTtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCIwOjBcIik7XG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICgkc2NvcGUucG9zaXRpb24gKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4Jztcblx0XHRUb25lLlRyYW5zcG9ydC5wYXVzZSgpO1xuXHR9O1xuXHQkc2NvcGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcblx0XHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xuXHRcdCRzY29wZS5wb3NpdGlvbiA9IDA7XG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAnMzAwcHgnO1xuXHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcblx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChcIjA6MFwiKTtcblx0XHQkKCcjcG9zaXRpb25TZWxlY3RvcicpLnZhbChcIjBcIik7XG5cdFx0Ly9zdG9wIGFuZCB0cmFjayBjdXJyZW50bHkgYmVpbmcgcHJldmlld2VkXG5cdFx0aWYoJHNjb3BlLnByZXZpZXdpbmdJZCkge1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJJbnRlcnZhbCgkc2NvcGUucHJldmlld2luZ0lkKTtcblx0XHRcdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xuXHRcdH1cblx0fTtcblx0JHNjb3BlLm5hbWVDaGFuZ2UgPSBmdW5jdGlvbihuZXdOYW1lKSB7XG5cdFx0aWYobmV3TmFtZSkge1xuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IGZhbHNlO1xuXHRcdFx0UHJvamVjdEZjdC5uYW1lQ2hhbmdlKG5ld05hbWUsICRzY29wZS5wcm9qZWN0SWQpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IFwiWW91IG11c3Qgc2V0IGEgbmFtZSFcIjtcblx0XHRcdCRzY29wZS5wcm9qZWN0TmFtZSA9IFwiVW50aXRsZWRcIjtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9qZWN0TmFtZUlucHV0JykuZm9jdXMoKTtcblx0XHR9XG5cdH07XG5cblx0JHNjb3BlLnRvZ2dsZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZigkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9PT0gMCkge1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS5vbiA9IGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcblxuXHRcdH1cblx0fTtcblxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xuXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKCRzY29wZS50cmFja3MsICRzY29wZS5wcm9qZWN0SWQsICRzY29wZS5wcm9qZWN0TmFtZSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XG5cbiAgICB9KTtcbiAgfTtcbiAgXG4gICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgfTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJQcm9maWxlJywge1xuICAgICAgICB1cmw6ICcvdXNlcnByb2ZpbGUvOnRoZUlEJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3VzZXJwcm9maWxlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInLFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5hcnRpc3RJbmZvJywge1xuICAgICAgICB1cmw6ICcvaW5mbycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9pbmZvLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXG4gICAgfSlcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLnByb2plY3QnLCB7XG4gICAgICAgIHVybDogJy9wcm9qZWN0cycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9wcm9qZWN0cy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5mb2xsb3dlcnMnLCB7XG4gICAgICAgIHVybDogJy9mb2xsb3dlcnMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93ZXJzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXG4gICAgfSlcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2luZycsIHtcbiAgICAgICAgdXJsOiAnL2ZvbGxvd2luZycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dpbmcuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcbiAgICB9KTtcblxufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFRvbmVUcmFja0ZjdCwgUHJvamVjdEZjdCwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsICRtZFRvYXN0KSB7XG5cdHZhciB0cmFja0J1Y2tldCA9IFtdO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgXHQkc2NvcGUubG9nZ2VkSW5Vc2VyID0gdXNlcjtcblxuXG4gICAgXHQkc2NvcGUubXlmb2xsb3dlcnMgPSAkc2NvcGUubG9nZ2VkSW5Vc2VyLmZvbGxvd2Vycy5sZW5ndGg7XG4gICAgXHQkc2NvcGUubXlmb2xsb3dpbmcgPSAkc2NvcGUubG9nZ2VkSW5Vc2VyLmZvbGxvd2luZy5sZW5ndGg7XG4gICAgXHQkc2NvcGUubXlwcm9qZWN0cyA9ICRzY29wZS5sb2dnZWRJblVzZXIucHJvamVjdHMubGVuZ3RoO1xuXG4gICAgfSk7XG5cblx0JHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnByb2plY3RzID0gZnVuY3Rpb24gKCl7XG4gICAgXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCkudGhlbihmdW5jdGlvbihwcm9qZWN0cyl7XG4gICAgXHRcdGNvbnNvbGUubG9nKCdQUk9KQ1MnLCBwcm9qZWN0cyk7XG4gICAgXHRcdCRzY29wZS5hbGxQcm9qZWN0cyA9IHByb2plY3RzO1xuICAgICAgICAgIFx0dmFyIGltZ0FyciA9IFtcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE5MDI1MDMtZGpicWg2LXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMTc5NTc3OC1jbXEweDEtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIzMDE1NzEzLXd1dXV5OS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE5MjUzOTItMmh3M2hnLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMjU0NjkxMC14bWpiNjMtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIyNTA2NTgzLW96eng4NS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMDM0MTg5MzItdGU2aHM0LXQ1MDB4NTAwLmpwZ1wiXG4gICAgICAgICAgICAgIF1cblxuICAgICAgICAgICAgICAkc2NvcGUuYWxsUHJvamVjdHMuZm9yRWFjaChmdW5jdGlvbihhUHJvamVjdCl7XG4gICAgICAgICAgICAgICAgYVByb2plY3QuYmFja2dyb3VuZEltZyA9IGltZ0FycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA5KV07XG4gICAgICAgICAgICAgIH0pO1xuICAgIFx0fSk7XG4gICAgfTtcblx0JHNjb3BlLnByb2plY3RzKCk7XG5cblxuXHQkc2NvcGUubWFrZUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9nZ2VkSW5Vc2VyJywgbG9nZ2VkSW5Vc2VyKTtcblx0XHRcdHByb2plY3Qub3duZXIgPSBsb2dnZWRJblVzZXIuX2lkO1xuXHRcdFx0cHJvamVjdC5mb3JrSUQgPSBwcm9qZWN0Ll9pZDtcblx0XHRcdGRlbGV0ZSBwcm9qZWN0Ll9pZDtcblx0XHRcdGNvbnNvbGUubG9nKHByb2plY3QpO1xuXHRcdFx0JG1kVG9hc3Quc2hvdyh7XG5cdFx0XHRcdGhpZGVEZWxheTogMjAwMCxcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxuXHRcdFx0XHR0ZW1wbGF0ZTpcIjxtZC10b2FzdD4gSXQncyBiZWVuIGZvcmtlZCA8L21kLXRvYXN0PlwiXG5cdFx0XHR9KTtcblxuXHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmsgcmVzcG9uc2UgaXMnLCByZXNwb25zZSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XG5cdH07XG5cdFx0XG5cdHZhciBzdG9wID1mYWxzZTtcblxuXG5cdCRzY29wZS5zYW1wbGVUcmFjayA9IGZ1bmN0aW9uKHRyYWNrKXtcblxuXHRcdGlmKHN0b3A9PT10cnVlKXtcblx0XHRcdCRzY29wZS5wbGF5ZXIuc3RvcCgpO1xuXHRcdH1cblxuXHRcdFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBmdW5jdGlvbihwbGF5ZXIpe1xuXHRcdFx0JHNjb3BlLnBsYXllciA9IHBsYXllcjtcblx0XHRcdGlmKHN0b3AgPT09IGZhbHNlKXtcblx0XHRcdFx0c3RvcCA9IHRydWU7XG5cdFx0XHRcdCRzY29wZS5wbGF5ZXIuc3RhcnQoKTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdHN0b3AgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxuXG5cdCRzY29wZS5nZXRVc2VyUHJvZmlsZSA9IGZ1bmN0aW9uKHVzZXIpe1xuXHQgICAgLy8gY29uc29sZS5sb2coXCJjbGlja2VkXCIsIHVzZXIpO1xuXHQgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHt0aGVJRDogdXNlci5faWR9KTtcblx0fTtcblxuICAgIFxuXG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdMYW5kaW5nUGFnZUNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgVG9uZVRyYWNrRmN0LCAkc3RhdGUpIHtcbiAgICAvLyAkKCcjZnVsbHBhZ2UnKS5mdWxscGFnZSgpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG5cblxuICAgICRzY29wZS5nb1RvRm9ybXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHRmdW5jdGlvbiBzY3JvbGxUb0JvdHRvbShkdXJhdGlvbikge1xuXHRcdCAgICBpZiAoZHVyYXRpb24gPD0gMCkgcmV0dXJuO1xuXG5cdFx0XHR2YXIgZGlmZmVyZW5jZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgLSB3aW5kb3cuc2Nyb2xsWTtcblx0XHRcdHZhciBwZXJUaWNrID0gZGlmZmVyZW5jZSAvIGR1cmF0aW9uICogMTA7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHdpbmRvdy5zY3JvbGwoMCwgd2luZG93LnNjcm9sbFkgKyBwZXJUaWNrKTtcblx0XHRcdFx0c2Nyb2xsVG9Cb3R0b20oZHVyYXRpb24gLSAxMCk7XG5cdFx0XHR9LCAxMCk7XG5cdFx0fVxuXG5cdFx0c2Nyb2xsVG9Cb3R0b20oMTAwMCk7XG4gICAgfTtcblxuICAgIFxuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xuICAgICAgICBBdXRoU2VydmljZS5zaWdudXAoc2lnbnVwSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdOZXdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFByb2plY3RGY3QsICRzdGF0ZSl7XG5cdCBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgfSk7XG5cblx0JHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xuXHRcdFByb2plY3RGY3QubmV3UHJvamVjdCgkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihwcm9qZWN0SWQpe1xuXHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogcHJvamVjdElkfSk7XHQgXHRcblx0XHR9KTtcblxuXHR9O1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcbiAgXG4gIHZhciB3YXZBcnJheSA9IFtdO1xuICBcbiAgJHNjb3BlLm51bU1lYXN1cmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgNjA7IGkrKykge1xuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xuICB9XG5cbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xuICAkc2NvcGUudHJhY2tzID0gW107XG4gICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcblxuXG4gIFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJzU1OTRjMjBhZDA3NTljZDQwY2U1MWUxNCcpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICBjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xuXG4gICAgICBpZiAocHJvamVjdC50cmFja3MubGVuZ3RoKSB7XG4gICAgICAgIHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICAgICAgaWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJhY2sucGxheWVyID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGRvbmVMb2FkaW5nKTtcbiAgICAgICAgICAgIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcbiAgICAgICAgICAgICRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcbiAgICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgICAgb2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xuICAgICAgICAgIG9iai5sb2NhdGlvbiA9IFtdO1xuICAgICAgICAgICRzY29wZS50cmFja3MucHVzaChvYmopO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIFRvbmVUaW1lbGluZUZjdC5nZXRUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKTtcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xuXG4gIH0pO1xuXG4gIC8vIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24oYVVzZXIpe1xuICAvLyAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcbiAgLy8gICAgIC8vICRzdGF0ZVBhcmFtcy50aGVJRCA9IGFVc2VyLl9pZFxuICAvLyAgICAgY29uc29sZS5sb2coXCJpZFwiLCAkc3RhdGVQYXJhbXMpO1xuICAvLyB9KTtcblxuICAkc2NvcGUucmVjb3JkID0gZnVuY3Rpb24gKGUsIGluZGV4KSB7XG5cbiAgXHRlID0gZS50b0VsZW1lbnQ7XG5cbiAgICAgICAgLy8gc3RhcnQgcmVjb3JkaW5nXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdGFydCByZWNvcmRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghYXVkaW9SZWNvcmRlcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBlLmNsYXNzTGlzdC5hZGQoXCJyZWNvcmRpbmdcIik7XG4gICAgICAgIGF1ZGlvUmVjb3JkZXIuY2xlYXIoKTtcbiAgICAgICAgYXVkaW9SZWNvcmRlci5yZWNvcmQoKTtcblxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLnN0b3AoKTtcbiAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XG4gICAgICAgICAgXG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xuICAgICAgICAgICAgLy8gJHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3SW1hZ2UgPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nSW1hZ2U7XG5cbiAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgIFxuICAgICAgICB9LCAyMDAwKTtcblxuICB9XG5cbiAgJHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xuXG4gIH07XG5cbiAgJHNjb3BlLnNlbmRUb0FXUyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgIHZhciBhd3NUcmFja3MgPSAkc2NvcGUudHJhY2tzLmZpbHRlcihmdW5jdGlvbih0cmFjayxpbmRleCl7XG4gICAgICAgICAgICAgIGlmKHRyYWNrLnJhd0F1ZGlvKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoYXdzVHJhY2tzLCAnNTU5NWE3ZmFhYTkwMWFkNjMyMzRmOTIwJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XG5cbiAgICB9KTtcbiAgfTtcblxuXG5cdFxuXG5cbn0pO1xuXG5cbiIsIlxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgJHN0YXRlUGFyYW1zLCB1c2VyRmFjdG9yeSkge1xuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcbiAgICAgICAgXG4gICAgICAgICAgJHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcblxuICAgICAgICAgIHVzZXJGYWN0b3J5LmdldFVzZXJPYmooJHN0YXRlUGFyYW1zLnRoZUlEKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICB2YXIgaW1nQXJyID0gW1xuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMTkwMjUwMy1kamJxaDYtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTAzNDE4OTMyLXRlNmhzNC10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE3OTU3NzgtY21xMHgxLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMTkyNTM5Mi0yaHczaGctdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIyNTA2NTgzLW96eng4NS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjMwMTU3MTMtd3V1dXk5LXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMjU0NjkxMC14bWpiNjMtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgIF1cblxuICAgICAgICAgICAgICAkc2NvcGUudXNlci5wcm9qZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKGFQcm9qZWN0KXtcbiAgICAgICAgICAgICAgICBhUHJvamVjdC5iYWNrZ3JvdW5kSW1nID0gaW1nQXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDkpXTtcbiAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmKCEkc2NvcGUudXNlci5wcm9mcGljKXtcbiAgICAgICAgICAgICAgJHNjb3BlLnVzZXIucHJvZnBpYyA9IFwiaHR0cHM6Ly93d3cubWRyMTAxLmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wNS9wbGFjZWhvbGRlci11c2VyLmpwZ1wiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdXNlci5mb2xsb3dlcnMubGVuZ3RoOyBpICsrKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJHN0YXRlUGFyYW1zLnRoZUlELCB1c2VyLmZvbGxvd2Vyc1tpXS5faWQpO1xuICAgICAgICAgICAgICBpZih1c2VyLmZvbGxvd2Vyc1tpXS5faWQgPT09IGxvZ2dlZEluVXNlci5faWQpe1xuICAgICAgICAgICAgICAgICRzY29wZS5mb2xsb3dTdGF0dXMgPSB0cnVlO1xuICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICB9KTtcbiAgICB9KTtcblxuXG5cbiAgICAvLyAkc2NvcGUuZGlzcGxheVNldHRpbmdzID0gZnVuY3Rpb24oKXtcbiAgICAvLyAgICAgaWYoJHNjb3BlLnNob3dTZXR0aW5ncykgJHNjb3BlLnNob3dTZXR0aW5ncyA9IGZhbHNlO1xuICAgIC8vICAgICBjb25zb2xlLmxvZygkc2NvcGUuc2hvd1NldHRpbmdzKTtcbiAgICAvLyB9XG5cbiAgICAkc2NvcGUuZm9sbG93ID0gZnVuY3Rpb24odXNlcil7XG4gICAgICB1c2VyRmFjdG9yeS5mb2xsb3codXNlciwgJHNjb3BlLmxvZ2dlZEluVXNlcikudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIGNvbnNvbGUubG9nKCdGb2xsb3cgY29udHJvbGxlciByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAkc2NvcGUuZm9sbG93U3RhdHVzID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRpc3BsYXlXZWIgPSBmdW5jdGlvbigpe1xuICAgICAgJHN0YXRlLmdvKCdmb3Jrd2ViJyk7XG4gICAgfTtcblxuXG59KTsiLCJhcHAuZmFjdG9yeSgnQW5hbHlzZXJGY3QnLCBmdW5jdGlvbigpIHtcblxuXHR2YXIgdXBkYXRlQW5hbHlzZXJzID0gZnVuY3Rpb24gKGFuYWx5c2VyQ29udGV4dCwgYW5hbHlzZXJOb2RlLCBjb250aW51ZVVwZGF0ZSkge1xuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xuXHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xuXHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XG5cdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcblxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxuXG5cdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XG5cdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XG5cdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XG5cblx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcblx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XG5cdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxuXHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcblx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xuXHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XG5cdFx0XHR9XG5cdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XG5cdH1cblxuXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xuXHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggYW5hbHlzZXJJZCApO1xuXHR9XG5cdHJldHVybiB7XG5cdFx0dXBkYXRlQW5hbHlzZXJzOiB1cGRhdGVBbmFseXNlcnMsXG5cdFx0Y2FuY2VsQW5hbHlzZXJVcGRhdGVzOiBjYW5jZWxBbmFseXNlclVwZGF0ZXNcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ0ZvcmtGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldFdlYiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9mb3JrcycpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRXZWI6IGdldFdlYlxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdIb21lRmN0JywgZnVuY3Rpb24oJGh0dHApe1xuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcicsIHtwYXJhbXM6IHtfaWQ6IHVzZXJ9fSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWNjZXNzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdQcm9qZWN0RmN0JywgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldFByb2plY3RJbmZvID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xuXG4gICAgICAgIC8vaWYgY29taW5nIGZyb20gSG9tZUNvbnRyb2xsZXIgYW5kIG5vIElkIGlzIHBhc3NlZCwgc2V0IGl0IHRvICdhbGwnXG4gICAgICAgIHZhciBwcm9qZWN0aWQgPSBwcm9qZWN0SWQgfHwgJ2FsbCc7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvamVjdHMvJyArIHByb2plY3RpZCB8fCBwcm9qZWN0aWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgY3JlYXRlQUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzLycsIHByb2plY3QpLnRoZW4oZnVuY3Rpb24oZm9yayl7XG4gICAgXHRcdFx0cmV0dXJuIGZvcmsuZGF0YTtcbiAgICBcdH0pO1xuICAgIH1cbiAgICB2YXIgbmV3UHJvamVjdCA9IGZ1bmN0aW9uKHVzZXIpe1xuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMnLHtvd25lcjp1c2VyLl9pZCwgbmFtZTonVW50aXRsZWQnLCBicG06MTIwLCBlbmRNZWFzdXJlOiAzMn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgIFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICBcdH0pO1xuICAgIH1cbiAgICB2YXIgbmFtZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld05hbWUsIHByb2plY3RJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3Byb2plY3RzLycrcHJvamVjdElkLCB7bmFtZTogbmV3TmFtZX0pLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3Byb2plY3RzLycrcHJvamVjdC5faWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0RlbGV0ZSBQcm9qIEZjdCcsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciB1cGxvYWRQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCdhcGkvcHJvamVjdHMvc291bmRjbG91ZCcsIHsgcHJvamVjdCA6IHByb2plY3QgfSApLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRQcm9qZWN0SW5mbzogZ2V0UHJvamVjdEluZm8sXG4gICAgICAgIGNyZWF0ZUFGb3JrOiBjcmVhdGVBRm9yayxcbiAgICAgICAgbmV3UHJvamVjdDogbmV3UHJvamVjdCwgXG4gICAgICAgIGRlbGV0ZVByb2plY3Q6IGRlbGV0ZVByb2plY3QsXG4gICAgICAgIG5hbWVDaGFuZ2U6IG5hbWVDaGFuZ2UsXG4gICAgICAgIHVwbG9hZFByb2plY3Q6IHVwbG9hZFByb2plY3RcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdSZWNvcmRlckZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgQXV0aFNlcnZpY2UsICRxLCBUb25lVHJhY2tGY3QsIEFuYWx5c2VyRmN0KSB7XG5cbiAgICB2YXIgcmVjb3JkZXJJbml0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICAgICAgICAgIHZhciBhdWRpb0NvbnRleHQgPSBuZXcgQ29udGV4dCgpO1xuICAgICAgICAgICAgdmFyIHJlY29yZGVyO1xuXG4gICAgICAgICAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSAoXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pDYW5jZWxBbmltYXRpb25GcmFtZTtcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSlcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgICAgICAgICAvLyBhc2sgZm9yIHBlcm1pc3Npb25cbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXVkaW9cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWFuZGF0b3J5XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nRWNob0NhbmNlbGxhdGlvblwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0F1dG9HYWluQ29udHJvbFwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ05vaXNlU3VwcHJlc3Npb25cIjogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dIaWdocGFzc0ZpbHRlclwiOiBcImZhbHNlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3B0aW9uYWxcIjogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dFBvaW50ID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIEF1ZGlvTm9kZSBmcm9tIHRoZSBzdHJlYW0uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbEF1ZGlvSW5wdXQgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdWRpb0lucHV0ID0gcmVhbEF1ZGlvSW5wdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdWRpb0lucHV0LmNvbm5lY3QoaW5wdXRQb2ludCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbmFseXNlciBub2RlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXNlck5vZGUuZmZ0U2l6ZSA9IDIwNDg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIGFuYWx5c2VyTm9kZSApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSByZWNvcmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoIGlucHV0UG9pbnQgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB6ZXJvR2FpbiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5nYWluLnZhbHVlID0gMC4wO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCB6ZXJvR2FpbiApO1xuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uY29ubmVjdCggYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoW3JlY29yZGVyLCBhbmFseXNlck5vZGVdKTtcblxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIHJlY29yZFN0YXJ0ID0gZnVuY3Rpb24gKHJlY29yZGVyKSB7XG4gICAgICAgIHJlY29yZGVyLmNsZWFyKCk7XG4gICAgICAgIHJlY29yZGVyLnJlY29yZCgpO1xuICAgIH1cblxuICAgIHZhciByZWNvcmRTdG9wID0gZnVuY3Rpb24gKGluZGV4LCByZWNvcmRlcikge1xuICAgICAgICByZWNvcmRlci5zdG9wKCk7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgLy8gZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xuICAgICAgICAgICAgcmVjb3JkZXIuZ2V0QnVmZmVycyhmdW5jdGlvbiAoYnVmZmVycykge1xuICAgICAgICAgICAgICAgIC8vZGlzcGxheSB3YXYgaW1hZ2VcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZWRpc3BsYXlcIiArICBpbmRleCApO1xuICAgICAgICAgICAgICAgIHZhciBjYW52YXNMb29wID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZUZvckxvb3BcIiArICBpbmRleCApO1xuICAgICAgICAgICAgICAgIGRyYXdCdWZmZXIoIDMwMCwgMTAwLCBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSwgYnVmZmVyc1swXSApO1xuICAgICAgICAgICAgICAgIGRyYXdCdWZmZXIoIDE5OCwgOTgsIGNhbnZhc0xvb3AuZ2V0Q29udGV4dCgnMmQnKSwgYnVmZmVyc1swXSApO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RCdWZmZXIgPSBidWZmZXJzWzBdO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZSA9IGNhbnZhc0xvb3AudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGhlIE9OTFkgdGltZSBnb3RCdWZmZXJzIGlzIGNhbGxlZCBpcyByaWdodCBhZnRlciBhIG5ldyByZWNvcmRpbmcgaXMgY29tcGxldGVkIC0gXG4gICAgICAgICAgICAgICAgLy8gc28gaGVyZSdzIHdoZXJlIHdlIHNob3VsZCBzZXQgdXAgdGhlIGRvd25sb2FkLlxuICAgICAgICAgICAgICAgIHJlY29yZGVyLmV4cG9ydFdBViggZnVuY3Rpb24gKCBibG9iICkge1xuICAgICAgICAgICAgICAgICAgICAvL25lZWRzIGEgdW5pcXVlIG5hbWVcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb3JkZXIuc2V0dXBEb3dubG9hZCggYmxvYiwgXCJteVJlY29yZGluZzAud2F2XCIgKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgbG9vcCB0aW1lXG4gICAgICAgICAgICAgICAgICAgIFRvbmVUcmFja0ZjdC5sb29wSW5pdGlhbGl6ZShibG9iLCBpbmRleCwgXCJteVJlY29yZGluZzAud2F2XCIpLnRoZW4ocmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBcblxuICAgIFxuICAgIHZhciBjb252ZXJ0VG9CYXNlNjQgPSBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VhY2ggdHJhY2snLCB0cmFjayk7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICAgIGlmKHRyYWNrLnJhd0F1ZGlvKSB7XG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwodHJhY2sucmF3QXVkaW8pO1xuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG5cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VuZFRvQVdTOiBmdW5jdGlvbiAodHJhY2tzQXJyYXksIHByb2plY3RJZCwgcHJvamVjdE5hbWUpIHtcblxuICAgICAgICAgICAgdmFyIHJlYWRQcm9taXNlcyA9IHRyYWNrc0FycmF5Lm1hcChjb252ZXJ0VG9CYXNlNjQpO1xuXG4gICAgICAgICAgICByZXR1cm4gJHEuYWxsKHJlYWRQcm9taXNlcykudGhlbihmdW5jdGlvbiAoc3RvcmVEYXRhKSB7XG5cbiAgICAgICAgICAgICAgICB0cmFja3NBcnJheS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaywgaSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcmVEYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFjay5yYXdBdWRpbyA9IHN0b3JlRGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrLmVmZmVjdHNSYWNrID0gdHJhY2suZWZmZWN0c1JhY2subWFwKGZ1bmN0aW9uIChlZmZlY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVGRkVDVFwiLCBlZmZlY3QsIGVmZmVjdC53ZXQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlZmZlY3Qud2V0LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2F3cy8nLCB7IHRyYWNrcyA6IHRyYWNrc0FycmF5LCBwcm9qZWN0SWQgOiBwcm9qZWN0SWQsIHByb2plY3ROYW1lIDogcHJvamVjdE5hbWUgfSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgaW4gc2VuZFRvQVdTRmFjdG9yeScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhOyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIHJlY29yZGVySW5pdDogcmVjb3JkZXJJbml0LFxuICAgICAgICByZWNvcmRTdGFydDogcmVjb3JkU3RhcnQsXG4gICAgICAgIHJlY29yZFN0b3A6IHJlY29yZFN0b3BcbiAgICB9XG59KTsiLCIndXNlIHN0cmljdCc7XG4iLCIndXNlIHN0cmljdCc7XG5hcHAuZmFjdG9yeSgnVG9uZVRpbWVsaW5lRmN0JywgZnVuY3Rpb24gKCRodHRwLCAkcSkge1xuXG5cdHZhciBjcmVhdGVUcmFuc3BvcnQgPSBmdW5jdGlvbiAobG9vcEVuZCkge1xuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3AgPSB0cnVlO1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcFN0YXJ0ID0gJzBtJztcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BFbmQgPSBsb29wRW5kLnRvU3RyaW5nKCkgKyAnbSc7XG5cdFx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cblx0XHRcdGNyZWF0ZU1ldHJvbm9tZSgpLnRoZW4oZnVuY3Rpb24gKG1ldHJvbm9tZSkge1xuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIHBvc0FyciA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6Jyk7XG5cdFx0XHRcdFx0dmFyIGxlZnRQb3MgPSAoKHBhcnNlSW50KHBvc0FyclswXSkgKiAyMDAgKSArIChwYXJzZUludChwb3NBcnJbMV0pICogNTApICsgNTAwKS50b1N0cmluZygpICsgJ3B4Jztcblx0XHRcdFx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gbGVmdFBvcztcblx0XHRcdFx0XHRtZXRyb25vbWUuc3RhcnQoKTtcblx0XHRcdFx0fSwgJzFtJyk7XG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR2YXIgcG9zQXJyID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoXCI6XCIpO1xuXHRcdFx0XHRcdGlmKHBvc0Fyci5sZW5ndGggPT09IDMpIHtcblx0XHRcdFx0XHRcdCQoJyN0aW1lbGluZVBvc2l0aW9uJykudmFsKHBvc0FyclsxXSArIFwiOlwiICsgcG9zQXJyWzJdKTtcblx0XHRcdFx0XHRcdCQoJyNwb3NpdGlvblNlbGVjdG9yJykudmFsKHBvc0FyclswXSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoJyN0aW1lbGluZVBvc2l0aW9uJykudmFsKHBvc0FyclsxXSArIFwiOlwiICsgcG9zQXJyWzJdKTtcblx0XHRcdFx0XHRcdCQoJyNwb3NpdGlvblNlbGVjdG9yJykudmFsKHBvc0FyclswXSk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XG5cdFx0XHRcdH0sICc0bicpO1xuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShtZXRyb25vbWUpO1xuXHRcdFx0fSk7XG4gICAgICAgIH0pO1xuXHR9O1xuXG5cdHZhciBjaGFuZ2VCcG0gPSBmdW5jdGlvbiAoYnBtKSB7XG5cdFx0VG9uZS5UcmFuc3BvcnQuYnBtLnZhbHVlID0gYnBtO1xuXHRcdHJldHVybiBUb25lLlRyYW5zcG9ydDtcblx0fTtcblxuXHR2YXIgc3RvcEFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcblx0XHRcdGlmKHRyYWNrLnBsYXllcikgdHJhY2sucGxheWVyLnN0b3AoKTtcblx0XHR9KTtcblx0fTtcblxuXHR2YXIgbXV0ZUFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcblx0XHRcdGlmKHRyYWNrLnBsYXllcikgdHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IC0xMDA7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIHVuTXV0ZUFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcblx0XHRcdGlmKHRyYWNrLnBsYXllcikgdHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIGNyZWF0ZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgdmFyIG1ldCA9IG5ldyBUb25lLlBsYXllcihcIi9hcGkvd2F2L0NsaWNrMS53YXZcIiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShtZXQpO1xuXHQgICAgICAgIH0pLnRvTWFzdGVyKCk7XG4gICAgICAgIH0pO1xuXHR9O1xuXG5cdC8vIHZhciBhZGRMb29wVG9UaW1lbGluZSA9IGZ1bmN0aW9uIChwbGF5ZXIsIHN0YXJ0VGltZUFycmF5KSB7XG5cblx0Ly8gXHRpZihzdGFydFRpbWVBcnJheS5pbmRleE9mKDApID09PSAtMSkge1xuXHQvLyBcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XG5cdC8vIFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdC8vIFx0XHR9LCBcIjBtXCIpXG5cblx0Ly8gXHR9XG5cblx0Ly8gXHRzdGFydFRpbWVBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChzdGFydFRpbWUpIHtcblxuXHQvLyBcdFx0dmFyIHN0YXJ0VGltZSA9IHN0YXJ0VGltZS50b1N0cmluZygpICsgJ20nO1xuXG5cdC8vIFx0XHRUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdC8vIFx0XHRcdGNvbnNvbGUubG9nKCdTdGFydCcsIFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcblx0Ly8gXHRcdFx0cGxheWVyLnN0b3AoKTtcblx0Ly8gXHRcdFx0cGxheWVyLnN0YXJ0KCk7XG5cdC8vIFx0XHR9LCBzdGFydFRpbWUpO1xuXG5cdC8vIFx0XHQvLyB2YXIgc3RvcFRpbWUgPSBwYXJzZUludChzdGFydFRpbWUuc3Vic3RyKDAsIHN0YXJ0VGltZS5sZW5ndGgtMSkpICsgMSkudG9TdHJpbmcoKSArIHN0YXJ0VGltZS5zdWJzdHIoLTEsMSk7XG5cdC8vIFx0XHQvLy8vIGNvbnNvbGUubG9nKCdTVE9QJywgc3RvcCk7XG5cdC8vIFx0XHQvLy8vIHRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdC8vIFx0XHQvLy8vIFx0cGxheWVyLnN0b3AoKTtcblx0Ly8gXHRcdC8vLy8gfSwgc3RvcFRpbWUpO1xuXG5cdC8vIFx0fSk7XG5cblx0Ly8gfTtcblx0XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlVHJhbnNwb3J0OiBjcmVhdGVUcmFuc3BvcnQsXG4gICAgICAgIGNoYW5nZUJwbTogY2hhbmdlQnBtLFxuICAgICAgICAvLyBhZGRMb29wVG9UaW1lbGluZTogYWRkTG9vcFRvVGltZWxpbmUsXG4gICAgICAgIGNyZWF0ZU1ldHJvbm9tZTogY3JlYXRlTWV0cm9ub21lLFxuICAgICAgICBzdG9wQWxsOiBzdG9wQWxsLFxuICAgICAgICBtdXRlQWxsOiBtdXRlQWxsLFxuICAgICAgICB1bk11dGVBbGw6IHVuTXV0ZUFsbFxuICAgIH07XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1RvbmVUcmFja0ZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcblxuXHR2YXIgY3JlYXRlUGxheWVyID0gZnVuY3Rpb24gKHVybCwgZG9uZUZuKSB7XG5cdFx0dmFyIHBsYXllciAgPSBuZXcgVG9uZS5QbGF5ZXIodXJsLCBkb25lRm4pO1xuXHRcdC8vIFRPRE86IHJlbW92ZSB0b01hc3RlclxuXHRcdHBsYXllci50b01hc3RlcigpO1xuXHRcdC8vIHBsYXllci5zeW5jKCk7XG5cdFx0Ly8gcGxheWVyLmxvb3AgPSB0cnVlO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0dmFyIGxvb3BJbml0aWFsaXplID0gZnVuY3Rpb24oYmxvYiwgaW5kZXgsIGZpbGVuYW1lKSB7XG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHQvL1BBU1NFRCBBIEJMT0IgRlJPTSBSRUNPUkRFUkpTRkFDVE9SWSAtIERST1BQRUQgT04gTUVBU1VSRSAwXG5cdFx0XHR2YXIgdXJsID0gKHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0dmFyIGxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNhdmVcIitpbmRleCk7XG5cdFx0XHRsaW5rLmhyZWYgPSB1cmw7XG5cdFx0XHRsaW5rLmRvd25sb2FkID0gZmlsZW5hbWUgfHwgJ291dHB1dCcraW5kZXgrJy53YXYnO1xuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZyA9IGJsb2I7XG5cdFx0XHR3aW5kb3cubGF0ZXN0UmVjb3JkaW5nVVJMID0gdXJsO1xuXHRcdFx0dmFyIHBsYXllcjtcblx0XHRcdC8vIFRPRE86IHJlbW92ZSB0b01hc3RlclxuXHRcdFx0cGxheWVyID0gbmV3IFRvbmUuUGxheWVyKGxpbmsuaHJlZiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXNvbHZlKHBsYXllcik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fTtcblxuXHR2YXIgZWZmZWN0c0luaXRpYWxpemUgPSBmdW5jdGlvbihhcnIpIHtcblxuXG5cdFx0dmFyIGNob3J1cyA9IG5ldyBUb25lLkNob3J1cygpO1xuXHRcdGNob3J1cy5uYW1lID0gXCJDaG9ydXNcIjtcblx0XHR2YXIgcGhhc2VyID0gbmV3IFRvbmUuUGhhc2VyKCk7XG5cdFx0cGhhc2VyLm5hbWUgPSBcIlBoYXNlclwiO1xuXHRcdHZhciBkaXN0b3J0ID0gbmV3IFRvbmUuRGlzdG9ydGlvbigpO1xuXHRcdGRpc3RvcnQubmFtZSA9IFwiRGlzdG9ydGlvblwiO1xuXHRcdHZhciBwaW5ncG9uZyA9IG5ldyBUb25lLlBpbmdQb25nRGVsYXkoXCI0bVwiKTtcblx0XHRwaW5ncG9uZy5uYW1lID0gXCJQaW5nIFBvbmdcIjtcblxuXHRcdGlmIChhcnIubGVuZ3RoKSB7XG5cdFx0XHRjaG9ydXMud2V0LnZhbHVlID0gYXJyWzBdO1xuXHRcdFx0cGhhc2VyLndldC52YWx1ZSA9IGFyclsxXTtcblx0XHRcdGRpc3RvcnQud2V0LnZhbHVlID0gYXJyWzJdO1xuXHRcdFx0cGluZ3Bvbmcud2V0LnZhbHVlID0gYXJyWzNdO1xuXHRcdH1cblx0XHRcblx0XHRjaG9ydXMuY29ubmVjdChwaGFzZXIpO1xuXHRcdHBoYXNlci5jb25uZWN0KGRpc3RvcnQpO1xuXHRcdGRpc3RvcnQuY29ubmVjdChwaW5ncG9uZyk7XG5cdFx0cGluZ3BvbmcudG9NYXN0ZXIoKTtcblx0XHQvLyBwaW5ncG9uZy5jb25uZWN0KHZvbHVtZSk7XG5cdFx0Ly8gdm9sdW1lLnRvTWFzdGVyKCk7XG5cblx0XHRyZXR1cm4gW2Nob3J1cywgcGhhc2VyLCBkaXN0b3J0LCBwaW5ncG9uZ107XG5cdH07XG5cblx0dmFyIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG1lYXN1cmUpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnSlVTVCBEUk9QUEVEJywgcGxheWVyLCBtZWFzdXJlKTtcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xuXHRcdFx0fSwgbWVhc3VyZStcIm1cIik7XG5cdH07XG5cblx0dmFyIHJlcGxhY2VUaW1lbGluZUxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpIHtcblx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbGQgdGltZWxpbmUgaWQnLCBvbGRUaW1lbGluZUlkKTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQob2xkVGltZWxpbmVJZCkpO1xuXHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZXMoKTtcblx0XHRcdHJlc29sdmUoY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChwbGF5ZXIsIG5ld01lYXN1cmUpKTtcblx0XHR9KTtcblx0fTtcblx0dmFyIGRlbGV0ZVRpbWVsaW5lTG9vcCA9IGZ1bmN0aW9uKHRpbWVsaW5lSWQpIHtcblx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KHRpbWVsaW5lSWQpKTtcblx0fTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZVBsYXllcjogY3JlYXRlUGxheWVyLFxuICAgICAgICBsb29wSW5pdGlhbGl6ZTogbG9vcEluaXRpYWxpemUsXG4gICAgICAgIGVmZmVjdHNJbml0aWFsaXplOiBlZmZlY3RzSW5pdGlhbGl6ZSxcbiAgICAgICAgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcDogY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCxcbiAgICAgICAgcmVwbGFjZVRpbWVsaW5lTG9vcDogcmVwbGFjZVRpbWVsaW5lTG9vcCxcbiAgICAgICAgZGVsZXRlVGltZWxpbmVMb29wOiBkZWxldGVUaW1lbGluZUxvb3BcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCd1c2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRnZXRVc2VyT2JqOiBmdW5jdGlvbih1c2VySUQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXJzJywge3BhcmFtczoge19pZDogdXNlcklEfX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygncmVzb29uc2UgaXMnLCByZXNwb25zZS5kYXRhKVxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRmb2xsb3c6IGZ1bmN0aW9uKHVzZXIsIGxvZ2dlZEluVXNlcil7XG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMnLHt1c2VyVG9Gb2xsb3c6IHVzZXIsIGxvZ2dlZEluVXNlcjogbG9nZ2VkSW5Vc2VyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb2xsb3dVc2VyIEZhY3RvcnkgcmVzcG9uc2UnLCByZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0dW5Gb2xsb3c6IGZ1bmN0aW9uKGZvbGxvd2VlLCBsb2dnZWRJblVzZXIpIHtcblx0XHRcdHJldHVybiAkaHR0cC5wdXQoJ2FwaS91c2VycycsIHt1c2VyVG9VbmZvbGxvdzogZm9sbG93ZWUsIGxvZ2dlZEluVXNlcjogbG9nZ2VkSW5Vc2VyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCd1bkZvbGxvdyByZXNwb25zZScsIHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnZHJhZ2dhYmxlJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XG4gICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICBcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xuICAgIFxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xuICAgICAgICBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKCdUZXh0JywgdGhpcy5pZCk7XG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnZHJhZycpO1xuXG4gICAgICAgIHZhciBpZHggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBhcnNlSW50KGF0dHJzLnBvc2l0aW9uKSk7XG4gICAgICAgIHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG4gICAgXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VuZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG5cbiAgfVxufSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Ryb3BwYWJsZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBkcm9wOiAnJicgLy8gcGFyZW50XG4gICAgfSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgLy8gYWdhaW4gd2UgbmVlZCB0aGUgbmF0aXZlIG9iamVjdFxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcbiAgICAgICAgICAvLyBhbGxvd3MgdXMgdG8gZHJvcFxuICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBmYWxzZVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdsZWF2ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgICAgXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cbiAgICAgICAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdXBvbiBkcm9wLCBjaGFuZ2luZyBwb3NpdGlvbiBhbmQgdXBkYXRpbmcgdHJhY2subG9jYXRpb24gYXJyYXkgb24gc2NvcGUgXG4gICAgICAgICAgdmFyIGl0ZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlLmRhdGFUcmFuc2Zlci5nZXREYXRhKCdUZXh0JykpO1xuICAgICAgICAgIHZhciByb3dJZCwgdHJhY2tJbmRleDtcblxuICAgICAgICAgIC8vZ2V0IHRyYWNrSWQgb2YgZHJvcHBhYmxlIGNvbnRhaW5lclxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGlmKG5hbWUuaW5jbHVkZXMoXCJ0cmFja1wiKSkge1xuICAgICAgICAgICAgICB0cmFja0luZGV4ID0gbmFtZS5zcGxpdChcInRyYWNrXCIpWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vZ2V0IHRyYWNrSWQgb2YgZHJhZ2dhYmxlIGNvbnRhaW5lclxuICAgICAgICAgIGl0ZW0uY2xhc3NMaXN0LmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGlmKG5hbWUuaW5jbHVkZXMoXCJ0cmFja0xvb3BcIikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2cobmFtZS5zcGxpdChcInRyYWNrTG9vcFwiKVsxXSk7XG4gICAgICAgICAgICAgIHJvd0lkID0gbmFtZS5zcGxpdChcInRyYWNrTG9vcFwiKVsxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgeHBvc2l0aW9uID0gcGFyc2VJbnQodGhpcy5hdHRyaWJ1dGVzLnhwb3NpdGlvbi52YWx1ZSk7XG4gICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSB0aGlzLmNoaWxkTm9kZXM7XG4gICAgICAgICAgdmFyIG9sZFRpbWVsaW5lSWQ7XG4gICAgICAgICAgdmFyIHRoZUNhbnZhcztcblxuICAgICAgICAgIC8vaWYgcm93SWQgPSB0cmFjay5pbmRleE9mKClcbiAgICAgICAgICAvLyBpZigpXG4gICAgICAgICAgY29uc29sZS5sb2coJ1JPV0lEJywgcm93SWQsIFwidHJhY2tJbmRleFwiLCB0cmFja0luZGV4KTtcbiAgICAgICAgICBpZihwYXJzZUludChyb3dJZCkgPT09IHBhcnNlSW50KHRyYWNrSW5kZXgpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGROb2Rlc1tpXS5jbGFzc05hbWUgPT09ICdjYW52YXMtYm94Jykge1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1tpXS5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnB1c2goeHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzTm9kZSA9IHRoaXMuY2hpbGROb2Rlc1tpXS5jaGlsZE5vZGVzO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzTm9kZS5sZW5ndGg7IGorKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzTm9kZVtqXS5ub2RlTmFtZSA9PT0gJ0NBTlZBUycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMucG9zaXRpb24udmFsdWUgPSB4cG9zaXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkVGltZWxpbmVJZCA9IGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy50aW1lbGluZUlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9sZFRpbWVsaW5lSWQgPSBjYW52YXNOb2RlW2pdLmRhdGFzZXQudGltZWxpbmVJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnT0xEIFRJTUVMSU5FJywgb2xkVGltZWxpbmVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlQ2FudmFzID0gY2FudmFzTm9kZVtqXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSAgICAgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbGRUaW1lbGluZUlkJywgb2xkVGltZWxpbmVJZCk7XG4gICAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQubW92ZUluVGltZWxpbmUob2xkVGltZWxpbmVJZCwgeHBvc2l0aW9uKS50aGVuKGZ1bmN0aW9uIChuZXdUaW1lbGluZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhlQ2FudmFzLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZSA9IG5ld1RpbWVsaW5lSWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNhbGwgdGhlIGRyb3AgcGFzc2VkIGRyb3AgZnVuY3Rpb25cbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgfVxuICB9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCdmb2xsb3dkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZm9sbG93L2ZvbGxvd0RpcmVjdGl2ZS5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnRm9sbG93RGlyZWN0aXZlQ29udHJvbGxlcidcblx0fTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9sbG93RGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCB1c2VyRmFjdG9yeSl7XG5cblxuXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xuICAgICAgICAgXHQkc2NvcGUubG9nZ2VkSW5Vc2VyID0gbG9nZ2VkSW5Vc2VyO1xuICAgICAgICAgIFx0dXNlckZhY3RvcnkuZ2V0VXNlck9iaigkc3RhdGVQYXJhbXMudGhlSUQpLnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdCAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcblxuXHQgICAgICAgICAgICBpZigkc3RhdGUuY3VycmVudC5uYW1lID09PSBcInVzZXJQcm9maWxlLmZvbGxvd2Vyc1wiKXtcblx0ICAgICAgICAgICAgXHQkc2NvcGUuZm9sbG93cyA9IHVzZXIuZm9sbG93ZXJzO1xuXHQgICAgICAgICAgICB9IGVsc2V7XG5cdCAgICAgICAgICAgIFx0JHNjb3BlLmZvbGxvd3MgPSB1c2VyLmZvbGxvd2luZztcblx0ICAgICAgICAgICAgXHRpZigkc3RhdGVQYXJhbXMudGhlSUQgPT09IGxvZ2dlZEluVXNlci5faWQpICRzY29wZS5zaG93QnV0dG9uID0gdHJ1ZTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImZvbGxvd09iaiBpc1wiLCAkc2NvcGUuZm9sbG93cywgJHN0YXRlUGFyYW1zKTtcblxuXHQgICAgXHR9KTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS5nb1RvRm9sbG93ID0gZnVuY3Rpb24oZm9sbG93KXtcblx0ICAgICAgY29uc29sZS5sb2coXCJjbGlja2VkXCIsIGZvbGxvdyk7XG5cdCAgICAgICRzdGF0ZS5nbygndXNlclByb2ZpbGUnLCB7IHRoZUlEOiBmb2xsb3cuX2lkfSk7XG5cdCAgICB9O1xuXG5cdCAgICAkc2NvcGUudW5Gb2xsb3cgPSBmdW5jdGlvbihmb2xsb3dlZSkge1xuXHQgICAgXHRjb25zb2xlLmxvZygkc2NvcGUuZm9sbG93cyk7XG4gICAgXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgJHNjb3BlLmZvbGxvd3MubGVuZ3RoOyBpKyspIHtcbiAgICBcdFx0XHRcdGlmKCRzY29wZS5mb2xsb3dzW2ldLl9pZCA9PT0gZm9sbG93ZWUuX2lkKXtcbiAgICBcdFx0XHRcdFx0dmFyIGRlbCA9ICRzY29wZS5mb2xsb3dzLnNwbGljZShpLCAxKTtcbiAgICBcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJkZWxldGVcIiwgZGVsLCAkc2NvcGUuZm9sbG93cyk7XG4gICAgXHRcdFx0XHR9XG4gICAgXHRcdH1cblx0ICAgIFx0dXNlckZhY3RvcnkudW5Gb2xsb3coZm9sbG93ZWUsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHQgICAgXHRcdGNvbnNvbGUubG9nKFwic3VjY2VzZnVsXCIsIHJlc3BvbnNlKTtcblx0ICAgIFx0XHQkc2NvcGUuJGRpZ2VzdCgpO1x0XG5cdCAgICBcdH0pO1xuXG5cdCAgICB9O1xuXG5cdFxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbG9hZGluZ0dpZicsIGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbG9hZGluZy1naWYvbG9hZGluZy5odG1sJ1xuXHR9O1xufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUsIFByb2plY3RGY3QpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgdmFyIHNldE5hdmJhciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcil7XG4gICAgICAgICAgICAgICAgICAgIGlmKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXJJZCA9IHVzZXIuX2lkO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Byb2ZpbGUnLCBzdGF0ZTogJ3VzZXJQcm9maWxlKHt0aGVJRDogdXNlcklkfSknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZXROYXZiYXIoKTtcblxuICAgICAgICAgICAgLy8gc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ3Byb2plY3QnIH0sXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ1NpZ24gVXAnLCBzdGF0ZTogJ3NpZ251cCcgfSxcbiAgICAgICAgICAgIC8vICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICd1c2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgLy8gXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubmV3UHJvamVjdEJ1dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgUHJvamVjdEZjdC5uZXdQcm9qZWN0KHNjb3BlLnVzZXIpLnRoZW4oZnVuY3Rpb24ocHJvamVjdElkKXtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogcHJvamVjdElkfSk7ICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldE5hdmJhcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHNldE5hdmJhcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgncHJvamVjdGRpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ3Byb2plY3RkaXJlY3RpdmVDb250cm9sbGVyJ1xuXHR9O1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlLCAkbWRUb2FzdCl7XG5cblxuXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xuXHRcdFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcblx0XHRcdCRzY29wZS5kaXNwbGF5QVByb2plY3QgPSBmdW5jdGlvbihzb21ldGhpbmcpe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnVEhJTkcnLCBzb21ldGhpbmcpO1xuXHRcdFx0XHRpZigkc2NvcGUubG9nZ2VkSW5Vc2VyLl9pZCA9PT0gJHN0YXRlUGFyYW1zLnRoZUlEKXtcblx0XHRcdFx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBzb21ldGhpbmcuX2lkfSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0XHRcdGlmKCFwcm9qZWN0LmZvcmtPcmlnaW4pIHByb2plY3QuZm9ya09yaWdpbiA9IHByb2plY3QuX2lkO1xuXHRcdFx0XHQkbWRUb2FzdC5zaG93KHtcblx0XHRcdFx0aGlkZURlbGF5OiAyMDAwLFxuXHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG5cdFx0XHRcdHRlbXBsYXRlOlwiPG1kLXRvYXN0PiBJdCdzIGJlZW4gZm9ya2VkIDwvbWQtdG9hc3Q+XCJcblx0XHRcdH0pO1xuXG5cdFx0XHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XG5cdFx0XHRcdHByb2plY3Qub3duZXIgPSBsb2dnZWRJblVzZXIuX2lkO1xuXHRcdFx0XHRkZWxldGUgcHJvamVjdC5faWQ7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKHByb2plY3QpO1xuXHRcdFx0XHRQcm9qZWN0RmN0LmNyZWF0ZUFGb3JrKHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JrIHJlc3BvbnNlIGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0JHNjb3BlLmRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcblx0XHRcdFx0Y29uc29sZS5sb2coJHNjb3BlLnVzZXIucHJvamVjdHMpO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8ICRzY29wZS51c2VyLnByb2plY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHRcdFx0XHRpZigkc2NvcGUudXNlci5wcm9qZWN0c1tpXS5faWQgPT09IHByb2plY3QuX2lkKXtcbiAgICBcdFx0XHRcdFx0dmFyIGRlbCA9ICRzY29wZS51c2VyLnByb2plY3RzLnNwbGljZShpLCAxKTtcbiAgICBcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJkZWxldGVcIiwgZGVsLCAkc2NvcGUudXNlci5wcm9qZWN0cyk7XG4gICAgXHRcdFx0XHR9XG4gICAgXHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0RlbGV0ZVByb2plY3QnLCBwcm9qZWN0KVxuXHRcdFx0XHRQcm9qZWN0RmN0LmRlbGV0ZVByb2plY3QocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0RlbGV0ZSByZXF1ZXN0IGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0JHNjb3BlLnBvc3RUb1NvdW5kY2xvdWQgPSBmdW5jdGlvbihwcm9qZWN0KXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1VwbG9hZGluZyBQcm9qZWN0JywgcHJvamVjdCk7XG5cdFx0XHRcdFByb2plY3RGY3QudXBsb2FkUHJvamVjdChwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnVXBsb2FkIFJlcXVlc3QgaXMnLCByZXNwb25zZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cblx0XHR9KTtcblx0XG59KTsiLCJhcHAuZGlyZWN0aXZlKCd4aW1UcmFjaycsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEFuYWx5c2VyRmN0LCAkcSkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5odG1sJyxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdHNjb3BlLmVmZmVjdFdldG5lc3NlcyA9IHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrLm1hcChmdW5jdGlvbiAoZWZmZWN0KSB7XG5cdFx0XHRcdHJldHVybiBlZmZlY3Qud2V0LnZhbHVlICogMTAwMDtcblx0XHRcdH0pO1xuXHRcdFx0XHRzY29wZS52b2x1bWUgPSBuZXcgVG9uZS5Wb2x1bWUoKTtcblx0XHRcdFx0c2NvcGUudm9sdW1lLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uZm9yRWFjaChmdW5jdGlvbiAobG9jKSB7XG5cdFx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcblx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgbG9jKTtcblx0XHRcdFx0XHQkKCcjbWVhc3VyZScgKyBsb2MgKyAnLnRyYWNrJyArIHRyYWNrSW5kZXgpLmZpcnN0KCkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBsb2MgKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgdHJhY2tJbmRleCArIFwiLVwiICsgbG9jICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK3RyYWNrSW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LCAwKTtcblxuXHRcdFx0c2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgsIHBvc2l0aW9uKSB7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XG5cdFx0XHRcdC8vIHZhciBwb3NpdGlvbiA9IDA7XG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcblxuXHRcdFx0XHRpZiAoc2NvcGUudHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Ly8gZHJvcCB0aGUgbG9vcCBvbiB0aGUgZmlyc3QgYXZhaWxhYmxlIGluZGV4XHRcdFx0XHRcblx0XHRcdFx0XHR3aGlsZSAoc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbikgPiAtMSkge1xuXHRcdFx0XHRcdFx0cG9zaXRpb24rKztcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9hcHBlbmQgY2FudmFzIGVsZW1lbnRcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24ucHVzaChwb3NpdGlvbik7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcblx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIHBvc2l0aW9uKTtcblx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1twb3NpdGlvbl0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgcG9zaXRpb24gKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgaW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK2luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XG5cdFx0XHRcdFxuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUubW92ZUluVGltZWxpbmUgPSBmdW5jdGlvbiAob2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xuXHRcdFx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0XHRUb25lVHJhY2tGY3QucmVwbGFjZVRpbWVsaW5lTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpLnRoZW4ocmVzb2x2ZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblxuXG5cdFx0XHRzY29wZS5hcHBlYXJPckRpc2FwcGVhciA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgdHJhY2tJbmRleCA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLmluZGV4T2Yoc2NvcGUudHJhY2spO1xuXHRcdFx0XHR2YXIgbG9vcEluZGV4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbik7XG5cblx0XHRcdFx0aWYoc2NvcGUudHJhY2sub25UaW1lbGluZSkge1xuXHRcdFx0XHRcdGlmKGxvb3BJbmRleCA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnB1c2gocG9zaXRpb24pO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xuXHRcdFx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIHBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdC8vIGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK3RyYWNrSW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XG5cdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XG5cdFx0XHRcdFx0XHQvL3JlbW92ZSBmcm9tIGxvY2F0aW9ucyBhcnJheVxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc3BsaWNlKGxvb3BJbmRleCwgMSk7XG5cdFx0XHRcdFx0XHQvL3JlbW92ZSB0aW1lbGluZUlkXG5cdFx0XHRcdFx0XHRUb25lVHJhY2tGY3QuZGVsZXRlVGltZWxpbmVMb29wKCBjYW52YXMuYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlICk7XG5cdFx0XHRcdFx0XHQvL3JlbW92ZSBjYW52YXMgaXRlbVxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24gcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XG5cdFx0XHRcdFx0XHQgICAgZWxlbWVudCAmJiBlbGVtZW50LnBhcmVudE5vZGUgJiYgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmVtb3ZlRWxlbWVudCggY2FudmFzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdOTyBEUk9QJyk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdHNjb3BlLnJlUmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XG5cdFx0XHRcdC8vY2hhbmdlIGFsbCBwYXJhbXMgYmFjayBhcyBpZiBlbXB0eSB0cmFja1xuXHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IHRydWU7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gbnVsbDtcblx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IG51bGw7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IG51bGw7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcblx0XHRcdFx0Ly9kaXNwb3NlIG9mIGVmZmVjdHNSYWNrXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrLmZvckVhY2goZnVuY3Rpb24gKGVmZmVjdCkge1xuXHRcdFx0XHRcdGVmZmVjdC5kaXNwb3NlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzY29wZS50cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwwLDAsMF0pO1xuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbiA9IFtdO1xuXHRcdFx0XHQvL3JlbW92ZSBhbGwgbG9vcHMgZnJvbSBVSVxuXHRcdFx0XHR2YXIgbG9vcHNVSSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3RyYWNrTG9vcCcraW5kZXgudG9TdHJpbmcoKSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiTE9PUFNcIiwgbG9vcHNVSSk7XG5cdFx0XHRcdHdoaWxlKGxvb3BzVUkubGVuZ3RoICE9PSAwKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0xPT1BTIEFSUicsIGxvb3BzVUkpO1xuXHRcdFx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBsb29wc1VJLmxlbmd0aDtpKyspIHtcblx0XHRcdFx0XHRcdGxvb3BzVUlbaV0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChsb29wc1VJW2ldKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bG9vcHNVSSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3RyYWNrTG9vcCcraW5kZXgudG9TdHJpbmcoKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc3RvcCgpO1xuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUuc29sbyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dmFyIG90aGVyVHJhY2tzID0gc2NvcGUuJHBhcmVudC50cmFja3MubWFwKGZ1bmN0aW9uICh0cmFjaykge1xuXHRcdFx0XHRcdGlmKHRyYWNrICE9PSBzY29wZS50cmFjaykge1xuXHRcdFx0XHRcdFx0dHJhY2suc2lsZW5jZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJhY2s7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KS5maWx0ZXIoZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRcdFx0aWYodHJhY2sgJiYgdHJhY2sucGxheWVyKSByZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKG90aGVyVHJhY2tzKTtcblx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcblx0XHRcdH07XG5cblx0XHRcdHNjb3BlLnNpbGVuY2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmKCFzY29wZS50cmFjay5zaWxlbmNlKSB7XG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IC0xMDA7XG5cdFx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcblx0XHRcdFx0dmFyIHJlY29yZGVyID0gJHJvb3RTY29wZS5yZWNvcmRlcjtcblxuXHRcdFx0XHR2YXIgY29udGludWVVcGRhdGUgPSB0cnVlO1xuXG5cdFx0XHRcdC8vYW5hbHlzZXIgc3R1ZmZcblx0XHQgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFuYWx5c2VyXCIraW5kZXgpO1xuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9ICRyb290U2NvcGUuYW5hbHlzZXJOb2RlO1xuXHRcdFx0XHR2YXIgYW5hbHlzZXJJZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcblx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RhcnQocmVjb3JkZXIpO1xuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XG5cdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gdHJ1ZTtcblxuXG5cdFx0XHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRcdFx0XHR2YXIgU1BBQ0lORyA9IDM7XG5cdFx0XHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XG5cdFx0XHRcdFx0dmFyIG51bUJhcnMgPSBNYXRoLnJvdW5kKDMwMCAvIFNQQUNJTkcpO1xuXHRcdFx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xuXG5cdFx0XHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxuXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1Jztcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XG5cdFx0XHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xuXG5cdFx0XHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZSA9IDA7XG5cdFx0XHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcblx0XHRcdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGo8IG11bHRpcGxpZXI7IGorKylcblx0XHRcdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xuXHRcdFx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUyID0gZnJlcUJ5dGVEYXRhW2kgKiBtdWx0aXBsaWVyXTtcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBlbmRSZWNvcmRpbmcocG9zaXRpb24pIHtcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlcikudGhlbihmdW5jdGlvbiAocGxheWVyKSB7XG5cdFx0XHRcdFx0XHQvL3RyYWNrIHZhcmlhYmxlc1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucmVjb3JkaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlO1xuXG5cdFx0XHRcdFx0XHQvL2NyZWF0ZSBwbGF5ZXJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllciA9IHBsYXllcjtcblx0XHRcdFx0XHRcdHBsYXllci5jb25uZWN0KHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcblxuXHRcdFx0XHRcdFx0Ly9zdG9wIGFuYWx5c2VyXG5cdFx0XHRcdFx0XHRjb250aW51ZVVwZGF0ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XG5cblx0XHRcdFx0XHRcdC8vc2V0IFByb2plY3QgdmFyc1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RvcCgpO1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jdXJyZW50bHlSZWNvcmRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdC8vIHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xuXHRcdFx0XHRcdFx0Ly8gVG9uZVRpbWVsaW5lRmN0LnVuTXV0ZUFsbChzY29wZS4kcGFyZW50LnRyYWNrcyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZihUb25lLlRyYW5zcG9ydC5zdGF0ZSA9PT0gXCJzdG9wcGVkXCIpIHtcblx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9IFwiLTE6MDowXCI7XG5cdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jb3VudE51bWJlciA9IDA7XG5cdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jb3VudEluID0gdHJ1ZTtcblx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xuXHRcdFx0XHRcdHZhciBpbmNDb3VudCA9IFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuY291bnROdW1iZXIgPSBzY29wZS4kcGFyZW50LmNvdW50TnVtYmVyICsgMTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuJGRpZ2VzdCgpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSwgXCI0blwiKTtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRpbmdJRCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuY291bnRJbiA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coc2NvcGUuJHBhcmVudC5jb3VudEluKTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuJGRpZ2VzdCgpO1xuXHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJJbnRlcnZhbChpbmNDb3VudCk7XG5cdFx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlciwgaW5kZXgpO1xuXHRcdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlciwgaW5kZXgpO1xuXHRcdFx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZW5kUmVjb3JkaW5nKDApO1xuXHRcdFx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocmVjb3JkaW5nSUQpO1xuXG5cdFx0XHRcdFx0XHRcdH0sIDIwMDApO1xuXHRcdFx0XHRcdFx0fSwgNTApO1xuXHRcdFx0XHRcdH0sIFwiMG1cIik7XG5cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgbmV4dEJhciA9IHBhcnNlSW50KFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF0pICsgMTtcblx0XHRcdFx0XHR2YXIgZW5kQmFyID0gbmV4dEJhciArIDE7XG5cblx0XHRcdFx0XHR2YXIgcmVjSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XG5cdFx0XHRcdFx0XHR9LCA1MCk7XG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xuXG5cblx0XHRcdFx0XHR2YXIgcmVjRW5kSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHJlY0lkKTtcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocmVjRW5kSWQpO1xuXHRcdFx0XHRcdFx0ZW5kUmVjb3JkaW5nKG5leHRCYXIpO1xuXG5cdFx0XHRcdFx0fSwgZW5kQmFyLnRvU3RyaW5nKCkgKyBcIm1cIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblxuXHRcdFx0c2NvcGUucHJldmlldyA9IGZ1bmN0aW9uKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcblx0XHRcdFx0dmFyIG5leHRCYXI7XG5cdFx0XHRcdGlmKCFzY29wZS4kcGFyZW50LnByZXZpZXdpbmdJZCkge1xuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSB0cnVlO1xuXG5cdFx0XHRcdFx0aWYoVG9uZS5UcmFuc3BvcnQuc3RhdGUgPT09IFwic3RvcHBlZFwiKSB7XG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSk7XG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR2YXIgcGxheUxhdW5jaCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHRcdFx0XHR2YXIgcHJldmlld0ludGV2YWwgPSBUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdGFydCgpO1xuXHRcdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBsYXlMYXVuY2gpO1xuXHRcdFx0XHRcdFx0fSwgXCIxbVwiKTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQucHJldmlld2luZ0lkID0gcHJldmlld0ludGV2YWw7XG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdBTFJFQURZIFBSRVZJRVdJTkcnKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVmZmVjdCk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGFtb3VudCk7XG5cblx0XHRcdFx0ZWZmZWN0LndldC52YWx1ZSA9IGFtb3VudCAvIDEwMDA7XG5cdFx0XHR9O1xuXG5cdFx0fVxuXHRcdFxuXG5cdH07XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=