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
app.run(function ($rootScope, AuthService, $state) {

	// The given state requires an authenticated user.
	var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
		return state.data && state.data.authenticate;
	};

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
		controller: "ForkWebController"
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

		console.log("network", $scope.nodes);
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
		console.log("PLEASE", linkArr, nodeArr);
		var nodes = nodeArr;
		var links = linkArr;

		var width = 960,
		    height = 500;

		var color = d3.scale.category20();

		var fisheye = d3.fisheye.circular().radius(120);

		var force = d3.layout.force().charge(-240).linkDistance(40).size([width, height]);

		var svg = d3.select("#ui").append("svg").attr("width", width).attr("height", height);

		svg.append("rect").attr("class", "background").attr("width", width).attr("height", height);

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

		var link = svg.selectAll(".link").data(links).enter().append("line").attr("class", "link").attr("x1", function (d) {
			return d.source.x;
		}).attr("y1", function (d) {
			return d.source.y;
		}).attr("x2", function (d) {
			return d.target.x;
		}).attr("y2", function (d) {
			return d.target.y;
		}).style("stroke-width", function (d) {
			return 2;
		});

		var node = svg.selectAll(".node").data(nodes).enter().append("circle").attr("class", "node").attr("cx", function (d) {
			return d.x;
		}).attr("cy", function (d) {
			return d.y;
		}).attr("r", 4.5).style("fill", function (d) {
			return "blue";
		}).call(force.drag);

		svg.on("mousemove", function () {
			fisheye.focus(d3.mouse(this));

			node.each(function (d) {
				d.fisheye = fisheye(d);
			}).attr("cx", function (d) {
				return d.fisheye.x;
			}).attr("cy", function (d) {
				return d.fisheye.y;
			}).attr("r", function (d) {
				return d.fisheye.z * 4.5;
			});

			link.attr("x1", function (d) {
				return d.source.fisheye.x;
			}).attr("y1", function (d) {
				return d.source.fisheye.y;
			}).attr("x2", function (d) {
				return d.target.fisheye.x;
			}).attr("y2", function (d) {
				return d.target.fisheye.y;
			});
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

app.controller('ProjectController', function ($scope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AuthService) {

	//window events
	window.onblur = function () {
		$scope.stop();
		$scope.$digest();
	};
	window.onbeforeunload = function () {
		return "Are you sure you want to leave this page before saving your work?";
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
	RecorderFct.recorderInit().then(function (retArr) {
		$scope.recorder = retArr[0];
		$scope.analyserNode = retArr[1];
	})['catch'](function (e) {
		alert('Error getting audio');
		console.log(e);
	});

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
							$('#measure' + loc + '.track' + i).first().append($compile("<canvas width='198' height='98' position='" + loc + "' timelineId='" + timelineId + "' id='mdisplay" + i + "-" + loc + "' class='item trackLoop" + i + "' style='position: absolute; background: url(" + track.img + ");' draggable></canvas>"));
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
			Tone.Transport.position = measure.toString() + ":0:0";
			$scope.movePlayhead(measure);
		}
	};

	$scope.movePlayhead = function (numberMeasures) {
		var playHead = document.getElementById('playbackHead');
		$('#timelinePosition').val("0:0");
		playHead.style.left = (numberMeasures * 200 + 300).toString() + 'px';
	};

	$scope.zoomOut = function () {
		$scope.zoom -= 10;
		var zoom = ($scope.zoom - 10).toString() + "%";
		$('.timeline-container').css('zoom', zoom);
	};

	$scope.zoomIn = function () {
		$scope.zoom += 10;
		var zoom = ($scope.zoom + 10).toString() + "%";
		$('.timeline-container').css('zoom', zoom);
	};

	$scope.addTrack = function () {};

	$scope.play = function () {
		$scope.playing = true;
		Tone.Transport.position = $scope.position.toString() + ":0:0";
		Tone.Transport.start();
	};
	$scope.pause = function () {
		$scope.playing = false;
		$scope.metronome.stop();
		ToneTimelineFct.stopAll($scope.tracks);
		$scope.position = Tone.Transport.position.split(':')[0];
		var playHead = document.getElementById('playbackHead');
		$('#timelinePosition').val("0:0");
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
		$('#timelinePosition').val("0:0");
		$('#positionSelector').val("0");
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
			$scope.nameError = "You must set a name!";
			$scope.projectName = "Untitled";
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
	document.getElementsByTagName('navbar')[0].style.display = "block";
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
			var imgArr = ["https://i1.sndcdn.com/artworks-000121902503-djbqh6-t500x500.jpg", "https://i1.sndcdn.com/artworks-000121795778-cmq0x1-t500x500.jpg", "https://i1.sndcdn.com/artworks-000123015713-wuuuy9-t500x500.jpg", "https://i1.sndcdn.com/artworks-000121925392-2hw3hg-t500x500.jpg", "https://i1.sndcdn.com/artworks-000122546910-xmjb63-t500x500.jpg", "https://i1.sndcdn.com/artworks-000122506583-ozzx85-t500x500.jpg", "https://i1.sndcdn.com/artworks-000103418932-te6hs4-t500x500.jpg"];

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
				template: "<md-toast> It's been forked </md-toast>"
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
	document.getElementsByTagName('navbar')[0].style.display = "none";

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

		e.classList.add("recording");
		audioRecorder.clear();
		audioRecorder.record();

		window.setTimeout(function () {
			audioRecorder.stop();
			e.classList.remove("recording");
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
			var imgArr = ["https://i1.sndcdn.com/artworks-000121902503-djbqh6-t500x500.jpg", "https://i1.sndcdn.com/artworks-000103418932-te6hs4-t500x500.jpg", "https://i1.sndcdn.com/artworks-000121795778-cmq0x1-t500x500.jpg", "https://i1.sndcdn.com/artworks-000121925392-2hw3hg-t500x500.jpg", "https://i1.sndcdn.com/artworks-000122506583-ozzx85-t500x500.jpg", "https://i1.sndcdn.com/artworks-000123015713-wuuuy9-t500x500.jpg", "https://i1.sndcdn.com/artworks-000122546910-xmjb63-t500x500.jpg"];

			$scope.user.projects.forEach(function (aProject) {
				aProject.backgroundImg = imgArr[Math.floor(Math.random() * 9)];
			});

			if (!$scope.user.profpic) {
				$scope.user.profpic = "https://www.mdr101.com/wp-content/uploads/2014/05/placeholder-user.jpg";
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
				analyserContext.fillStyle = "hsl( " + Math.round(i * 360 / numBars) + ", 100%, 50%)";
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
				"audio": {
					"mandatory": {
						"googEchoCancellation": "false",
						"googAutoGainControl": "false",
						"googNoiseSuppression": "false",
						"googHighpassFilter": "false"
					},
					"optional": []
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
				var canvas = document.getElementById("wavedisplay" + index);
				var canvasLoop = document.getElementById("waveForLoop" + index);
				drawBuffer(300, 100, canvas.getContext('2d'), buffers[0]);
				drawBuffer(198, 98, canvasLoop.getContext('2d'), buffers[0]);
				window.latestBuffer = buffers[0];
				window.latestRecordingImage = canvasLoop.toDataURL("image/png");

				// the ONLY time gotBuffers is called is right after a new recording is completed -
				// so here's where we should set up the download.
				recorder.exportWAV(function (blob) {
					//needs a unique name
					// Recorder.setupDownload( blob, "myRecording0.wav" );
					//create loop time
					ToneTrackFct.loopInitialize(blob, index, "myRecording0.wav").then(resolve);
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
							console.log("EFFECT", effect, effect.wet.value);
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
					var posArr = Tone.Transport.position.split(":");
					if (posArr.length === 3) {
						$('#timelinePosition').val(posArr[1] + ":" + posArr[2]);
						$('#positionSelector').val(posArr[0]);
					} else {
						$('#timelinePosition').val(posArr[1] + ":" + posArr[2]);
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
			var met = new Tone.Player("/api/wav/Click1.wav", function () {
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
			var link = document.getElementById("save" + index);
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
		chorus.name = "Chorus";
		var phaser = new Tone.Phaser();
		phaser.name = "Phaser";
		var distort = new Tone.Distortion();
		distort.name = "Distortion";
		var pingpong = new Tone.PingPongDelay("4m");
		pingpong.name = "Ping Pong";

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
		}, measure + "m");
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
					if (name.includes("track")) {
						trackIndex = name.split("track")[1];
					}
				});
				//get trackId of draggable container
				item.classList.forEach(function (name) {
					if (name.includes("trackLoop")) {
						console.log(name.split("trackLoop")[1]);
						rowId = name.split("trackLoop")[1];
					}
				});
				var xposition = parseInt(this.attributes.xposition.value);
				var childNodes = this.childNodes;
				var oldTimelineId;
				var theCanvas;

				//if rowId = track.indexOf()
				// if()
				console.log('ROWID', rowId, "trackIndex", trackIndex);
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

			if ($state.current.name === "userProfile.followers") {
				$scope.follows = user.followers;
			} else {
				$scope.follows = user.following;
				if ($stateParams.theID === loggedInUser._id) $scope.showButton = true;
			}
			// console.log("followObj is", $scope.follows, $stateParams);
		});
	});

	$scope.goToFollow = function (follow) {
		console.log("clicked", follow);
		$state.go('userProfile', { theID: follow._id });
	};

	$scope.unFollow = function (followee) {
		console.log($scope.follows);
		for (var i = 0; i < $scope.follows.length; i++) {
			if ($scope.follows[i]._id === followee._id) {
				var del = $scope.follows.splice(i, 1);
				console.log("delete", del, $scope.follows);
			}
		}
		userFactory.unFollow(followee, $scope.loggedInUser).then(function (response) {
			console.log("succesful", response);
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
				template: "<md-toast> It's been forked </md-toast>"
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
					console.log("delete", del, $scope.user.projects);
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
					$('#measure' + loc + '.track' + trackIndex).first().append($compile("<canvas width='198' height='98' position='" + loc + "' timelineId='" + timelineId + "' id='mdisplay" + trackIndex + "-" + loc + "' class='item trackLoop" + trackIndex + "' style='position: absolute; background: url(" + scope.track.img + ");' draggable></canvas>")(scope));
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
				angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='" + timelineId + "' id='mdisplay" + index + "-" + position + "' class='item trackLoop" + index + "' style='position: absolute; background: url(" + scope.track.img + ");' draggable></canvas>")(scope));
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
						angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='" + timelineId + "' id='mdisplay" + trackIndex + "-" + position + "' class='item trackLoop" + trackIndex + "' style='position: absolute; background: url(" + scope.track.img + ");' draggable></canvas>")(scope));
					} else {
						//remove canvas item

						var removeElement = function removeElement(element) {
							element && element.parentNode && element.parentNode.removeChild(element);
						};

						var canvas = document.getElementById("mdisplay" + trackIndex + "-" + position);
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
				console.log("LOOPS", loopsUI);
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
				var recorder = scope.recorder;

				var continueUpdate = true;

				//analyser stuff
				var canvas = document.getElementById("analyser" + index);
				var analyserContext = canvas.getContext('2d');
				var analyserNode = scope.analyserNode;
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
						analyserContext.fillStyle = "hsl( " + Math.round(i * 360 / numBars) + ", 100%, 50%)";
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

				if (Tone.Transport.state === "stopped") {
					Tone.Transport.position = "-1:0:0";
					scope.$parent.countNumber = 0;
					scope.$parent.countIn = true;
					Tone.Transport.start();
					var incCount = Tone.Transport.setInterval(function () {
						scope.$parent.countNumber = scope.$parent.countNumber + 1;
						scope.$parent.$digest();
					}, "4n");

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
					}, "0m");
				} else {
					var nextBar = parseInt(Tone.Transport.position.split(':')[0]) + 1;
					var endBar = nextBar + 1;

					var recId = Tone.Transport.setTimeline(function () {
						window.setTimeout(function () {
							RecorderFct.recordStart(recorder, index);
						}, 50);
					}, nextBar.toString() + "m");

					var recEndId = Tone.Transport.setTimeline(function () {
						Tone.Transport.clearTimeline(recId);
						Tone.Transport.clearTimeline(recEndId);
						endRecording(nextBar);
					}, endBar.toString() + "m");
				}
			};

			scope.preview = function (currentlyPreviewing) {
				var nextBar;
				if (!scope.$parent.previewingId) {
					scope.track.previewing = true;

					if (Tone.Transport.state === "stopped") {
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
						}, "1m");
						scope.$parent.previewingId = previewInteval;
					}, nextBar.toString() + "m");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZvcmt3ZWIvZm9ya3dlYi5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9MYW5kaW5nUGFnZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTmV3UHJvamVjdENvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVGltZWxpbmVDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1VzZXJDb250cm9sbGVyLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9BbmFseXNlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRm9ya0ZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0hvbWVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1Byb2plY3RGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9sb2FkaW5nLWdpZi9sb2FkaW5nLWdpZi5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSx1QkFBQSxFQUFBO0FBQ0Esd0JBQUEsQ0FBQSxRQUFBLEdBQUEsa0NBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxHQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7OztBQUdBLEtBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxJQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBO0VBQ0EsQ0FBQTs7OztBQUlBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLE1BQUEsQ0FBQSw0QkFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBOzs7QUFHQSxVQUFBO0dBQ0E7O0FBRUEsTUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBLFVBQUE7R0FDQTs7O0FBR0EsT0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxPQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLE1BQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3ZEQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsVUFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtBQUNBLFlBQUEsRUFBQSxtQkFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLE9BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsT0FBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsS0FBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTtBQUNBLFVBQUEsSUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsTUFBQSxLQUFBLEdBQUEsT0FBQSxDQUFBOztBQUVBLE1BQUEsS0FBQSxHQUFBLEdBQUE7TUFBQSxNQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLE1BQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLEdBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsQ0FDQSxNQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxLQUFBLEdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FDQSxNQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FDQSxZQUFBLENBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLENBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxLQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxZQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7O0FBR0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFBQSxJQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7R0FBQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7OztBQUdBLE1BQUEsRUFBQSxHQUFBLENBQUE7TUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLEtBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUFBO0FBQ0EsSUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLENBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0dBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUNBLEtBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQTtHQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLElBQUEsR0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FDQSxLQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7R0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FDQSxLQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsVUFBQSxNQUFBLENBQUE7R0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxFQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxHQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsQ0FBQTtJQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtJQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsV0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDeEhBLENBQUEsWUFBQTs7QUFFQSxhQUFBLENBQUE7OztBQUdBLEtBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsd0JBQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxJQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLGVBQUEsRUFBQSxxQkFBQTtBQUNBLGdCQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLHdCQUFBO0FBQ0EsZUFBQSxFQUFBLHFCQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUE7QUFDQSxNQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0dBQ0EsQ0FBQTtBQUNBLFNBQUE7QUFDQSxnQkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLENBQUEsQ0FDQSxXQUFBLEVBQ0EsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBOzs7Ozs7QUFNQSxPQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7SUFDQTs7Ozs7QUFLQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUVBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsV0FBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLE9BQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLEVBQUEsQ0FBQTtBQ3hJQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsQ0FBQSxjQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsT0FBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsc0JBQUE7QUFDQSxZQUFBLEVBQUEsdUJBQUE7QUFDQSxTQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLHlCQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQTtHQUNBO0VBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ3BCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFFBQUE7QUFDQSxhQUFBLEVBQUEscUJBQUE7QUFDQSxZQUFBLEVBQUEsV0FBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxxQkFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtFQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBOzs7QUFHQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLGNBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxtRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsRUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsU0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxVQUFBLEVBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBSUEsS0FBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxNQUFBLE1BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsV0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLFNBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBOztBQUVBLFlBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsTUFBQSxLQUFBLGNBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO09BQ0E7TUFDQSxDQUFBOztBQUVBLFNBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBLENBQ0EsS0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSw0Q0FBQSxHQUFBLEdBQUEsR0FBQSxnQkFBQSxHQUFBLFVBQUEsR0FBQSxnQkFBQSxHQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLHlCQUFBLEdBQUEsQ0FBQSxHQUFBLCtDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSx5QkFBQSxDQUFBLENBQUEsQ0FBQTtPQUNBLENBQUEsQ0FBQTs7O0FBR0EsV0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7TUFDQSxNQUFBO0FBQ0EsV0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7TUFDQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsU0FBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0lBQ0E7QUFDQSxTQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtHQUNBOzs7O0FBSUEsUUFBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLFVBQUEsR0FBQSxFQUFBLEVBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtHQUNBOztBQUlBLGlCQUFBLENBQUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxjQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxNQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxHQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxNQUFBLENBQUEsWUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7R0FDQTtFQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsTUFBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUEsRUFDQSxDQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsR0FBQSxzQkFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFdBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsY0FBQSxDQUFBLGtCQUFBLENBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxNQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLEVBQUEsR0FBQSxLQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtHQUVBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsYUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7R0FFQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFNBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzlQQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFNBQUE7QUFDQSxhQUFBLEVBQUEsdUJBQUE7QUFDQSxZQUFBLEVBQUEsWUFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEscUJBQUE7QUFDQSxhQUFBLEVBQUEsMEJBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7OztBQUdBLE1BQUEsRUFBQTtBQUNBLGVBQUEsRUFBQSxJQUFBO0dBQ0E7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHdCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsT0FBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEscUJBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxXQUFBO0FBQ0EsYUFBQSxFQUFBLHVCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx1QkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFlBQUE7QUFDQSxhQUFBLEVBQUEsd0JBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHVCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSx3QkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNqQ0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsS0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLG9CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsUUFBQSxDQUFBLFdBQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsV0FBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFNBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsY0FBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxHQUFBLENBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsQ0FDQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxFQUFBLElBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQTtBQUNBLFlBQUEsRUFBQSx5Q0FBQTtJQUNBLENBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsa0JBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsS0FBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtHQUNBOztBQUVBLGNBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLEtBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7SUFDQSxNQUNBO0FBQ0EsUUFBQSxHQUFBLEtBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFHQSxPQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsSUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxFQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQUtBLENBQUEsQ0FBQTtBQ3pGQSxHQUFBLENBQUEsVUFBQSxDQUFBLHVCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsU0FBQSxDQUFBLG9CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxNQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLFNBQUEsR0FBQSxZQUFBO0FBQ0EsV0FBQSxjQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsT0FBQSxRQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUE7O0FBRUEsT0FBQSxVQUFBLEdBQUEsUUFBQSxDQUFBLGVBQUEsQ0FBQSxZQUFBLEdBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLFVBQUEsR0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtHQUNBOztBQUVBLGdCQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUlBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMvQ0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxzQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDWkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxvQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBOztBQUVBLEtBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtFQUNBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFHQSxXQUFBLENBQUEsY0FBQSxDQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsTUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7O01BRUE7S0FDQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7O0FBRUEsaUJBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBOzs7Ozs7OztBQVFBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLEdBQUEsR0FBQSxDQUFBLENBQUEsU0FBQSxDQUFBOzs7QUFHQSxTQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsYUFBQSxFQUNBLE9BQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLElBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTs7SUFHQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0dBRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsTUFBQSxTQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsT0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxJQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxFQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0dBRUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQU1BLENBQUEsQ0FBQTs7QUN0R0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLE1BQUEsR0FBQSxDQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLEVBQ0EsaUVBQUEsRUFDQSxpRUFBQSxFQUNBLGlFQUFBLENBQ0EsQ0FBQTs7QUFFQSxTQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsYUFBQSxHQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxHQUFBLHdFQUFBLENBQUE7SUFDQTs7QUFFQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0E7SUFDQTtHQUdBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7Ozs7OztBQVNBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSw0QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQUdBLENBQUEsQ0FBQTtBQ3pEQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLFdBQUEsTUFBQSxHQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsT0FBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFDQSxTQUFBLElBQUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7SUFDQTtBQUNBLE9BQUEsY0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBO0FBQ0EsUUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUdBLEtBQUEscUJBQUEsR0FBQSxTQUFBLHFCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsUUFBQTtBQUNBLGlCQUFBLEVBQUEsZUFBQTtBQUNBLHVCQUFBLEVBQUEscUJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDNUNBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLEtBQUEsTUFBQSxHQUFBLFNBQUEsTUFBQSxHQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsUUFBQTtBQUNBLFFBQUEsRUFBQSxNQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFFBQUE7QUFDQSxTQUFBLEVBQUEsaUJBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDYkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsS0FBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsU0FBQSxFQUFBOzs7QUFHQSxNQUFBLFNBQUEsR0FBQSxTQUFBLElBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGdCQUFBLEdBQUEsU0FBQSxJQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxVQUFBLENBQUEsZ0JBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLHlCQUFBLEVBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUdBLFFBQUE7QUFDQSxnQkFBQSxFQUFBLGNBQUE7QUFDQSxhQUFBLEVBQUEsV0FBQTtBQUNBLFlBQUEsRUFBQSxVQUFBO0FBQ0EsZUFBQSxFQUFBLGFBQUE7QUFDQSxZQUFBLEVBQUEsVUFBQTtBQUNBLGVBQUEsRUFBQSxhQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNuREEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLEtBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxHQUFBOztBQUVBLFNBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLElBQUEsTUFBQSxDQUFBLGtCQUFBLENBQUE7QUFDQSxPQUFBLFlBQUEsR0FBQSxJQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxRQUFBLENBQUE7O0FBRUEsT0FBQSxTQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxZQUFBLEdBQ0EsU0FBQSxDQUFBLFlBQUEsSUFDQSxTQUFBLENBQUEsa0JBQUEsSUFDQSxTQUFBLENBQUEsZUFBQSxJQUNBLFNBQUEsQ0FBQSxjQUFBLEFBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsRUFDQSxTQUFBLENBQUEsb0JBQUEsR0FBQSxTQUFBLENBQUEsMEJBQUEsSUFBQSxTQUFBLENBQUEsdUJBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEscUJBQUEsRUFDQSxTQUFBLENBQUEscUJBQUEsR0FBQSxTQUFBLENBQUEsMkJBQUEsSUFBQSxTQUFBLENBQUEsd0JBQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFlBQUEsQ0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSw0QkFBQSxFQUFBLE9BQUE7QUFDQSwyQkFBQSxFQUFBLE9BQUE7QUFDQSw0QkFBQSxFQUFBLE9BQUE7QUFDQSwwQkFBQSxFQUFBLE9BQUE7TUFDQTtBQUNBLGVBQUEsRUFBQSxFQUFBO0tBQ0E7SUFDQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBOzs7QUFHQSxRQUFBLGNBQUEsR0FBQSxZQUFBLENBQUEsdUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7OztBQUdBLFFBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7OztBQUdBLFlBQUEsR0FBQSxJQUFBLFFBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUEsQ0FBQTtJQUVBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxRQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsWUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxvQkFBQSxHQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7Ozs7QUFJQSxZQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsaUJBQUEsQ0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxrQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFJQSxLQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxNQUFBLEdBQUEsSUFBQSxVQUFBLEVBQUEsQ0FBQTs7QUFFQSxPQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtJQUNBLE1BQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBS0EsUUFBQTtBQUNBLFdBQUEsRUFBQSxtQkFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxPQUFBLFlBQUEsR0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLGVBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxRQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQTtPQUNBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFdBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSw4QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBRUE7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSxXQUFBO0FBQ0EsWUFBQSxFQUFBLFVBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDL0lBLFlBQUEsQ0FBQTs7QUNBQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLE9BQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsTUFBQSxDQUFBLE1BQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxNQUFBO0FBQ0EsT0FBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO01BRUE7QUFDQSxjQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLE9BQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsR0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxxQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUErQkEsUUFBQTtBQUNBLGlCQUFBLEVBQUEsZUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBOztBQUVBLGlCQUFBLEVBQUEsZUFBQTtBQUNBLFNBQUEsRUFBQSxPQUFBO0FBQ0EsU0FBQSxFQUFBLE9BQUE7QUFDQSxXQUFBLEVBQUEsU0FBQTtFQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDeEdBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxLQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsTUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7OztBQUdBLFNBQUEsTUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsR0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsSUFBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsZUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsUUFBQSxJQUFBLFFBQUEsR0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLGVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsa0JBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLE1BQUEsQ0FBQTs7QUFFQSxTQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxpQkFBQSxHQUFBLFNBQUEsaUJBQUEsQ0FBQSxHQUFBLEVBQUE7O0FBR0EsTUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxNQUFBLE9BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsYUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxXQUFBLENBQUE7O0FBRUEsTUFBQSxHQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0E7O0FBRUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOzs7O0FBSUEsU0FBQSxDQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0EsRUFBQSxPQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsbUJBQUEsR0FBQSxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLFFBQUE7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsaUJBQUE7QUFDQSw4QkFBQSxFQUFBLDRCQUFBO0FBQ0EscUJBQUEsRUFBQSxtQkFBQTtBQUNBLG9CQUFBLEVBQUEsa0JBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3ZGQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUE7QUFDQSxZQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFFBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSw2QkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFVBQUEsRUFBQSxrQkFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLGNBQUEsRUFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ3hCQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLE1BQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxhQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsSUFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsR0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsS0FBQSxDQUFBO0dBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxJQUFBLENBQUEsZ0JBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsS0FBQSxDQUFBO0dBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtFQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxPQUFBLEVBQUE7QUFDQSxPQUFBLEVBQUEsR0FBQTtHQUNBO0FBQ0EsTUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTs7QUFFQSxPQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsS0FBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLEdBQUEsTUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7O0FBR0EsUUFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxLQUFBLEVBQUEsVUFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLFdBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQTtBQUNBLFFBQUEsYUFBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLENBQUE7Ozs7QUFJQSxXQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUEsWUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxVQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxTQUFBLEtBQUEsWUFBQSxFQUFBOztBQUVBLFdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBOztBQUVBLFdBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBOztBQUVBLFlBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBOztBQUVBLFlBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFFBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLHNCQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxDQUFBOztBQUVBLGdCQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1NBRUE7UUFDQTtPQUNBO01BQ0E7O0FBRUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxhQUFBLENBQUE7TUFDQSxDQUFBLENBQUE7S0FFQTs7O0FBR0EsU0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7R0FDQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDdklBLEdBQUEsQ0FBQSxTQUFBLENBQUEsaUJBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLGtEQUFBO0FBQ0EsWUFBQSxFQUFBLDJCQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLDJCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBOztBQUlBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE9BQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEtBQUEsdUJBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtJQUNBLE1BQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxRQUFBLFlBQUEsQ0FBQSxLQUFBLEtBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtJQUNBOztHQUdBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsT0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQSxRQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLEdBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7QUFDQSxhQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBR0EsQ0FBQSxDQUFBO0FDakRBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEseURBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDTkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSwrQ0FBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNMQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsT0FBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUEseUNBQUE7QUFDQSxNQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7O0FBRUEsT0FBQSxTQUFBLEdBQUEsU0FBQSxTQUFBLEdBQUE7QUFDQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxTQUFBLEVBQUEsS0FBQSxFQUFBLDhCQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUNBLENBQUE7TUFDQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUE7QUFDQSxZQUFBLEVBQUEsQ0FBQTs7Ozs7Ozs7QUFRQSxRQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxXQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsT0FBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUE7QUFDQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLE9BQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFFQSxDQUFBOztBQUVBLFVBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtHQUVBOztFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNyRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxrQkFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsb0RBQUE7QUFDQSxZQUFBLEVBQUEsNEJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsNEJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsUUFBQSxFQUFBOztBQUlBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxHQUFBLEtBQUEsWUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsRUFBQSxPQUFBLENBQUEsVUFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxFQUFBLElBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQTtBQUNBLFlBQUEsRUFBQSx5Q0FBQTtJQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLFlBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLGtCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsT0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFNBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtLQUNBO0lBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLGFBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxnQkFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLGFBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBO0VBR0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDOURBLEdBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxRQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsdUNBQUE7QUFDQSxNQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxlQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsNENBQUEsR0FBQSxHQUFBLEdBQUEsZ0JBQUEsR0FBQSxVQUFBLEdBQUEsZ0JBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsR0FBQSx5QkFBQSxHQUFBLFVBQUEsR0FBQSwrQ0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLHlCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBOztBQUVBLFlBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsY0FBQSxFQUFBLENBQUE7TUFDQTtLQUNBOzs7QUFHQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLDRDQUFBLEdBQUEsUUFBQSxHQUFBLGdCQUFBLEdBQUEsVUFBQSxHQUFBLGdCQUFBLEdBQUEsS0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEseUJBQUEsR0FBQSxLQUFBLEdBQUEsK0NBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSx5QkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTtJQUVBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxXQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFHQSxRQUFBLENBQUEsaUJBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxTQUFBLFNBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxVQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsNENBQUEsR0FBQSxRQUFBLEdBQUEsZ0JBQUEsR0FBQSxVQUFBLEdBQUEsZ0JBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsR0FBQSx5QkFBQSxHQUFBLFVBQUEsR0FBQSwrQ0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLHlCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0EsTUFBQTs7O1VBT0EsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGNBQUEsSUFBQSxPQUFBLENBQUEsVUFBQSxJQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO09BQ0E7O0FBUkEsVUFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsa0JBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUtBLG1CQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7TUFDQTtLQUNBLE1BQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsT0FBQSxDQUFBLE1BQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQTtBQUNBLFlBQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7S0FDQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGFBQUEsS0FBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLElBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLElBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsT0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBOzs7QUFHQSxRQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsZUFBQSxHQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsWUFBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsYUFBQSxNQUFBLEdBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSxVQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFDQSxTQUFBLElBQUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsVUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7TUFDQTtBQUNBLFNBQUEsY0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7TUFDQTtLQUNBOztBQUVBLGFBQUEsWUFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxvQkFBQSxDQUFBOzs7QUFHQSxXQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7OztBQUdBLG9CQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7OztBQUdBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLEtBQUEsQ0FBQTs7O01BR0EsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsUUFBQSxJQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxDQUFBLFdBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7TUFFQSxFQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsV0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxpQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxvQkFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7UUFFQSxFQUFBLElBQUEsQ0FBQSxDQUFBO09BQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtNQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7S0FFQSxNQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsTUFBQSxHQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtPQUNBLEVBQUEsRUFBQSxDQUFBLENBQUE7TUFDQSxFQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFHQSxTQUFBLFFBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7TUFFQSxFQUFBLE1BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTtLQUNBO0lBQ0EsQ0FBQTs7QUFHQSxRQUFBLENBQUEsT0FBQSxHQUFBLFVBQUEsbUJBQUEsRUFBQTtBQUNBLFFBQUEsT0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFNBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsYUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7TUFDQSxNQUFBO0FBQ0EsYUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7TUFDQTtBQUNBLFNBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7T0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEdBQUEsY0FBQSxDQUFBO01BQ0EsRUFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSxvQkFBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGFBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQTtHQUVBOztFQUdBLENBQUE7Q0FDQSxDQUFBLENBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ25nU3RvcmFnZScsICduZ01hdGVyaWFsJywgJ25nS25vYicsICdwbGFuZ3VsYXInXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24ocGxhbmd1bGFyQ29uZmlnUHJvdmlkZXIpe1xuICAgIHBsYW5ndWxhckNvbmZpZ1Byb3ZpZGVyLmNsaWVudElkID0gJzQ1YzVlNjIxMmFjNThjNzNlN2QwNWY4NjM2YTliZjIyJztcbn0pO1xuXG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3Jrd2ViJywge1xuICAgICAgICB1cmw6ICcvZm9ya3dlYicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ya3dlYi9mb3Jrd2ViLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiBcIkZvcmtXZWJDb250cm9sbGVyXCJcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb3JrV2ViQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlLCBGb3JrRmFjdG9yeSl7XG5cblx0Rm9ya0ZhY3RvcnkuZ2V0V2ViKCkudGhlbihmdW5jdGlvbih3ZWJzKXtcblx0XHQkc2NvcGUubm9kZXMgPSBbXTtcbiAgICBcdHZhciBsaW5rQXJyID0gW107XG4gICAgICAgIHdlYnMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcbiAgICAgICAgXHR2YXIgYXJyID0gW107XG4gICAgICAgIFx0YXJyLnB1c2gobm9kZSk7XG4gICAgICAgIFx0dmFyIG5ld2FyciA9IGFyci5jb25jYXQobm9kZS5icmFuY2gpO1xuICAgICAgICBcdCRzY29wZS5ub2Rlcy5wdXNoKG5ld2Fycik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwibmV0d29ya1wiLCAkc2NvcGUubm9kZXMpO1xuXHRcdHZhciB0ZXN0QSA9IFtdO1xuXHRcdHZhciBjb3VudGVyID0gMDtcblx0XHQkc2NvcGUubm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlQXJyKXtcblx0XHRcdGZvciAodmFyIGogPSAxOyBqIDwgbm9kZUFyci5sZW5ndGg7IGorKykge1xuICAgICAgICBcdFx0dmFyIGFMaW5rID0ge1xuICAgICAgICBcdFx0XHQnc291cmNlJzogY291bnRlcixcbiAgICAgICAgXHRcdFx0J3RhcmdldCc6IGogKyBjb3VudGVyLFxuICAgICAgICBcdFx0XHQnd2VpZ2h0JzogM1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdFx0bGlua0Fyci5wdXNoKGFMaW5rKTtcbiAgICAgICAgXHR9O1xuICAgIFx0XHRjb3VudGVyICs9IChub2RlQXJyLmxlbmd0aCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgbm9kZUFyciA9IFtdO1xuXHRcdG5vZGVBcnIgPSBub2RlQXJyLmNvbmNhdC5hcHBseShub2RlQXJyLCAkc2NvcGUubm9kZXMpO1xuXHRcdGNvbnNvbGUubG9nKFwiUExFQVNFXCIsIGxpbmtBcnIsIG5vZGVBcnIpO1xuXHRcdHZhciBub2RlcyA9IG5vZGVBcnI7XG5cdFx0dmFyIGxpbmtzID0gbGlua0FycjtcblxuXHRcdCAgdmFyIHdpZHRoID0gOTYwLCBoZWlnaHQgPSA1MDA7XG5cblx0XHQgIHZhciBjb2xvciA9IGQzLnNjYWxlLmNhdGVnb3J5MjAoKTtcblxuXHRcdCAgdmFyIGZpc2hleWUgPSBkMy5maXNoZXllLmNpcmN1bGFyKClcblx0XHQgICAgICAucmFkaXVzKDEyMCk7XG5cblx0XHQgIHZhciBmb3JjZSA9IGQzLmxheW91dC5mb3JjZSgpXG5cdFx0ICAgICAgLmNoYXJnZSgtMjQwKVxuXHRcdCAgICAgIC5saW5rRGlzdGFuY2UoNDApXG5cdFx0ICAgICAgLnNpemUoW3dpZHRoLCBoZWlnaHRdKTtcblxuXHRcdCAgdmFyIHN2ZyA9IGQzLnNlbGVjdChcIiN1aVwiKS5hcHBlbmQoXCJzdmdcIilcblx0XHQgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHRcdCAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XG5cblx0XHQgIHN2Zy5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0ICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImJhY2tncm91bmRcIilcblx0XHQgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHRcdCAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XG5cblx0XHQgICAgdmFyIG4gPSBub2Rlcy5sZW5ndGg7XG5cblx0XHQgICAgZm9yY2Uubm9kZXMobm9kZXMpLmxpbmtzKGxpbmtzKTtcblxuXHRcdCAgICAvLyBJbml0aWFsaXplIHRoZSBwb3NpdGlvbnMgZGV0ZXJtaW5pc3RpY2FsbHksIGZvciBiZXR0ZXIgcmVzdWx0cy5cblx0XHQgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkLCBpKSB7IGQueCA9IGQueSA9IHdpZHRoIC8gbiAqIGk7IH0pO1xuXG5cdFx0ICAgIC8vIFJ1biB0aGUgbGF5b3V0IGEgZml4ZWQgbnVtYmVyIG9mIHRpbWVzLlxuXHRcdCAgICAvLyBUaGUgaWRlYWwgbnVtYmVyIG9mIHRpbWVzIHNjYWxlcyB3aXRoIGdyYXBoIGNvbXBsZXhpdHkuXG5cdFx0ICAgIC8vIE9mIGNvdXJzZSwgZG9uJ3QgcnVuIHRvbyBsb25n4oCUeW91J2xsIGhhbmcgdGhlIHBhZ2UhXG5cdFx0ICAgIGZvcmNlLnN0YXJ0KCk7XG5cdFx0ICAgIGZvciAodmFyIGkgPSBuOyBpID4gMDsgLS1pKSBmb3JjZS50aWNrKCk7XG5cdFx0ICAgIGZvcmNlLnN0b3AoKTtcblxuXHRcdCAgICAvLyBDZW50ZXIgdGhlIG5vZGVzIGluIHRoZSBtaWRkbGUuIFxuXHRcdCAgICB2YXIgb3ggPSAwLCBveSA9IDA7XG5cdFx0ICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBveCArPSBkLngsIG95ICs9IGQueTsgfSk7XG5cdFx0ICAgIG94ID0gb3ggLyBuIC0gd2lkdGggLyAyLCBveSA9IG95IC8gbiAtIGhlaWdodCAvIDI7XG5cdFx0ICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkLnggLT0gb3gsIGQueSAtPSBveTsgfSk7XG5cblx0XHQgICAgdmFyIGxpbmsgPSBzdmcuc2VsZWN0QWxsKFwiLmxpbmtcIilcblx0XHQgICAgICAgIC5kYXRhKGxpbmtzKVxuXHRcdCAgICAgIC5lbnRlcigpLmFwcGVuZChcImxpbmVcIilcblx0XHQgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG5cdFx0ICAgICAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLng7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLnk7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0Lng7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInkyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0Lnk7IH0pXG5cdFx0ICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gMjsgfSk7XG5cblx0XHQgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiLm5vZGVcIilcblx0XHQgICAgICAgIC5kYXRhKG5vZGVzKVxuXHRcdCAgICAgIC5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuXHRcdCAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcblx0XHQgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54OyB9KVxuXHRcdCAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnk7IH0pXG5cdFx0ICAgICAgICAuYXR0cihcInJcIiwgNC41KVxuXHRcdCAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcImJsdWVcIjsgfSlcblx0XHQgICAgICAgIC5jYWxsKGZvcmNlLmRyYWcpO1xuXG5cdFx0ICAgIHN2Zy5vbihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbigpIHtcblx0XHQgICAgICBmaXNoZXllLmZvY3VzKGQzLm1vdXNlKHRoaXMpKTtcblxuXHRcdCAgICAgIG5vZGUuZWFjaChmdW5jdGlvbihkKSB7IGQuZmlzaGV5ZSA9IGZpc2hleWUoZCk7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5maXNoZXllLng7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5maXNoZXllLnk7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwiclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmZpc2hleWUueiAqIDQuNTsgfSk7XG5cblx0XHQgICAgICBsaW5rLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnNvdXJjZS5maXNoZXllLng7IH0pXG5cdFx0ICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zb3VyY2UuZmlzaGV5ZS55OyB9KVxuXHRcdCAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0LmZpc2hleWUueDsgfSlcblx0XHQgICAgICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5maXNoZXllLnk7IH0pO1xuXHRcdCAgICB9KTtcblx0XHRcblx0fSk7XG5cdFxufSk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zaWdudXAgPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNyZWRlbnRpYWxzKTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4oIG9uU3VjY2Vzc2Z1bExvZ2luIClcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBzaWdudXAgY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9nZ2VkSW5Ib21lJywge1xuICAgICAgICB1cmw6ICcvaG9tZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcidcbiAgICB9KVxuXHQuc3RhdGUoJ2hvbWUnLHtcblx0XHR1cmw6ICcvJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbGFuZGluZy5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnTGFuZGluZ1BhZ2VDb250cm9sbGVyJyxcblx0XHRyZXNvbHZlOiB7XG5cdFx0XHQgY2hlY2tJZkxvZ2dlZEluOiBmdW5jdGlvbiAoQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXHRcdFx0IFx0Ly8gY29uc29sZS5sb2coQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkpO1xuXHRcdCAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuXHRcdCAgICAgICAgXHRpZih1c2VyKSAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuXHRcdCAgICAgICAgfSk7XG5cdFx0ICAgIH1cblx0XHR9XG5cdH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbihsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2plY3QnLCB7XG4gICAgICAgIHVybDogJy9wcm9qZWN0Lzpwcm9qZWN0SUQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2plY3QvcHJvamVjdC5odG1sJ1xuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQXV0aFNlcnZpY2UpIHtcblxuXHQvL3dpbmRvdyBldmVudHNcblx0d2luZG93Lm9uYmx1ciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLnN0b3AoKTtcblx0XHQkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH07XG4gICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGxlYXZlIHRoaXMgcGFnZSBiZWZvcmUgc2F2aW5nIHlvdXIgd29yaz9cIjtcblx0fTtcblx0d2luZG93Lm9udW5sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmVzKCk7XG5cdH1cblx0JCgnLnRpbWVsaW5lLWNvbnRhaW5lcicpLnNjcm9sbChmdW5jdGlvbigpe1xuXHQgICAgJCgnLnRyYWNrTWFpblNlY3Rpb24nKS5jc3Moe1xuXHQgICAgICAgICdsZWZ0JzogJCh0aGlzKS5zY3JvbGxMZWZ0KClcblx0ICAgIH0pO1xuXHR9KTtcblxuXG5cblx0dmFyIG1heE1lYXN1cmUgPSAwO1xuXG5cdC8vIG51bWJlciBvZiBtZWFzdXJlcyBvbiB0aGUgdGltZWxpbmVcblx0JHNjb3BlLm51bU1lYXN1cmVzID0gXy5yYW5nZSgwLCA2MCk7XG5cblx0Ly8gbGVuZ3RoIG9mIHRoZSB0aW1lbGluZVxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XG5cblx0Ly9Jbml0aWFsaXplIHJlY29yZGVyIG9uIHByb2plY3QgbG9hZFxuXHRSZWNvcmRlckZjdC5yZWNvcmRlckluaXQoKS50aGVuKGZ1bmN0aW9uIChyZXRBcnIpIHtcblx0XHQkc2NvcGUucmVjb3JkZXIgPSByZXRBcnJbMF07XG5cdFx0JHNjb3BlLmFuYWx5c2VyTm9kZSA9IHJldEFyclsxXTtcblx0fSkuY2F0Y2goZnVuY3Rpb24gKGUpe1xuICAgICAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBhdWRpbycpO1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTtcblxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XG5cdCRzY29wZS50cmFja3MgPSBbXTtcblx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuXHQkc2NvcGUucHJvamVjdElkID0gJHN0YXRlUGFyYW1zLnByb2plY3RJRDtcblx0JHNjb3BlLnBvc2l0aW9uID0gMDtcblx0JHNjb3BlLnBsYXlpbmcgPSBmYWxzZTtcblx0JHNjb3BlLmN1cnJlbnRseVJlY29yZGluZyA9IGZhbHNlO1xuXHQkc2NvcGUucHJldmlld2luZ0lkID0gbnVsbDtcblx0JHNjb3BlLnpvb20gPSAxMDA7XG5cdCRzY29wZS5jb3VudEluID0gZmFsc2U7XG5cdCRzY29wZS5jb3VudE51bWJlciA9IDE7XG5cblx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XG5cdFx0dmFyIGxvYWRlZCA9IDA7XG5cdFx0JHNjb3BlLnByb2plY3ROYW1lID0gcHJvamVjdC5uYW1lO1xuXG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xuXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuXG5cdFx0XHRcdHZhciBsb2FkYWJsZVRyYWNrcyA9IFtdO1xuXG5cdFx0XHRcdHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XG5cdFx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xuXHRcdFx0XHRcdFx0bG9hZGFibGVUcmFja3MrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGlmICh0cmFjay51cmwpIHtcblxuXHRcdFx0XHRcdHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0XHRcdFx0bG9hZGVkKys7XG5cblx0XHRcdFx0XHRcdGlmKGxvYWRlZCA9PT0gbG9hZGFibGVUcmFja3MpIHtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRkaWdlc3QoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0dmFyIG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIHRyYWNrLmxvY2F0aW9uKTtcblx0XHRcdFx0XHRpZihtYXggKyAyID4gbWF4TWVhc3VyZSkgbWF4TWVhc3VyZSA9IG1heCArIDI7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dHJhY2suZW1wdHkgPSBmYWxzZTtcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGFzc3VtaW5nIHRoYXQgYSBwbGF5ZXIgZXhpc3RzXG5cdFx0XHRcdFx0dHJhY2sucGxheWVyID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGRvbmVMb2FkaW5nKTtcblx0XHRcdFx0XHQvL2luaXQgZWZmZWN0cywgY29ubmVjdCwgYW5kIGFkZCB0byBzY29wZVxuXG5cdFx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUodHJhY2suZWZmZWN0c1JhY2spO1xuXHRcdFx0XHRcdHRyYWNrLnBsYXllci5jb25uZWN0KHRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcblxuXHRcdFx0XHRcdGlmKHRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0dHJhY2subG9jYXRpb24uZm9yRWFjaChmdW5jdGlvbiAobG9jKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdUUkFDSycsIHRyYWNrLCBsb2MpO1xuXHRcdFx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHRyYWNrLnBsYXllciwgbG9jKTtcblx0XHRcdFx0XHRcdFx0JCgnI21lYXN1cmUnICsgbG9jICsgJy50cmFjaycgKyBpIClcblx0XHRcdFx0XHRcdFx0XHQuZmlyc3QoKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIGxvYyArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICBpICsgXCItXCIgKyBsb2MgKyBcIicgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIraStcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgdHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKSk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdC8vIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcblx0XHRcdFx0XHRcdC8vYWRkIGxvb3AgdG8gVUlcblx0XHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dHJhY2suZW1wdHkgPSB0cnVlO1xuXHRcdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xuICAgIFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xuICAgIFx0XHRcdFx0dHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xuICAgIFx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoWzAsIDAsIDAsIDBdKTtcbiAgICBcdFx0XHRcdHRyYWNrLnBsYXllciA9IG51bGw7XG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHNjb3BlLm1heE1lYXN1cmUgPSAzMjtcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICBcdFx0XHRcdHZhciBvYmogPSB7fTtcbiAgICBcdFx0XHRcdG9iai5lbXB0eSA9IHRydWU7XG4gICAgXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XG4gICAgXHRcdFx0XHRvYmoub25UaW1lbGluZSA9IGZhbHNlO1xuICAgIFx0XHRcdFx0b2JqLnByZXZpZXdpbmcgPSBmYWxzZTtcbiAgICBcdFx0XHRcdG9iai5zaWxlbmNlID0gZmFsc2U7XG4gICAgXHRcdFx0XHRvYmouZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoWzAsIDAsIDAsIDBdKTtcbiAgICBcdFx0XHRcdG9iai5wbGF5ZXIgPSBudWxsO1xuICAgIFx0XHRcdFx0b2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xuICAgIFx0XHRcdFx0b2JqLmxvY2F0aW9uID0gW107XG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcbiAgXHRcdFx0fVxuICBcdFx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vZHluYW1pY2FsbHkgc2V0IG1lYXN1cmVzXG5cdFx0Ly9pZiBsZXNzIHRoYW4gMTYgc2V0IDE4IGFzIG1pbmltdW1cblx0XHQkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcblx0XHRpZihtYXhNZWFzdXJlIDwgMzIpIG1heE1lYXN1cmUgPSAzMjtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1heE1lYXN1cmU7IGkrKykge1xuXHRcdFx0JHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XG5cdFx0fVxuXG5cblxuXHRcdFRvbmVUaW1lbGluZUZjdC5jcmVhdGVUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcblx0XHRcdCRzY29wZS5tZXRyb25vbWUgPSBtZXRyb25vbWU7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcblx0XHR9KTtcblx0XHRUb25lVGltZWxpbmVGY3QuY2hhbmdlQnBtKHByb2plY3QuYnBtKTtcblxuXHR9KTtcblxuXHQkc2NvcGUuanVtcFRvTWVhc3VyZSA9IGZ1bmN0aW9uKG1lYXN1cmUpIHtcblx0XHRpZihtYXhNZWFzdXJlID4gbWVhc3VyZSkge1xuXHRcdFx0JHNjb3BlLnBvc2l0aW9uID0gbWVhc3VyZTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uID0gbWVhc3VyZS50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0XHQkc2NvcGUubW92ZVBsYXloZWFkKG1lYXN1cmUpO1xuXHRcdH1cblx0fVxuXG5cdCRzY29wZS5tb3ZlUGxheWhlYWQgPSBmdW5jdGlvbiAobnVtYmVyTWVhc3VyZXMpIHtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCIwOjBcIik7XG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IChudW1iZXJNZWFzdXJlcyAqIDIwMCArIDMwMCkudG9TdHJpbmcoKSsncHgnO1xuXHR9XG5cblx0JHNjb3BlLnpvb21PdXQgPSBmdW5jdGlvbigpIHtcblx0XHQkc2NvcGUuem9vbSAtPSAxMDtcblx0XHR2YXIgem9vbSA9ICgkc2NvcGUuem9vbSAtIDEwKS50b1N0cmluZygpICsgXCIlXCI7XG5cdFx0JCgnLnRpbWVsaW5lLWNvbnRhaW5lcicpLmNzcygnem9vbScsIHpvb20pO1xuXHR9O1xuXG5cdCRzY29wZS56b29tSW4gPSBmdW5jdGlvbigpIHtcblx0XHQkc2NvcGUuem9vbSArPSAxMDtcblx0XHR2YXIgem9vbSA9ICgkc2NvcGUuem9vbSArIDEwKS50b1N0cmluZygpICsgXCIlXCI7XG5cdFx0JCgnLnRpbWVsaW5lLWNvbnRhaW5lcicpLmNzcygnem9vbScsIHpvb20pO1xuXHR9O1xuXG5cdCRzY29wZS5hZGRUcmFjayA9IGZ1bmN0aW9uICgpIHtcblxuXHR9O1xuXG5cdCRzY29wZS5wbGF5ID0gZnVuY3Rpb24gKCkge1xuXHRcdCRzY29wZS5wbGF5aW5nID0gdHJ1ZTtcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcblx0fTtcblx0JHNjb3BlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xuXHRcdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXTtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCIwOjBcIik7XG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICgkc2NvcGUucG9zaXRpb24gKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4Jztcblx0XHRUb25lLlRyYW5zcG9ydC5wYXVzZSgpO1xuXHR9O1xuXHQkc2NvcGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcblx0XHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xuXHRcdCRzY29wZS5wb3NpdGlvbiA9IDA7XG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAnMzAwcHgnO1xuXHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcblx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChcIjA6MFwiKTtcblx0XHQkKCcjcG9zaXRpb25TZWxlY3RvcicpLnZhbChcIjBcIik7XG5cdFx0Ly9zdG9wIGFuZCB0cmFjayBjdXJyZW50bHkgYmVpbmcgcHJldmlld2VkXG5cdFx0aWYoJHNjb3BlLnByZXZpZXdpbmdJZCkge1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJJbnRlcnZhbCgkc2NvcGUucHJldmlld2luZ0lkKTtcblx0XHRcdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xuXHRcdH1cblx0fTtcblx0JHNjb3BlLm5hbWVDaGFuZ2UgPSBmdW5jdGlvbihuZXdOYW1lKSB7XG5cdFx0aWYobmV3TmFtZSkge1xuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IGZhbHNlO1xuXHRcdFx0UHJvamVjdEZjdC5uYW1lQ2hhbmdlKG5ld05hbWUsICRzY29wZS5wcm9qZWN0SWQpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IFwiWW91IG11c3Qgc2V0IGEgbmFtZSFcIjtcblx0XHRcdCRzY29wZS5wcm9qZWN0TmFtZSA9IFwiVW50aXRsZWRcIjtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9qZWN0TmFtZUlucHV0JykuZm9jdXMoKTtcblx0XHR9XG5cdH07XG5cblx0JHNjb3BlLnRvZ2dsZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZigkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9PT0gMCkge1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS5vbiA9IGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcblxuXHRcdH1cblx0fTtcblxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xuXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKCRzY29wZS50cmFja3MsICRzY29wZS5wcm9qZWN0SWQsICRzY29wZS5wcm9qZWN0TmFtZSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XG5cbiAgICB9KTtcbiAgfTtcbiAgXG4gICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgfTtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUuc2lnbnVwID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xuICAgICAgICBBdXRoU2VydmljZS5zaWdudXAoc2lnbnVwSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VyUHJvZmlsZScsIHtcbiAgICAgICAgdXJsOiAnL3VzZXJwcm9maWxlLzp0aGVJRCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci91c2VycHJvZmlsZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJyxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuYXJ0aXN0SW5mbycsIHtcbiAgICAgICAgdXJsOiAnL2luZm8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvaW5mby5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5wcm9qZWN0Jywge1xuICAgICAgICB1cmw6ICcvcHJvamVjdHMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvcHJvamVjdHMuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcbiAgICB9KVxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuZm9sbG93ZXJzJywge1xuICAgICAgICB1cmw6ICcvZm9sbG93ZXJzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL2ZvbGxvd2Vycy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5mb2xsb3dpbmcnLCB7XG4gICAgICAgIHVybDogJy9mb2xsb3dpbmcnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93aW5nLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXG4gICAgfSk7XG5cbn0pO1xuXG4iLCJhcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBUb25lVHJhY2tGY3QsIFByb2plY3RGY3QsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCAkbWRUb2FzdCkge1xuXHR2YXIgdHJhY2tCdWNrZXQgPSBbXTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbmF2YmFyJylbMF0uc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgIFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IHVzZXI7XG5cblxuICAgIFx0JHNjb3BlLm15Zm9sbG93ZXJzID0gJHNjb3BlLmxvZ2dlZEluVXNlci5mb2xsb3dlcnMubGVuZ3RoO1xuICAgIFx0JHNjb3BlLm15Zm9sbG93aW5nID0gJHNjb3BlLmxvZ2dlZEluVXNlci5mb2xsb3dpbmcubGVuZ3RoO1xuICAgIFx0JHNjb3BlLm15cHJvamVjdHMgPSAkc2NvcGUubG9nZ2VkSW5Vc2VyLnByb2plY3RzLmxlbmd0aDtcblxuICAgIH0pO1xuXG5cdCRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5wcm9qZWN0cyA9IGZ1bmN0aW9uICgpe1xuICAgIFx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygpLnRoZW4oZnVuY3Rpb24ocHJvamVjdHMpe1xuICAgIFx0XHRjb25zb2xlLmxvZygnUFJPSkNTJywgcHJvamVjdHMpO1xuICAgIFx0XHQkc2NvcGUuYWxsUHJvamVjdHMgPSBwcm9qZWN0cztcbiAgICAgICAgICBcdHZhciBpbWdBcnIgPSBbXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIxOTAyNTAzLWRqYnFoNi10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE3OTU3NzgtY21xMHgxLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMzAxNTcxMy13dXV1eTktdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIxOTI1MzkyLTJodzNoZy10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjI1NDY5MTAteG1qYjYzLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMjUwNjU4My1venp4ODUtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTAzNDE4OTMyLXRlNmhzNC10NTAweDUwMC5qcGdcIlxuICAgICAgICAgICAgICBdXG5cbiAgICAgICAgICAgICAgJHNjb3BlLmFsbFByb2plY3RzLmZvckVhY2goZnVuY3Rpb24oYVByb2plY3Qpe1xuICAgICAgICAgICAgICAgIGFQcm9qZWN0LmJhY2tncm91bmRJbWcgPSBpbWdBcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogOSldO1xuICAgICAgICAgICAgICB9KTtcbiAgICBcdH0pO1xuICAgIH07XG5cdCRzY29wZS5wcm9qZWN0cygpO1xuXG5cblx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvZ2dlZEluVXNlcicsIGxvZ2dlZEluVXNlcik7XG5cdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcblx0XHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XG5cdFx0XHRkZWxldGUgcHJvamVjdC5faWQ7XG5cdFx0XHRjb25zb2xlLmxvZyhwcm9qZWN0KTtcblx0XHRcdCRtZFRvYXN0LnNob3coe1xuXHRcdFx0XHRoaWRlRGVsYXk6IDIwMDAsXG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tIHJpZ2h0Jyxcblx0XHRcdFx0dGVtcGxhdGU6XCI8bWQtdG9hc3Q+IEl0J3MgYmVlbiBmb3JrZWQgPC9tZC10b2FzdD5cIlxuXHRcdFx0fSk7XG5cblx0XHRcdFByb2plY3RGY3QuY3JlYXRlQUZvcmsocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JrIHJlc3BvbnNlIGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFxuXHR9O1xuXHRcdFxuXHR2YXIgc3RvcCA9ZmFsc2U7XG5cblxuXHQkc2NvcGUuc2FtcGxlVHJhY2sgPSBmdW5jdGlvbih0cmFjayl7XG5cblx0XHRpZihzdG9wPT09dHJ1ZSl7XG5cdFx0XHQkc2NvcGUucGxheWVyLnN0b3AoKTtcblx0XHR9XG5cblx0XHRUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZnVuY3Rpb24ocGxheWVyKXtcblx0XHRcdCRzY29wZS5wbGF5ZXIgPSBwbGF5ZXI7XG5cdFx0XHRpZihzdG9wID09PSBmYWxzZSl7XG5cdFx0XHRcdHN0b3AgPSB0cnVlO1xuXHRcdFx0XHQkc2NvcGUucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRzdG9wID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cblxuXHQkc2NvcGUuZ2V0VXNlclByb2ZpbGUgPSBmdW5jdGlvbih1c2VyKXtcblx0ICAgIC8vIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCB1c2VyKTtcblx0ICAgICRzdGF0ZS5nbygndXNlclByb2ZpbGUnLCB7dGhlSUQ6IHVzZXIuX2lkfSk7XG5cdH07XG5cbiAgICBcblxuXG59KTsiLCJhcHAuY29udHJvbGxlcignTGFuZGluZ1BhZ2VDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsIFRvbmVUcmFja0ZjdCwgJHN0YXRlKSB7XG4gICAgLy8gJCgnI2Z1bGxwYWdlJykuZnVsbHBhZ2UoKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbmF2YmFyJylbMF0uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuXG5cbiAgICAkc2NvcGUuZ29Ub0Zvcm1zID0gZnVuY3Rpb24gKCkge1xuICAgIFx0ZnVuY3Rpb24gc2Nyb2xsVG9Cb3R0b20oZHVyYXRpb24pIHtcblx0XHQgICAgaWYgKGR1cmF0aW9uIDw9IDApIHJldHVybjtcblxuXHRcdFx0dmFyIGRpZmZlcmVuY2UgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IC0gd2luZG93LnNjcm9sbFk7XG5cdFx0XHR2YXIgcGVyVGljayA9IGRpZmZlcmVuY2UgLyBkdXJhdGlvbiAqIDEwO1xuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR3aW5kb3cuc2Nyb2xsKDAsIHdpbmRvdy5zY3JvbGxZICsgcGVyVGljayk7XG5cdFx0XHRcdHNjcm9sbFRvQm90dG9tKGR1cmF0aW9uIC0gMTApO1xuXHRcdFx0fSwgMTApO1xuXHRcdH1cblxuXHRcdHNjcm9sbFRvQm90dG9tKDEwMDApO1xuICAgIH07XG5cbiAgICBcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbihsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICAgICBjb25zb2xlLmxvZyhzaWdudXBJbmZvKTtcbiAgICAgICAgQXV0aFNlcnZpY2Uuc2lnbnVwKHNpZ251cEluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignTmV3UHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBQcm9qZWN0RmN0LCAkc3RhdGUpe1xuXHQgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcblx0IFx0JHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgIH0pO1xuXG5cdCRzY29wZS5uZXdQcm9qZWN0QnV0ID0gZnVuY3Rpb24oKXtcblx0XHRQcm9qZWN0RmN0Lm5ld1Byb2plY3QoJHNjb3BlLnVzZXIpLnRoZW4oZnVuY3Rpb24ocHJvamVjdElkKXtcblx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHByb2plY3RJZH0pO1x0IFx0XG5cdFx0fSk7XG5cblx0fTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ1RpbWVsaW5lQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZVBhcmFtcywgJGxvY2FsU3RvcmFnZSwgUmVjb3JkZXJGY3QsIFByb2plY3RGY3QsIFRvbmVUcmFja0ZjdCwgVG9uZVRpbWVsaW5lRmN0KSB7XG4gIFxuICB2YXIgd2F2QXJyYXkgPSBbXTtcbiAgXG4gICRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IDYwOyBpKyspIHtcbiAgICAkc2NvcGUubnVtTWVhc3VyZXMucHVzaChpKTtcbiAgfVxuXG4gICRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcbiAgJHNjb3BlLnRyYWNrcyA9IFtdO1xuICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG5cblxuICBQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCc1NTk0YzIwYWQwNzU5Y2Q0MGNlNTFlMTQnKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XG5cbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgY29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcblxuICAgICAgaWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xuICAgICAgICBwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICAgICAgdmFyIGRvbmVMb2FkaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgICAgIGlmKGxvYWRlZCA9PT0gcHJvamVjdC50cmFja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyYWNrLnBsYXllciA9IFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBkb25lTG9hZGluZyk7XG4gICAgICAgICAgICBUb25lVGltZWxpbmVGY3QuYWRkTG9vcFRvVGltZWxpbmUodHJhY2sucGxheWVyLCB0cmFjay5sb2NhdGlvbik7XG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjsgaSsrKSB7XG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgIG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcbiAgICAgICAgICBvYmoubG9jYXRpb24gPSBbXTtcbiAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBUb25lVGltZWxpbmVGY3QuZ2V0VHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSk7XG4gICAgICBUb25lVGltZWxpbmVGY3QuY2hhbmdlQnBtKHByb2plY3QuYnBtKTtcblxuICB9KTtcblxuICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcbiAgLy8gICAgICRzY29wZS50aGVVc2VyID0gYVVzZXI7XG4gIC8vICAgICAvLyAkc3RhdGVQYXJhbXMudGhlSUQgPSBhVXNlci5faWRcbiAgLy8gICAgIGNvbnNvbGUubG9nKFwiaWRcIiwgJHN0YXRlUGFyYW1zKTtcbiAgLy8gfSk7XG5cbiAgJHNjb3BlLnJlY29yZCA9IGZ1bmN0aW9uIChlLCBpbmRleCkge1xuXG4gIFx0ZSA9IGUudG9FbGVtZW50O1xuXG4gICAgICAgIC8vIHN0YXJ0IHJlY29yZGluZ1xuICAgICAgICBjb25zb2xlLmxvZygnc3RhcnQgcmVjb3JkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWF1ZGlvUmVjb3JkZXIpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgZS5jbGFzc0xpc3QuYWRkKFwicmVjb3JkaW5nXCIpO1xuICAgICAgICBhdWRpb1JlY29yZGVyLmNsZWFyKCk7XG4gICAgICAgIGF1ZGlvUmVjb3JkZXIucmVjb3JkKCk7XG5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5zdG9wKCk7XG4gICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xuICAgICAgICAgIGF1ZGlvUmVjb3JkZXIuZ2V0QnVmZmVycyggZ290QnVmZmVycyApO1xuICAgICAgICAgIFxuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS50cmFja3NbaW5kZXhdLnJhd0F1ZGlvID0gd2luZG93LmxhdGVzdFJlY29yZGluZztcbiAgICAgICAgICAgIC8vICRzY29wZS50cmFja3NbaW5kZXhdLnJhd0ltYWdlID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlO1xuXG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICBcbiAgICAgICAgfSwgMjAwMCk7XG5cbiAgfVxuXG4gICRzY29wZS5hZGRUcmFjayA9IGZ1bmN0aW9uICgpIHtcblxuICB9O1xuXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICB2YXIgYXdzVHJhY2tzID0gJHNjb3BlLnRyYWNrcy5maWx0ZXIoZnVuY3Rpb24odHJhY2ssaW5kZXgpe1xuICAgICAgICAgICAgICBpZih0cmFjay5yYXdBdWRpbyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKGF3c1RyYWNrcywgJzU1OTVhN2ZhYWE5MDFhZDYzMjM0ZjkyMCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHdhdmUgbG9naWNcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xuXG4gICAgfSk7XG4gIH07XG5cblxuXHRcblxuXG59KTtcblxuXG4iLCJcbmFwcC5jb250cm9sbGVyKCdVc2VyQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSwgQXV0aFNlcnZpY2UsICRzdGF0ZVBhcmFtcywgdXNlckZhY3RvcnkpIHtcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XG4gICAgICAgIFxuICAgICAgICAgICRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XG5cbiAgICAgICAgICB1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgdmFyIGltZ0FyciA9IFtcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE5MDI1MDMtZGpicWg2LXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEwMzQxODkzMi10ZTZoczQtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIxNzk1Nzc4LWNtcTB4MS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjE5MjUzOTItMmh3M2hnLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9pMS5zbmRjZG4uY29tL2FydHdvcmtzLTAwMDEyMjUwNjU4My1venp4ODUtdDUwMHg1MDAuanBnXCIsXG4gICAgICAgICAgICAgICAgXCJodHRwczovL2kxLnNuZGNkbi5jb20vYXJ0d29ya3MtMDAwMTIzMDE1NzEzLXd1dXV5OS10NTAweDUwMC5qcGdcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vaTEuc25kY2RuLmNvbS9hcnR3b3Jrcy0wMDAxMjI1NDY5MTAteG1qYjYzLXQ1MDB4NTAwLmpwZ1wiLFxuICAgICAgICAgICAgICBdXG5cbiAgICAgICAgICAgICAgJHNjb3BlLnVzZXIucHJvamVjdHMuZm9yRWFjaChmdW5jdGlvbihhUHJvamVjdCl7XG4gICAgICAgICAgICAgICAgYVByb2plY3QuYmFja2dyb3VuZEltZyA9IGltZ0FycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA5KV07XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZighJHNjb3BlLnVzZXIucHJvZnBpYyl7XG4gICAgICAgICAgICAgICRzY29wZS51c2VyLnByb2ZwaWMgPSBcImh0dHBzOi8vd3d3Lm1kcjEwMS5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTQvMDUvcGxhY2Vob2xkZXItdXNlci5qcGdcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHVzZXIuZm9sbG93ZXJzLmxlbmd0aDsgaSArKyl7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzdGF0ZVBhcmFtcy50aGVJRCwgdXNlci5mb2xsb3dlcnNbaV0uX2lkKTtcbiAgICAgICAgICAgICAgaWYodXNlci5mb2xsb3dlcnNbaV0uX2lkID09PSBsb2dnZWRJblVzZXIuX2lkKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZm9sbG93U3RhdHVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgfSk7XG4gICAgfSk7XG5cblxuXG4gICAgLy8gJHNjb3BlLmRpc3BsYXlTZXR0aW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgLy8gICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJHNjb3BlLnNob3dTZXR0aW5ncyk7XG4gICAgLy8gfVxuXG4gICAgJHNjb3BlLmZvbGxvdyA9IGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgdXNlckZhY3RvcnkuZm9sbG93KHVzZXIsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICBjb25zb2xlLmxvZygnRm9sbG93IGNvbnRyb2xsZXIgcmVzcG9uc2UnLCByZXNwb25zZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgJHNjb3BlLmZvbGxvd1N0YXR1cyA9IHRydWU7XG4gICAgfTtcblxuICAgICRzY29wZS5kaXNwbGF5V2ViID0gZnVuY3Rpb24oKXtcbiAgICAgICRzdGF0ZS5nbygnZm9ya3dlYicpO1xuICAgIH07XG5cblxufSk7IiwiYXBwLmZhY3RvcnkoJ0FuYWx5c2VyRmN0JywgZnVuY3Rpb24oKSB7XG5cblx0dmFyIHVwZGF0ZUFuYWx5c2VycyA9IGZ1bmN0aW9uIChhbmFseXNlckNvbnRleHQsIGFuYWx5c2VyTm9kZSwgY29udGludWVVcGRhdGUpIHtcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRcdHZhciBTUEFDSU5HID0gMztcblx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xuXHRcdFx0dmFyIG51bUJhcnMgPSBNYXRoLnJvdW5kKDMwMCAvIFNQQUNJTkcpO1xuXHRcdFx0dmFyIGZyZXFCeXRlRGF0YSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XG5cblx0XHRcdGFuYWx5c2VyTm9kZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnl0ZURhdGEpOyBcblxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XG5cdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gJyNGNkQ1NjUnO1xuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xuXHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xuXG5cdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmb3IgZWFjaCBmcmVxdWVuY3kgYmluLlxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcblx0XHRcdFx0dmFyIG1hZ25pdHVkZSA9IDA7XG5cdFx0XHRcdHZhciBvZmZzZXQgPSBNYXRoLmZsb29yKCBpICogbXVsdGlwbGllciApO1xuXHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGo8IG11bHRpcGxpZXI7IGorKylcblx0XHRcdFx0ICAgIG1hZ25pdHVkZSArPSBmcmVxQnl0ZURhdGFbb2Zmc2V0ICsgal07XG5cdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XG5cdFx0XHRcdHZhciBtYWduaXR1ZGUyID0gZnJlcUJ5dGVEYXRhW2kgKiBtdWx0aXBsaWVyXTtcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9IFwiaHNsKCBcIiArIE1hdGgucm91bmQoKGkqMzYwKS9udW1CYXJzKSArIFwiLCAxMDAlLCA1MCUpXCI7XG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xuXHRcdFx0fVxuXHRcdFx0aWYoY29udGludWVVcGRhdGUpIHtcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXHR9XG5cblxuXHR2YXIgY2FuY2VsQW5hbHlzZXJVcGRhdGVzID0gZnVuY3Rpb24gKGFuYWx5c2VySWQpIHtcblx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcblx0fVxuXHRyZXR1cm4ge1xuXHRcdHVwZGF0ZUFuYWx5c2VyczogdXBkYXRlQW5hbHlzZXJzLFxuXHRcdGNhbmNlbEFuYWx5c2VyVXBkYXRlczogY2FuY2VsQW5hbHlzZXJVcGRhdGVzXG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdGb3JrRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblxuICAgIHZhciBnZXRXZWIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZm9ya3MnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0V2ViOiBnZXRXZWJcbiAgICB9O1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuZmFjdG9yeSgnSG9tZUZjdCcsIGZ1bmN0aW9uKCRodHRwKXtcblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0VXNlcjogZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXInLCB7cGFyYW1zOiB7X2lkOiB1c2VyfX0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihzdWNjZXNzKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2Vzcy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuZmFjdG9yeSgnUHJvamVjdEZjdCcsIGZ1bmN0aW9uKCRodHRwKXtcblxuICAgIHZhciBnZXRQcm9qZWN0SW5mbyA9IGZ1bmN0aW9uIChwcm9qZWN0SWQpIHtcblxuICAgICAgICAvL2lmIGNvbWluZyBmcm9tIEhvbWVDb250cm9sbGVyIGFuZCBubyBJZCBpcyBwYXNzZWQsIHNldCBpdCB0byAnYWxsJ1xuICAgICAgICB2YXIgcHJvamVjdGlkID0gcHJvamVjdElkIHx8ICdhbGwnO1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2plY3RzLycgKyBwcm9qZWN0aWQgfHwgcHJvamVjdGlkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIGNyZWF0ZUFGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgXHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9wcm9qZWN0cy8nLCBwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKGZvcmspe1xuICAgIFx0XHRcdHJldHVybiBmb3JrLmRhdGE7XG4gICAgXHR9KTtcbiAgICB9XG4gICAgdmFyIG5ld1Byb2plY3QgPSBmdW5jdGlvbih1c2VyKXtcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzJyx7b3duZXI6dXNlci5faWQsIG5hbWU6J1VudGl0bGVkJywgYnBtOjEyMCwgZW5kTWVhc3VyZTogMzJ9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICBcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgXHR9KTtcbiAgICB9XG4gICAgdmFyIG5hbWVDaGFuZ2UgPSBmdW5jdGlvbihuZXdOYW1lLCBwcm9qZWN0SWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS9wcm9qZWN0cy8nK3Byb2plY3RJZCwge25hbWU6IG5ld05hbWV9KS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSl7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIGRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS9wcm9qZWN0cy8nK3Byb2plY3QuX2lkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEZWxldGUgUHJvaiBGY3QnLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgdXBsb2FkUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnYXBpL3Byb2plY3RzL3NvdW5kY2xvdWQnLCB7IHByb2plY3QgOiBwcm9qZWN0IH0gKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0UHJvamVjdEluZm86IGdldFByb2plY3RJbmZvLFxuICAgICAgICBjcmVhdGVBRm9yazogY3JlYXRlQUZvcmssXG4gICAgICAgIG5ld1Byb2plY3Q6IG5ld1Byb2plY3QsIFxuICAgICAgICBkZWxldGVQcm9qZWN0OiBkZWxldGVQcm9qZWN0LFxuICAgICAgICBuYW1lQ2hhbmdlOiBuYW1lQ2hhbmdlLFxuICAgICAgICB1cGxvYWRQcm9qZWN0OiB1cGxvYWRQcm9qZWN0XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmVjb3JkZXJGY3QnLCBmdW5jdGlvbiAoJGh0dHAsIEF1dGhTZXJ2aWNlLCAkcSwgVG9uZVRyYWNrRmN0LCBBbmFseXNlckZjdCkge1xuXG4gICAgdmFyIHJlY29yZGVySW5pdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIENvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgICAgICAgICB2YXIgYXVkaW9Db250ZXh0ID0gbmV3IENvbnRleHQoKTtcbiAgICAgICAgICAgIHZhciByZWNvcmRlcjtcblxuICAgICAgICAgICAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gKFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jYW5jZWxBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWU7XG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1velJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuICAgICAgICAgICAgLy8gYXNrIGZvciBwZXJtaXNzaW9uXG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImF1ZGlvXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1hbmRhdG9yeVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0VjaG9DYW5jZWxsYXRpb25cIjogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dBdXRvR2FpbkNvbnRyb2xcIjogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dOb2lzZVN1cHByZXNzaW9uXCI6IFwiZmFsc2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nSGlnaHBhc3NGaWx0ZXJcIjogXCJmYWxzZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9wdGlvbmFsXCI6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXRQb2ludCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbiBBdWRpb05vZGUgZnJvbSB0aGUgc3RyZWFtLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWxBdWRpb0lucHV0ID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXVkaW9JbnB1dCA9IHJlYWxBdWRpb0lucHV0O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXVkaW9JbnB1dC5jb25uZWN0KGlucHV0UG9pbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW5hbHlzZXIgbm9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHlzZXJOb2RlLmZmdFNpemUgPSAyMDQ4O1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCBhbmFseXNlck5vZGUgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgcmVjb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZGVyID0gbmV3IFJlY29yZGVyKCBpbnB1dFBvaW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgemVyb0dhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uZ2Fpbi52YWx1ZSA9IDAuMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggemVyb0dhaW4gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmNvbm5lY3QoIGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbiApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFtyZWNvcmRlciwgYW5hbHlzZXJOb2RlXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciByZWNvcmRTdGFydCA9IGZ1bmN0aW9uIChyZWNvcmRlcikge1xuICAgICAgICByZWNvcmRlci5jbGVhcigpO1xuICAgICAgICByZWNvcmRlci5yZWNvcmQoKTtcbiAgICB9XG5cbiAgICB2YXIgcmVjb3JkU3RvcCA9IGZ1bmN0aW9uIChpbmRleCwgcmVjb3JkZXIpIHtcbiAgICAgICAgcmVjb3JkZXIuc3RvcCgpO1xuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIC8vIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcbiAgICAgICAgICAgIHJlY29yZGVyLmdldEJ1ZmZlcnMoZnVuY3Rpb24gKGJ1ZmZlcnMpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3BsYXkgd2F2IGltYWdlXG4gICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIndhdmVkaXNwbGF5XCIgKyAgaW5kZXggKTtcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzTG9vcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIndhdmVGb3JMb29wXCIgKyAgaW5kZXggKTtcbiAgICAgICAgICAgICAgICBkcmF3QnVmZmVyKCAzMDAsIDEwMCwgY2FudmFzLmdldENvbnRleHQoJzJkJyksIGJ1ZmZlcnNbMF0gKTtcbiAgICAgICAgICAgICAgICBkcmF3QnVmZmVyKCAxOTgsIDk4LCBjYW52YXNMb29wLmdldENvbnRleHQoJzJkJyksIGJ1ZmZlcnNbMF0gKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0QnVmZmVyID0gYnVmZmVyc1swXTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nSW1hZ2UgPSBjYW52YXNMb29wLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTtcblxuICAgICAgICAgICAgICAgIC8vIHRoZSBPTkxZIHRpbWUgZ290QnVmZmVycyBpcyBjYWxsZWQgaXMgcmlnaHQgYWZ0ZXIgYSBuZXcgcmVjb3JkaW5nIGlzIGNvbXBsZXRlZCAtIFxuICAgICAgICAgICAgICAgIC8vIHNvIGhlcmUncyB3aGVyZSB3ZSBzaG91bGQgc2V0IHVwIHRoZSBkb3dubG9hZC5cbiAgICAgICAgICAgICAgICByZWNvcmRlci5leHBvcnRXQVYoIGZ1bmN0aW9uICggYmxvYiApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9uZWVkcyBhIHVuaXF1ZSBuYW1lXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlY29yZGVyLnNldHVwRG93bmxvYWQoIGJsb2IsIFwibXlSZWNvcmRpbmcwLndhdlwiICk7XG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIGxvb3AgdGltZVxuICAgICAgICAgICAgICAgICAgICBUb25lVHJhY2tGY3QubG9vcEluaXRpYWxpemUoYmxvYiwgaW5kZXgsIFwibXlSZWNvcmRpbmcwLndhdlwiKS50aGVuKHJlc29sdmUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgXG5cbiAgICBcbiAgICB2YXIgY29udmVydFRvQmFzZTY0ID0gZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlYWNoIHRyYWNrJywgdHJhY2spO1xuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgICBpZih0cmFjay5yYXdBdWRpbykge1xuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKHRyYWNrLnJhd0F1ZGlvKTtcbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuXG5cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNlbmRUb0FXUzogZnVuY3Rpb24gKHRyYWNrc0FycmF5LCBwcm9qZWN0SWQsIHByb2plY3ROYW1lKSB7XG5cbiAgICAgICAgICAgIHZhciByZWFkUHJvbWlzZXMgPSB0cmFja3NBcnJheS5tYXAoY29udmVydFRvQmFzZTY0KTtcblxuICAgICAgICAgICAgcmV0dXJuICRxLmFsbChyZWFkUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKHN0b3JlRGF0YSkge1xuXG4gICAgICAgICAgICAgICAgdHJhY2tzQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2ssIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3JlRGF0YVtpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2sucmF3QXVkaW8gPSBzdG9yZURhdGFbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFjay5lZmZlY3RzUmFjayA9IHRyYWNrLmVmZmVjdHNSYWNrLm1hcChmdW5jdGlvbiAoZWZmZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFRkZFQ1RcIiwgZWZmZWN0LCBlZmZlY3Qud2V0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWZmZWN0LndldC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9hd3MvJywgeyB0cmFja3MgOiB0cmFja3NBcnJheSwgcHJvamVjdElkIDogcHJvamVjdElkLCBwcm9qZWN0TmFtZSA6IHByb2plY3ROYW1lIH0pXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGluIHNlbmRUb0FXU0ZhY3RvcnknLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICByZWNvcmRlckluaXQ6IHJlY29yZGVySW5pdCxcbiAgICAgICAgcmVjb3JkU3RhcnQ6IHJlY29yZFN0YXJ0LFxuICAgICAgICByZWNvcmRTdG9wOiByZWNvcmRTdG9wXG4gICAgfVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1RvbmVUaW1lbGluZUZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcblxuXHR2YXIgY3JlYXRlVHJhbnNwb3J0ID0gZnVuY3Rpb24gKGxvb3BFbmQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wID0gdHJ1ZTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BTdGFydCA9ICcwbSc7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wRW5kID0gbG9vcEVuZC50b1N0cmluZygpICsgJ20nO1xuXHRcdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXG5cdFx0XHRjcmVhdGVNZXRyb25vbWUoKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBwb3NBcnIgPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpO1xuXHRcdFx0XHRcdHZhciBsZWZ0UG9zID0gKChwYXJzZUludChwb3NBcnJbMF0pICogMjAwICkgKyAocGFyc2VJbnQocG9zQXJyWzFdKSAqIDUwKSArIDUwMCkudG9TdHJpbmcoKSArICdweCc7XG5cdFx0XHRcdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IGxlZnRQb3M7XG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XG5cdFx0XHRcdH0sICcxbScpO1xuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIHBvc0FyciA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KFwiOlwiKTtcblx0XHRcdFx0XHRpZihwb3NBcnIubGVuZ3RoID09PSAzKSB7XG5cdFx0XHRcdFx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChwb3NBcnJbMV0gKyBcIjpcIiArIHBvc0FyclsyXSk7XG5cdFx0XHRcdFx0XHQkKCcjcG9zaXRpb25TZWxlY3RvcicpLnZhbChwb3NBcnJbMF0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChwb3NBcnJbMV0gKyBcIjpcIiArIHBvc0FyclsyXSk7XG5cdFx0XHRcdFx0XHQkKCcjcG9zaXRpb25TZWxlY3RvcicpLnZhbChwb3NBcnJbMF0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xuXHRcdFx0XHR9LCAnNG4nKTtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0cm9ub21lKTtcblx0XHRcdH0pO1xuICAgICAgICB9KTtcblx0fTtcblxuXHR2YXIgY2hhbmdlQnBtID0gZnVuY3Rpb24gKGJwbSkge1xuXHRcdFRvbmUuVHJhbnNwb3J0LmJwbS52YWx1ZSA9IGJwbTtcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XG5cdH07XG5cblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIG11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciB1bk11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciBjcmVhdGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgIHZhciBtZXQgPSBuZXcgVG9uZS5QbGF5ZXIoXCIvYXBpL3dhdi9DbGljazEud2F2XCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0KTtcblx0ICAgICAgICB9KS50b01hc3RlcigpO1xuICAgICAgICB9KTtcblx0fTtcblxuXHQvLyB2YXIgYWRkTG9vcFRvVGltZWxpbmUgPSBmdW5jdGlvbiAocGxheWVyLCBzdGFydFRpbWVBcnJheSkge1xuXG5cdC8vIFx0aWYoc3RhcnRUaW1lQXJyYXkuaW5kZXhPZigwKSA9PT0gLTEpIHtcblx0Ly8gXHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xuXHQvLyBcdFx0XHRwbGF5ZXIuc3RvcCgpO1xuXHQvLyBcdFx0fSwgXCIwbVwiKVxuXG5cdC8vIFx0fVxuXG5cdC8vIFx0c3RhcnRUaW1lQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRUaW1lKSB7XG5cblx0Ly8gXHRcdHZhciBzdGFydFRpbWUgPSBzdGFydFRpbWUudG9TdHJpbmcoKSArICdtJztcblxuXHQvLyBcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHQvLyBcdFx0XHRjb25zb2xlLmxvZygnU3RhcnQnLCBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbik7XG5cdC8vIFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdC8vIFx0XHRcdHBsYXllci5zdGFydCgpO1xuXHQvLyBcdFx0fSwgc3RhcnRUaW1lKTtcblxuXHQvLyBcdFx0Ly8gdmFyIHN0b3BUaW1lID0gcGFyc2VJbnQoc3RhcnRUaW1lLnN1YnN0cigwLCBzdGFydFRpbWUubGVuZ3RoLTEpKSArIDEpLnRvU3RyaW5nKCkgKyBzdGFydFRpbWUuc3Vic3RyKC0xLDEpO1xuXHQvLyBcdFx0Ly8vLyBjb25zb2xlLmxvZygnU1RPUCcsIHN0b3ApO1xuXHQvLyBcdFx0Ly8vLyB0cmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHQvLyBcdFx0Ly8vLyBcdHBsYXllci5zdG9wKCk7XG5cdC8vIFx0XHQvLy8vIH0sIHN0b3BUaW1lKTtcblxuXHQvLyBcdH0pO1xuXG5cdC8vIH07XG5cdFxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZVRyYW5zcG9ydDogY3JlYXRlVHJhbnNwb3J0LFxuICAgICAgICBjaGFuZ2VCcG06IGNoYW5nZUJwbSxcbiAgICAgICAgLy8gYWRkTG9vcFRvVGltZWxpbmU6IGFkZExvb3BUb1RpbWVsaW5lLFxuICAgICAgICBjcmVhdGVNZXRyb25vbWU6IGNyZWF0ZU1ldHJvbm9tZSxcbiAgICAgICAgc3RvcEFsbDogc3RvcEFsbCxcbiAgICAgICAgbXV0ZUFsbDogbXV0ZUFsbCxcbiAgICAgICAgdW5NdXRlQWxsOiB1bk11dGVBbGxcbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdUb25lVHJhY2tGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XG5cblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xuXHRcdHZhciBwbGF5ZXIgID0gbmV3IFRvbmUuUGxheWVyKHVybCwgZG9uZUZuKTtcblx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcblx0XHQvLyBwbGF5ZXIuc3luYygpO1xuXHRcdC8vIHBsYXllci5sb29wID0gdHJ1ZTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0Ly9QQVNTRUQgQSBCTE9CIEZST00gUkVDT1JERVJKU0ZBQ1RPUlkgLSBEUk9QUEVEIE9OIE1FQVNVUkUgMFxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdHZhciBsaW5rID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYXZlXCIraW5kZXgpO1xuXHRcdFx0bGluay5ocmVmID0gdXJsO1xuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2Jztcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmcgPSBibG9iO1xuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZ1VSTCA9IHVybDtcblx0XHRcdHZhciBwbGF5ZXI7XG5cdFx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIGVmZmVjdHNJbml0aWFsaXplID0gZnVuY3Rpb24oYXJyKSB7XG5cblxuXHRcdHZhciBjaG9ydXMgPSBuZXcgVG9uZS5DaG9ydXMoKTtcblx0XHRjaG9ydXMubmFtZSA9IFwiQ2hvcnVzXCI7XG5cdFx0dmFyIHBoYXNlciA9IG5ldyBUb25lLlBoYXNlcigpO1xuXHRcdHBoYXNlci5uYW1lID0gXCJQaGFzZXJcIjtcblx0XHR2YXIgZGlzdG9ydCA9IG5ldyBUb25lLkRpc3RvcnRpb24oKTtcblx0XHRkaXN0b3J0Lm5hbWUgPSBcIkRpc3RvcnRpb25cIjtcblx0XHR2YXIgcGluZ3BvbmcgPSBuZXcgVG9uZS5QaW5nUG9uZ0RlbGF5KFwiNG1cIik7XG5cdFx0cGluZ3BvbmcubmFtZSA9IFwiUGluZyBQb25nXCI7XG5cblx0XHRpZiAoYXJyLmxlbmd0aCkge1xuXHRcdFx0Y2hvcnVzLndldC52YWx1ZSA9IGFyclswXTtcblx0XHRcdHBoYXNlci53ZXQudmFsdWUgPSBhcnJbMV07XG5cdFx0XHRkaXN0b3J0LndldC52YWx1ZSA9IGFyclsyXTtcblx0XHRcdHBpbmdwb25nLndldC52YWx1ZSA9IGFyclszXTtcblx0XHR9XG5cdFx0XG5cdFx0Y2hvcnVzLmNvbm5lY3QocGhhc2VyKTtcblx0XHRwaGFzZXIuY29ubmVjdChkaXN0b3J0KTtcblx0XHRkaXN0b3J0LmNvbm5lY3QocGluZ3BvbmcpO1xuXHRcdHBpbmdwb25nLnRvTWFzdGVyKCk7XG5cdFx0Ly8gcGluZ3BvbmcuY29ubmVjdCh2b2x1bWUpO1xuXHRcdC8vIHZvbHVtZS50b01hc3RlcigpO1xuXG5cdFx0cmV0dXJuIFtjaG9ydXMsIHBoYXNlciwgZGlzdG9ydCwgcGluZ3BvbmddO1xuXHR9O1xuXG5cdHZhciBjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wID0gZnVuY3Rpb24ocGxheWVyLCBtZWFzdXJlKSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ0pVU1QgRFJPUFBFRCcsIHBsYXllciwgbWVhc3VyZSk7XG5cdFx0cmV0dXJuIFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xuXHRcdFx0XHRwbGF5ZXIuc3RhcnQoKTtcblx0XHRcdH0sIG1lYXN1cmUrXCJtXCIpO1xuXHR9O1xuXG5cdHZhciByZXBsYWNlVGltZWxpbmVMb29wID0gZnVuY3Rpb24ocGxheWVyLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKSB7XG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb2xkIHRpbWVsaW5lIGlkJywgb2xkVGltZWxpbmVJZCk7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KG9sZFRpbWVsaW5lSWQpKTtcblx0XHRcdC8vIFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmVzKCk7XG5cdFx0XHRyZXNvbHZlKGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AocGxheWVyLCBuZXdNZWFzdXJlKSk7XG5cdFx0fSk7XG5cdH07XG5cdHZhciBkZWxldGVUaW1lbGluZUxvb3AgPSBmdW5jdGlvbih0aW1lbGluZUlkKSB7XG5cdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShwYXJzZUludCh0aW1lbGluZUlkKSk7XG5cdH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBjcmVhdGVQbGF5ZXI6IGNyZWF0ZVBsYXllcixcbiAgICAgICAgbG9vcEluaXRpYWxpemU6IGxvb3BJbml0aWFsaXplLFxuICAgICAgICBlZmZlY3RzSW5pdGlhbGl6ZTogZWZmZWN0c0luaXRpYWxpemUsXG4gICAgICAgIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3A6IGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AsXG4gICAgICAgIHJlcGxhY2VUaW1lbGluZUxvb3A6IHJlcGxhY2VUaW1lbGluZUxvb3AsXG4gICAgICAgIGRlbGV0ZVRpbWVsaW5lTG9vcDogZGVsZXRlVGltZWxpbmVMb29wXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgndXNlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XG5cdHJldHVybiB7XG5cdFx0Z2V0VXNlck9iajogZnVuY3Rpb24odXNlcklEKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ2FwaS91c2VycycsIHtwYXJhbXM6IHtfaWQ6IHVzZXJJRH19KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ3Jlc29vbnNlIGlzJywgcmVzcG9uc2UuZGF0YSlcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Zm9sbG93OiBmdW5jdGlvbih1c2VyLCBsb2dnZWRJblVzZXIpe1xuXHRcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzJyx7dXNlclRvRm9sbG93OiB1c2VyLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9sbG93VXNlciBGYWN0b3J5IHJlc3BvbnNlJywgcmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdHVuRm9sbG93OiBmdW5jdGlvbihmb2xsb3dlZSwgbG9nZ2VkSW5Vc2VyKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMnLCB7dXNlclRvVW5mb2xsb3c6IGZvbGxvd2VlLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZygndW5Gb2xsb3cgcmVzcG9uc2UnLCByZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG5cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2RyYWdnYWJsZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgLy8gdGhpcyBnaXZlcyB1cyB0aGUgbmF0aXZlIEpTIG9iamVjdFxuICAgIHZhciBlbCA9IGVsZW1lbnRbMF07XG4gICAgXG4gICAgZWwuZHJhZ2dhYmxlID0gdHJ1ZTtcbiAgICBcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnc3RhcnQnLCBmdW5jdGlvbihlKSB7XG5cbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9ICdtb3ZlJztcbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuc2V0RGF0YSgnVGV4dCcsIHRoaXMuaWQpO1xuICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ2RyYWcnKTtcblxuICAgICAgICB2YXIgaWR4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwYXJzZUludChhdHRycy5wb3NpdGlvbikpO1xuICAgICAgICBzY29wZS50cmFjay5sb2NhdGlvbi5zcGxpY2UoaWR4LCAxKTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuICAgICAgZmFsc2VcbiAgICApO1xuICAgIFxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbmQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuICAgICAgZmFsc2VcbiAgICApO1xuXG4gIH1cbn0pO1xuXG5hcHAuZGlyZWN0aXZlKCdkcm9wcGFibGUnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZToge1xuICAgICAgZHJvcDogJyYnIC8vIHBhcmVudFxuICAgIH0sXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgIC8vIGFnYWluIHdlIG5lZWQgdGhlIG5hdGl2ZSBvYmplY3RcbiAgICAgIHZhciBlbCA9IGVsZW1lbnRbMF07XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnbW92ZSc7XG4gICAgICAgICAgLy8gYWxsb3dzIHVzIHRvIGRyb3BcbiAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ292ZXInKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgICAgXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnbGVhdmUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBmYWxzZVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAvLyBTdG9wcyBzb21lIGJyb3dzZXJzIGZyb20gcmVkaXJlY3RpbmcuXG4gICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIFxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnb3ZlcicpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHVwb24gZHJvcCwgY2hhbmdpbmcgcG9zaXRpb24gYW5kIHVwZGF0aW5nIHRyYWNrLmxvY2F0aW9uIGFycmF5IG9uIHNjb3BlIFxuICAgICAgICAgIHZhciBpdGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZS5kYXRhVHJhbnNmZXIuZ2V0RGF0YSgnVGV4dCcpKTtcbiAgICAgICAgICB2YXIgcm93SWQsIHRyYWNrSW5kZXg7XG5cbiAgICAgICAgICAvL2dldCB0cmFja0lkIG9mIGRyb3BwYWJsZSBjb250YWluZXJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBpZihuYW1lLmluY2x1ZGVzKFwidHJhY2tcIikpIHtcbiAgICAgICAgICAgICAgdHJhY2tJbmRleCA9IG5hbWUuc3BsaXQoXCJ0cmFja1wiKVsxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvL2dldCB0cmFja0lkIG9mIGRyYWdnYWJsZSBjb250YWluZXJcbiAgICAgICAgICBpdGVtLmNsYXNzTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBpZihuYW1lLmluY2x1ZGVzKFwidHJhY2tMb29wXCIpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKG5hbWUuc3BsaXQoXCJ0cmFja0xvb3BcIilbMV0pO1xuICAgICAgICAgICAgICByb3dJZCA9IG5hbWUuc3BsaXQoXCJ0cmFja0xvb3BcIilbMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIHhwb3NpdGlvbiA9IHBhcnNlSW50KHRoaXMuYXR0cmlidXRlcy54cG9zaXRpb24udmFsdWUpO1xuICAgICAgICAgIHZhciBjaGlsZE5vZGVzID0gdGhpcy5jaGlsZE5vZGVzO1xuICAgICAgICAgIHZhciBvbGRUaW1lbGluZUlkO1xuICAgICAgICAgIHZhciB0aGVDYW52YXM7XG5cbiAgICAgICAgICAvL2lmIHJvd0lkID0gdHJhY2suaW5kZXhPZigpXG4gICAgICAgICAgLy8gaWYoKVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdST1dJRCcsIHJvd0lkLCBcInRyYWNrSW5kZXhcIiwgdHJhY2tJbmRleCk7XG4gICAgICAgICAgaWYocGFyc2VJbnQocm93SWQpID09PSBwYXJzZUludCh0cmFja0luZGV4KSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkTm9kZXNbaV0uY2xhc3NOYW1lID09PSAnY2FudmFzLWJveCcpIHtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbaV0uYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC50cmFjay5sb2NhdGlvbi5wdXNoKHhwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC50cmFjay5sb2NhdGlvbi5zb3J0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhc05vZGUgPSB0aGlzLmNoaWxkTm9kZXNbaV0uY2hpbGROb2RlcztcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc05vZGUubGVuZ3RoOyBqKyspIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhc05vZGVbal0ubm9kZU5hbWUgPT09ICdDQU5WQVMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FudmFzTm9kZVtqXS5hdHRyaWJ1dGVzLnBvc2l0aW9uLnZhbHVlID0geHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9sZFRpbWVsaW5lSWQgPSBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMudGltZWxpbmVJZC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbGRUaW1lbGluZUlkID0gY2FudmFzTm9kZVtqXS5kYXRhc2V0LnRpbWVsaW5lSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ09MRCBUSU1FTElORScsIG9sZFRpbWVsaW5lSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUNhbnZhcyA9IGNhbnZhc05vZGVbal07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gICAgIFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb2xkVGltZWxpbmVJZCcsIG9sZFRpbWVsaW5lSWQpO1xuICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50Lm1vdmVJblRpbWVsaW5lKG9sZFRpbWVsaW5lSWQsIHhwb3NpdGlvbikudGhlbihmdW5jdGlvbiAobmV3VGltZWxpbmVJZCkge1xuICAgICAgICAgICAgICAgIHRoZUNhbnZhcy5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWUgPSBuZXdUaW1lbGluZUlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBjYWxsIHRoZSBkcm9wIHBhc3NlZCBkcm9wIGZ1bmN0aW9uXG4gICAgICAgICAgc2NvcGUuJGFwcGx5KCdkcm9wKCknKTtcbiAgICAgICAgICBcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgIH1cbiAgfVxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmb2xsb3dkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZm9sbG93L2ZvbGxvd0RpcmVjdGl2ZS5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnRm9sbG93RGlyZWN0aXZlQ29udHJvbGxlcidcblx0fTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9sbG93RGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCB1c2VyRmFjdG9yeSl7XG5cblxuXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xuICAgICAgICAgXHQkc2NvcGUubG9nZ2VkSW5Vc2VyID0gbG9nZ2VkSW5Vc2VyO1xuICAgICAgICAgIFx0dXNlckZhY3RvcnkuZ2V0VXNlck9iaigkc3RhdGVQYXJhbXMudGhlSUQpLnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdCAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcblxuXHQgICAgICAgICAgICBpZigkc3RhdGUuY3VycmVudC5uYW1lID09PSBcInVzZXJQcm9maWxlLmZvbGxvd2Vyc1wiKXtcblx0ICAgICAgICAgICAgXHQkc2NvcGUuZm9sbG93cyA9IHVzZXIuZm9sbG93ZXJzO1xuXHQgICAgICAgICAgICB9IGVsc2V7XG5cdCAgICAgICAgICAgIFx0JHNjb3BlLmZvbGxvd3MgPSB1c2VyLmZvbGxvd2luZztcblx0ICAgICAgICAgICAgXHRpZigkc3RhdGVQYXJhbXMudGhlSUQgPT09IGxvZ2dlZEluVXNlci5faWQpICRzY29wZS5zaG93QnV0dG9uID0gdHJ1ZTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImZvbGxvd09iaiBpc1wiLCAkc2NvcGUuZm9sbG93cywgJHN0YXRlUGFyYW1zKTtcblxuXHQgICAgXHR9KTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS5nb1RvRm9sbG93ID0gZnVuY3Rpb24oZm9sbG93KXtcblx0ICAgICAgY29uc29sZS5sb2coXCJjbGlja2VkXCIsIGZvbGxvdyk7XG5cdCAgICAgICRzdGF0ZS5nbygndXNlclByb2ZpbGUnLCB7IHRoZUlEOiBmb2xsb3cuX2lkfSk7XG5cdCAgICB9O1xuXG5cdCAgICAkc2NvcGUudW5Gb2xsb3cgPSBmdW5jdGlvbihmb2xsb3dlZSkge1xuXHQgICAgXHRjb25zb2xlLmxvZygkc2NvcGUuZm9sbG93cyk7XG4gICAgXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgJHNjb3BlLmZvbGxvd3MubGVuZ3RoOyBpKyspIHtcbiAgICBcdFx0XHRcdGlmKCRzY29wZS5mb2xsb3dzW2ldLl9pZCA9PT0gZm9sbG93ZWUuX2lkKXtcbiAgICBcdFx0XHRcdFx0dmFyIGRlbCA9ICRzY29wZS5mb2xsb3dzLnNwbGljZShpLCAxKTtcbiAgICBcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJkZWxldGVcIiwgZGVsLCAkc2NvcGUuZm9sbG93cyk7XG4gICAgXHRcdFx0XHR9XG4gICAgXHRcdH1cblx0ICAgIFx0dXNlckZhY3RvcnkudW5Gb2xsb3coZm9sbG93ZWUsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHQgICAgXHRcdGNvbnNvbGUubG9nKFwic3VjY2VzZnVsXCIsIHJlc3BvbnNlKTtcblx0ICAgIFx0XHQkc2NvcGUuJGRpZ2VzdCgpO1x0XG5cdCAgICBcdH0pO1xuXG5cdCAgICB9O1xuXG5cdFxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2xvYWRpbmdHaWYnLCBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2xvYWRpbmctZ2lmL2xvYWRpbmcuaHRtbCdcblx0fTtcbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlLCBQcm9qZWN0RmN0KSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHZhciBzZXROYXZiYXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpe1xuICAgICAgICAgICAgICAgICAgICBpZih1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VySWQgPSB1c2VyLl9pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdQcm9maWxlJywgc3RhdGU6ICd1c2VyUHJvZmlsZSh7dGhlSUQ6IHVzZXJJZH0pJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2V0TmF2YmFyKCk7XG5cbiAgICAgICAgICAgIC8vIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgLy8gICAgIC8vIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxuICAgICAgICAgICAgLy8gICAgIC8vIHsgbGFiZWw6ICdTaWduIFVwJywgc3RhdGU6ICdzaWdudXAnIH0sXG4gICAgICAgICAgICAvLyAgICAgeyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAndXNlclByb2ZpbGUnLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIC8vIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIFByb2plY3RGY3QubmV3UHJvamVjdChzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHByb2plY3RJZCl7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHByb2plY3RJZH0pOyAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXROYXZiYXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCBzZXROYXZiYXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3Byb2plY3RkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvamVjdC9wcm9qZWN0RGlyZWN0aXZlLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcidcblx0fTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcigncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBQcm9qZWN0RmN0LCBBdXRoU2VydmljZSwgJG1kVG9hc3Qpe1xuXG5cblxuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcblx0XHRcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XG5cdFx0XHQkc2NvcGUuZGlzcGxheUFQcm9qZWN0ID0gZnVuY3Rpb24oc29tZXRoaW5nKXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RISU5HJywgc29tZXRoaW5nKTtcblx0XHRcdFx0aWYoJHNjb3BlLmxvZ2dlZEluVXNlci5faWQgPT09ICRzdGF0ZVBhcmFtcy50aGVJRCl7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogc29tZXRoaW5nLl9pZH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCRzY29wZS5tYWtlRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuXHRcdFx0XHRpZighcHJvamVjdC5mb3JrT3JpZ2luKSBwcm9qZWN0LmZvcmtPcmlnaW4gPSBwcm9qZWN0Ll9pZDtcblx0XHRcdFx0JG1kVG9hc3Quc2hvdyh7XG5cdFx0XHRcdGhpZGVEZWxheTogMjAwMCxcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxuXHRcdFx0XHR0ZW1wbGF0ZTpcIjxtZC10b2FzdD4gSXQncyBiZWVuIGZvcmtlZCA8L21kLXRvYXN0PlwiXG5cdFx0XHR9KTtcblxuXHRcdFx0XHRwcm9qZWN0LmZvcmtJRCA9IHByb2plY3QuX2lkO1xuXHRcdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcblx0XHRcdFx0ZGVsZXRlIHByb2plY3QuX2lkO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhwcm9qZWN0KTtcblx0XHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yayByZXNwb25zZSBpcycsIHJlc3BvbnNlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdCRzY29wZS5kZWxldGVQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCRzY29wZS51c2VyLnByb2plY3RzKTtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAkc2NvcGUudXNlci5wcm9qZWN0cy5sZW5ndGg7IGkrKykge1xuICAgIFx0XHRcdFx0aWYoJHNjb3BlLnVzZXIucHJvamVjdHNbaV0uX2lkID09PSBwcm9qZWN0Ll9pZCl7XG4gICAgXHRcdFx0XHRcdHZhciBkZWwgPSAkc2NvcGUudXNlci5wcm9qZWN0cy5zcGxpY2UoaSwgMSk7XG4gICAgXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiZGVsZXRlXCIsIGRlbCwgJHNjb3BlLnVzZXIucHJvamVjdHMpO1xuICAgIFx0XHRcdFx0fVxuICAgIFx0XHRcdH07XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdEZWxldGVQcm9qZWN0JywgcHJvamVjdClcblx0XHRcdFx0UHJvamVjdEZjdC5kZWxldGVQcm9qZWN0KHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdEZWxldGUgcmVxdWVzdCBpcycsIHJlc3BvbnNlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdCRzY29wZS5wb3N0VG9Tb3VuZGNsb3VkID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdVcGxvYWRpbmcgUHJvamVjdCcsIHByb2plY3QpO1xuXHRcdFx0XHRQcm9qZWN0RmN0LnVwbG9hZFByb2plY3QocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1VwbG9hZCBSZXF1ZXN0IGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXG5cdFx0fSk7XG5cdFxufSk7IiwiYXBwLmRpcmVjdGl2ZSgneGltVHJhY2snLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHN0YXRlUGFyYW1zLCAkY29tcGlsZSwgUmVjb3JkZXJGY3QsIFByb2plY3RGY3QsIFRvbmVUcmFja0ZjdCwgVG9uZVRpbWVsaW5lRmN0LCBBbmFseXNlckZjdCwgJHEpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdHJhY2svdHJhY2suaHRtbCcsXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cdFx0XHRzY29wZS5lZmZlY3RXZXRuZXNzZXMgPSBzY29wZS50cmFjay5lZmZlY3RzUmFjay5tYXAoZnVuY3Rpb24gKGVmZmVjdCkge1xuXHRcdFx0XHRyZXR1cm4gZWZmZWN0LndldC52YWx1ZSAqIDEwMDA7XG5cdFx0XHR9KTtcblx0XHRcdFx0c2NvcGUudm9sdW1lID0gbmV3IFRvbmUuVm9sdW1lKCk7XG5cdFx0XHRcdHNjb3BlLnZvbHVtZS52b2x1bWUudmFsdWUgPSAwO1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLmZvckVhY2goZnVuY3Rpb24gKGxvYykge1xuXHRcdFx0XHRcdHZhciB0cmFja0luZGV4ID0gc2NvcGUuJHBhcmVudC50cmFja3MuaW5kZXhPZihzY29wZS50cmFjayk7XG5cdFx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIGxvYyk7XG5cdFx0XHRcdFx0JCgnI21lYXN1cmUnICsgbG9jICsgJy50cmFjaycgKyB0cmFja0luZGV4KS5maXJzdCgpLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgbG9jICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIGxvYyArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgMCk7XG5cblx0XHRcdHNjb3BlLmRyb3BJblRpbWVsaW5lID0gZnVuY3Rpb24gKGluZGV4LCBwb3NpdGlvbikge1xuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xuXHRcdFx0XHRzY29wZS50cmFjay5vblRpbWVsaW5lID0gdHJ1ZTtcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xuXHRcdFx0XHQvLyB2YXIgcG9zaXRpb24gPSAwO1xuXHRcdFx0XHR2YXIgY2FudmFzUm93ID0gZWxlbWVudFswXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYW52YXMtYm94Jyk7XG5cblx0XHRcdFx0aWYgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vIGRyb3AgdGhlIGxvb3Agb24gdGhlIGZpcnN0IGF2YWlsYWJsZSBpbmRleFx0XHRcdFx0XG5cdFx0XHRcdFx0d2hpbGUgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmluZGV4T2YocG9zaXRpb24pID4gLTEpIHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uKys7XG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vYXBwZW5kIGNhbnZhcyBlbGVtZW50XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnB1c2gocG9zaXRpb24pO1xuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zb3J0KCk7XG5cdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBwb3NpdGlvbik7XG5cdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIGluZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIitpbmRleCtcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcblx0XHRcdH07XG5cblx0XHRcdHNjb3BlLm1vdmVJblRpbWVsaW5lID0gZnVuY3Rpb24gKG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRcdFx0VG9uZVRyYWNrRmN0LnJlcGxhY2VUaW1lbGluZUxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKS50aGVuKHJlc29sdmUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cblxuXHRcdFx0c2NvcGUuYXBwZWFyT3JEaXNhcHBlYXIgPSBmdW5jdGlvbihwb3NpdGlvbikge1xuXHRcdFx0XHRcblx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcblx0XHRcdFx0dmFyIGxvb3BJbmRleCA9IHNjb3BlLnRyYWNrLmxvY2F0aW9uLmluZGV4T2YocG9zaXRpb24pO1xuXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLm9uVGltZWxpbmUpIHtcblx0XHRcdFx0XHRpZihsb29wSW5kZXggPT09IC0xKSB7XG5cdFx0XHRcdFx0XHR2YXIgY2FudmFzUm93ID0gZWxlbWVudFswXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYW52YXMtYm94Jyk7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5wdXNoKHBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcblx0XHRcdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBwb3NpdGlvbik7XG5cdFx0XHRcdFx0XHQvLyBhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1twb3NpdGlvbl0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgcG9zaXRpb24gKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgdHJhY2tJbmRleCArIFwiLVwiICsgcG9zaXRpb24gKyBcIicgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIrdHJhY2tJbmRleCtcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwibWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiApO1xuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgZnJvbSBsb2NhdGlvbnMgYXJyYXlcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShsb29wSW5kZXgsIDEpO1xuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgdGltZWxpbmVJZFxuXHRcdFx0XHRcdFx0VG9uZVRyYWNrRmN0LmRlbGV0ZVRpbWVsaW5lTG9vcCggY2FudmFzLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZSApO1xuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgY2FudmFzIGl0ZW1cblx0XHRcdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQoZWxlbWVudCkge1xuXHRcdFx0XHRcdFx0ICAgIGVsZW1lbnQgJiYgZWxlbWVudC5wYXJlbnROb2RlICYmIGVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtZW50KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlbW92ZUVsZW1lbnQoIGNhbnZhcyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnTk8gRFJPUCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRzY29wZS5yZVJlY29yZCA9IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdFx0XHQvL2NoYW5nZSBhbGwgcGFyYW1zIGJhY2sgYXMgaWYgZW1wdHkgdHJhY2tcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xuXHRcdFx0XHRzY29wZS50cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllciA9IG51bGw7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcblx0XHRcdFx0c2NvcGUudHJhY2sucmF3QXVkaW8gPSBudWxsO1xuXHRcdFx0XHRzY29wZS50cmFjay5pbWcgPSBudWxsO1xuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XG5cdFx0XHRcdC8vZGlzcG9zZSBvZiBlZmZlY3RzUmFja1xuXHRcdFx0XHRzY29wZS50cmFjay5lZmZlY3RzUmFjay5mb3JFYWNoKGZ1bmN0aW9uIChlZmZlY3QpIHtcblx0XHRcdFx0XHRlZmZlY3QuZGlzcG9zZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2NvcGUudHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoWzAsMCwwLDBdKTtcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24gPSBbXTtcblx0XHRcdFx0Ly9yZW1vdmUgYWxsIGxvb3BzIGZyb20gVUlcblx0XHRcdFx0dmFyIGxvb3BzVUkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCd0cmFja0xvb3AnK2luZGV4LnRvU3RyaW5nKCkpO1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkxPT1BTXCIsIGxvb3BzVUkpO1xuXHRcdFx0XHR3aGlsZShsb29wc1VJLmxlbmd0aCAhPT0gMCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdMT09QUyBBUlInLCBsb29wc1VJKTtcblx0XHRcdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbG9vcHNVSS5sZW5ndGg7aSsrKSB7XG5cdFx0XHRcdFx0XHRsb29wc1VJW2ldLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobG9vcHNVSVtpXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxvb3BzVUkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCd0cmFja0xvb3AnK2luZGV4LnRvU3RyaW5nKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcblx0XHRcdH07XG5cblx0XHRcdHNjb3BlLnNvbG8gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZhciBvdGhlclRyYWNrcyA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLm1hcChmdW5jdGlvbiAodHJhY2spIHtcblx0XHRcdFx0XHRpZih0cmFjayAhPT0gc2NvcGUudHJhY2spIHtcblx0XHRcdFx0XHRcdHRyYWNrLnNpbGVuY2UgPSB0cnVlO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRyYWNrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSkuZmlsdGVyKGZ1bmN0aW9uICh0cmFjaykge1xuXHRcdFx0XHRcdGlmKHRyYWNrICYmIHRyYWNrLnBsYXllcikgcmV0dXJuIHRydWU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRUb25lVGltZWxpbmVGY3QubXV0ZUFsbChvdGhlclRyYWNrcyk7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0XHR9O1xuXG5cdFx0XHRzY29wZS5zaWxlbmNlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZighc2NvcGUudHJhY2suc2lsZW5jZSkge1xuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUucmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XG5cdFx0XHRcdHZhciByZWNvcmRlciA9IHNjb3BlLnJlY29yZGVyO1xuXG5cdFx0XHRcdHZhciBjb250aW51ZVVwZGF0ZSA9IHRydWU7XG5cblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxuXHRcdCAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYW5hbHlzZXJcIitpbmRleCk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xuXHRcdFx0XHR2YXIgYW5hbHlzZXJJZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcblx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RhcnQocmVjb3JkZXIpO1xuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XG5cdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gdHJ1ZTtcblxuXG5cdFx0XHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRcdFx0XHR2YXIgU1BBQ0lORyA9IDM7XG5cdFx0XHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XG5cdFx0XHRcdFx0dmFyIG51bUJhcnMgPSBNYXRoLnJvdW5kKDMwMCAvIFNQQUNJTkcpO1xuXHRcdFx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xuXG5cdFx0XHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxuXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1Jztcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XG5cdFx0XHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xuXG5cdFx0XHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZSA9IDA7XG5cdFx0XHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcblx0XHRcdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGo8IG11bHRpcGxpZXI7IGorKylcblx0XHRcdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xuXHRcdFx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUyID0gZnJlcUJ5dGVEYXRhW2kgKiBtdWx0aXBsaWVyXTtcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBlbmRSZWNvcmRpbmcocG9zaXRpb24pIHtcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlcikudGhlbihmdW5jdGlvbiAocGxheWVyKSB7XG5cdFx0XHRcdFx0XHQvL3RyYWNrIHZhcmlhYmxlc1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucmVjb3JkaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlO1xuXG5cdFx0XHRcdFx0XHQvL2NyZWF0ZSBwbGF5ZXJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllciA9IHBsYXllcjtcblx0XHRcdFx0XHRcdHBsYXllci5jb25uZWN0KHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcblxuXHRcdFx0XHRcdFx0Ly9zdG9wIGFuYWx5c2VyXG5cdFx0XHRcdFx0XHRjb250aW51ZVVwZGF0ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XG5cblx0XHRcdFx0XHRcdC8vc2V0IFByb2plY3QgdmFyc1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RvcCgpO1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jdXJyZW50bHlSZWNvcmRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdC8vIHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xuXHRcdFx0XHRcdFx0Ly8gVG9uZVRpbWVsaW5lRmN0LnVuTXV0ZUFsbChzY29wZS4kcGFyZW50LnRyYWNrcyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZihUb25lLlRyYW5zcG9ydC5zdGF0ZSA9PT0gXCJzdG9wcGVkXCIpIHtcblx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9IFwiLTE6MDowXCI7XG5cdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jb3VudE51bWJlciA9IDA7XG5cdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5jb3VudEluID0gdHJ1ZTtcblx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xuXHRcdFx0XHRcdHZhciBpbmNDb3VudCA9IFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuY291bnROdW1iZXIgPSBzY29wZS4kcGFyZW50LmNvdW50TnVtYmVyICsgMTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuJGRpZ2VzdCgpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fSwgXCI0blwiKTtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRpbmdJRCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuY291bnRJbiA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coc2NvcGUuJHBhcmVudC5jb3VudEluKTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuJGRpZ2VzdCgpO1xuXHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJJbnRlcnZhbChpbmNDb3VudCk7XG5cdFx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlciwgaW5kZXgpO1xuXHRcdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlciwgaW5kZXgpO1xuXHRcdFx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZW5kUmVjb3JkaW5nKDApO1xuXHRcdFx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocmVjb3JkaW5nSUQpO1xuXG5cdFx0XHRcdFx0XHRcdH0sIDIwMDApO1xuXHRcdFx0XHRcdFx0fSwgNTApO1xuXHRcdFx0XHRcdH0sIFwiMG1cIik7XG5cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgbmV4dEJhciA9IHBhcnNlSW50KFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF0pICsgMTtcblx0XHRcdFx0XHR2YXIgZW5kQmFyID0gbmV4dEJhciArIDE7XG5cblx0XHRcdFx0XHR2YXIgcmVjSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XG5cdFx0XHRcdFx0XHR9LCA1MCk7XG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xuXG5cblx0XHRcdFx0XHR2YXIgcmVjRW5kSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHJlY0lkKTtcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocmVjRW5kSWQpO1xuXHRcdFx0XHRcdFx0ZW5kUmVjb3JkaW5nKG5leHRCYXIpO1xuXG5cdFx0XHRcdFx0fSwgZW5kQmFyLnRvU3RyaW5nKCkgKyBcIm1cIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblxuXHRcdFx0c2NvcGUucHJldmlldyA9IGZ1bmN0aW9uKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcblx0XHRcdFx0dmFyIG5leHRCYXI7XG5cdFx0XHRcdGlmKCFzY29wZS4kcGFyZW50LnByZXZpZXdpbmdJZCkge1xuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSB0cnVlO1xuXG5cdFx0XHRcdFx0aWYoVG9uZS5UcmFuc3BvcnQuc3RhdGUgPT09IFwic3RvcHBlZFwiKSB7XG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSk7XG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR2YXIgcGxheUxhdW5jaCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHRcdFx0XHR2YXIgcHJldmlld0ludGV2YWwgPSBUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdGFydCgpO1xuXHRcdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBsYXlMYXVuY2gpO1xuXHRcdFx0XHRcdFx0fSwgXCIxbVwiKTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQucHJldmlld2luZ0lkID0gcHJldmlld0ludGV2YWw7XG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdBTFJFQURZIFBSRVZJRVdJTkcnKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVmZmVjdCk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGFtb3VudCk7XG5cblx0XHRcdFx0ZWZmZWN0LndldC52YWx1ZSA9IGFtb3VudCAvIDEwMDA7XG5cdFx0XHR9O1xuXG5cdFx0fVxuXHRcdFxuXG5cdH07XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=