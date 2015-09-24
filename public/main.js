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
		$rootScope.recorder = retArr[0];
		$rootScope.analyserNode = retArr[1];
	})['catch'](function (e) {
		alert('Error getting audio');
		console.log(e);
	});

	// $stateChangeStart is an event fired
	// whenever the process of changing a state begins.
	$rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
		Tone.Transport.clearTimelines();
		Tone.Transport.clearIntervals();
		Tone.Transport.stop();

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
	// window.onunload = function () {
	// 	Tone.Transport.clearTimelines();
	// }
	$('.timeline-container').scroll(function () {
		$('.trackMainSection').css({
			'left': $(this).scrollLeft()
		});
	});

	var maxMeasure = 0;

	// number of measures on the timeline
	$scope.numMeasures = _.range(0, 60);

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
		console.log('PROJECT', JSON.stringify(project));
		var loaded = 0;
		$scope.projectName = project.name;
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
							finishLoading();
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
			finishLoading();
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
		startLoading();
		RecorderFct.sendToAWS($scope.tracks, $scope.projectId, $scope.projectName).then(function (response) {
			// wave logic
			finishLoading();

			console.log('response from sendToAWS', response);
		});
	};

	$scope.isLoggedIn = function () {
		return AuthService.isAuthenticated();
	};

	function startLoading() {
		$scope.loading = true;
	}
	function finishLoading() {
		$scope.loading = false;
	}
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
				// console.log('storeData',storeData);
				tracksArray.forEach(function (track, i) {
					if (storeData[i]) {
						track.rawAudio = storeData[i];
					}
				});
				console.log('BEFORE SAVE', tracksArray);
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

		if (!arr.length) arr = [0, 0, 0, 0];

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
			//saveValue initiated
			chorus.saveValue = arr[0];
			phaser.saveValue = arr[1];
			distort.saveValue = arr[2];
			pingpong.saveValue = arr[3];
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
'use strict';
app.directive('fullstackLogo', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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
			// console.log("TRCK", scope.track);
			// TODO: not sure what this is
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
				effect.wet.value = amount / 1000;
				effect.saveValue = amount / 1000;
			};
		}

	};
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZvcmt3ZWIvZm9ya3dlYi5qcyIsImhvbWUvaG9tZS5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9MYW5kaW5nUGFnZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTmV3UHJvamVjdENvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVGltZWxpbmVDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1VzZXJDb250cm9sbGVyLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9BbmFseXNlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRm9ya0ZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0hvbWVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1Byb2plY3RGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9sb2FkaW5nLWdpZi9sb2FkaW5nLWdpZi5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSx1QkFBQSxFQUFBO0FBQ0Esd0JBQUEsQ0FBQSxRQUFBLEdBQUEsa0NBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxHQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBOzs7QUFHQSxLQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtFQUNBLENBQUE7OztBQUlBLFlBQUEsQ0FBQSxZQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxZQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxTQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7OztBQUlBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSw0QkFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBOzs7QUFHQSxVQUFBO0dBQ0E7O0FBRUEsTUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBLFVBQUE7R0FDQTs7O0FBR0EsT0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxPQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLE1BQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3BFQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsVUFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtBQUNBLFlBQUEsRUFBQSxtQkFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLE9BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsT0FBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsS0FBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTtBQUNBLFVBQUEsSUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsT0FBQSxDQUFBOztBQUVBLE1BQUEsS0FBQSxHQUFBLEdBQUE7TUFBQSxNQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLE1BQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLEdBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsQ0FDQSxNQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxLQUFBLEdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FDQSxNQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FDQSxZQUFBLENBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLENBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxLQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxZQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7O0FBR0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFBQSxJQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7R0FBQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7OztBQUdBLE1BQUEsRUFBQSxHQUFBLENBQUE7TUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLEtBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUFBO0FBQ0EsSUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLENBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0dBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUNBLEtBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQTtHQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLElBQUEsR0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FDQSxLQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7R0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FDQSxLQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsVUFBQSxNQUFBLENBQUE7R0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxFQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxHQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsQ0FBQTtJQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtJQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsV0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDeEhBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxPQUFBO0FBQ0EsYUFBQSxFQUFBLG1CQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxzQkFBQTtBQUNBLFlBQUEsRUFBQSx1QkFBQTtBQUNBLFNBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEseUJBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7RUFDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDcEJBLENBQUEsWUFBQTs7QUFFQSxhQUFBLENBQUE7OztBQUdBLEtBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsd0JBQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxJQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLGVBQUEsRUFBQSxxQkFBQTtBQUNBLGdCQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLHdCQUFBO0FBQ0EsZUFBQSxFQUFBLHFCQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUE7QUFDQSxNQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0dBQ0EsQ0FBQTtBQUNBLFNBQUE7QUFDQSxnQkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLENBQUEsQ0FDQSxXQUFBLEVBQ0EsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBOzs7Ozs7QUFNQSxPQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7SUFDQTs7Ozs7QUFLQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUVBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsV0FBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLE9BQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLEVBQUEsQ0FBQTtBQ3hJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFFBQUE7QUFDQSxhQUFBLEVBQUEscUJBQUE7QUFDQSxZQUFBLEVBQUEsV0FBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxxQkFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtFQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxRQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLEtBQUEsUUFBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxNQUFBLFFBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxjQUFBLEdBQUEsWUFBQTtBQUNBLFNBQUEsbUVBQUEsQ0FBQTtFQUNBLENBQUE7Ozs7QUFJQSxFQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxZQUFBO0FBQ0EsR0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxTQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLFVBQUEsRUFBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFJQSxLQUFBLFVBQUEsR0FBQSxDQUFBLENBQUE7OztBQUdBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsR0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxXQUFBLEdBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLG9CQUFBLEVBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTs7QUFFQSxTQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTs7QUFFQSxZQUFBLEVBQUEsQ0FBQTs7QUFFQSxVQUFBLE1BQUEsS0FBQSxjQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7T0FDQTtNQUNBLENBQUE7O0FBRUEsU0FBQSxHQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsTUFBQSxHQUFBLFlBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxXQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLENBQUEsQ0FBQSxDQUNBLEtBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxHQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSwyQkFBQSxHQUFBLENBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLENBQUE7T0FDQSxDQUFBLENBQUE7OztBQUdBLFdBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO01BQ0EsTUFBQTtBQUNBLFdBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO01BQ0E7QUFDQSxXQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtLQUNBLE1BQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtLQUNBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsTUFBQTtBQUNBLFNBQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBO0FBQ0EsZ0JBQUEsRUFBQSxDQUFBO0dBQ0E7Ozs7QUFJQSxRQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsVUFBQSxHQUFBLEVBQUEsRUFBQSxVQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0E7O0FBSUEsaUJBQUEsQ0FBQSxlQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxNQUFBLFVBQUEsR0FBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsUUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxHQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxZQUFBLEdBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxNQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxDQUFBLGNBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxHQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxpQkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE1BQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxpQkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsUUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLE1BQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxNQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQSxFQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLHNCQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxjQUFBLENBQUEsa0JBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxLQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLEtBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0dBRUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsRUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxnQkFBQSxFQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxTQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsVUFBQSxZQUFBLEdBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtFQUNBO0FBQ0EsVUFBQSxhQUFBLEdBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtFQUNBO0NBQ0EsQ0FBQSxDQUFBOztBQzVQQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFNBQUE7QUFDQSxhQUFBLEVBQUEsdUJBQUE7QUFDQSxZQUFBLEVBQUEsWUFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEscUJBQUE7QUFDQSxhQUFBLEVBQUEsMEJBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7OztBQUdBLE1BQUEsRUFBQTtBQUNBLGVBQUEsRUFBQSxJQUFBO0dBQ0E7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHdCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsT0FBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEscUJBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxXQUFBO0FBQ0EsYUFBQSxFQUFBLHVCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx1QkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFlBQUE7QUFDQSxhQUFBLEVBQUEsd0JBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHVCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSx3QkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNqQ0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsS0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLG9CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsUUFBQSxDQUFBLFdBQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsV0FBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFNBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsY0FBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxHQUFBLENBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsQ0FDQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxFQUFBLElBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQTtBQUNBLFlBQUEsRUFBQSwwQ0FBQTtJQUNBLENBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsa0JBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsS0FBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtHQUNBOztBQUVBLGNBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLEtBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7SUFDQSxNQUNBO0FBQ0EsUUFBQSxHQUFBLEtBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFHQSxPQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsSUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxFQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQUtBLENBQUEsQ0FBQTtBQ3pGQSxHQUFBLENBQUEsVUFBQSxDQUFBLHVCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsU0FBQSxDQUFBLG9CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxNQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLFNBQUEsR0FBQSxZQUFBO0FBQ0EsV0FBQSxjQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsT0FBQSxRQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUE7O0FBRUEsT0FBQSxVQUFBLEdBQUEsUUFBQSxDQUFBLGVBQUEsQ0FBQSxZQUFBLEdBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLFVBQUEsR0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtHQUNBOztBQUVBLGdCQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUlBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMvQ0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxzQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDWkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxvQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBOztBQUVBLEtBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtFQUNBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFHQSxXQUFBLENBQUEsY0FBQSxDQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsTUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7O01BRUE7S0FDQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7O0FBRUEsaUJBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBOzs7Ozs7OztBQVFBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLEdBQUEsR0FBQSxDQUFBLENBQUEsU0FBQSxDQUFBOzs7QUFHQSxTQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsYUFBQSxFQUNBLE9BQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLElBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTs7SUFHQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0dBRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsTUFBQSxTQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsT0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxJQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxFQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0dBRUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQU1BLENBQUEsQ0FBQTs7QUN0R0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLE1BQUEsR0FBQSxDQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLENBQ0EsQ0FBQTs7QUFFQSxTQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsYUFBQSxHQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxHQUFBLHdFQUFBLENBQUE7SUFDQTs7QUFFQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0E7SUFDQTtHQUdBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7Ozs7OztBQVNBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSw0QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQUdBLENBQUEsQ0FBQTtBQ3pEQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLFdBQUEsTUFBQSxHQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsT0FBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFDQSxTQUFBLElBQUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7SUFDQTtBQUNBLE9BQUEsY0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBO0FBQ0EsUUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUdBLEtBQUEscUJBQUEsR0FBQSxTQUFBLHFCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsUUFBQTtBQUNBLGlCQUFBLEVBQUEsZUFBQTtBQUNBLHVCQUFBLEVBQUEscUJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDNUNBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLEtBQUEsTUFBQSxHQUFBLFNBQUEsTUFBQSxHQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsUUFBQTtBQUNBLFFBQUEsRUFBQSxNQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFFBQUE7QUFDQSxTQUFBLEVBQUEsaUJBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDYkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsS0FBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsU0FBQSxFQUFBOzs7QUFHQSxNQUFBLFNBQUEsR0FBQSxTQUFBLElBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGdCQUFBLEdBQUEsU0FBQSxJQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxVQUFBLENBQUEsZ0JBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLHlCQUFBLEVBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUdBLFFBQUE7QUFDQSxnQkFBQSxFQUFBLGNBQUE7QUFDQSxhQUFBLEVBQUEsV0FBQTtBQUNBLFlBQUEsRUFBQSxVQUFBO0FBQ0EsZUFBQSxFQUFBLGFBQUE7QUFDQSxZQUFBLEVBQUEsVUFBQTtBQUNBLGVBQUEsRUFBQSxhQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNuREEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLEtBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxHQUFBOztBQUVBLFNBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLElBQUEsTUFBQSxDQUFBLGtCQUFBLENBQUE7QUFDQSxPQUFBLFlBQUEsR0FBQSxJQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxRQUFBLENBQUE7O0FBRUEsT0FBQSxTQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxZQUFBLEdBQ0EsU0FBQSxDQUFBLFlBQUEsSUFDQSxTQUFBLENBQUEsa0JBQUEsSUFDQSxTQUFBLENBQUEsZUFBQSxJQUNBLFNBQUEsQ0FBQSxjQUFBLEFBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsRUFDQSxTQUFBLENBQUEsb0JBQUEsR0FBQSxTQUFBLENBQUEsMEJBQUEsSUFBQSxTQUFBLENBQUEsdUJBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEscUJBQUEsRUFDQSxTQUFBLENBQUEscUJBQUEsR0FBQSxTQUFBLENBQUEsMkJBQUEsSUFBQSxTQUFBLENBQUEsd0JBQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFlBQUEsQ0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSw0QkFBQSxFQUFBLE9BQUE7QUFDQSwyQkFBQSxFQUFBLE9BQUE7QUFDQSw0QkFBQSxFQUFBLE9BQUE7QUFDQSwwQkFBQSxFQUFBLE9BQUE7TUFDQTtBQUNBLGVBQUEsRUFBQSxFQUFBO0tBQ0E7SUFDQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBOzs7QUFHQSxRQUFBLGNBQUEsR0FBQSxZQUFBLENBQUEsdUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7OztBQUdBLFFBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7OztBQUdBLFlBQUEsR0FBQSxJQUFBLFFBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUEsQ0FBQTtJQUVBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxRQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsWUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxvQkFBQSxHQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7Ozs7QUFJQSxZQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsaUJBQUEsQ0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxrQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFJQSxLQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxNQUFBLEdBQUEsSUFBQSxVQUFBLEVBQUEsQ0FBQTs7QUFFQSxPQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtJQUNBLE1BQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBS0EsUUFBQTtBQUNBLFdBQUEsRUFBQSxtQkFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxPQUFBLFlBQUEsR0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLGVBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxRQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSw4QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBRUE7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSxXQUFBO0FBQ0EsWUFBQSxFQUFBLFVBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDM0lBLFlBQUEsQ0FBQTs7QUNBQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLE9BQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsTUFBQSxDQUFBLE1BQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxNQUFBO0FBQ0EsT0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO01BRUE7QUFDQSxjQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLE9BQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsR0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxxQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUErQkEsUUFBQTtBQUNBLGlCQUFBLEVBQUEsZUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBOztBQUVBLGlCQUFBLEVBQUEsZUFBQTtBQUNBLFNBQUEsRUFBQSxPQUFBO0FBQ0EsU0FBQSxFQUFBLE9BQUE7QUFDQSxXQUFBLEVBQUEsU0FBQTtFQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDeEdBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxLQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsTUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7OztBQUdBLFNBQUEsTUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsR0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsSUFBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsZUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsUUFBQSxJQUFBLFFBQUEsR0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLGVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsa0JBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLE1BQUEsQ0FBQTs7QUFFQSxTQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxpQkFBQSxHQUFBLFNBQUEsaUJBQUEsQ0FBQSxHQUFBLEVBQUE7O0FBRUEsTUFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxNQUFBLE9BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsYUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxXQUFBLENBQUE7O0FBRUEsTUFBQSxHQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxTQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0E7O0FBRUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOzs7O0FBSUEsU0FBQSxDQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0EsRUFBQSxPQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsbUJBQUEsR0FBQSxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLFFBQUE7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsaUJBQUE7QUFDQSw4QkFBQSxFQUFBLDRCQUFBO0FBQ0EscUJBQUEsRUFBQSxtQkFBQTtBQUNBLG9CQUFBLEVBQUEsa0JBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQzdGQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUE7QUFDQSxZQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFFBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSw2QkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFVBQUEsRUFBQSxrQkFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLGNBQUEsRUFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ3hCQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLE1BQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxhQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsSUFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsR0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsS0FBQSxDQUFBO0dBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxJQUFBLENBQUEsZ0JBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsS0FBQSxDQUFBO0dBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtFQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxPQUFBLEVBQUE7QUFDQSxPQUFBLEVBQUEsR0FBQTtBQUFBLEdBQ0E7QUFDQSxNQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLE9BQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxLQUFBLENBQUEsWUFBQSxDQUFBLFVBQUEsR0FBQSxNQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxLQUFBLENBQUE7SUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxLQUFBLENBQUE7SUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxLQUFBLENBQUE7SUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOzs7QUFHQSxRQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLEtBQUEsRUFBQSxVQUFBLENBQUE7OztBQUdBLFFBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsV0FBQSxDQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBO0FBQ0EsUUFBQSxhQUFBLENBQUE7QUFDQSxRQUFBLFNBQUEsQ0FBQTs7OztBQUlBLFdBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxRQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFVBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFNBQUEsS0FBQSxZQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7O0FBRUEsV0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUE7O0FBRUEsWUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7O0FBRUEsWUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsUUFBQSxLQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0Esc0JBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLGFBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FFQTtRQUNBO09BQ0E7TUFDQTs7QUFFQSxZQUFBLENBQUEsR0FBQSxDQUFBLGVBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxHQUFBLGFBQUEsQ0FBQTtNQUNBLENBQUEsQ0FBQTtLQUVBOzs7QUFHQSxTQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUN2SUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsa0RBQUE7QUFDQSxZQUFBLEVBQUEsMkJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsMkJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsS0FBQSx1QkFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0lBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFFBQUEsWUFBQSxDQUFBLEtBQUEsS0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO0lBQ0E7O0dBR0EsQ0FBQSxDQUFBO0FBSEEsRUFJQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLE9BQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsUUFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7SUFDQTtHQUNBO0FBQ0EsYUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTtDQUdBLENBQUEsQ0FBQTtBQ2pEQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLHlEQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ05BLEdBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsK0NBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTEEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLE9BQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLHlDQUFBO0FBQ0EsTUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLE9BQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxHQUFBO0FBQ0EsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsR0FBQSxDQUNBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQSw4QkFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsQ0FDQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBO0FBQ0EsWUFBQSxFQUFBLENBQUE7Ozs7Ozs7O0FBUUEsUUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsV0FBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLE9BQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxPQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsYUFBQSxHQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBRUEsQ0FBQTs7QUFFQSxVQUFBLEVBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7R0FFQTs7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDckVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsa0JBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLG9EQUFBO0FBQ0EsWUFBQSxFQUFBLDRCQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLDRCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFJQSxZQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsR0FBQSxLQUFBLFlBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEVBQUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLGFBQUEsRUFBQSxJQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUE7QUFDQSxZQUFBLEVBQUEsMENBQUE7SUFDQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxPQUFBLENBQUEsR0FBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxLQUFBLE9BQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxTQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGVBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxhQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsZ0JBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxhQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTtFQUdBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzlEQSxHQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLHVDQUFBO0FBQ0EsTUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7OztBQUdBLFFBQUEsQ0FBQSxlQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxHQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSwyQkFBQSxHQUFBLFVBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBOztBQUVBLFlBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsY0FBQSxFQUFBLENBQUE7TUFDQTtLQUNBOzs7QUFHQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLGlEQUFBLEdBQUEsUUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLGtCQUFBLEdBQUEsS0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsMkJBQUEsR0FBQSxLQUFBLEdBQUEsaURBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSwwQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTtJQUVBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxXQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFHQSxRQUFBLENBQUEsaUJBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxTQUFBLFNBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxVQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxRQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsR0FBQSwyQkFBQSxHQUFBLFVBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0EsTUFBQTs7O1VBT0EsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGNBQUEsSUFBQSxPQUFBLENBQUEsVUFBQSxJQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO09BQ0E7O0FBUkEsVUFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsa0JBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUtBLG1CQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7TUFDQTtLQUNBLE1BQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsUUFBQSxPQUFBLEdBQUEsUUFBQSxDQUFBLHNCQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxNQUFBLEtBQUEsQ0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0E7QUFDQSxZQUFBLEdBQUEsUUFBQSxDQUFBLHNCQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0E7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLEtBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxJQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE9BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLFFBQUEsR0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBOztBQUVBLFFBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQTs7O0FBR0EsUUFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLGVBQUEsR0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxZQUFBLEdBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxDQUFBLGtCQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLGFBQUEsTUFBQSxHQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLFNBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLEdBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFVBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO01BQ0E7QUFDQSxTQUFBLGNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO01BQ0E7S0FDQTs7QUFFQSxhQUFBLFlBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsUUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsTUFBQSxFQUFBOztBQUVBLFdBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxlQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsb0JBQUEsQ0FBQTs7O0FBR0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOzs7QUFHQSxvQkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxXQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxLQUFBLENBQUE7OztNQUdBLENBQUEsQ0FBQTtLQUNBOztBQUVBLFFBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEdBQUEsUUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLFdBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO01BRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLFdBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esb0JBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO1FBRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtPQUNBLEVBQUEsRUFBQSxDQUFBLENBQUE7TUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBRUEsTUFBQTtBQUNBLFNBQUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsR0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7T0FDQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO01BQ0EsRUFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBR0EsU0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO01BRUEsRUFBQSxNQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7O0FBR0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxVQUFBLG1CQUFBLEVBQUE7QUFDQSxRQUFBLE9BQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxTQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO01BQ0EsTUFBQTtBQUNBLGFBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO01BQ0E7QUFDQSxTQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLGNBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO09BQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxHQUFBLGNBQUEsQ0FBQTtNQUNBLEVBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtJQUNBLENBQUE7R0FFQTs7RUFHQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICduZ1N0b3JhZ2UnLCAnbmdNYXRlcmlhbCcsICduZ0tub2InLCAncGxhbmd1bGFyJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uKHBsYW5ndWxhckNvbmZpZ1Byb3ZpZGVyKXtcbiAgICBwbGFuZ3VsYXJDb25maWdQcm92aWRlci5jbGllbnRJZCA9ICc0NWM1ZTYyMTJhYzU4YzczZTdkMDVmODYzNmE5YmYyMic7XG59KTtcblxuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgUmVjb3JkZXJGY3QpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuXG4gICAgLy9Jbml0aWFsaXplIHJlY29yZGVyIG9uIHByb2plY3QgbG9hZFxuICAgIFJlY29yZGVyRmN0LnJlY29yZGVySW5pdCgpLnRoZW4oZnVuY3Rpb24gKHJldEFycikge1xuICAgICAgICAkcm9vdFNjb3BlLnJlY29yZGVyID0gcmV0QXJyWzBdO1xuICAgICAgICAkcm9vdFNjb3BlLmFuYWx5c2VyTm9kZSA9IHJldEFyclsxXTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSl7XG4gICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pO1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG4gICAgICAgIFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmVzKCk7XG4gICAgICAgIFRvbmUuVHJhbnNwb3J0LmNsZWFySW50ZXJ2YWxzKCk7XG4gICAgICAgIFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3Jrd2ViJywge1xuICAgICAgICB1cmw6ICcvZm9ya3dlYicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ya3dlYi9mb3Jrd2ViLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiBcIkZvcmtXZWJDb250cm9sbGVyXCJcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb3JrV2ViQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlLCBGb3JrRmFjdG9yeSl7XG5cblx0Rm9ya0ZhY3RvcnkuZ2V0V2ViKCkudGhlbihmdW5jdGlvbih3ZWJzKXtcblx0XHQkc2NvcGUubm9kZXMgPSBbXTtcbiAgICBcdHZhciBsaW5rQXJyID0gW107XG4gICAgICAgIHdlYnMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcbiAgICAgICAgXHR2YXIgYXJyID0gW107XG4gICAgICAgIFx0YXJyLnB1c2gobm9kZSk7XG4gICAgICAgIFx0dmFyIG5ld2FyciA9IGFyci5jb25jYXQobm9kZS5icmFuY2gpO1xuICAgICAgICBcdCRzY29wZS5ub2Rlcy5wdXNoKG5ld2Fycik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwibmV0d29ya1wiLCAkc2NvcGUubm9kZXMpO1xuXHRcdHZhciB0ZXN0QSA9IFtdO1xuXHRcdHZhciBjb3VudGVyID0gMDtcblx0XHQkc2NvcGUubm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlQXJyKXtcblx0XHRcdGZvciAodmFyIGogPSAxOyBqIDwgbm9kZUFyci5sZW5ndGg7IGorKykge1xuICAgICAgICBcdFx0dmFyIGFMaW5rID0ge1xuICAgICAgICBcdFx0XHQnc291cmNlJzogY291bnRlcixcbiAgICAgICAgXHRcdFx0J3RhcmdldCc6IGogKyBjb3VudGVyLFxuICAgICAgICBcdFx0XHQnd2VpZ2h0JzogM1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdFx0bGlua0Fyci5wdXNoKGFMaW5rKTtcbiAgICAgICAgXHR9O1xuICAgIFx0XHRjb3VudGVyICs9IChub2RlQXJyLmxlbmd0aCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgbm9kZUFyciA9IFtdO1xuXHRcdG5vZGVBcnIgPSBub2RlQXJyLmNvbmNhdC5hcHBseShub2RlQXJyLCAkc2NvcGUubm9kZXMpO1xuXHRcdGNvbnNvbGUubG9nKFwiUExFQVNFXCIsIGxpbmtBcnIsIG5vZGVBcnIpO1xuXHRcdHZhciBub2RlcyA9IG5vZGVBcnI7XG5cdFx0dmFyIGxpbmtzID0gbGlua0FycjtcblxuXHRcdCAgdmFyIHdpZHRoID0gOTYwLCBoZWlnaHQgPSA1MDA7XG5cblx0XHQgIHZhciBjb2xvciA9IGQzLnNjYWxlLmNhdGVnb3J5MjAoKTtcblxuXHRcdCAgdmFyIGZpc2hleWUgPSBkMy5maXNoZXllLmNpcmN1bGFyKClcblx0XHQgICAgICAucmFkaXVzKDEyMCk7XG5cblx0XHQgIHZhciBmb3JjZSA9IGQzLmxheW91dC5mb3JjZSgpXG5cdFx0ICAgICAgLmNoYXJnZSgtMjQwKVxuXHRcdCAgICAgIC5saW5rRGlzdGFuY2UoNDApXG5cdFx0ICAgICAgLnNpemUoW3dpZHRoLCBoZWlnaHRdKTtcblxuXHRcdCAgdmFyIHN2ZyA9IGQzLnNlbGVjdChcIiN1aVwiKS5hcHBlbmQoXCJzdmdcIilcblx0XHQgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHRcdCAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XG5cblx0XHQgIHN2Zy5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0ICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImJhY2tncm91bmRcIilcblx0XHQgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHRcdCAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XG5cblx0XHQgICAgdmFyIG4gPSBub2Rlcy5sZW5ndGg7XG5cblx0XHQgICAgZm9yY2Uubm9kZXMobm9kZXMpLmxpbmtzKGxpbmtzKTtcblxuXHRcdCAgICAvLyBJbml0aWFsaXplIHRoZSBwb3NpdGlvbnMgZGV0ZXJtaW5pc3RpY2FsbHksIGZvciBiZXR0ZXIgcmVzdWx0cy5cblx0XHQgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkLCBpKSB7IGQueCA9IGQueSA9IHdpZHRoIC8gbiAqIGk7IH0pO1xuXG5cdFx0ICAgIC8vIFJ1biB0aGUgbGF5b3V0IGEgZml4ZWQgbnVtYmVyIG9mIHRpbWVzLlxuXHRcdCAgICAvLyBUaGUgaWRlYWwgbnVtYmVyIG9mIHRpbWVzIHNjYWxlcyB3aXRoIGdyYXBoIGNvbXBsZXhpdHkuXG5cdFx0ICAgIC8vIE9mIGNvdXJzZSwgZG9uJ3QgcnVuIHRvbyBsb25n4oCUeW91J2xsIGhhbmcgdGhlIHBhZ2UhXG5cdFx0ICAgIGZvcmNlLnN0YXJ0KCk7XG5cdFx0ICAgIGZvciAodmFyIGkgPSBuOyBpID4gMDsgLS1pKSBmb3JjZS50aWNrKCk7XG5cdFx0ICAgIGZvcmNlLnN0b3AoKTtcblxuXHRcdCAgICAvLyBDZW50ZXIgdGhlIG5vZGVzIGluIHRoZSBtaWRkbGUuIFxuXHRcdCAgICB2YXIgb3ggPSAwLCBveSA9IDA7XG5cdFx0ICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBveCArPSBkLngsIG95ICs9IGQueTsgfSk7XG5cdFx0ICAgIG94ID0gb3ggLyBuIC0gd2lkdGggLyAyLCBveSA9IG95IC8gbiAtIGhlaWdodCAvIDI7XG5cdFx0ICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkLnggLT0gb3gsIGQueSAtPSBveTsgfSk7XG5cblx0XHQgICAgdmFyIGxpbmsgPSBzdmcuc2VsZWN0QWxsKFwiLmxpbmtcIilcblx0XHQgICAgICAgIC5kYXRhKGxpbmtzKVxuXHRcdCAgICAgIC5lbnRlcigpLmFwcGVuZChcImxpbmVcIilcblx0XHQgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG5cdFx0ICAgICAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLng7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLnk7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0Lng7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInkyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0Lnk7IH0pXG5cdFx0ICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gMjsgfSk7XG5cblx0XHQgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiLm5vZGVcIilcblx0XHQgICAgICAgIC5kYXRhKG5vZGVzKVxuXHRcdCAgICAgIC5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuXHRcdCAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcblx0XHQgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54OyB9KVxuXHRcdCAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnk7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInJcIiwgNC41KVxuXHRcdCAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcImJsdWVcIjsgfSlcblx0XHQgICAgICAgIC5jYWxsKGZvcmNlLmRyYWcpO1xuXG5cdFx0ICAgIHN2Zy5vbihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbigpIHtcblx0XHQgICAgICBmaXNoZXllLmZvY3VzKGQzLm1vdXNlKHRoaXMpKTtcblxuXHRcdCAgICAgIG5vZGUuZWFjaChmdW5jdGlvbihkKSB7IGQuZmlzaGV5ZSA9IGZpc2hleWUoZCk7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5maXNoZXllLng7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5maXNoZXllLnk7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmZpc2hleWUueiAqIDQuNTsgfSk7XG5cblx0XHQgICAgICBsaW5rLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnNvdXJjZS5maXNoZXllLng7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zb3VyY2UuZmlzaGV5ZS55OyB9KVxuXHRcdCAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0LmZpc2hleWUueDsgfSlcblx0XHQgICAgICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5maXNoZXllLnk7IH0pO1xuXHRcdCAgICB9KTtcblx0XHRcblx0fSk7XG5cdFxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9nZ2VkSW5Ib21lJywge1xuICAgICAgICB1cmw6ICcvaG9tZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcidcbiAgICB9KVxuXHQuc3RhdGUoJ2hvbWUnLHtcblx0XHR1cmw6ICcvJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbGFuZGluZy5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnTGFuZGluZ1BhZ2VDb250cm9sbGVyJyxcblx0XHRyZXNvbHZlOiB7XG5cdFx0XHQgY2hlY2tJZkxvZ2dlZEluOiBmdW5jdGlvbiAoQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXHRcdFx0IFx0Ly8gY29uc29sZS5sb2coQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkpO1xuXHRcdCAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuXHRcdCAgICAgICAgXHRpZih1c2VyKSAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuXHRcdCAgICAgICAgfSk7XG5cdFx0ICAgIH1cblx0XHR9XG5cdH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCRsb2NhdGlvbikge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNpZ251cCA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coY3JlZGVudGlhbHMpO1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbiggb25TdWNjZXNzZnVsTG9naW4gKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIHNpZ251cCBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbihsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2plY3QnLCB7XG4gICAgICAgIHVybDogJy9wcm9qZWN0Lzpwcm9qZWN0SUQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2plY3QvcHJvamVjdC5odG1sJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRyb290U2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQXV0aFNlcnZpY2UpIHtcblx0dmFyIGluaXRMb2FkID0gMDtcblx0Ly93aW5kb3cgZXZlbnRzXG5cdHdpbmRvdy5vbmJsdXIgPSBmdW5jdGlvbiAoKSB7XG5cdGlmKGluaXRMb2FkKSB7XG4gICAgICAgIFx0JHNjb3BlLnN0b3AoKTtcblx0XHQkc2NvcGUuJGRpZ2VzdCgpO1xuXHR9IGVsc2Uge1xuXHRcdGluaXRMb2FkKys7XG5cdH1cbiAgICB9O1xuICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBsZWF2ZSB0aGlzIHBhZ2UgYmVmb3JlIHNhdmluZyB5b3VyIHdvcms/XCI7XG5cdH07XG5cdC8vIHdpbmRvdy5vbnVubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0Ly8gXHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lcygpO1xuXHQvLyB9XG5cdCQoJy50aW1lbGluZS1jb250YWluZXInKS5zY3JvbGwoZnVuY3Rpb24oKXtcblx0ICAgICQoJy50cmFja01haW5TZWN0aW9uJykuY3NzKHtcblx0ICAgICAgICAnbGVmdCc6ICQodGhpcykuc2Nyb2xsTGVmdCgpXG5cdCAgICB9KTtcblx0fSk7XG5cblxuXG5cdHZhciBtYXhNZWFzdXJlID0gMDtcblxuXHQvLyBudW1iZXIgb2YgbWVhc3VyZXMgb24gdGhlIHRpbWVsaW5lXG5cdCRzY29wZS5udW1NZWFzdXJlcyA9IF8ucmFuZ2UoMCwgNjApO1xuXG5cdCRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcblx0JHNjb3BlLnRyYWNrcyA9IFtdO1xuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XG5cdCRzY29wZS5wcm9qZWN0SWQgPSAkc3RhdGVQYXJhbXMucHJvamVjdElEO1xuXHQkc2NvcGUucG9zaXRpb24gPSAwO1xuXHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xuXHQkc2NvcGUuY3VycmVudGx5UmVjb3JkaW5nID0gZmFsc2U7XG5cdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xuXHQkc2NvcGUuem9vbSA9IDEwMDtcblx0JHNjb3BlLmNvdW50SW4gPSBmYWxzZTtcblx0JHNjb3BlLmNvdW50TnVtYmVyID0gMTtcblxuXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCRzY29wZS5wcm9qZWN0SWQpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcblx0XHRjb25zb2xlLmxvZygnUFJPSkVDVCcsIEpTT04uc3RyaW5naWZ5KHByb2plY3QpKTtcblx0XHR2YXIgbG9hZGVkID0gMDtcblx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBwcm9qZWN0Lm5hbWU7XG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xuXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuXG5cdFx0XHRcdHZhciBsb2FkYWJsZVRyYWNrcyA9IFtdO1xuXG5cdFx0XHRcdHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XG5cdFx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xuXHRcdFx0XHRcdFx0bG9hZGFibGVUcmFja3MrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGlmICh0cmFjay51cmwpIHtcblxuXHRcdFx0XHRcdHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0XHRcdFx0bG9hZGVkKys7XG5cblx0XHRcdFx0XHRcdGlmKGxvYWRlZCA9PT0gbG9hZGFibGVUcmFja3MpIHtcblx0XHRcdFx0XHRcdFx0ZmluaXNoTG9hZGluZygpO1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUuJGRpZ2VzdCgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHR2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdHJhY2subG9jYXRpb24pO1xuXHRcdFx0XHRcdGlmKG1heCArIDIgPiBtYXhNZWFzdXJlKSBtYXhNZWFzdXJlID0gbWF4ICsgMjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xuXHRcdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdC8vIFRPRE86IHRoaXMgaXMgYXNzdW1pbmcgdGhhdCBhIHBsYXllciBleGlzdHNcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xuXHRcdFx0XHRcdC8vaW5pdCBlZmZlY3RzLCBjb25uZWN0LCBhbmQgYWRkIHRvIHNjb3BlXG5cdFx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUodHJhY2suZWZmZWN0c1JhY2spO1xuXHRcdFx0XHRcdHRyYWNrLnBsYXllci5jb25uZWN0KHRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcblxuXHRcdFx0XHRcdGlmKHRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0dHJhY2subG9jYXRpb24uZm9yRWFjaChmdW5jdGlvbiAobG9jKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AodHJhY2sucGxheWVyLCBsb2MpO1xuXHRcdFx0XHRcdFx0XHQkKCcjbWVhc3VyZScgKyBsb2MgKyAnLnRyYWNrJyArIGkgKVxuXHRcdFx0XHRcdFx0XHRcdC5maXJzdCgpLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgbG9jICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIGkgKyBcIi1cIiArIGxvYyArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIitpK1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyB0cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0Ly8gVG9uZVRpbWVsaW5lRmN0LmFkZExvb3BUb1RpbWVsaW5lKHRyYWNrLnBsYXllciwgdHJhY2subG9jYXRpb24pO1xuXHRcdFx0XHRcdFx0Ly9hZGQgbG9vcCB0byBVSVxuXHRcdFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IHRydWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKHRyYWNrKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IHRydWU7XG5cdFx0XHRcdFx0dHJhY2sucmVjb3JkaW5nID0gZmFsc2U7XG4gICAgXHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XG4gICAgXHRcdFx0XHR0cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XG4gICAgXHRcdFx0XHR0cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwgMCwgMCwgMF0pO1xuICAgIFx0XHRcdFx0dHJhY2sucGxheWVyID0gbnVsbDtcbiAgICBcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc2NvcGUubWF4TWVhc3VyZSA9IDMyO1xuICBcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDg7IGkrKykge1xuICAgIFx0XHRcdFx0dmFyIG9iaiA9IHt9O1xuICAgIFx0XHRcdFx0b2JqLmVtcHR5ID0gdHJ1ZTtcbiAgICBcdFx0XHRcdG9iai5yZWNvcmRpbmcgPSBmYWxzZTtcbiAgICBcdFx0XHRcdG9iai5vblRpbWVsaW5lID0gZmFsc2U7XG4gICAgXHRcdFx0XHRvYmoucHJldmlld2luZyA9IGZhbHNlO1xuICAgIFx0XHRcdFx0b2JqLnNpbGVuY2UgPSBmYWxzZTtcbiAgICBcdFx0XHRcdG9iai5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwgMCwgMCwgMF0pO1xuICAgIFx0XHRcdFx0b2JqLnBsYXllciA9IG51bGw7XG4gICAgXHRcdFx0XHRvYmoubmFtZSA9ICdUcmFjayAnICsgKGkrMSk7XG4gICAgXHRcdFx0XHRvYmoubG9jYXRpb24gPSBbXTtcbiAgICBcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaChvYmopO1xuICBcdFx0XHR9XG4gIFx0XHRcdGZpbmlzaExvYWRpbmcoKTtcblx0XHR9XG5cblx0XHQvL2R5bmFtaWNhbGx5IHNldCBtZWFzdXJlc1xuXHRcdC8vaWYgbGVzcyB0aGFuIDE2IHNldCAxOCBhcyBtaW5pbXVtXG5cdFx0JHNjb3BlLm51bU1lYXN1cmVzID0gW107XG5cdFx0aWYobWF4TWVhc3VyZSA8IDMyKSBtYXhNZWFzdXJlID0gMzI7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXhNZWFzdXJlOyBpKyspIHtcblx0XHRcdCRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xuXHRcdH1cblxuXG5cblx0XHRUb25lVGltZWxpbmVGY3QuY3JlYXRlVHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lID0gbWV0cm9ub21lO1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS5vbiA9IHRydWU7XG5cdFx0fSk7XG5cdFx0VG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XG5cblx0fSk7XG5cblx0JHNjb3BlLmp1bXBUb01lYXN1cmUgPSBmdW5jdGlvbihtZWFzdXJlKSB7XG5cdFx0aWYobWF4TWVhc3VyZSA+IG1lYXN1cmUpIHtcblx0XHRcdCRzY29wZS5wb3NpdGlvbiA9IG1lYXN1cmU7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9IG1lYXN1cmUudG9TdHJpbmcoKSArIFwiOjA6MFwiO1xuXHRcdFx0JHNjb3BlLm1vdmVQbGF5aGVhZChtZWFzdXJlKTtcblx0XHR9XG5cdH1cblxuXHQkc2NvcGUubW92ZVBsYXloZWFkID0gZnVuY3Rpb24gKG51bWJlck1lYXN1cmVzKSB7XG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXHRcdCQoJyN0aW1lbGluZVBvc2l0aW9uJykudmFsKFwiMDowXCIpO1xuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAobnVtYmVyTWVhc3VyZXMgKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4Jztcblx0fVxuXG5cdCRzY29wZS56b29tT3V0ID0gZnVuY3Rpb24oKSB7XG5cdFx0JHNjb3BlLnpvb20gLT0gMTA7XG5cdFx0dmFyIHpvb20gPSAoJHNjb3BlLnpvb20gLSAxMCkudG9TdHJpbmcoKSArIFwiJVwiO1xuXHRcdCQoJy50aW1lbGluZS1jb250YWluZXInKS5jc3MoJ3pvb20nLCB6b29tKTtcblx0fTtcblxuXHQkc2NvcGUuem9vbUluID0gZnVuY3Rpb24oKSB7XG5cdFx0JHNjb3BlLnpvb20gKz0gMTA7XG5cdFx0dmFyIHpvb20gPSAoJHNjb3BlLnpvb20gKyAxMCkudG9TdHJpbmcoKSArIFwiJVwiO1xuXHRcdCQoJy50aW1lbGluZS1jb250YWluZXInKS5jc3MoJ3pvb20nLCB6b29tKTtcblx0fTtcblxuXHQkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cblx0fTtcblxuXHQkc2NvcGUucGxheSA9IGZ1bmN0aW9uICgpIHtcblx0XHQkc2NvcGUucGxheWluZyA9IHRydWU7XG5cdFx0VG9uZS5UcmFuc3BvcnQucG9zaXRpb24gPSAkc2NvcGUucG9zaXRpb24udG9TdHJpbmcoKSArIFwiOjA6MFwiO1xuXHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XG5cdH07XG5cdCRzY29wZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcblx0XHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xuXHRcdCRzY29wZS5wb3NpdGlvbiA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF07XG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXHRcdCQoJyN0aW1lbGluZVBvc2l0aW9uJykudmFsKFwiMDowXCIpO1xuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAoJHNjb3BlLnBvc2l0aW9uICogMjAwICsgMzAwKS50b1N0cmluZygpKydweCc7XG5cdFx0VG9uZS5UcmFuc3BvcnQucGF1c2UoKTtcblx0fTtcblx0JHNjb3BlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cdFx0JHNjb3BlLnBsYXlpbmcgPSBmYWxzZTtcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcblx0XHRUb25lVGltZWxpbmVGY3Quc3RvcEFsbCgkc2NvcGUudHJhY2tzKTtcblx0XHQkc2NvcGUucG9zaXRpb24gPSAwO1xuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcblx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gJzMwMHB4Jztcblx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCIwOjBcIik7XG5cdFx0JCgnI3Bvc2l0aW9uU2VsZWN0b3InKS52YWwoXCIwXCIpO1xuXHRcdC8vc3RvcCBhbmQgdHJhY2sgY3VycmVudGx5IGJlaW5nIHByZXZpZXdlZFxuXHRcdGlmKCRzY29wZS5wcmV2aWV3aW5nSWQpIHtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFySW50ZXJ2YWwoJHNjb3BlLnByZXZpZXdpbmdJZCk7XG5cdFx0XHQkc2NvcGUucHJldmlld2luZ0lkID0gbnVsbDtcblx0XHR9XG5cdH07XG5cdCRzY29wZS5uYW1lQ2hhbmdlID0gZnVuY3Rpb24obmV3TmFtZSkge1xuXHRcdGlmKG5ld05hbWUpIHtcblx0XHRcdCRzY29wZS5uYW1lRXJyb3IgPSBmYWxzZTtcblx0XHRcdFByb2plY3RGY3QubmFtZUNoYW5nZShuZXdOYW1lLCAkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzY29wZS5uYW1lRXJyb3IgPSBcIllvdSBtdXN0IHNldCBhIG5hbWUhXCI7XG5cdFx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBcIlVudGl0bGVkXCI7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdE5hbWVJbnB1dCcpLmZvY3VzKCk7XG5cdFx0fVxuXHR9O1xuXG5cdCRzY29wZS50b2dnbGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYoJHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPT09IDApIHtcblx0XHRcdCRzY29wZS5tZXRyb25vbWUudm9sdW1lLnZhbHVlID0gLTEwMDtcblx0XHRcdCRzY29wZS5tZXRyb25vbWUub24gPSBmYWxzZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAwO1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS5vbiA9IHRydWU7XG5cblx0XHR9XG5cdH07XG5cblx0JHNjb3BlLnNlbmRUb0FXUyA9IGZ1bmN0aW9uICgpIHtcblx0XHRzdGFydExvYWRpbmcoKTtcblx0XHRSZWNvcmRlckZjdC5zZW5kVG9BV1MoJHNjb3BlLnRyYWNrcywgJHNjb3BlLnByb2plY3RJZCwgJHNjb3BlLnByb2plY3ROYW1lKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHRcdCAgICAvLyB3YXZlIGxvZ2ljXG5cdFx0XHRmaW5pc2hMb2FkaW5nKCk7XG5cblx0XHQgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xuXHRcdH0pO1xuXHR9O1xuICBcbiAgJHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc3RhcnRMb2FkaW5nKCkge1xuXHRcdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZmluaXNoTG9hZGluZygpIHtcblx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgIH1cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJQcm9maWxlJywge1xuICAgICAgICB1cmw6ICcvdXNlcnByb2ZpbGUvOnRoZUlEJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3VzZXJwcm9maWxlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInLFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5hcnRpc3RJbmZvJywge1xuICAgICAgICB1cmw6ICcvaW5mbycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9pbmZvLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXG4gICAgfSlcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLnByb2plY3QnLCB7XG4gICAgICAgIHVybDogJy9wcm9qZWN0cycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9wcm9qZWN0cy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5mb2xsb3dlcnMnLCB7XG4gICAgICAgIHVybDogJy9mb2xsb3dlcnMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93ZXJzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXG4gICAgfSlcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2luZycsIHtcbiAgICAgICAgdXJsOiAnL2ZvbGxvd2luZycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dpbmcuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcbiAgICB9KTtcblxufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFRvbmVUcmFja0ZjdCwgUHJvamVjdEZjdCwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsICRtZFRvYXN0KSB7XG5cdHZhciB0cmFja0J1Y2tldCA9IFtdO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgXHQkc2NvcGUubG9nZ2VkSW5Vc2VyID0gdXNlcjtcblxuXG4gICAgXHQkc2NvcGUubXlmb2xsb3dlcnMgPSAkc2NvcGUubG9nZ2VkSW5Vc2VyLmZvbGxvd2Vycy5sZW5ndGg7XG4gICAgXHQkc2NvcGUubXlmb2xsb3dpbmcgPSAkc2NvcGUubG9nZ2VkSW5Vc2VyLmZvbGxvd2luZy5sZW5ndGg7XG4gICAgXHQkc2NvcGUubXlwcm9qZWN0cyA9ICRzY29wZS5sb2dnZWRJblVzZXIucHJvamVjdHMubGVuZ3RoO1xuXG4gICAgfSk7XG5cblx0JHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnByb2plY3RzID0gZnVuY3Rpb24gKCl7XG4gICAgXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCkudGhlbihmdW5jdGlvbihwcm9qZWN0cyl7XG4gICAgXHRcdGNvbnNvbGUubG9nKCdQUk9KQ1MnLCBwcm9qZWN0cyk7XG4gICAgXHRcdCRzY29wZS5hbGxQcm9qZWN0cyA9IHByb2plY3RzO1xuICAgICAgICAgIFx0dmFyIGltZ0FyciA9IFtcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE5MDI1MDMtZGpicWg2LXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMTc5NTc3OC1jbXEweDEtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIzMDE1NzEzLXd1dXV5OS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE5MjUzOTItMmh3M2hnLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMjU0NjkxMC14bWpiNjMtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIyNTA2NTgzLW96eng4NS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMDM0MTg5MzItdGU2aHM0LXQ1MDB4NTAwLmpwZ1wiXG4gICAgICAgICAgICAgIF1cblxuICAgICAgICAgICAgICAkc2NvcGUuYWxsUHJvamVjdHMuZm9yRWFjaChmdW5jdGlvbihhUHJvamVjdCl7XG4gICAgICAgICAgICAgICAgYVByb2plY3QuYmFja2dyb3VuZEltZyA9IGltZ0FycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA5KV07XG4gICAgICAgICAgICAgIH0pO1xuICAgIFx0fSk7XG4gICAgfTtcblx0JHNjb3BlLnByb2plY3RzKCk7XG5cblxuXHQkc2NvcGUubWFrZUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9nZ2VkSW5Vc2VyJywgbG9nZ2VkSW5Vc2VyKTtcblx0XHRcdHByb2plY3Qub3duZXIgPSBsb2dnZWRJblVzZXIuX2lkO1xuXHRcdFx0cHJvamVjdC5mb3JrSUQgPSBwcm9qZWN0Ll9pZDtcblx0XHRcdGRlbGV0ZSBwcm9qZWN0Ll9pZDtcblx0XHRcdGNvbnNvbGUubG9nKHByb2plY3QpO1xuXHRcdFx0JG1kVG9hc3Quc2hvdyh7XG5cdFx0XHRcdGhpZGVEZWxheTogMjAwMCxcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxuXHRcdFx0XHR0ZW1wbGF0ZTpcIjxtZC10b2FzdD4gSXQncyBiZWVuIGZvcmtlZCA8L21kLXRvYXN0PlwiXG5cdFx0XHR9KTtcblxuXHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmsgcmVzcG9uc2UgaXMnLCByZXNwb25zZSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XG5cdH07XG5cdFx0XG5cdHZhciBzdG9wID1mYWxzZTtcblxuXG5cdCRzY29wZS5zYW1wbGVUcmFjayA9IGZ1bmN0aW9uKHRyYWNrKXtcblxuXHRcdGlmKHN0b3A9PT10cnVlKXtcblx0XHRcdCRzY29wZS5wbGF5ZXIuc3RvcCgpO1xuXHRcdH1cblxuXHRcdFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBmdW5jdGlvbihwbGF5ZXIpe1xuXHRcdFx0JHNjb3BlLnBsYXllciA9IHBsYXllcjtcblx0XHRcdGlmKHN0b3AgPT09IGZhbHNlKXtcblx0XHRcdFx0c3RvcCA9IHRydWU7XG5cdFx0XHRcdCRzY29wZS5wbGF5ZXIuc3RhcnQoKTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdHN0b3AgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxuXG5cdCRzY29wZS5nZXRVc2VyUHJvZmlsZSA9IGZ1bmN0aW9uKHVzZXIpe1xuXHQgICAgLy8gY29uc29sZS5sb2coXCJjbGlja2VkXCIsIHVzZXIpO1xuXHQgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHt0aGVJRDogdXNlci5faWR9KTtcblx0fTtcblxuICAgIFxuXG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdMYW5kaW5nUGFnZUNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgVG9uZVRyYWNrRmN0LCAkc3RhdGUpIHtcbiAgICAvLyAkKCcjZnVsbHBhZ2UnKS5mdWxscGFnZSgpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG5cblxuICAgICRzY29wZS5nb1RvRm9ybXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHRmdW5jdGlvbiBzY3JvbGxUb0JvdHRvbShkdXJhdGlvbikge1xuXHRcdCAgICBpZiAoZHVyYXRpb24gPD0gMCkgcmV0dXJuO1xuXG5cdFx0XHR2YXIgZGlmZmVyZW5jZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgLSB3aW5kb3cuc2Nyb2xsWTtcblx0XHRcdHZhciBwZXJUaWNrID0gZGlmZmVyZW5jZSAvIGR1cmF0aW9uICogMTA7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHdpbmRvdy5zY3JvbGwoMCwgd2luZG93LnNjcm9sbFkgKyBwZXJUaWNrKTtcblx0XHRcdFx0c2Nyb2xsVG9Cb3R0b20oZHVyYXRpb24gLSAxMCk7XG5cdFx0XHR9LCAxMCk7XG5cdFx0fVxuXG5cdFx0c2Nyb2xsVG9Cb3R0b20oMTAwMCk7XG4gICAgfTtcblxuICAgIFxuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xuICAgICAgICBBdXRoU2VydmljZS5zaWdudXAoc2lnbnVwSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdOZXdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFByb2plY3RGY3QsICRzdGF0ZSl7XG5cdCBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgfSk7XG5cblx0JHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xuXHRcdFByb2plY3RGY3QubmV3UHJvamVjdCgkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihwcm9qZWN0SWQpe1xuXHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogcHJvamVjdElkfSk7XHQgXHRcblx0XHR9KTtcblxuXHR9O1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcbiAgXG4gIHZhciB3YXZBcnJheSA9IFtdO1xuICBcbiAgJHNjb3BlLm51bU1lYXN1cmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgNjA7IGkrKykge1xuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xuICB9XG5cbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xuICAkc2NvcGUudHJhY2tzID0gW107XG4gICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcblxuXG4gIFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJzU1OTRjMjBhZDA3NTljZDQwY2U1MWUxNCcpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICBjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xuXG4gICAgICBpZiAocHJvamVjdC50cmFja3MubGVuZ3RoKSB7XG4gICAgICAgIHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICAgICAgaWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJhY2sucGxheWVyID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGRvbmVMb2FkaW5nKTtcbiAgICAgICAgICAgIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcbiAgICAgICAgICAgICRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcbiAgICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgICAgb2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xuICAgICAgICAgIG9iai5sb2NhdGlvbiA9IFtdO1xuICAgICAgICAgICRzY29wZS50cmFja3MucHVzaChvYmopO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIFRvbmVUaW1lbGluZUZjdC5nZXRUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKTtcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xuXG4gIH0pO1xuXG4gIC8vIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24oYVVzZXIpe1xuICAvLyAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcbiAgLy8gICAgIC8vICRzdGF0ZVBhcmFtcy50aGVJRCA9IGFVc2VyLl9pZFxuICAvLyAgICAgY29uc29sZS5sb2coXCJpZFwiLCAkc3RhdGVQYXJhbXMpO1xuICAvLyB9KTtcblxuICAkc2NvcGUucmVjb3JkID0gZnVuY3Rpb24gKGUsIGluZGV4KSB7XG5cbiAgXHRlID0gZS50b0VsZW1lbnQ7XG5cbiAgICAgICAgLy8gc3RhcnQgcmVjb3JkaW5nXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdGFydCByZWNvcmRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghYXVkaW9SZWNvcmRlcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBlLmNsYXNzTGlzdC5hZGQoXCJyZWNvcmRpbmdcIik7XG4gICAgICAgIGF1ZGlvUmVjb3JkZXIuY2xlYXIoKTtcbiAgICAgICAgYXVkaW9SZWNvcmRlci5yZWNvcmQoKTtcblxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLnN0b3AoKTtcbiAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XG4gICAgICAgICAgXG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xuICAgICAgICAgICAgLy8gJHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3SW1hZ2UgPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nSW1hZ2U7XG5cbiAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgIFxuICAgICAgICB9LCAyMDAwKTtcblxuICB9XG5cbiAgJHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xuXG4gIH07XG5cbiAgJHNjb3BlLnNlbmRUb0FXUyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgIHZhciBhd3NUcmFja3MgPSAkc2NvcGUudHJhY2tzLmZpbHRlcihmdW5jdGlvbih0cmFjayxpbmRleCl7XG4gICAgICAgICAgICAgIGlmKHRyYWNrLnJhd0F1ZGlvKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoYXdzVHJhY2tzLCAnNTU5NWE3ZmFhYTkwMWFkNjMyMzRmOTIwJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XG5cbiAgICB9KTtcbiAgfTtcblxuXG5cdFxuXG5cbn0pO1xuXG5cbiIsIlxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgJHN0YXRlUGFyYW1zLCB1c2VyRmFjdG9yeSkge1xuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcbiAgICAgICAgXG4gICAgICAgICAgJHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcblxuICAgICAgICAgIHVzZXJGYWN0b3J5LmdldFVzZXJPYmooJHN0YXRlUGFyYW1zLnRoZUlEKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICB2YXIgaW1nQXJyID0gW1xuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMTkwMjUwMy1kamJxaDYtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTAzNDE4OTMyLXRlNmhzNC10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE3OTU3NzgtY21xMHgxLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMTkyNTM5Mi0yaHczaGctdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIyNTA2NTgzLW96eng4NS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjMwMTU3MTMtd3V1dXk5LXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMjU0NjkxMC14bWpiNjMtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgIF1cblxuICAgICAgICAgICAgICAkc2NvcGUudXNlci5wcm9qZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKGFQcm9qZWN0KXtcbiAgICAgICAgICAgICAgICBhUHJvamVjdC5iYWNrZ3JvdW5kSW1nID0gaW1nQXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDkpXTtcbiAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmKCEkc2NvcGUudXNlci5wcm9mcGljKXtcbiAgICAgICAgICAgICAgJHNjb3BlLnVzZXIucHJvZnBpYyA9IFwiaHR0cHM6Ly93d3cubWRyMTAxLmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wNS9wbGFjZWhvbGRlci11c2VyLmpwZ1wiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdXNlci5mb2xsb3dlcnMubGVuZ3RoOyBpICsrKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJHN0YXRlUGFyYW1zLnRoZUlELCB1c2VyLmZvbGxvd2Vyc1tpXS5faWQpO1xuICAgICAgICAgICAgICBpZih1c2VyLmZvbGxvd2Vyc1tpXS5faWQgPT09IGxvZ2dlZEluVXNlci5faWQpe1xuICAgICAgICAgICAgICAgICRzY29wZS5mb2xsb3dTdGF0dXMgPSB0cnVlO1xuICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICB9KTtcbiAgICB9KTtcblxuXG5cbiAgICAvLyAkc2NvcGUuZGlzcGxheVNldHRpbmdzID0gZnVuY3Rpb24oKXtcbiAgICAvLyAgICAgaWYoJHNjb3BlLnNob3dTZXR0aW5ncykgJHNjb3BlLnNob3dTZXR0aW5ncyA9IGZhbHNlO1xuICAgIC8vICAgICBjb25zb2xlLmxvZygkc2NvcGUuc2hvd1NldHRpbmdzKTtcbiAgICAvLyB9XG5cbiAgICAkc2NvcGUuZm9sbG93ID0gZnVuY3Rpb24odXNlcil7XG4gICAgICB1c2VyRmFjdG9yeS5mb2xsb3codXNlciwgJHNjb3BlLmxvZ2dlZEluVXNlcikudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIGNvbnNvbGUubG9nKCdGb2xsb3cgY29udHJvbGxlciByZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAkc2NvcGUuZm9sbG93U3RhdHVzID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRpc3BsYXlXZWIgPSBmdW5jdGlvbigpe1xuICAgICAgJHN0YXRlLmdvKCdmb3Jrd2ViJyk7XG4gICAgfTtcblxuXG59KTsiLCJhcHAuZmFjdG9yeSgnQW5hbHlzZXJGY3QnLCBmdW5jdGlvbigpIHtcblxuXHR2YXIgdXBkYXRlQW5hbHlzZXJzID0gZnVuY3Rpb24gKGFuYWx5c2VyQ29udGV4dCwgYW5hbHlzZXJOb2RlLCBjb250aW51ZVVwZGF0ZSkge1xuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xuXHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xuXHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XG5cdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcblxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxuXG5cdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XG5cdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XG5cdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XG5cblx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcblx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XG5cdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxuXHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcblx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xuXHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XG5cdFx0XHR9XG5cdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XG5cdH1cblxuXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xuXHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggYW5hbHlzZXJJZCApO1xuXHR9XG5cdHJldHVybiB7XG5cdFx0dXBkYXRlQW5hbHlzZXJzOiB1cGRhdGVBbmFseXNlcnMsXG5cdFx0Y2FuY2VsQW5hbHlzZXJVcGRhdGVzOiBjYW5jZWxBbmFseXNlclVwZGF0ZXNcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ0ZvcmtGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldFdlYiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9mb3JrcycpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRXZWI6IGdldFdlYlxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdIb21lRmN0JywgZnVuY3Rpb24oJGh0dHApe1xuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcicsIHtwYXJhbXM6IHtfaWQ6IHVzZXJ9fSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWNjZXNzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdQcm9qZWN0RmN0JywgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldFByb2plY3RJbmZvID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xuXG4gICAgICAgIC8vaWYgY29taW5nIGZyb20gSG9tZUNvbnRyb2xsZXIgYW5kIG5vIElkIGlzIHBhc3NlZCwgc2V0IGl0IHRvICdhbGwnXG4gICAgICAgIHZhciBwcm9qZWN0aWQgPSBwcm9qZWN0SWQgfHwgJ2FsbCc7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvamVjdHMvJyArIHByb2plY3RpZCB8fCBwcm9qZWN0aWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgY3JlYXRlQUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzLycsIHByb2plY3QpLnRoZW4oZnVuY3Rpb24oZm9yayl7XG4gICAgXHRcdFx0cmV0dXJuIGZvcmsuZGF0YTtcbiAgICBcdH0pO1xuICAgIH1cbiAgICB2YXIgbmV3UHJvamVjdCA9IGZ1bmN0aW9uKHVzZXIpe1xuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMnLHtvd25lcjp1c2VyLl9pZCwgbmFtZTonVW50aXRsZWQnLCBicG06MTIwLCBlbmRNZWFzdXJlOiAzMn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgIFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICBcdH0pO1xuICAgIH1cbiAgICB2YXIgbmFtZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld05hbWUsIHByb2plY3RJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3Byb2plY3RzLycrcHJvamVjdElkLCB7bmFtZTogbmV3TmFtZX0pLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3Byb2plY3RzLycrcHJvamVjdC5faWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0RlbGV0ZSBQcm9qIEZjdCcsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciB1cGxvYWRQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCdhcGkvcHJvamVjdHMvc291bmRjbG91ZCcsIHsgcHJvamVjdCA6IHByb2plY3QgfSApLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRQcm9qZWN0SW5mbzogZ2V0UHJvamVjdEluZm8sXG4gICAgICAgIGNyZWF0ZUFGb3JrOiBjcmVhdGVBRm9yayxcbiAgICAgICAgbmV3UHJvamVjdDogbmV3UHJvamVjdCwgXG4gICAgICAgIGRlbGV0ZVByb2plY3Q6IGRlbGV0ZVByb2plY3QsXG4gICAgICAgIG5hbWVDaGFuZ2U6IG5hbWVDaGFuZ2UsXG4gICAgICAgIHVwbG9hZFByb2plY3Q6IHVwbG9hZFByb2plY3RcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdSZWNvcmRlckZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgQXV0aFNlcnZpY2UsICRxLCBUb25lVHJhY2tGY3QsIEFuYWx5c2VyRmN0KSB7XG5cbiAgICB2YXIgcmVjb3JkZXJJbml0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICAgICAgICAgIHZhciBhdWRpb0NvbnRleHQgPSBuZXcgQ29udGV4dCgpO1xuICAgICAgICAgICAgdmFyIHJlY29yZGVyO1xuXG4gICAgICAgICAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSAoXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pDYW5jZWxBbmltYXRpb25GcmFtZTtcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSlcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgICAgICAgICAvLyBhc2sgZm9yIHBlcm1pc3Npb25cbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXVkaW9cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWFuZGF0b3J5XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nRWNob0NhbmNlbGxhdGlvblwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0F1dG9HYWluQ29udHJvbFwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ05vaXNlU3VwcHJlc3Npb25cIjogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dIaWdocGFzc0ZpbHRlclwiOiBcImZhbHNlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3B0aW9uYWxcIjogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dFBvaW50ID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIEF1ZGlvTm9kZSBmcm9tIHRoZSBzdHJlYW0uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbEF1ZGlvSW5wdXQgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdWRpb0lucHV0ID0gcmVhbEF1ZGlvSW5wdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdWRpb0lucHV0LmNvbm5lY3QoaW5wdXRQb2ludCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbmFseXNlciBub2RlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXNlck5vZGUuZmZ0U2l6ZSA9IDIwNDg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIGFuYWx5c2VyTm9kZSApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSByZWNvcmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoIGlucHV0UG9pbnQgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB6ZXJvR2FpbiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5nYWluLnZhbHVlID0gMC4wO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCB6ZXJvR2FpbiApO1xuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uY29ubmVjdCggYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoW3JlY29yZGVyLCBhbmFseXNlck5vZGVdKTtcblxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIHJlY29yZFN0YXJ0ID0gZnVuY3Rpb24gKHJlY29yZGVyKSB7XG4gICAgICAgIHJlY29yZGVyLmNsZWFyKCk7XG4gICAgICAgIHJlY29yZGVyLnJlY29yZCgpO1xuICAgIH1cblxuICAgIHZhciByZWNvcmRTdG9wID0gZnVuY3Rpb24gKGluZGV4LCByZWNvcmRlcikge1xuICAgICAgICByZWNvcmRlci5zdG9wKCk7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgLy8gZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xuICAgICAgICAgICAgcmVjb3JkZXIuZ2V0QnVmZmVycyhmdW5jdGlvbiAoYnVmZmVycykge1xuICAgICAgICAgICAgICAgIC8vZGlzcGxheSB3YXYgaW1hZ2VcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZWRpc3BsYXlcIiArICBpbmRleCApO1xuICAgICAgICAgICAgICAgIHZhciBjYW52YXNMb29wID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZUZvckxvb3BcIiArICBpbmRleCApO1xuICAgICAgICAgICAgICAgIGRyYXdCdWZmZXIoIDMwMCwgMTAwLCBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSwgYnVmZmVyc1swXSApO1xuICAgICAgICAgICAgICAgIGRyYXdCdWZmZXIoIDE5OCwgOTgsIGNhbnZhc0xvb3AuZ2V0Q29udGV4dCgnMmQnKSwgYnVmZmVyc1swXSApO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RCdWZmZXIgPSBidWZmZXJzWzBdO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZSA9IGNhbnZhc0xvb3AudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGhlIE9OTFkgdGltZSBnb3RCdWZmZXJzIGlzIGNhbGxlZCBpcyByaWdodCBhZnRlciBhIG5ldyByZWNvcmRpbmcgaXMgY29tcGxldGVkIC0gXG4gICAgICAgICAgICAgICAgLy8gc28gaGVyZSdzIHdoZXJlIHdlIHNob3VsZCBzZXQgdXAgdGhlIGRvd25sb2FkLlxuICAgICAgICAgICAgICAgIHJlY29yZGVyLmV4cG9ydFdBViggZnVuY3Rpb24gKCBibG9iICkge1xuICAgICAgICAgICAgICAgICAgICAvL25lZWRzIGEgdW5pcXVlIG5hbWVcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb3JkZXIuc2V0dXBEb3dubG9hZCggYmxvYiwgXCJteVJlY29yZGluZzAud2F2XCIgKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgbG9vcCB0aW1lXG4gICAgICAgICAgICAgICAgICAgIFRvbmVUcmFja0ZjdC5sb29wSW5pdGlhbGl6ZShibG9iLCBpbmRleCwgXCJteVJlY29yZGluZzAud2F2XCIpLnRoZW4ocmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBcblxuICAgIFxuICAgIHZhciBjb252ZXJ0VG9CYXNlNjQgPSBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VhY2ggdHJhY2snLCB0cmFjayk7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICAgIGlmKHRyYWNrLnJhd0F1ZGlvKSB7XG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwodHJhY2sucmF3QXVkaW8pO1xuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG5cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VuZFRvQVdTOiBmdW5jdGlvbiAodHJhY2tzQXJyYXksIHByb2plY3RJZCwgcHJvamVjdE5hbWUpIHtcblxuICAgICAgICAgICAgdmFyIHJlYWRQcm9taXNlcyA9IHRyYWNrc0FycmF5Lm1hcChjb252ZXJ0VG9CYXNlNjQpO1xuXG4gICAgICAgICAgICByZXR1cm4gJHEuYWxsKHJlYWRQcm9taXNlcykudGhlbihmdW5jdGlvbiAoc3RvcmVEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3N0b3JlRGF0YScsc3RvcmVEYXRhKTtcbiAgICAgICAgICAgICAgICB0cmFja3NBcnJheS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaywgaSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcmVEYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFjay5yYXdBdWRpbyA9IHN0b3JlRGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdCRUZPUkUgU0FWRScsIHRyYWNrc0FycmF5KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9hd3MvJywgeyB0cmFja3MgOiB0cmFja3NBcnJheSwgcHJvamVjdElkIDogcHJvamVjdElkLCBwcm9qZWN0TmFtZSA6IHByb2plY3ROYW1lIH0pXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGluIHNlbmRUb0FXU0ZhY3RvcnknLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICByZWNvcmRlckluaXQ6IHJlY29yZGVySW5pdCxcbiAgICAgICAgcmVjb3JkU3RhcnQ6IHJlY29yZFN0YXJ0LFxuICAgICAgICByZWNvcmRTdG9wOiByZWNvcmRTdG9wXG4gICAgfVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1RvbmVUaW1lbGluZUZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcblxuXHR2YXIgY3JlYXRlVHJhbnNwb3J0ID0gZnVuY3Rpb24gKGxvb3BFbmQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wID0gdHJ1ZTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BTdGFydCA9ICcwbSc7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wRW5kID0gbG9vcEVuZC50b1N0cmluZygpICsgJ20nO1xuXHRcdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXG5cdFx0XHRjcmVhdGVNZXRyb25vbWUoKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBwb3NBcnIgPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpO1xuXHRcdFx0XHRcdHZhciBsZWZ0UG9zID0gKChwYXJzZUludChwb3NBcnJbMF0pICogMjAwICkgKyAocGFyc2VJbnQocG9zQXJyWzFdKSAqIDUwKSArIDUwMCkudG9TdHJpbmcoKSArICdweCc7XG5cdFx0XHRcdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IGxlZnRQb3M7XG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XG5cdFx0XHRcdH0sICcxbScpO1xuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIHBvc0FyciA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KFwiOlwiKTtcblx0XHRcdFx0XHRpZihwb3NBcnIubGVuZ3RoID09PSAzKSB7XG5cdFx0XHRcdFx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChwb3NBcnJbMV0gKyBcIjpcIiArIHBvc0FyclsyXSk7XG5cdFx0XHRcdFx0XHQkKCcjcG9zaXRpb25TZWxlY3RvcicpLnZhbChwb3NBcnJbMF0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChwb3NBcnJbMV0gKyBcIjpcIiArIHBvc0FyclsyXSk7XG5cdFx0XHRcdFx0XHQkKCcjcG9zaXRpb25TZWxlY3RvcicpLnZhbChwb3NBcnJbMF0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xuXHRcdFx0XHR9LCAnNG4nKTtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0cm9ub21lKTtcblx0XHRcdH0pO1xuICAgICAgICB9KTtcblx0fTtcblxuXHR2YXIgY2hhbmdlQnBtID0gZnVuY3Rpb24gKGJwbSkge1xuXHRcdFRvbmUuVHJhbnNwb3J0LmJwbS52YWx1ZSA9IGJwbTtcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XG5cdH07XG5cblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIG11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciB1bk11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciBjcmVhdGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgIHZhciBtZXQgPSBuZXcgVG9uZS5QbGF5ZXIoXCIvYXBpL3dhdi9DbGljazEud2F2XCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0KTtcblx0ICAgICAgICB9KS50b01hc3RlcigpO1xuICAgICAgICB9KTtcblx0fTtcblxuXHQvLyB2YXIgYWRkTG9vcFRvVGltZWxpbmUgPSBmdW5jdGlvbiAocGxheWVyLCBzdGFydFRpbWVBcnJheSkge1xuXG5cdC8vIFx0aWYoc3RhcnRUaW1lQXJyYXkuaW5kZXhPZigwKSA9PT0gLTEpIHtcblx0Ly8gXHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xuXHQvLyBcdFx0XHRwbGF5ZXIuc3RvcCgpO1xuXHQvLyBcdFx0fSwgXCIwbVwiKVxuXG5cdC8vIFx0fVxuXG5cdC8vIFx0c3RhcnRUaW1lQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRUaW1lKSB7XG5cblx0Ly8gXHRcdHZhciBzdGFydFRpbWUgPSBzdGFydFRpbWUudG9TdHJpbmcoKSArICdtJztcblxuXHQvLyBcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHQvLyBcdFx0XHRjb25zb2xlLmxvZygnU3RhcnQnLCBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbik7XG5cdC8vIFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdC8vIFx0XHRcdHBsYXllci5zdGFydCgpO1xuXHQvLyBcdFx0fSwgc3RhcnRUaW1lKTtcblxuXHQvLyBcdFx0Ly8gdmFyIHN0b3BUaW1lID0gcGFyc2VJbnQoc3RhcnRUaW1lLnN1YnN0cigwLCBzdGFydFRpbWUubGVuZ3RoLTEpKSArIDEpLnRvU3RyaW5nKCkgKyBzdGFydFRpbWUuc3Vic3RyKC0xLDEpO1xuXHQvLyBcdFx0Ly8vLyBjb25zb2xlLmxvZygnU1RPUCcsIHN0b3ApO1xuXHQvLyBcdFx0Ly8vLyB0cmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHQvLyBcdFx0Ly8vLyBcdHBsYXllci5zdG9wKCk7XG5cdC8vIFx0XHQvLy8vIH0sIHN0b3BUaW1lKTtcblxuXHQvLyBcdH0pO1xuXG5cdC8vIH07XG5cdFxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZVRyYW5zcG9ydDogY3JlYXRlVHJhbnNwb3J0LFxuICAgICAgICBjaGFuZ2VCcG06IGNoYW5nZUJwbSxcbiAgICAgICAgLy8gYWRkTG9vcFRvVGltZWxpbmU6IGFkZExvb3BUb1RpbWVsaW5lLFxuICAgICAgICBjcmVhdGVNZXRyb25vbWU6IGNyZWF0ZU1ldHJvbm9tZSxcbiAgICAgICAgc3RvcEFsbDogc3RvcEFsbCxcbiAgICAgICAgbXV0ZUFsbDogbXV0ZUFsbCxcbiAgICAgICAgdW5NdXRlQWxsOiB1bk11dGVBbGxcbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdUb25lVHJhY2tGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XG5cblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xuXHRcdHZhciBwbGF5ZXIgID0gbmV3IFRvbmUuUGxheWVyKHVybCwgZG9uZUZuKTtcblx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcblx0XHQvLyBwbGF5ZXIuc3luYygpO1xuXHRcdC8vIHBsYXllci5sb29wID0gdHJ1ZTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0Ly9QQVNTRUQgQSBCTE9CIEZST00gUkVDT1JERVJKU0ZBQ1RPUlkgLSBEUk9QUEVEIE9OIE1FQVNVUkUgMFxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdHZhciBsaW5rID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYXZlXCIraW5kZXgpO1xuXHRcdFx0bGluay5ocmVmID0gdXJsO1xuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2Jztcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmcgPSBibG9iO1xuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZ1VSTCA9IHVybDtcblx0XHRcdHZhciBwbGF5ZXI7XG5cdFx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIGVmZmVjdHNJbml0aWFsaXplID0gZnVuY3Rpb24oYXJyKSB7XG5cblx0XHRpZighYXJyLmxlbmd0aCkgYXJyID0gWzAsMCwwLDBdO1xuXG5cdFx0dmFyIGNob3J1cyA9IG5ldyBUb25lLkNob3J1cygpO1xuXHRcdGNob3J1cy5uYW1lID0gXCJDaG9ydXNcIjtcblx0XHR2YXIgcGhhc2VyID0gbmV3IFRvbmUuUGhhc2VyKCk7XG5cdFx0cGhhc2VyLm5hbWUgPSBcIlBoYXNlclwiO1xuXHRcdHZhciBkaXN0b3J0ID0gbmV3IFRvbmUuRGlzdG9ydGlvbigpO1xuXHRcdGRpc3RvcnQubmFtZSA9IFwiRGlzdG9ydGlvblwiO1xuXHRcdHZhciBwaW5ncG9uZyA9IG5ldyBUb25lLlBpbmdQb25nRGVsYXkoXCI0bVwiKTtcblx0XHRwaW5ncG9uZy5uYW1lID0gXCJQaW5nIFBvbmdcIjtcblxuXHRcdGlmIChhcnIubGVuZ3RoKSB7XG5cdFx0XHRjaG9ydXMud2V0LnZhbHVlID0gYXJyWzBdO1xuXHRcdFx0cGhhc2VyLndldC52YWx1ZSA9IGFyclsxXTtcblx0XHRcdGRpc3RvcnQud2V0LnZhbHVlID0gYXJyWzJdO1xuXHRcdFx0cGluZ3Bvbmcud2V0LnZhbHVlID0gYXJyWzNdO1xuXHRcdFx0Ly9zYXZlVmFsdWUgaW5pdGlhdGVkXG5cdFx0XHRjaG9ydXMuc2F2ZVZhbHVlID0gYXJyWzBdO1xuXHRcdFx0cGhhc2VyLnNhdmVWYWx1ZSA9IGFyclsxXTtcblx0XHRcdGRpc3RvcnQuc2F2ZVZhbHVlID0gYXJyWzJdO1xuXHRcdFx0cGluZ3Bvbmcuc2F2ZVZhbHVlID0gYXJyWzNdO1xuXHRcdH1cblx0XHRcblx0XHRjaG9ydXMuY29ubmVjdChwaGFzZXIpO1xuXHRcdHBoYXNlci5jb25uZWN0KGRpc3RvcnQpO1xuXHRcdGRpc3RvcnQuY29ubmVjdChwaW5ncG9uZyk7XG5cdFx0cGluZ3BvbmcudG9NYXN0ZXIoKTtcblx0XHQvLyBwaW5ncG9uZy5jb25uZWN0KHZvbHVtZSk7XG5cdFx0Ly8gdm9sdW1lLnRvTWFzdGVyKCk7XG5cblx0XHRyZXR1cm4gW2Nob3J1cywgcGhhc2VyLCBkaXN0b3J0LCBwaW5ncG9uZ107XG5cdH07XG5cblx0dmFyIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG1lYXN1cmUpIHtcblx0XHQvLyBjb25zb2xlLmxvZygnSlVTVCBEUk9QUEVEJywgcGxheWVyLCBtZWFzdXJlKTtcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xuXHRcdFx0fSwgbWVhc3VyZStcIm1cIik7XG5cdH07XG5cblx0dmFyIHJlcGxhY2VUaW1lbGluZUxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpIHtcblx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbGQgdGltZWxpbmUgaWQnLCBvbGRUaW1lbGluZUlkKTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQob2xkVGltZWxpbmVJZCkpO1xuXHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZXMoKTtcblx0XHRcdHJlc29sdmUoY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChwbGF5ZXIsIG5ld01lYXN1cmUpKTtcblx0XHR9KTtcblx0fTtcblx0dmFyIGRlbGV0ZVRpbWVsaW5lTG9vcCA9IGZ1bmN0aW9uKHRpbWVsaW5lSWQpIHtcblx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KHRpbWVsaW5lSWQpKTtcblx0fTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZVBsYXllcjogY3JlYXRlUGxheWVyLFxuICAgICAgICBsb29wSW5pdGlhbGl6ZTogbG9vcEluaXRpYWxpemUsXG4gICAgICAgIGVmZmVjdHNJbml0aWFsaXplOiBlZmZlY3RzSW5pdGlhbGl6ZSxcbiAgICAgICAgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcDogY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCxcbiAgICAgICAgcmVwbGFjZVRpbWVsaW5lTG9vcDogcmVwbGFjZVRpbWVsaW5lTG9vcCxcbiAgICAgICAgZGVsZXRlVGltZWxpbmVMb29wOiBkZWxldGVUaW1lbGluZUxvb3BcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCd1c2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRnZXRVc2VyT2JqOiBmdW5jdGlvbih1c2VySUQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXJzJywge3BhcmFtczoge19pZDogdXNlcklEfX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygncmVzb29uc2UgaXMnLCByZXNwb25zZS5kYXRhKVxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRmb2xsb3c6IGZ1bmN0aW9uKHVzZXIsIGxvZ2dlZEluVXNlcil7XG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMnLHt1c2VyVG9Gb2xsb3c6IHVzZXIsIGxvZ2dlZEluVXNlcjogbG9nZ2VkSW5Vc2VyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb2xsb3dVc2VyIEZhY3RvcnkgcmVzcG9uc2UnLCByZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0dW5Gb2xsb3c6IGZ1bmN0aW9uKGZvbGxvd2VlLCBsb2dnZWRJblVzZXIpIHtcblx0XHRcdHJldHVybiAkaHR0cC5wdXQoJ2FwaS91c2VycycsIHt1c2VyVG9VbmZvbGxvdzogZm9sbG93ZWUsIGxvZ2dlZEluVXNlcjogbG9nZ2VkSW5Vc2VyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCd1bkZvbGxvdyByZXNwb25zZScsIHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnZHJhZ2dhYmxlJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XG4gICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICBcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xuICAgIFxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xuICAgICAgICBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKCdUZXh0JywgdGhpcy5pZCk7XG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnZHJhZycpO1xuXG4gICAgICAgIHZhciBpZHggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBhcnNlSW50KGF0dHJzLnBvc2l0aW9uKSk7XG4gICAgICAgIHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG4gICAgXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VuZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG5cbiAgfVxufSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Ryb3BwYWJsZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBkcm9wOiAnJicgLy8gcGFyZW50XG4gICAgfSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgLy8gYWdhaW4gd2UgbmVlZCB0aGUgbmF0aXZlIG9iamVjdFxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcbiAgICAgICAgICAvLyBhbGxvd3MgdXMgdG8gZHJvcFxuICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBmYWxzZVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdsZWF2ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgICAgXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cbiAgICAgICAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdXBvbiBkcm9wLCBjaGFuZ2luZyBwb3NpdGlvbiBhbmQgdXBkYXRpbmcgdHJhY2subG9jYXRpb24gYXJyYXkgb24gc2NvcGUgXG4gICAgICAgICAgdmFyIGl0ZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlLmRhdGFUcmFuc2Zlci5nZXREYXRhKCdUZXh0JykpO1xuICAgICAgICAgIHZhciByb3dJZCwgdHJhY2tJbmRleDtcblxuICAgICAgICAgIC8vZ2V0IHRyYWNrSWQgb2YgZHJvcHBhYmxlIGNvbnRhaW5lclxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGlmKG5hbWUuaW5jbHVkZXMoXCJ0cmFja1wiKSkge1xuICAgICAgICAgICAgICB0cmFja0luZGV4ID0gbmFtZS5zcGxpdChcInRyYWNrXCIpWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vZ2V0IHRyYWNrSWQgb2YgZHJhZ2dhYmxlIGNvbnRhaW5lclxuICAgICAgICAgIGl0ZW0uY2xhc3NMaXN0LmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGlmKG5hbWUuaW5jbHVkZXMoXCJ0cmFja0xvb3BcIikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2cobmFtZS5zcGxpdChcInRyYWNrTG9vcFwiKVsxXSk7XG4gICAgICAgICAgICAgIHJvd0lkID0gbmFtZS5zcGxpdChcInRyYWNrTG9vcFwiKVsxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgeHBvc2l0aW9uID0gcGFyc2VJbnQodGhpcy5hdHRyaWJ1dGVzLnhwb3NpdGlvbi52YWx1ZSk7XG4gICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSB0aGlzLmNoaWxkTm9kZXM7XG4gICAgICAgICAgdmFyIG9sZFRpbWVsaW5lSWQ7XG4gICAgICAgICAgdmFyIHRoZUNhbnZhcztcblxuICAgICAgICAgIC8vaWYgcm93SWQgPSB0cmFjay5pbmRleE9mKClcbiAgICAgICAgICAvLyBpZigpXG4gICAgICAgICAgY29uc29sZS5sb2coJ1JPV0lEJywgcm93SWQsIFwidHJhY2tJbmRleFwiLCB0cmFja0luZGV4KTtcbiAgICAgICAgICBpZihwYXJzZUludChyb3dJZCkgPT09IHBhcnNlSW50KHRyYWNrSW5kZXgpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGROb2Rlc1tpXS5jbGFzc05hbWUgPT09ICdjYW52YXMtYm94Jykge1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1tpXS5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnB1c2goeHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzTm9kZSA9IHRoaXMuY2hpbGROb2Rlc1tpXS5jaGlsZE5vZGVzO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzTm9kZS5sZW5ndGg7IGorKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzTm9kZVtqXS5ub2RlTmFtZSA9PT0gJ0NBTlZBUycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMucG9zaXRpb24udmFsdWUgPSB4cG9zaXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkVGltZWxpbmVJZCA9IGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy50aW1lbGluZUlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9sZFRpbWVsaW5lSWQgPSBjYW52YXNOb2RlW2pdLmRhdGFzZXQudGltZWxpbmVJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnT0xEIFRJTUVMSU5FJywgb2xkVGltZWxpbmVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlQ2FudmFzID0gY2FudmFzTm9kZVtqXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSAgICAgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbGRUaW1lbGluZUlkJywgb2xkVGltZWxpbmVJZCk7XG4gICAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQubW92ZUluVGltZWxpbmUob2xkVGltZWxpbmVJZCwgeHBvc2l0aW9uKS50aGVuKGZ1bmN0aW9uIChuZXdUaW1lbGluZUlkKSB7XG4gICAgICAgICAgICAgICAgdGhlQ2FudmFzLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZSA9IG5ld1RpbWVsaW5lSWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNhbGwgdGhlIGRyb3AgcGFzc2VkIGRyb3AgZnVuY3Rpb25cbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgfVxuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2ZvbGxvd2RpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJ1xuXHR9O1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRzdGF0ZSwgQXV0aFNlcnZpY2UsIHVzZXJGYWN0b3J5KXtcblxuXG5cblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XG4gICAgICAgICBcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XG4gICAgICAgICAgXHR1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcblx0ICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuXG5cdCAgICAgICAgICAgIGlmKCRzdGF0ZS5jdXJyZW50Lm5hbWUgPT09IFwidXNlclByb2ZpbGUuZm9sbG93ZXJzXCIpe1xuXHQgICAgICAgICAgICBcdCRzY29wZS5mb2xsb3dzID0gdXNlci5mb2xsb3dlcnM7XG5cdCAgICAgICAgICAgIH0gZWxzZXtcblx0ICAgICAgICAgICAgXHQkc2NvcGUuZm9sbG93cyA9IHVzZXIuZm9sbG93aW5nO1xuXHQgICAgICAgICAgICBcdGlmKCRzdGF0ZVBhcmFtcy50aGVJRCA9PT0gbG9nZ2VkSW5Vc2VyLl9pZCkgJHNjb3BlLnNob3dCdXR0b24gPSB0cnVlO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZm9sbG93T2JqIGlzXCIsICRzY29wZS5mb2xsb3dzLCAkc3RhdGVQYXJhbXMpO1xuXG5cdCAgICBcdH0pO1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLmdvVG9Gb2xsb3cgPSBmdW5jdGlvbihmb2xsb3cpe1xuXHQgICAgICBjb25zb2xlLmxvZyhcImNsaWNrZWRcIiwgZm9sbG93KTtcblx0ICAgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHsgdGhlSUQ6IGZvbGxvdy5faWR9KTtcblx0ICAgIH07XG5cblx0ICAgICRzY29wZS51bkZvbGxvdyA9IGZ1bmN0aW9uKGZvbGxvd2VlKSB7XG5cdCAgICBcdGNvbnNvbGUubG9nKCRzY29wZS5mb2xsb3dzKTtcbiAgICBcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAkc2NvcGUuZm9sbG93cy5sZW5ndGg7IGkrKykge1xuICAgIFx0XHRcdFx0aWYoJHNjb3BlLmZvbGxvd3NbaV0uX2lkID09PSBmb2xsb3dlZS5faWQpe1xuICAgIFx0XHRcdFx0XHR2YXIgZGVsID0gJHNjb3BlLmZvbGxvd3Muc3BsaWNlKGksIDEpO1xuICAgIFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcImRlbGV0ZVwiLCBkZWwsICRzY29wZS5mb2xsb3dzKTtcbiAgICBcdFx0XHRcdH1cbiAgICBcdFx0fVxuXHQgICAgXHR1c2VyRmFjdG9yeS51bkZvbGxvdyhmb2xsb3dlZSwgJHNjb3BlLmxvZ2dlZEluVXNlcikudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdCAgICBcdFx0Y29uc29sZS5sb2coXCJzdWNjZXNmdWxcIiwgcmVzcG9uc2UpO1xuXHQgICAgXHRcdCRzY29wZS4kZGlnZXN0KCk7XHRcblx0ICAgIFx0fSk7XG5cblx0ICAgIH07XG5cblx0XG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbG9hZGluZ0dpZicsIGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbG9hZGluZy1naWYvbG9hZGluZy5odG1sJ1xuXHR9O1xufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUsIFByb2plY3RGY3QpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgdmFyIHNldE5hdmJhciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcil7XG4gICAgICAgICAgICAgICAgICAgIGlmKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXJJZCA9IHVzZXIuX2lkO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Byb2ZpbGUnLCBzdGF0ZTogJ3VzZXJQcm9maWxlKHt0aGVJRDogdXNlcklkfSknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZXROYXZiYXIoKTtcblxuICAgICAgICAgICAgLy8gc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ3Byb2plY3QnIH0sXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ1NpZ24gVXAnLCBzdGF0ZTogJ3NpZ251cCcgfSxcbiAgICAgICAgICAgIC8vICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICd1c2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgLy8gXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubmV3UHJvamVjdEJ1dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgUHJvamVjdEZjdC5uZXdQcm9qZWN0KHNjb3BlLnVzZXIpLnRoZW4oZnVuY3Rpb24ocHJvamVjdElkKXtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogcHJvamVjdElkfSk7ICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldE5hdmJhcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHNldE5hdmJhcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgncHJvamVjdGRpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ3Byb2plY3RkaXJlY3RpdmVDb250cm9sbGVyJ1xuXHR9O1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlLCAkbWRUb2FzdCl7XG5cblxuXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xuXHRcdFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcblx0XHRcdCRzY29wZS5kaXNwbGF5QVByb2plY3QgPSBmdW5jdGlvbihzb21ldGhpbmcpe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnVEhJTkcnLCBzb21ldGhpbmcpO1xuXHRcdFx0XHRpZigkc2NvcGUubG9nZ2VkSW5Vc2VyLl9pZCA9PT0gJHN0YXRlUGFyYW1zLnRoZUlEKXtcblx0XHRcdFx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBzb21ldGhpbmcuX2lkfSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0XHRcdGlmKCFwcm9qZWN0LmZvcmtPcmlnaW4pIHByb2plY3QuZm9ya09yaWdpbiA9IHByb2plY3QuX2lkO1xuXHRcdFx0XHQkbWRUb2FzdC5zaG93KHtcblx0XHRcdFx0aGlkZURlbGF5OiAyMDAwLFxuXHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG5cdFx0XHRcdHRlbXBsYXRlOlwiPG1kLXRvYXN0PiBJdCdzIGJlZW4gZm9ya2VkIDwvbWQtdG9hc3Q+XCJcblx0XHRcdH0pO1xuXG5cdFx0XHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XG5cdFx0XHRcdHByb2plY3Qub3duZXIgPSBsb2dnZWRJblVzZXIuX2lkO1xuXHRcdFx0XHRkZWxldGUgcHJvamVjdC5faWQ7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKHByb2plY3QpO1xuXHRcdFx0XHRQcm9qZWN0RmN0LmNyZWF0ZUFGb3JrKHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JrIHJlc3BvbnNlIGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0JHNjb3BlLmRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcblx0XHRcdFx0Y29uc29sZS5sb2coJHNjb3BlLnVzZXIucHJvamVjdHMpO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8ICRzY29wZS51c2VyLnByb2plY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHRcdFx0XHRpZigkc2NvcGUudXNlci5wcm9qZWN0c1tpXS5faWQgPT09IHByb2plY3QuX2lkKXtcbiAgICBcdFx0XHRcdFx0dmFyIGRlbCA9ICRzY29wZS51c2VyLnByb2plY3RzLnNwbGljZShpLCAxKTtcbiAgICBcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJkZWxldGVcIiwgZGVsLCAkc2NvcGUudXNlci5wcm9qZWN0cyk7XG4gICAgXHRcdFx0XHR9XG4gICAgXHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0RlbGV0ZVByb2plY3QnLCBwcm9qZWN0KVxuXHRcdFx0XHRQcm9qZWN0RmN0LmRlbGV0ZVByb2plY3QocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0RlbGV0ZSByZXF1ZXN0IGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0JHNjb3BlLnBvc3RUb1NvdW5kY2xvdWQgPSBmdW5jdGlvbihwcm9qZWN0KXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1VwbG9hZGluZyBQcm9qZWN0JywgcHJvamVjdCk7XG5cdFx0XHRcdFByb2plY3RGY3QudXBsb2FkUHJvamVjdChwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnVXBsb2FkIFJlcXVlc3QgaXMnLCByZXNwb25zZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cblx0XHR9KTtcblx0XG59KTsiLCJhcHAuZGlyZWN0aXZlKCd4aW1UcmFjaycsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEFuYWx5c2VyRmN0LCAkcSkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5odG1sJyxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiVFJDS1wiLCBzY29wZS50cmFjayk7XG5cdFx0XHQvLyBUT0RPOiBub3Qgc3VyZSB3aGF0IHRoaXMgaXNcblx0XHRcdHNjb3BlLmVmZmVjdFdldG5lc3NlcyA9IHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrLm1hcChmdW5jdGlvbiAoZWZmZWN0KSB7XG5cdFx0XHRcdHJldHVybiBlZmZlY3Qud2V0LnZhbHVlICogMTAwMDtcblx0XHRcdH0pO1xuXHRcdFx0XHRzY29wZS52b2x1bWUgPSBuZXcgVG9uZS5Wb2x1bWUoKTtcblx0XHRcdFx0c2NvcGUudm9sdW1lLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uZm9yRWFjaChmdW5jdGlvbiAobG9jKSB7XG5cdFx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcblx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgbG9jKTtcblx0XHRcdFx0XHQkKCcjbWVhc3VyZScgKyBsb2MgKyAnLnRyYWNrJyArIHRyYWNrSW5kZXgpLmZpcnN0KCkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBsb2MgKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgdHJhY2tJbmRleCArIFwiLVwiICsgbG9jICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK3RyYWNrSW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LCAwKTtcblxuXHRcdFx0c2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgsIHBvc2l0aW9uKSB7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XG5cdFx0XHRcdC8vIHZhciBwb3NpdGlvbiA9IDA7XG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcblxuXHRcdFx0XHRpZiAoc2NvcGUudHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Ly8gZHJvcCB0aGUgbG9vcCBvbiB0aGUgZmlyc3QgYXZhaWxhYmxlIGluZGV4XHRcdFx0XHRcblx0XHRcdFx0XHR3aGlsZSAoc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbikgPiAtMSkge1xuXHRcdFx0XHRcdFx0cG9zaXRpb24rKztcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9hcHBlbmQgY2FudmFzIGVsZW1lbnRcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24ucHVzaChwb3NpdGlvbik7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcblx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIHBvc2l0aW9uKTtcblx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1twb3NpdGlvbl0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgcG9zaXRpb24gKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgaW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK2luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XG5cdFx0XHRcdFxuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUubW92ZUluVGltZWxpbmUgPSBmdW5jdGlvbiAob2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xuXHRcdFx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0XHRUb25lVHJhY2tGY3QucmVwbGFjZVRpbWVsaW5lTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpLnRoZW4ocmVzb2x2ZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblxuXG5cdFx0XHRzY29wZS5hcHBlYXJPckRpc2FwcGVhciA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgdHJhY2tJbmRleCA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLmluZGV4T2Yoc2NvcGUudHJhY2spO1xuXHRcdFx0XHR2YXIgbG9vcEluZGV4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbik7XG5cblx0XHRcdFx0aWYoc2NvcGUudHJhY2sub25UaW1lbGluZSkge1xuXHRcdFx0XHRcdGlmKGxvb3BJbmRleCA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnB1c2gocG9zaXRpb24pO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xuXHRcdFx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIHBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdC8vIGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK3RyYWNrSW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XG5cdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XG5cdFx0XHRcdFx0XHQvL3JlbW92ZSBmcm9tIGxvY2F0aW9ucyBhcnJheVxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc3BsaWNlKGxvb3BJbmRleCwgMSk7XG5cdFx0XHRcdFx0XHQvL3JlbW92ZSB0aW1lbGluZUlkXG5cdFx0XHRcdFx0XHRUb25lVHJhY2tGY3QuZGVsZXRlVGltZWxpbmVMb29wKCBjYW52YXMuYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlICk7XG5cdFx0XHRcdFx0XHQvL3JlbW92ZSBjYW52YXMgaXRlbVxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24gcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XG5cdFx0XHRcdFx0XHQgICAgZWxlbWVudCAmJiBlbGVtZW50LnBhcmVudE5vZGUgJiYgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmVtb3ZlRWxlbWVudCggY2FudmFzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdOTyBEUk9QJyk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdHNjb3BlLnJlUmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XG5cdFx0XHRcdC8vY2hhbmdlIGFsbCBwYXJhbXMgYmFjayBhcyBpZiBlbXB0eSB0cmFja1xuXHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IHRydWU7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gbnVsbDtcblx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IG51bGw7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IG51bGw7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcblx0XHRcdFx0Ly9kaXNwb3NlIG9mIGVmZmVjdHNSYWNrXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrLmZvckVhY2goZnVuY3Rpb24gKGVmZmVjdCkge1xuXHRcdFx0XHRcdGVmZmVjdC5kaXNwb3NlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzY29wZS50cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwwLDAsMF0pO1xuXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uID0gW107XG5cdFx0XHRcdC8vcmVtb3ZlIGFsbCBsb29wcyBmcm9tIFVJXG5cdFx0XHRcdHZhciBsb29wc1VJID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgndHJhY2tMb29wJytpbmRleC50b1N0cmluZygpKTtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJMT09QU1wiLCBsb29wc1VJKTtcblx0XHRcdFx0d2hpbGUobG9vcHNVSS5sZW5ndGggIT09IDApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnTE9PUFMgQVJSJywgbG9vcHNVSSk7XG5cdFx0XHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGxvb3BzVUkubGVuZ3RoO2krKykge1xuXHRcdFx0XHRcdFx0bG9vcHNVSVtpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGxvb3BzVUlbaV0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsb29wc1VJID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgndHJhY2tMb29wJytpbmRleC50b1N0cmluZygpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XG5cdFx0XHR9O1xuXG5cdFx0XHRzY29wZS5zb2xvID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2YXIgb3RoZXJUcmFja3MgPSBzY29wZS4kcGFyZW50LnRyYWNrcy5tYXAoZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRcdFx0aWYodHJhY2sgIT09IHNjb3BlLnRyYWNrKSB7XG5cdFx0XHRcdFx0XHR0cmFjay5zaWxlbmNlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHJldHVybiB0cmFjaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLmZpbHRlcihmdW5jdGlvbiAodHJhY2spIHtcblx0XHRcdFx0XHRpZih0cmFjayAmJiB0cmFjay5wbGF5ZXIpIHJldHVybiB0cnVlO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0Lm11dGVBbGwob3RoZXJUcmFja3MpO1xuXHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUuc2lsZW5jZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYoIXNjb3BlLnRyYWNrLnNpbGVuY2UpIHtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gLTEwMDtcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdHNjb3BlLnJlY29yZCA9IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdFx0XHR2YXIgcmVjb3JkZXIgPSAkcm9vdFNjb3BlLnJlY29yZGVyO1xuXG5cdFx0XHRcdHZhciBjb250aW51ZVVwZGF0ZSA9IHRydWU7XG5cblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxuXHRcdCAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYW5hbHlzZXJcIitpbmRleCk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gJHJvb3RTY29wZS5hbmFseXNlck5vZGU7XG5cdFx0XHRcdHZhciBhbmFseXNlcklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XG5cblx0XHRcdFx0c2NvcGUudHJhY2sucmVjb3JkaW5nID0gdHJ1ZTtcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xuXHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlcik7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcblx0XHRcdFx0c2NvcGUuJHBhcmVudC5jdXJyZW50bHlSZWNvcmRpbmcgPSB0cnVlO1xuXG5cblx0XHRcdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xuXHRcdFx0XHRcdHZhciBTUEFDSU5HID0gMztcblx0XHRcdFx0XHR2YXIgQkFSX1dJRFRIID0gMTtcblx0XHRcdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XG5cdFx0XHRcdFx0dmFyIGZyZXFCeXRlRGF0YSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XG5cblx0XHRcdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXG5cblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gJyNGNkQ1NjUnO1xuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcblx0XHRcdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XG5cblx0XHRcdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmb3IgZWFjaCBmcmVxdWVuY3kgYmluLlxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgKytpKSB7XG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcblx0XHRcdFx0XHRcdHZhciBvZmZzZXQgPSBNYXRoLmZsb29yKCBpICogbXVsdGlwbGllciApO1xuXHRcdFx0XHRcdFx0Ly8gZ290dGEgc3VtL2F2ZXJhZ2UgdGhlIGJsb2NrLCBvciB3ZSBtaXNzIG5hcnJvdy1iYW5kd2lkdGggc3Bpa2VzXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxuXHRcdFx0XHRcdFx0ICAgIG1hZ25pdHVkZSArPSBmcmVxQnl0ZURhdGFbb2Zmc2V0ICsgal07XG5cdFx0XHRcdFx0XHRtYWduaXR1ZGUgPSBtYWduaXR1ZGUgLyBtdWx0aXBsaWVyO1xuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9IFwiaHNsKCBcIiArIE1hdGgucm91bmQoKGkqMzYwKS9udW1CYXJzKSArIFwiLCAxMDAlLCA1MCUpXCI7XG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFJlY3QoaSAqIFNQQUNJTkcsIDEwMCwgQkFSX1dJRFRILCAtbWFnbml0dWRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYoY29udGludWVVcGRhdGUpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGVuZFJlY29yZGluZyhwb3NpdGlvbikge1xuXHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0b3AoaW5kZXgsIHJlY29yZGVyKS50aGVuKGZ1bmN0aW9uIChwbGF5ZXIpIHtcblx0XHRcdFx0XHRcdC8vdHJhY2sgdmFyaWFibGVzXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5pbWcgPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nSW1hZ2U7XG5cblx0XHRcdFx0XHRcdC8vY3JlYXRlIHBsYXllclxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gcGxheWVyO1xuXHRcdFx0XHRcdFx0cGxheWVyLmNvbm5lY3Qoc2NvcGUudHJhY2suZWZmZWN0c1JhY2tbMF0pO1xuXG5cdFx0XHRcdFx0XHQvL3N0b3AgYW5hbHlzZXJcblx0XHRcdFx0XHRcdGNvbnRpbnVlVXBkYXRlID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcblxuXHRcdFx0XHRcdFx0Ly9zZXQgUHJvamVjdCB2YXJzXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdG9wKCk7XG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LmN1cnJlbnRseVJlY29yZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Ly8gc2NvcGUuJHBhcmVudC5zdG9wKCk7XG5cdFx0XHRcdFx0XHQvLyBUb25lVGltZWxpbmVGY3QudW5NdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xuXHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uID0gXCItMTowOjBcIjtcblx0XHRcdFx0XHRzY29wZS4kcGFyZW50LmNvdW50TnVtYmVyID0gMDtcblx0XHRcdFx0XHRzY29wZS4kcGFyZW50LmNvdW50SW4gPSB0cnVlO1xuXHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XG5cdFx0XHRcdFx0dmFyIGluY0NvdW50ID0gVG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jb3VudE51bWJlciA9IHNjb3BlLiRwYXJlbnQuY291bnROdW1iZXIgKyAxO1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC4kZGlnZXN0KCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9LCBcIjRuXCIpO1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZGluZ0lEID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jb3VudEluID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhzY29wZS4kcGFyZW50LmNvdW50SW4pO1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC4kZGlnZXN0KCk7XG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhckludGVydmFsKGluY0NvdW50KTtcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XG5cdFx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XG5cdFx0XHRcdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0XHRlbmRSZWNvcmRpbmcoMCk7XG5cdFx0XHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShyZWNvcmRpbmdJRCk7XG5cblx0XHRcdFx0XHRcdFx0fSwgMjAwMCk7XG5cdFx0XHRcdFx0XHR9LCA1MCk7XG5cdFx0XHRcdFx0fSwgXCIwbVwiKTtcblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciBuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xuXHRcdFx0XHRcdHZhciBlbmRCYXIgPSBuZXh0QmFyICsgMTtcblxuXHRcdFx0XHRcdHZhciByZWNJZCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RhcnQocmVjb3JkZXIsIGluZGV4KTtcblx0XHRcdFx0XHRcdH0sIDUwKTtcblx0XHRcdFx0XHR9LCBuZXh0QmFyLnRvU3RyaW5nKCkgKyBcIm1cIik7XG5cblxuXHRcdFx0XHRcdHZhciByZWNFbmRJZCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocmVjSWQpO1xuXHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShyZWNFbmRJZCk7XG5cdFx0XHRcdFx0XHRlbmRSZWNvcmRpbmcobmV4dEJhcik7XG5cblx0XHRcdFx0XHR9LCBlbmRCYXIudG9TdHJpbmcoKSArIFwibVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXG5cdFx0XHRzY29wZS5wcmV2aWV3ID0gZnVuY3Rpb24oY3VycmVudGx5UHJldmlld2luZykge1xuXHRcdFx0XHR2YXIgbmV4dEJhcjtcblx0XHRcdFx0aWYoIXNjb3BlLiRwYXJlbnQucHJldmlld2luZ0lkKSB7XG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IHRydWU7XG5cblx0XHRcdFx0XHRpZihUb25lLlRyYW5zcG9ydC5zdGF0ZSA9PT0gXCJzdG9wcGVkXCIpIHtcblx0XHRcdFx0XHRcdG5leHRCYXIgPSBwYXJzZUludChUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpWzBdKTtcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG5leHRCYXIgPSBwYXJzZUludChUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpWzBdKSArIDE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZhciBwbGF5TGF1bmNoID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcblx0XHRcdFx0XHRcdHZhciBwcmV2aWV3SW50ZXZhbCA9IFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0b3AoKTtcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGxheUxhdW5jaCk7XG5cdFx0XHRcdFx0XHR9LCBcIjFtXCIpO1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5wcmV2aWV3aW5nSWQgPSBwcmV2aWV3SW50ZXZhbDtcblx0XHRcdFx0XHR9LCBuZXh0QmFyLnRvU3RyaW5nKCkgKyBcIm1cIik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0FMUkVBRFkgUFJFVklFV0lORycpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRzY29wZS5jaGFuZ2VXZXRuZXNzID0gZnVuY3Rpb24oZWZmZWN0LCBhbW91bnQpIHtcblx0XHRcdFx0ZWZmZWN0LndldC52YWx1ZSA9IGFtb3VudCAvIDEwMDA7XG5cdFx0XHRcdGVmZmVjdC5zYXZlVmFsdWUgPSBhbW91bnQgLyAxMDAwO1xuXHRcdFx0fTtcblxuXHRcdH1cblx0XHRcblxuXHR9O1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9