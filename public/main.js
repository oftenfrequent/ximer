'use strict';
var app = angular.module('FullstackGeneratedApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'ngStorage', 'ngMaterial', 'ngKnob']);

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

	ProjectFct.getProjectInfo($scope.projectId).then(function (project) {
		var loaded = 0;
		console.log('PROJECT', project);
		$scope.projectName = project.name;

		if (project.tracks.length) {

			console.log('project.tracks.length', project.tracks.length);

			project.tracks.forEach(function (track) {

				var loadableTracks = [];

				project.tracks.forEach(function (track) {
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
						ToneTimelineFct.addLoopToTimeline(track.player, track.location);
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
		// console.log('MEASURES', $scope.numMeasures);

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
		$('#timelinePosition').val(Tone.Transport.position.substr(1));
		playHead.style.left = (numberMeasures * 200 + 300).toString() + 'px';
	};

	$scope.zoomOut = function () {
		$scope.zoom -= 10;
		var zoom = ($scope.zoom - 10).toString() + '%';
		$('.timeline-container').css('zoom', zoom);
		console.log('OUT', $scope.zoom);
	};

	$scope.zoomIn = function () {
		$scope.zoom += 10;
		var zoom = ($scope.zoom + 10).toString() + '%';
		$('.timeline-container').css('zoom', zoom);
		console.log('IN', $scope.zoom);
	};

	$scope.dropInTimeline = function (index) {
		var track = scope.tracks[index];
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
		$('#timelinePosition').val(':0:0');
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
		$('#timelinePosition').val(':0:0');
		$('#positionSelector').val('0');
		//stop and track currently being previewed
		if ($scope.previewingId) {
			Tone.Transport.clearInterval($scope.previewingId);
			$scope.previewingId = null;
		}
	};
	$scope.nameChange = function (newName) {
		console.log('NEW', newName);
		if (newName) {
			$scope.nameError = false;
			ProjectFct.nameChange(newName, $scope.projectId).then(function (response) {
				console.log('RES', response);
			});
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

'use strict';
app.config(function ($stateProvider) {
	$stateProvider.state('forkweb', {
		url: '/forkweb',
		templateUrl: 'js/forkweb/forkweb.html',
		controller: 'ForkWebController'
	});
});

app.controller('ForkWebController', function ($scope, $stateParams, $state, ProjectFct, AuthService, ForkFactory) {

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

	ForkFactory.getWeb().then(function (webs) {
		$scope.forks = webs;
		console.log('webs are', $scope.forks);

		var dataset = [25, 7, 5, 26, 11];

		d3.select('#ui').selectAll('div').data(dataset).enter().append('div')
		// .text(function(d){return "I can count up to " + d;})
		.attr('class', 'bar').style({
			'display': 'inline-block',
			'width': '20px',
			'margin-right': '2px',
			'background-color': 'teal'
		}).style('height', function (d) {
			return d * 5 + 'px';
		});
	});
});
app.controller('HomeController', function ($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state, $mdToast) {
	var trackBucket = [];
	document.getElementsByTagName('navbar')[0].style.display = 'block';

	$scope.isLoggedIn = function () {
		return AuthService.isAuthenticated();
	};

	$scope.projects = function () {
		ProjectFct.getProjectInfo().then(function (projects) {
			$scope.allProjects = projects;
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
	$scope.user;

	AuthService.getLoggedInUser().then(function (user) {
		$scope.user = user;
		console.log('user is', $scope.user.username);
	});

	$scope.newProjectBut = function () {
		ProjectFct.newProject($scope.user).then(function (projectId) {
			console.log('Success is', projectId);
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
			console.log('user is', user, $state);
		});
	});

	$scope.displaySettings = function () {
		if ($scope.showSettings) $scope.showSettings = false;else $scope.showSettings = true;
		console.log($scope.showSettings);
	};

	$scope.follow = function (user) {
		userFactory.follow(user, $scope.loggedInUser).then(function (response) {
			console.log('Follow controller response', response);
		});
	};

	$scope.displayWeb = function () {
		console.log('clicked');
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
					$('#timelinePosition').val(Tone.Transport.position.substr(1));
					$('#positionSelector').val(Tone.Transport.position.substr(0, 1));
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

	var addLoopToTimeline = function addLoopToTimeline(player, startTimeArray) {

		if (startTimeArray.indexOf(0) === -1) {
			Tone.Transport.setTimeline(function () {
				player.stop();
			}, '0m');
		}

		startTimeArray.forEach(function (startTime) {

			var startTime = startTime.toString() + 'm';

			Tone.Transport.setTimeline(function () {
				console.log('Start', Tone.Transport.position);
				player.stop();
				player.start();
			}, startTime);

			// var stopTime = parseInt(startTime.substr(0, startTime.length-1)) + 1).toString() + startTime.substr(-1,1);
			//// console.log('STOP', stop);
			//// transport.setTimeline(function () {
			//// 	player.stop();
			//// }, stopTime);
		});
	};

	return {
		createTransport: createTransport,
		changeBpm: changeBpm,
		addLoopToTimeline: addLoopToTimeline,
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
				console.log('resoonse is', response.data);
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
				var xposition = parseInt(this.attributes.xposition.value);
				var childNodes = this.childNodes;
				var oldTimelineId;
				var theCanvas;

				for (var i = 0; i < childNodes.length; i++) {
					if (childNodes[i].className === 'canvas-box') {

						this.childNodes[i].appendChild(item);
						scope.$parent.$parent.track.location.push(xposition);
						scope.$parent.$parent.track.location.sort();

						var canvasNode = this.childNodes[i].childNodes;

						for (var j = 0; j < canvasNode.length; j++) {

							if (canvasNode[j].nodeName === 'CANVAS') {
								canvasNode[j].attributes.position.value = xposition;
								oldTimelineId = canvasNode[j].attributes.timelineid.value;
								theCanvas = canvasNode[j];
							}
						}
					}
				}

				scope.$parent.$parent.moveInTimeline(oldTimelineId, xposition).then(function (newTimelineId) {
					theCanvas.attributes.timelineid.value = newTimelineId;
				});

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
			console.log('user is', user);

			if ($state.current.name === 'userProfile.followers') {
				$scope.follows = user.followers;
			} else {
				$scope.follows = user.following;
				if ($stateParams.theID === loggedInUser._id) $scope.showButton = true;
			}
			console.log('followObj is', $scope.follows, $stateParams);
		});
	});

	$scope.goToFollow = function (follow) {
		console.log('clicked', follow);
		$state.go('userProfile', { theID: follow._id });
	};

	$scope.unFollow = function (followee) {
		console.log('clicked', followee);
		userFactory.unFollow(followee, $scope.loggedInUser).then(function (response) {
			console.log('succesful unfollow');
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
'use strict';
app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

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

			setUser();

			$rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
			$rootScope.$on(AUTH_EVENTS.loginSuccess, setNavbar);
			$rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
			$rootScope.$on(AUTH_EVENTS.logoutSuccess, setNavbar);
			$rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
		}

	};
});
app.directive('loadingGif', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/loading-gif/loading.html'
	};
});
app.directive('projectdirective', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/project/projectDirective.html',
		controller: 'projectdirectiveController'
	};
});

app.controller('projectdirectiveController', function ($scope, $stateParams, $state, ProjectFct, AuthService) {

	AuthService.getLoggedInUser().then(function (loggedInUser) {
		$scope.loggedInUser = loggedInUser;
		$scope.displayAProject = function (something) {
			console.log('THING', something);
			if ($scope.loggedInUser._id === $stateParams.theID) {
				$state.go('project', { projectID: something._id });
			}
			console.log('displaying a project', $scope.parent);
		};

		$scope.makeFork = function (project) {
			if (!project.forkOrigin) project.forkOrigin = project._id;
			project.forkID = project._id;
			project.owner = loggedInUser._id;
			delete project._id;
			// console.log(project);
			ProjectFct.createAFork(project).then(function (response) {
				console.log('Fork response is', response);
			});
		};

		$scope.deleteProject = function (project) {
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
			scope.effectWetnesses = [{
				name: 'Chorus',
				amount: 0
			}, {
				name: 'Phaser',
				amount: 0
			}, {
				name: 'Distortion',
				amount: 0
			}, {
				name: 'PingPongDelay',
				amount: 0
			}];
			scope.volume = new Tone.Volume();
			scope.volume.volume.value = 0;
			setTimeout(function () {
				var canvasRow = element[0].getElementsByClassName('canvas-box');
				for (var i = 0; i < canvasRow.length; i++) {
					var canvasClasses = canvasRow[i].parentNode.classList;

					for (var j = 0; j < canvasClasses.length; j++) {
						if (canvasClasses[j] === 'taken') {
							var trackIndex = scope.$parent.tracks.indexOf(scope.track);

							angular.element(canvasRow[i]).append($compile('<canvas width=\'198\' height=\'98\' id=\'wavedisplay\' class=\'item trackLoop' + trackIndex.toString() + '\' style=\'position: absolute; background: url(' + scope.track.img + ');\' draggable></canvas>')(scope));
						}
					}
				}
			}, 0);

			scope.dropInTimeline = function (index, position) {
				console.log('DROPPING');
				// scope.track.player.loop = false;
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
				angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + index + '-' + position + '\' class=\'item trackLoop' + index + '\' style=\'position: absolute; background: url(' + scope.track.img + ');\' draggable></canvas>')(scope));
				scope.track.location.push(position);
				scope.track.location.sort();
				var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
			};

			scope.moveInTimeline = function (oldTimelineId, newMeasure) {
				return new $q(function (resolve, reject) {
					// console.log('ELEMENT', oldTimelineId, newMeasure);
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
				console.log('RERECORD');
				console.log(scope.track);
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
				// scope.track.effectsRack = ToneTrackFct.effectsInitialize([0,0,0,0]);
				// scope.track.player.connect(effectsRack[0]);
				// scope.volume = new Tone.Volume();
				// scope.track.effectsRack[3].connect(scope.volume);
				// scope.volume.toMaster();
				console.log('RACK', scope.track.effectsRack);
				scope.track.location = [];
				//remove all loops from UI
				var loopsUI = document.getElementsByClassName('trackLoop' + index.toString());
				console.log('LOOPS', loopsUI);
				while (loopsUI.length !== 0) {
					console.log('LOOPS ARR', loopsUI);
					for (var i = 0; i < loopsUI.length; i++) {
						loopsUI[i].parentNode.removeChild(loopsUI[i]);
					}
					var loopsUI = document.getElementsByClassName('trackLoop' + index.toString());
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

				console.log(otherTracks);
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
				var canvas = document.getElementById('analyser' + index);
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
						analyserContext.fillStyle = 'hsl( ' + Math.round(i * 360 / numBars) + ', 100%, 50%)';
						analyserContext.fillRect(i * SPACING, 100, BAR_WIDTH, -magnitude);
					}
					if (continueUpdate) {
						window.requestAnimationFrame(update);
					}
				}

				function endRecording() {
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
						scope.$parent.stop();
						ToneTimelineFct.unMuteAll(scope.$parent.tracks);
					});
				}
				if (Tone.Transport.state === 'stopped') {
					ToneTimelineFct.muteAll(scope.$parent.tracks);
					scope.$parent.metronome.start();

					var click = window.setInterval(function () {
						scope.$parent.metronome.stop();
						scope.$parent.metronome.start();
					}, 500);

					window.setTimeout(function () {
						window.clearInterval(click);
						endRecording();
					}, 4000);

					window.setTimeout(function () {
						RecorderFct.recordStart(recorder, index);
					}, 2050);
				} else {
					console.log('WHILE PLAYING');
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
						endRecording();
					}, endBar.toString() + 'm');
				}
			};
			scope.volumeChange = function (amount) {
				console.log('VOL AMOUNT', amount);

				if (typeof amount === 'undefined') return;
				var volume = parseFloat(amount / 100, 10);
				console.log('AFTER / 100, 10', volume);

				if (scope.track.player) scope.track.player.volume.value = amount - 20;
			};
			// scope.$watch('track.volume', scope.volumeChange);

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
					console.log('NEXT', nextBar);
					var playLaunch = Tone.Transport.setTimeline(function () {
						scope.track.player.start();
						var previewInteval = Tone.Transport.setInterval(function () {
							console.log('SHOULD PLAY');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImZvcmt3ZWIvZm9ya3dlYi5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9MYW5kaW5nUGFnZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTmV3UHJvamVjdENvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVGltZWxpbmVDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1VzZXJDb250cm9sbGVyLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9BbmFseXNlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRm9ya0ZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0hvbWVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1Byb2plY3RGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbG9hZGluZy1naWYvbG9hZGluZy1naWYuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxLQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtFQUNBLENBQUE7Ozs7QUFJQSxXQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxNQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsVUFBQTtHQUNBOztBQUVBLE1BQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxFQUFBOzs7QUFHQSxVQUFBO0dBQ0E7OztBQUdBLE9BQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsT0FBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbERBLENBQUEsWUFBQTs7QUFFQSxhQUFBLENBQUE7OztBQUdBLEtBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsd0JBQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxJQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLGVBQUEsRUFBQSxxQkFBQTtBQUNBLGdCQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLHdCQUFBO0FBQ0EsZUFBQSxFQUFBLHFCQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUE7QUFDQSxNQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0dBQ0EsQ0FBQTtBQUNBLFNBQUE7QUFDQSxnQkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLENBQUEsQ0FDQSxXQUFBLEVBQ0EsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBOzs7Ozs7QUFNQSxPQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7SUFDQTs7Ozs7QUFLQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUVBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsV0FBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLE9BQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLEVBQUEsQ0FBQTtBQ3hJQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsQ0FBQSxjQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsT0FBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsc0JBQUE7QUFDQSxZQUFBLEVBQUEsdUJBQUE7QUFDQSxTQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLHlCQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQTtHQUNBO0VBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ3BCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFFBQUE7QUFDQSxhQUFBLEVBQUEscUJBQUE7QUFDQSxZQUFBLEVBQUEsV0FBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxxQkFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtFQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBOzs7QUFHQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLGNBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxtRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsRUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsU0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxVQUFBLEVBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBSUEsS0FBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFdBQUEsR0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSx1QkFBQSxFQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLFNBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBOztBQUVBLFlBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsTUFBQSxLQUFBLGNBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO09BQ0E7TUFDQSxDQUFBOztBQUVBLFNBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtNQUNBLE1BQUE7QUFDQSxXQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtNQUNBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7SUFDQTtBQUNBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0dBQ0E7Ozs7QUFJQSxRQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsVUFBQSxHQUFBLEVBQUEsRUFBQSxVQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0E7OztBQUtBLGlCQUFBLENBQUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxjQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxNQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxHQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxNQUFBLEtBQUEsR0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsUUFBQSxHQUFBLFlBQUEsRUFFQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsTUFBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLHNCQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxjQUFBLENBQUEsa0JBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxLQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLEtBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0dBRUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxhQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxHQUFBLENBQUEseUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDbFFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsU0FBQTtBQUNBLGFBQUEsRUFBQSx1QkFBQTtBQUNBLFlBQUEsRUFBQSxZQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxxQkFBQTtBQUNBLGFBQUEsRUFBQSwwQkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTs7O0FBR0EsTUFBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLElBQUE7R0FDQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsd0JBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxPQUFBO0FBQ0EsYUFBQSxFQUFBLG1CQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxxQkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFdBQUE7QUFDQSxhQUFBLEVBQUEsdUJBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHVCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSx3QkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxZQUFBO0FBQ0EsYUFBQSxFQUFBLHdCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2pDQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsVUFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtBQUNBLFlBQUEsRUFBQSxtQkFBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQTs7Ozs7Ozs7Ozs7OztBQWFBLFlBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxFQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLE9BQUEsR0FBQSxDQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFJQSxJQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQ0EsS0FBQSxFQUFBLENBQ0EsTUFBQSxDQUFBLEtBQUEsQ0FBQTs7R0FFQSxJQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsQ0FBQSxDQUNBLEtBQUEsQ0FBQTtBQUNBLFlBQUEsRUFBQSxjQUFBO0FBQ0EsVUFBQSxFQUFBLE1BQUE7QUFDQSxpQkFBQSxFQUFBLEtBQUE7QUFDQSxxQkFBQSxFQUFBLE1BQUE7R0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FJQSxDQUFBLENBQUE7QUNsREEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsS0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLG9CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxFQUFBLElBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQTtBQUNBLFlBQUEsRUFBQSwwQ0FBQTtJQUNBLENBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsa0JBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsS0FBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtHQUNBOztBQUVBLGNBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLEtBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7SUFDQSxNQUNBO0FBQ0EsUUFBQSxHQUFBLEtBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFHQSxPQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsSUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxFQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQUtBLENBQUEsQ0FBQTs7QUNsRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSx1QkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFNBQUEsQ0FBQSxvQkFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsTUFBQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsY0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLE9BQUEsUUFBQSxJQUFBLENBQUEsRUFBQSxPQUFBOztBQUVBLE9BQUEsVUFBQSxHQUFBLFFBQUEsQ0FBQSxlQUFBLENBQUEsWUFBQSxHQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLE9BQUEsR0FBQSxVQUFBLEdBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtJQUNBLEVBQUEsRUFBQSxDQUFBLENBQUE7R0FDQTs7QUFFQSxnQkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFJQSxPQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDL0NBLEdBQUEsQ0FBQSxVQUFBLENBQUEsc0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDaEJBLEdBQUEsQ0FBQSxVQUFBLENBQUEsb0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQTs7QUFFQSxLQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsV0FBQSxDQUFBLGNBQUEsQ0FBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLE1BQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBOztNQUVBO0tBQ0EsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxNQUFBO0FBQ0EsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7SUFDQTtHQUNBOztBQUVBLGlCQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7Ozs7Ozs7QUFRQSxPQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFNBQUEsQ0FBQTs7O0FBR0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLGFBQUEsRUFDQSxPQUFBOztBQUVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxJQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxlQUFBLENBQUE7O0lBR0EsRUFBQSxHQUFBLENBQUEsQ0FBQTtHQUVBLEVBQUEsSUFBQSxDQUFBLENBQUE7RUFFQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxZQUFBOztBQUVBLE1BQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLE9BQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsSUFBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsRUFBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxHQUFBLENBQUEseUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtFQUNBLENBQUE7Q0FNQSxDQUFBLENBQUE7O0FDdEdBLEdBQUEsQ0FBQSxVQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxNQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsS0FDQSxNQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsNEJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBO0NBR0EsQ0FBQSxDQUFBO0FDL0JBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFlBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsZUFBQSxFQUFBLFlBQUEsRUFBQSxjQUFBLEVBQUE7O0FBRUEsV0FBQSxNQUFBLEdBQUE7QUFDQSxPQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLG9CQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsR0FBQSxPQUFBLENBQUE7OztBQUdBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxHQUFBLFNBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxTQUFBLEdBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtJQUNBO0FBQ0EsT0FBQSxjQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7QUFDQSxRQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBR0EsS0FBQSxxQkFBQSxHQUFBLFNBQUEscUJBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxRQUFBO0FBQ0EsaUJBQUEsRUFBQSxlQUFBO0FBQ0EsdUJBQUEsRUFBQSxxQkFBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUM1Q0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsS0FBQSxNQUFBLEdBQUEsU0FBQSxNQUFBLEdBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxRQUFBO0FBQ0EsUUFBQSxFQUFBLE1BQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDYkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQTtBQUNBLFNBQUEsRUFBQSxpQkFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxFQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQTtFQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNiQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxLQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxTQUFBLEVBQUE7OztBQUdBLE1BQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxLQUFBLENBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLElBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsZ0JBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsS0FBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxVQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsS0FBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLFNBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxnQkFBQSxHQUFBLFNBQUEsRUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLFVBQUEsQ0FBQSxnQkFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLGFBQUEsR0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEseUJBQUEsRUFBQSxFQUFBLE9BQUEsRUFBQSxPQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBR0EsUUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLGFBQUEsRUFBQSxXQUFBO0FBQ0EsWUFBQSxFQUFBLFVBQUE7QUFDQSxlQUFBLEVBQUEsYUFBQTtBQUNBLFlBQUEsRUFBQSxVQUFBO0FBQ0EsZUFBQSxFQUFBLGFBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ25EQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsS0FBQSxZQUFBLEdBQUEsU0FBQSxZQUFBLEdBQUE7O0FBRUEsU0FBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsSUFBQSxNQUFBLENBQUEsa0JBQUEsQ0FBQTtBQUNBLE9BQUEsWUFBQSxHQUFBLElBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLFFBQUEsQ0FBQTs7QUFFQSxPQUFBLFNBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFlBQUEsR0FDQSxTQUFBLENBQUEsWUFBQSxJQUNBLFNBQUEsQ0FBQSxrQkFBQSxJQUNBLFNBQUEsQ0FBQSxlQUFBLElBQ0EsU0FBQSxDQUFBLGNBQUEsQUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxvQkFBQSxFQUNBLFNBQUEsQ0FBQSxvQkFBQSxHQUFBLFNBQUEsQ0FBQSwwQkFBQSxJQUFBLFNBQUEsQ0FBQSx1QkFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxxQkFBQSxFQUNBLFNBQUEsQ0FBQSxxQkFBQSxHQUFBLFNBQUEsQ0FBQSwyQkFBQSxJQUFBLFNBQUEsQ0FBQSx3QkFBQSxDQUFBOzs7QUFHQSxZQUFBLENBQUEsWUFBQSxDQUNBO0FBQ0EsV0FBQSxFQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLDRCQUFBLEVBQUEsT0FBQTtBQUNBLDJCQUFBLEVBQUEsT0FBQTtBQUNBLDRCQUFBLEVBQUEsT0FBQTtBQUNBLDBCQUFBLEVBQUEsT0FBQTtNQUNBO0FBQ0EsZUFBQSxFQUFBLEVBQUE7S0FDQTtJQUNBLEVBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7OztBQUdBLFFBQUEsY0FBQSxHQUFBLFlBQUEsQ0FBQSx1QkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7O0FBR0EsUUFBQSxZQUFBLEdBQUEsWUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7O0FBR0EsWUFBQSxHQUFBLElBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxRQUFBLEdBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBLENBQUEsQ0FBQSxDQUFBO0lBRUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLFFBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxZQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLG9CQUFBLEdBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7OztBQUlBLFlBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxpQkFBQSxDQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLGtCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUlBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLE1BQUEsR0FBQSxJQUFBLFVBQUEsRUFBQSxDQUFBOztBQUVBLE9BQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxhQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0lBQ0EsTUFBQTtBQUNBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFLQSxRQUFBO0FBQ0EsV0FBQSxFQUFBLG1CQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLE9BQUEsWUFBQSxHQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxFQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLFFBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBO09BQ0EsQ0FBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLDhCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FFQTtBQUNBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsYUFBQSxFQUFBLFdBQUE7QUFDQSxZQUFBLEVBQUEsVUFBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUMvSUEsWUFBQSxDQUFBOztBQ0FBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsT0FBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtLQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsTUFBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLE9BQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsR0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxxQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxpQkFBQSxHQUFBLFNBQUEsaUJBQUEsQ0FBQSxNQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLE1BQUEsY0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7SUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0dBRUE7O0FBRUEsZ0JBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsT0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtJQUNBLEVBQUEsU0FBQSxDQUFBLENBQUE7Ozs7Ozs7R0FRQSxDQUFBLENBQUE7RUFFQSxDQUFBOztBQUVBLFFBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUE7QUFDQSxXQUFBLEVBQUEsU0FBQTtBQUNBLG1CQUFBLEVBQUEsaUJBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUE7QUFDQSxTQUFBLEVBQUEsT0FBQTtBQUNBLFNBQUEsRUFBQSxPQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2pHQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsS0FBQSxZQUFBLEdBQUEsU0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOzs7QUFHQSxTQUFBLE1BQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLElBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLGVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxHQUFBLFFBQUEsSUFBQSxRQUFBLEdBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxlQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLGtCQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsT0FBQSxNQUFBLENBQUE7O0FBRUEsU0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsR0FBQSxFQUFBOztBQUdBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxNQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsSUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLE1BQUEsUUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsV0FBQSxDQUFBOztBQUVBLE1BQUEsR0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFFBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7OztBQUlBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0EsRUFBQSxPQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsbUJBQUEsR0FBQSxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLFFBQUE7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsaUJBQUE7QUFDQSw4QkFBQSxFQUFBLDRCQUFBO0FBQ0EscUJBQUEsRUFBQSxtQkFBQTtBQUNBLG9CQUFBLEVBQUEsa0JBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3RGQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUE7QUFDQSxZQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0E7O0FBRUEsUUFBQSxFQUFBLGdCQUFBLElBQUEsRUFBQSxZQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsWUFBQSxFQUFBLElBQUEsRUFBQSxZQUFBLEVBQUEsWUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLDZCQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0E7O0FBRUEsVUFBQSxFQUFBLGtCQUFBLFFBQUEsRUFBQSxZQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsY0FBQSxFQUFBLFFBQUEsRUFBQSxZQUFBLEVBQUEsWUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDeEJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxRQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsTUFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxJQUFBLENBQUEsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxJQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxLQUFBLENBQUE7R0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxnQkFBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUE7R0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBO0VBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLE9BQUEsRUFBQTtBQUNBLE9BQUEsRUFBQSxHQUFBO0FBQUEsR0FDQTtBQUNBLE1BQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUE7O0FBRUEsT0FBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLEtBQUEsQ0FBQSxZQUFBLENBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7OztBQUdBLFFBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsU0FBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUE7QUFDQSxRQUFBLGFBQUEsQ0FBQTtBQUNBLFFBQUEsU0FBQSxDQUFBOztBQUVBLFNBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsU0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBLFlBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTs7QUFFQSxVQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQTs7QUFFQSxXQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTs7QUFFQSxXQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxRQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxxQkFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQTtBQUNBLGlCQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1FBRUE7T0FDQTtNQUNBO0tBQ0E7O0FBR0EsU0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsYUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxTQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNoSEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsa0RBQUE7QUFDQSxZQUFBLEVBQUEsMkJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsMkJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxLQUFBLHVCQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7SUFDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsUUFBQSxZQUFBLENBQUEsS0FBQSxLQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7SUFDQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLE1BQUEsQ0FBQSxPQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7R0FFQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLG9CQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7Q0FJQSxDQUFBLENBQUE7QUMzQ0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxlQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSx5REFBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNOQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxPQUFBLEVBQUEsRUFBQTtBQUNBLGFBQUEsRUFBQSx5Q0FBQTtBQUNBLE1BQUEsRUFBQSxjQUFBLEtBQUEsRUFBQTs7QUFFQSxPQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsR0FBQTtBQUNBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLFNBQUEsRUFBQSxLQUFBLEVBQUEsOEJBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLENBQ0EsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTtBQUNBLFlBQUEsRUFBQSxDQUFBOzs7Ozs7OztBQVFBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxPQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsT0FBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxTQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0dBRUE7O0VBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzlEQSxHQUFBLENBQUEsU0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLCtDQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ0xBLEdBQUEsQ0FBQSxTQUFBLENBQUEsa0JBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLG9EQUFBO0FBQ0EsWUFBQSxFQUFBLDRCQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLDRCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBOztBQUlBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxHQUFBLEtBQUEsWUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0E7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLHNCQUFBLEVBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEVBQUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxPQUFBLENBQUEsR0FBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGdCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNqREEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSx1Q0FBQTtBQUNBLE1BQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLGVBQUEsR0FBQSxDQUFBO0FBQ0EsUUFBQSxFQUFBLFFBQUE7QUFDQSxVQUFBLEVBQUEsQ0FBQTtJQUNBLEVBQUE7QUFDQSxRQUFBLEVBQUEsUUFBQTtBQUNBLFVBQUEsRUFBQSxDQUFBO0lBQ0EsRUFBQTtBQUNBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxFQUFBLENBQUE7SUFDQSxFQUFBO0FBQ0EsUUFBQSxFQUFBLGVBQUE7QUFDQSxVQUFBLEVBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFlBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsU0FBQSxhQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUE7O0FBRUEsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLGFBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxVQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSwrRUFBQSxHQUFBLFVBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO09BQ0E7TUFDQTtLQUNBO0lBQ0EsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsWUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsQ0FBQTtNQUNBO0tBQ0E7OztBQUdBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLFFBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLEtBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLDJCQUFBLEdBQUEsS0FBQSxHQUFBLGlEQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBRUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsYUFBQSxFQUFBLFVBQUEsRUFBQTtBQUNBLFdBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLGlCQUFBLENBQUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFHQSxRQUFBLENBQUEsaUJBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxTQUFBLFNBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxVQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxRQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsR0FBQSwyQkFBQSxHQUFBLFVBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO01BQ0EsTUFBQTs7O1VBT0EsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGNBQUEsSUFBQSxPQUFBLENBQUEsVUFBQSxJQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO09BQ0E7O0FBUkEsVUFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsa0JBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUtBLG1CQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7TUFDQTtLQUNBLE1BQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7Ozs7O0FBTUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsT0FBQSxDQUFBLE1BQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQTtBQUNBLFNBQUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxzQkFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsQ0FBQTtLQUNBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxLQUFBLENBQUE7TUFDQTtLQUNBLENBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsSUFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE9BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLFFBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBOztBQUVBLFFBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQTs7O0FBR0EsUUFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLGVBQUEsR0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxZQUFBLEdBQUEsS0FBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxDQUFBLGtCQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLGFBQUEsTUFBQSxHQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLFNBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLEdBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFVBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO01BQ0E7QUFDQSxTQUFBLGNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO01BQ0E7S0FDQTs7QUFFQSxhQUFBLFlBQUEsR0FBQTtBQUNBLGdCQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxvQkFBQSxDQUFBOzs7QUFHQSxXQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7OztBQUdBLG9CQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7OztBQUdBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO01BQ0EsQ0FBQSxDQUFBO0tBQ0E7QUFDQSxRQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLG9CQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTs7QUFFQSxTQUFBLEtBQUEsR0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO01BQ0EsRUFBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsRUFBQSxDQUFBO01BRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxpQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7TUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxNQUFBLEdBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLEtBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO09BQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtNQUNBLEVBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUdBLFNBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsRUFBQSxDQUFBO01BRUEsRUFBQSxNQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7QUFDQSxRQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxPQUFBLE1BQUEsS0FBQSxXQUFBLEVBQUEsT0FBQTtBQUNBLFFBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsR0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUdBLFFBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0lBQ0EsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxVQUFBLG1CQUFBLEVBQUE7QUFDQSxRQUFBLE9BQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxTQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO01BQ0EsTUFBQTtBQUNBLGFBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO01BQ0E7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO09BQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxHQUFBLGNBQUEsQ0FBQTtNQUNBLEVBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtJQUNBLENBQUE7R0FFQTs7RUFHQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ25nU3RvcmFnZScsICduZ01hdGVyaWFsJywgJ25nS25vYiddKTtcclxuXHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcclxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcclxuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxyXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xyXG59KTtcclxuXHJcbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cclxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xyXG5cclxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXHJcbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxyXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXHJcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XHJcblxyXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xyXG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxyXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cclxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxyXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXHJcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cclxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxufSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxyXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xyXG5cclxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XHJcblxyXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcclxuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xyXG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xyXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcclxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXHJcbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xyXG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXHJcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXHJcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxyXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxyXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcclxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XHJcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XHJcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcclxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxyXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxyXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcclxuICAgICAgICAgICAgJyRpbmplY3RvcicsXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcclxuXHJcbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxyXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cclxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcclxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxyXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXHJcbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXHJcbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxyXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcclxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zaWdudXAgPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coY3JlZGVudGlhbHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIGNyZWRlbnRpYWxzKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oIG9uU3VjY2Vzc2Z1bExvZ2luIClcclxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgc2lnbnVwIGNyZWRlbnRpYWxzLicgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcclxuXHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XHJcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pO1xyXG5cclxufSkoKTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9nZ2VkSW5Ib21lJywge1xyXG4gICAgICAgIHVybDogJy9ob21lJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcidcclxuICAgIH0pXHJcblx0LnN0YXRlKCdob21lJyx7XHJcblx0XHR1cmw6ICcvJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvaG9tZS9sYW5kaW5nLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0xhbmRpbmdQYWdlQ29udHJvbGxlcicsXHJcblx0XHRyZXNvbHZlOiB7XHJcblx0XHRcdCBjaGVja0lmTG9nZ2VkSW46IGZ1bmN0aW9uIChBdXRoU2VydmljZSwgJHN0YXRlKSB7XHJcblx0XHRcdCBcdC8vIGNvbnNvbGUubG9nKEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpKTtcclxuXHRcdCAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xyXG5cdFx0ICAgICAgICBcdGlmKHVzZXIpICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XHJcblx0XHQgICAgICAgIH0pO1xyXG5cdFx0ICAgIH1cclxuXHRcdH1cclxuXHR9KTtcclxufSk7XHJcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xyXG4gICAgICAgIHVybDogJy9sb2dpbicsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAkc2NvcGUubG9naW4gPSB7fTtcclxuICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2plY3QnLCB7XHJcbiAgICAgICAgdXJsOiAnL3Byb2plY3QvOnByb2plY3RJRCcsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9qZWN0L3Byb2plY3QuaHRtbCdcclxuICAgIH0pO1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQXV0aFNlcnZpY2UpIHtcclxuXHJcblx0Ly93aW5kb3cgZXZlbnRzXHJcblx0d2luZG93Lm9uYmx1ciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkc2NvcGUuc3RvcCgpO1xyXG5cdFx0JHNjb3BlLiRkaWdlc3QoKTtcclxuICAgIH07XHJcbiAgICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBsZWF2ZSB0aGlzIHBhZ2UgYmVmb3JlIHNhdmluZyB5b3VyIHdvcms/XCI7XHJcblx0fTtcclxuXHR3aW5kb3cub251bmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lcygpO1xyXG5cdH1cclxuXHQkKCcudGltZWxpbmUtY29udGFpbmVyJykuc2Nyb2xsKGZ1bmN0aW9uKCl7XHJcblx0ICAgICQoJy50cmFja01haW5TZWN0aW9uJykuY3NzKHtcclxuXHQgICAgICAgICdsZWZ0JzogJCh0aGlzKS5zY3JvbGxMZWZ0KClcclxuXHQgICAgfSk7XHJcblx0fSk7XHJcblxyXG5cclxuXHJcblx0dmFyIG1heE1lYXN1cmUgPSAwO1xyXG5cclxuXHQvLyBudW1iZXIgb2YgbWVhc3VyZXMgb24gdGhlIHRpbWVsaW5lXHJcblx0JHNjb3BlLm51bU1lYXN1cmVzID0gXy5yYW5nZSgwLCA2MCk7XHJcblxyXG5cdC8vIGxlbmd0aCBvZiB0aGUgdGltZWxpbmVcclxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcblxyXG5cdC8vSW5pdGlhbGl6ZSByZWNvcmRlciBvbiBwcm9qZWN0IGxvYWRcclxuXHRSZWNvcmRlckZjdC5yZWNvcmRlckluaXQoKS50aGVuKGZ1bmN0aW9uIChyZXRBcnIpIHtcclxuXHRcdCRzY29wZS5yZWNvcmRlciA9IHJldEFyclswXTtcclxuXHRcdCRzY29wZS5hbmFseXNlck5vZGUgPSByZXRBcnJbMV07XHJcblx0fSkuY2F0Y2goZnVuY3Rpb24gKGUpe1xyXG4gICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coZSk7XHJcbiAgICB9KTtcclxuXHJcblx0JHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG5cdCRzY29wZS50cmFja3MgPSBbXTtcclxuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0JHNjb3BlLnByb2plY3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9qZWN0SUQ7XHJcblx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xyXG5cdCRzY29wZS5jdXJyZW50bHlSZWNvcmRpbmcgPSBmYWxzZTtcclxuXHQkc2NvcGUucHJldmlld2luZ0lkID0gbnVsbDtcclxuXHQkc2NvcGUuem9vbSA9IDEwMDtcclxuXHJcblx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblx0XHR2YXIgbG9hZGVkID0gMDtcclxuXHRcdGNvbnNvbGUubG9nKCdQUk9KRUNUJywgcHJvamVjdCk7XHJcblx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBwcm9qZWN0Lm5hbWU7XHJcblxyXG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3QudHJhY2tzLmxlbmd0aCcsIHByb2plY3QudHJhY2tzLmxlbmd0aCk7XHJcblxyXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cclxuXHRcdFx0XHR2YXIgbG9hZGFibGVUcmFja3MgPSBbXTtcclxuXHJcblx0XHRcdFx0cHJvamVjdC50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHRcdGlmICh0cmFjay51cmwpIHtcclxuXHRcdFx0XHRcdFx0bG9hZGFibGVUcmFja3MrKztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xyXG5cclxuXHRcdFx0XHRcdHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdFx0XHRcdGxvYWRlZCsrO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYobG9hZGVkID09PSBsb2FkYWJsZVRyYWNrcykge1xyXG5cdFx0XHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRkaWdlc3QoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHR2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdHJhY2subG9jYXRpb24pO1xyXG5cdFx0XHRcdFx0aWYobWF4ICsgMiA+IG1heE1lYXN1cmUpIG1heE1lYXN1cmUgPSBtYXggKyAyO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dHJhY2sucmVjb3JkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGFzc3VtaW5nIHRoYXQgYSBwbGF5ZXIgZXhpc3RzXHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG5cdFx0XHRcdFx0Ly9pbml0IGVmZmVjdHMsIGNvbm5lY3QsIGFuZCBhZGQgdG8gc2NvcGVcclxuXHJcblx0XHRcdFx0XHR0cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZSh0cmFjay5lZmZlY3RzUmFjayk7XHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIuY29ubmVjdCh0cmFjay5lZmZlY3RzUmFja1swXSk7XHJcblxyXG5cdFx0XHRcdFx0aWYodHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcclxuXHRcdFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IHRydWU7XHJcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xyXG4gICAgXHRcdFx0XHR0cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdHRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLCAwLCAwLCAwXSk7XHJcbiAgICBcdFx0XHRcdHRyYWNrLnBsYXllciA9IG51bGw7XHJcbiAgICBcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdCRzY29wZS5tYXhNZWFzdXJlID0gMzI7XHJcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcclxuICAgIFx0XHRcdFx0dmFyIG9iaiA9IHt9O1xyXG4gICAgXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xyXG4gICAgXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5vblRpbWVsaW5lID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5zaWxlbmNlID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwgMCwgMCwgMF0pO1xyXG4gICAgXHRcdFx0XHRvYmoucGxheWVyID0gbnVsbDtcclxuICAgIFx0XHRcdFx0b2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xyXG4gICAgXHRcdFx0XHRvYmoubG9jYXRpb24gPSBbXTtcclxuICAgIFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XHJcbiAgXHRcdFx0fVxyXG4gIFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly9keW5hbWljYWxseSBzZXQgbWVhc3VyZXNcclxuXHRcdC8vaWYgbGVzcyB0aGFuIDE2IHNldCAxOCBhcyBtaW5pbXVtXHJcblx0XHQkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcclxuXHRcdGlmKG1heE1lYXN1cmUgPCAzMikgbWF4TWVhc3VyZSA9IDMyO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXhNZWFzdXJlOyBpKyspIHtcclxuXHRcdFx0JHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XHJcblx0XHR9XHJcblx0XHQvLyBjb25zb2xlLmxvZygnTUVBU1VSRVMnLCAkc2NvcGUubnVtTWVhc3VyZXMpO1xyXG5cclxuXHJcblxyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LmNyZWF0ZVRyYW5zcG9ydChwcm9qZWN0LmVuZE1lYXN1cmUpLnRoZW4oZnVuY3Rpb24gKG1ldHJvbm9tZSkge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lID0gbWV0cm9ub21lO1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcclxuXHRcdH0pO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHQkc2NvcGUuanVtcFRvTWVhc3VyZSA9IGZ1bmN0aW9uKG1lYXN1cmUpIHtcclxuXHRcdGlmKG1heE1lYXN1cmUgPiBtZWFzdXJlKSB7XHJcblx0XHRcdCRzY29wZS5wb3NpdGlvbiA9IG1lYXN1cmU7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uID0gbWVhc3VyZS50b1N0cmluZygpICsgXCI6MDowXCI7XHJcblx0XHRcdCRzY29wZS5tb3ZlUGxheWhlYWQobWVhc3VyZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQkc2NvcGUubW92ZVBsYXloZWFkID0gZnVuY3Rpb24gKG51bWJlck1lYXN1cmVzKSB7XHJcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zdWJzdHIoMSkpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IChudW1iZXJNZWFzdXJlcyAqIDIwMCArIDMwMCkudG9TdHJpbmcoKSsncHgnO1xyXG5cdH1cclxuXHJcblx0JHNjb3BlLnpvb21PdXQgPSBmdW5jdGlvbigpIHtcclxuXHRcdCRzY29wZS56b29tIC09IDEwO1xyXG5cdFx0dmFyIHpvb20gPSAoJHNjb3BlLnpvb20gLSAxMCkudG9TdHJpbmcoKSArIFwiJVwiO1xyXG5cdFx0JCgnLnRpbWVsaW5lLWNvbnRhaW5lcicpLmNzcygnem9vbScsIHpvb20pO1xyXG5cdFx0Y29uc29sZS5sb2coJ09VVCcsICRzY29wZS56b29tKTtcclxuXHR9O1xyXG5cclxuXHQkc2NvcGUuem9vbUluID0gZnVuY3Rpb24oKSB7XHJcblx0XHQkc2NvcGUuem9vbSArPSAxMDtcclxuXHRcdHZhciB6b29tID0gKCRzY29wZS56b29tICsgMTApLnRvU3RyaW5nKCkgKyBcIiVcIjtcclxuXHRcdCQoJy50aW1lbGluZS1jb250YWluZXInKS5jc3MoJ3pvb20nLCB6b29tKTtcclxuXHRcdGNvbnNvbGUubG9nKCdJTicsICRzY29wZS56b29tKTtcclxuXHR9O1xyXG5cclxuXHQkc2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdHZhciB0cmFjayA9IHNjb3BlLnRyYWNrc1tpbmRleF07XHJcblx0fTtcclxuXHJcblx0JHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHR9O1xyXG5cclxuXHJcblx0JHNjb3BlLnBsYXkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHQkc2NvcGUucGxheWluZyA9IHRydWU7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG5cdH07XHJcblx0JHNjb3BlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JHNjb3BlLnBsYXlpbmcgPSBmYWxzZTtcclxuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XHJcblx0XHQkc2NvcGUucG9zaXRpb24gPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpWzBdO1xyXG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCI6MDowXCIpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICgkc2NvcGUucG9zaXRpb24gKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4JztcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnBhdXNlKCk7XHJcblx0fTtcclxuXHQkc2NvcGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XHJcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xyXG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcclxuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAnMzAwcHgnO1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RvcCgpO1xyXG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCI6MDowXCIpO1xyXG5cdFx0JCgnI3Bvc2l0aW9uU2VsZWN0b3InKS52YWwoXCIwXCIpO1xyXG5cdFx0Ly9zdG9wIGFuZCB0cmFjayBjdXJyZW50bHkgYmVpbmcgcHJldmlld2VkXHJcblx0XHRpZigkc2NvcGUucHJldmlld2luZ0lkKSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFySW50ZXJ2YWwoJHNjb3BlLnByZXZpZXdpbmdJZCk7XHJcblx0XHRcdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHQkc2NvcGUubmFtZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcclxuXHRcdGNvbnNvbGUubG9nKCdORVcnLCBuZXdOYW1lKTtcclxuXHRcdGlmKG5ld05hbWUpIHtcclxuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IGZhbHNlO1xyXG5cdFx0XHRQcm9qZWN0RmN0Lm5hbWVDaGFuZ2UobmV3TmFtZSwgJHNjb3BlLnByb2plY3RJZCkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlJFU1wiLCByZXNwb25zZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IFwiWW91IG11c3Qgc2V0IGEgbmFtZSFcIjtcclxuXHRcdFx0JHNjb3BlLnByb2plY3ROYW1lID0gXCJVbnRpdGxlZFwiO1xyXG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdE5hbWVJbnB1dCcpLmZvY3VzKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQkc2NvcGUudG9nZ2xlTWV0cm9ub21lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYoJHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPT09IDApIHtcclxuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gZmFsc2U7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdCRzY29wZS5tZXRyb25vbWUub24gPSB0cnVlO1xyXG5cclxuXHRcdH1cclxuXHR9XHJcblxyXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKCRzY29wZS50cmFja3MsICRzY29wZS5wcm9qZWN0SWQsICRzY29wZS5wcm9qZWN0TmFtZSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB3YXZlIGxvZ2ljXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xyXG5cclxuICAgIH0pO1xyXG4gIH07XHJcbiAgXHJcbiAgJHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgfTtcclxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xyXG4gICAgICAgIHVybDogJy9zaWdudXAnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcclxuICAgIH0pO1xyXG5cclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xyXG5cclxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcclxuICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XHJcblxyXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XHJcbiAgICAgICAgQXV0aFNlcnZpY2Uuc2lnbnVwKHNpZ251cEluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VyUHJvZmlsZScsIHtcclxuICAgICAgICB1cmw6ICcvdXNlcnByb2ZpbGUvOnRoZUlEJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvdXNlcnByb2ZpbGUuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJyxcclxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5hcnRpc3RJbmZvJywge1xyXG4gICAgICAgIHVybDogJy9pbmZvJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvaW5mby5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXHJcbiAgICB9KVxyXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5wcm9qZWN0Jywge1xyXG4gICAgICAgIHVybDogJy9wcm9qZWN0cycsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2plY3RzLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2VycycsIHtcclxuICAgICAgICB1cmw6ICcvZm9sbG93ZXJzJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93ZXJzLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2luZycsIHtcclxuICAgICAgICB1cmw6ICcvZm9sbG93aW5nJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93aW5nLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pO1xyXG5cclxufSk7XHJcblxyXG4iLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ya3dlYicsIHtcclxuICAgICAgICB1cmw6ICcvZm9ya3dlYicsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9mb3Jrd2ViL2Zvcmt3ZWIuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogXCJGb3JrV2ViQ29udHJvbGxlclwiXHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ0ZvcmtXZWJDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRzdGF0ZSwgUHJvamVjdEZjdCwgQXV0aFNlcnZpY2UsIEZvcmtGYWN0b3J5KXtcclxuXHJcblx0XHQvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcblx0XHQvLyBcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XHJcblx0XHQvLyBcdCRzY29wZS5kaXNwbGF5QVByb2plY3QgPSBmdW5jdGlvbihzb21ldGhpbmcpe1xyXG5cdFx0Ly8gXHRcdGNvbnNvbGUubG9nKCdUSElORycsIHNvbWV0aGluZyk7XHJcblx0XHQvLyBcdFx0aWYoJHNjb3BlLmxvZ2dlZEluVXNlci5faWQgPT09ICRzdGF0ZVBhcmFtcy50aGVJRCl7XHJcblx0XHQvLyBcdFx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBzb21ldGhpbmcuX2lkfSk7XHJcblx0XHQvLyBcdFx0fVxyXG5cdFx0Ly8gXHRcdGNvbnNvbGUubG9nKFwiZGlzcGxheWluZyBhIHByb2plY3RcIiwgJHNjb3BlLnBhcmVudCk7XHJcblx0XHQvLyBcdH1cclxuXHRcdC8vIH0pO1xyXG5cclxuXHRcdEZvcmtGYWN0b3J5LmdldFdlYigpLnRoZW4oZnVuY3Rpb24od2Vicyl7XHJcblx0ICAgICAgICAkc2NvcGUuZm9ya3MgPSB3ZWJzO1xyXG5cdCAgICAgICAgY29uc29sZS5sb2coJ3dlYnMgYXJlJywgJHNjb3BlLmZvcmtzKTtcclxuXHQgICAgXHRcclxuXHQgICAgXHR2YXIgZGF0YXNldCA9IFsgMjUsIDcsIDUsIDI2LCAxMSBdO1xyXG5cdCAgICBcdFxyXG5cclxuXHJcblx0ICAgIFx0ZDMuc2VsZWN0KCcjdWknKS5zZWxlY3RBbGwoXCJkaXZcIikuZGF0YShkYXRhc2V0KVxyXG5cdCAgICBcdC5lbnRlcigpXHJcblx0ICAgIFx0LmFwcGVuZChcImRpdlwiKVxyXG5cdCAgICBcdC8vIC50ZXh0KGZ1bmN0aW9uKGQpe3JldHVybiBcIkkgY2FuIGNvdW50IHVwIHRvIFwiICsgZDt9KVxyXG5cdCAgICBcdC5hdHRyKFwiY2xhc3NcIiwgXCJiYXJcIilcclxuXHQgICAgXHQuc3R5bGUoe1xyXG5cdFx0XHQgICAgJ2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJyxcclxuXHRcdFx0ICAgICd3aWR0aCc6ICcyMHB4JyxcclxuXHRcdFx0ICAgICdtYXJnaW4tcmlnaHQnOiAnMnB4JyxcclxuXHRcdFx0ICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogJ3RlYWwnXHJcblx0XHRcdH0pXHJcblx0XHRcdC5zdHlsZShcImhlaWdodFwiLCBmdW5jdGlvbihkKXtcclxuXHRcdFx0XHRyZXR1cm4gKGQgKiA1KSArIFwicHhcIjtcclxuXHRcdFx0fSk7XHJcblxyXG5cdCAgICB9KTtcclxuXHJcblxyXG5cdFxyXG59KTsiLCJhcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBUb25lVHJhY2tGY3QsIFByb2plY3RGY3QsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCAkbWRUb2FzdCkge1xyXG5cdHZhciB0cmFja0J1Y2tldCA9IFtdO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ25hdmJhcicpWzBdLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblxyXG5cdCRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcclxuICAgIH07XHJcblxyXG4gICAgJHNjb3BlLnByb2plY3RzID0gZnVuY3Rpb24gKCl7XHJcbiAgICBcdFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oKS50aGVuKGZ1bmN0aW9uKHByb2plY3RzKXtcclxuICAgIFx0XHQkc2NvcGUuYWxsUHJvamVjdHMgPSBwcm9qZWN0cztcclxuICAgIFx0fSk7XHJcbiAgICB9O1xyXG5cdCRzY29wZS5wcm9qZWN0cygpO1xyXG5cclxuXHJcblx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdsb2dnZWRJblVzZXInLCBsb2dnZWRJblVzZXIpO1xyXG5cdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcclxuXHRcdFx0cHJvamVjdC5mb3JrSUQgPSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0ZGVsZXRlIHByb2plY3QuX2lkO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhwcm9qZWN0KTtcclxuXHRcdFx0JG1kVG9hc3Quc2hvdyh7XHJcblx0XHRcdFx0aGlkZURlbGF5OiAyMDAwLFxyXG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tIHJpZ2h0JyxcclxuXHRcdFx0XHR0ZW1wbGF0ZTpcIjxtZC10b2FzdD4gSXQncyBiZWVuIGZvcmtlZCA8L21kLXRvYXN0PlwiXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9yayByZXNwb25zZSBpcycsIHJlc3BvbnNlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cdFxyXG5cdH1cclxuXHRcdFxyXG5cdHZhciBzdG9wID1mYWxzZTtcclxuXHJcblxyXG5cdCRzY29wZS5zYW1wbGVUcmFjayA9IGZ1bmN0aW9uKHRyYWNrKXtcclxuXHJcblx0XHRpZihzdG9wPT09dHJ1ZSl7XHJcblx0XHRcdCRzY29wZS5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBmdW5jdGlvbihwbGF5ZXIpe1xyXG5cdFx0XHQkc2NvcGUucGxheWVyID0gcGxheWVyO1xyXG5cdFx0XHRpZihzdG9wID09PSBmYWxzZSl7XHJcblx0XHRcdFx0c3RvcCA9IHRydWU7XHJcblx0XHRcdFx0JHNjb3BlLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblx0XHRcdFx0c3RvcCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cclxuXHQkc2NvcGUuZ2V0VXNlclByb2ZpbGUgPSBmdW5jdGlvbih1c2VyKXtcclxuXHQgICAgLy8gY29uc29sZS5sb2coXCJjbGlja2VkXCIsIHVzZXIpO1xyXG5cdCAgICAkc3RhdGUuZ28oJ3VzZXJQcm9maWxlJywge3RoZUlEOiB1c2VyLl9pZH0pO1xyXG5cdH1cclxuXHJcbiAgICBcclxuXHJcblxyXG59KTtcclxuIiwiYXBwLmNvbnRyb2xsZXIoJ0xhbmRpbmdQYWdlQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCBUb25lVHJhY2tGY3QsICRzdGF0ZSkge1xyXG4gICAgLy8gJCgnI2Z1bGxwYWdlJykuZnVsbHBhZ2UoKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblxyXG5cclxuICAgICRzY29wZS5nb1RvRm9ybXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBcdGZ1bmN0aW9uIHNjcm9sbFRvQm90dG9tKGR1cmF0aW9uKSB7XHJcblx0XHQgICAgaWYgKGR1cmF0aW9uIDw9IDApIHJldHVybjtcclxuXHJcblx0XHRcdHZhciBkaWZmZXJlbmNlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCAtIHdpbmRvdy5zY3JvbGxZO1xyXG5cdFx0XHR2YXIgcGVyVGljayA9IGRpZmZlcmVuY2UgLyBkdXJhdGlvbiAqIDEwO1xyXG5cclxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR3aW5kb3cuc2Nyb2xsKDAsIHdpbmRvdy5zY3JvbGxZICsgcGVyVGljayk7XHJcblx0XHRcdFx0c2Nyb2xsVG9Cb3R0b20oZHVyYXRpb24gLSAxMCk7XHJcblx0XHRcdH0sIDEwKTtcclxuXHRcdH1cclxuXHJcblx0XHRzY3JvbGxUb0JvdHRvbSgxMDAwKTtcclxuICAgIH07XHJcblxyXG4gICAgXHJcblxyXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xyXG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFwcC5jb250cm9sbGVyKCdOZXdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFByb2plY3RGY3QsICRzdGF0ZSl7XHJcblx0JHNjb3BlLnVzZXI7XHJcblxyXG5cdCBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG5cdCBcdCRzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICBjb25zb2xlLmxvZygndXNlciBpcycsICRzY29wZS51c2VyLnVzZXJuYW1lKVxyXG4gICAgfSk7XHJcblxyXG5cdCAkc2NvcGUubmV3UHJvamVjdEJ1dCA9IGZ1bmN0aW9uKCl7XHJcblx0IFx0UHJvamVjdEZjdC5uZXdQcm9qZWN0KCRzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHByb2plY3RJZCl7XHJcblx0IFx0XHRjb25zb2xlLmxvZygnU3VjY2VzcyBpcycsIHByb2plY3RJZClcclxuXHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogcHJvamVjdElkfSk7XHQgXHRcclxuXHRcdH0pXHJcblxyXG5cdCB9XHJcblxyXG59KSIsImFwcC5jb250cm9sbGVyKCdUaW1lbGluZUNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRsb2NhbFN0b3JhZ2UsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCkge1xyXG4gIFxyXG4gIHZhciB3YXZBcnJheSA9IFtdO1xyXG4gIFxyXG4gICRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgNjA7IGkrKykge1xyXG4gICAgJHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XHJcbiAgfVxyXG5cclxuICAkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcbiAgJHNjb3BlLnRyYWNrcyA9IFtdO1xyXG4gICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHJcblxyXG4gIFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJzU1OTRjMjBhZDA3NTljZDQwY2U1MWUxNCcpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcclxuXHJcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xyXG4gICAgICBjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xyXG5cclxuICAgICAgaWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG4gICAgICAgIHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgICAgIHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGxvYWRlZCsrO1xyXG4gICAgICAgICAgICAgICAgaWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRyYWNrLnBsYXllciA9IFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBkb25lTG9hZGluZyk7XHJcbiAgICAgICAgICAgIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcclxuICAgICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKHRyYWNrKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xyXG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgICAgICAgb2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xyXG4gICAgICAgICAgb2JqLmxvY2F0aW9uID0gW107XHJcbiAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5nZXRUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKTtcclxuICAgICAgVG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XHJcblxyXG4gIH0pO1xyXG5cclxuICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcclxuICAvLyAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcclxuICAvLyAgICAgLy8gJHN0YXRlUGFyYW1zLnRoZUlEID0gYVVzZXIuX2lkXHJcbiAgLy8gICAgIGNvbnNvbGUubG9nKFwiaWRcIiwgJHN0YXRlUGFyYW1zKTtcclxuICAvLyB9KTtcclxuXHJcbiAgJHNjb3BlLnJlY29yZCA9IGZ1bmN0aW9uIChlLCBpbmRleCkge1xyXG5cclxuICBcdGUgPSBlLnRvRWxlbWVudDtcclxuXHJcbiAgICAgICAgLy8gc3RhcnQgcmVjb3JkaW5nXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0IHJlY29yZGluZycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghYXVkaW9SZWNvcmRlcilcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICBlLmNsYXNzTGlzdC5hZGQoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xyXG4gICAgICAgIGF1ZGlvUmVjb3JkZXIucmVjb3JkKCk7XHJcblxyXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5zdG9wKCk7XHJcbiAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XHJcbiAgICAgICAgICAgIC8vICRzY29wZS50cmFja3NbaW5kZXhdLnJhd0ltYWdlID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlO1xyXG5cclxuICAgICAgICAgIH0sIDUwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICB9LCAyMDAwKTtcclxuXHJcbiAgfVxyXG5cclxuICAkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIH07XHJcblxyXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgdmFyIGF3c1RyYWNrcyA9ICRzY29wZS50cmFja3MuZmlsdGVyKGZ1bmN0aW9uKHRyYWNrLGluZGV4KXtcclxuICAgICAgICAgICAgICBpZih0cmFjay5yYXdBdWRpbyl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoYXdzVHJhY2tzLCAnNTU5NWE3ZmFhYTkwMWFkNjMyMzRmOTIwJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB3YXZlIGxvZ2ljXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xyXG5cclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuXHRcclxuXHJcblxyXG59KTtcclxuXHJcblxyXG4iLCJcclxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgJHN0YXRlUGFyYW1zLCB1c2VyRmFjdG9yeSkge1xyXG5cclxuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcclxuICAgICAgICBcclxuICAgICAgICAgICRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XHJcblxyXG4gICAgICAgICAgdXNlckZhY3RvcnkuZ2V0VXNlck9iaigkc3RhdGVQYXJhbXMudGhlSUQpLnRoZW4oZnVuY3Rpb24odXNlcil7XHJcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCB1c2VyLCAkc3RhdGUpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkc2NvcGUuZGlzcGxheVNldHRpbmdzID0gZnVuY3Rpb24oKXtcclxuICAgICAgICBpZigkc2NvcGUuc2hvd1NldHRpbmdzKSAkc2NvcGUuc2hvd1NldHRpbmdzID0gZmFsc2U7XHJcbiAgICAgICAgZWxzZSAkc2NvcGUuc2hvd1NldHRpbmdzID0gdHJ1ZTtcclxuICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUuc2hvd1NldHRpbmdzKTtcclxuICAgIH1cclxuXHJcbiAgICAkc2NvcGUuZm9sbG93ID0gZnVuY3Rpb24odXNlcil7XHJcbiAgICAgIHVzZXJGYWN0b3J5LmZvbGxvdyh1c2VyLCAkc2NvcGUubG9nZ2VkSW5Vc2VyKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICBjb25zb2xlLmxvZygnRm9sbG93IGNvbnRyb2xsZXIgcmVzcG9uc2UnLCByZXNwb25zZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgICRzY29wZS5kaXNwbGF5V2ViID0gZnVuY3Rpb24oKXtcclxuICAgICAgY29uc29sZS5sb2coXCJjbGlja2VkXCIpO1xyXG4gICAgICAkc3RhdGUuZ28oJ2Zvcmt3ZWInKTtcclxuICAgIH1cclxuXHJcblxyXG59KTsiLCJhcHAuZmFjdG9yeSgnQW5hbHlzZXJGY3QnLCBmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIHVwZGF0ZUFuYWx5c2VycyA9IGZ1bmN0aW9uIChhbmFseXNlckNvbnRleHQsIGFuYWx5c2VyTm9kZSwgY29udGludWVVcGRhdGUpIHtcclxuXHJcblx0XHRmdW5jdGlvbiB1cGRhdGUoKSB7XHJcblx0XHRcdHZhciBTUEFDSU5HID0gMztcclxuXHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XHJcblx0XHRcdHZhciBudW1CYXJzID0gTWF0aC5yb3VuZCgzMDAgLyBTUEFDSU5HKTtcclxuXHRcdFx0dmFyIGZyZXFCeXRlRGF0YSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XHJcblxyXG5cdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXHJcblxyXG5cdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1JztcclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XHJcblxyXG5cdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmb3IgZWFjaCBmcmVxdWVuY3kgYmluLlxyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xyXG5cdFx0XHRcdHZhciBtYWduaXR1ZGUgPSAwO1xyXG5cdFx0XHRcdHZhciBvZmZzZXQgPSBNYXRoLmZsb29yKCBpICogbXVsdGlwbGllciApO1xyXG5cdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqPCBtdWx0aXBsaWVyOyBqKyspXHJcblx0XHRcdFx0ICAgIG1hZ25pdHVkZSArPSBmcmVxQnl0ZURhdGFbb2Zmc2V0ICsgal07XHJcblx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcclxuXHRcdFx0XHR2YXIgbWFnbml0dWRlMiA9IGZyZXFCeXRlRGF0YVtpICogbXVsdGlwbGllcl07XHJcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9IFwiaHNsKCBcIiArIE1hdGgucm91bmQoKGkqMzYwKS9udW1CYXJzKSArIFwiLCAxMDAlLCA1MCUpXCI7XHJcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYoY29udGludWVVcGRhdGUpIHtcclxuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0fVxyXG5cclxuXHJcblx0dmFyIGNhbmNlbEFuYWx5c2VyVXBkYXRlcyA9IGZ1bmN0aW9uIChhbmFseXNlcklkKSB7XHJcblx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHR9XHJcblx0cmV0dXJuIHtcclxuXHRcdHVwZGF0ZUFuYWx5c2VyczogdXBkYXRlQW5hbHlzZXJzLFxyXG5cdFx0Y2FuY2VsQW5hbHlzZXJVcGRhdGVzOiBjYW5jZWxBbmFseXNlclVwZGF0ZXNcclxuXHR9XHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ0ZvcmtGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cclxuICAgIHZhciBnZXRXZWIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9mb3JrcycpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBnZXRXZWI6IGdldFdlYlxyXG4gICAgfTtcclxuXHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ0hvbWVGY3QnLCBmdW5jdGlvbigkaHR0cCl7XHJcblxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0VXNlcjogZnVuY3Rpb24odXNlcil7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcicsIHtwYXJhbXM6IHtfaWQ6IHVzZXJ9fSlcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc3VjY2Vzcyl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2Vzcy5kYXRhO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnUHJvamVjdEZjdCcsIGZ1bmN0aW9uKCRodHRwKXtcclxuXHJcbiAgICB2YXIgZ2V0UHJvamVjdEluZm8gPSBmdW5jdGlvbiAocHJvamVjdElkKSB7XHJcblxyXG4gICAgICAgIC8vaWYgY29taW5nIGZyb20gSG9tZUNvbnRyb2xsZXIgYW5kIG5vIElkIGlzIHBhc3NlZCwgc2V0IGl0IHRvICdhbGwnXHJcbiAgICAgICAgdmFyIHByb2plY3RpZCA9IHByb2plY3RJZCB8fCAnYWxsJztcclxuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2plY3RzLycgKyBwcm9qZWN0aWQgfHwgcHJvamVjdGlkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBjcmVhdGVBRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG4gICAgXHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9wcm9qZWN0cy8nLCBwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKGZvcmspe1xyXG4gICAgXHRcdFx0cmV0dXJuIGZvcmsuZGF0YTtcclxuICAgIFx0fSk7XHJcbiAgICB9XHJcbiAgICB2YXIgbmV3UHJvamVjdCA9IGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgXHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9wcm9qZWN0cycse293bmVyOnVzZXIuX2lkLCBuYW1lOidVbnRpdGxlZCcsIGJwbToxMjAsIGVuZE1lYXN1cmU6IDMyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICBcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICBcdH0pO1xyXG4gICAgfVxyXG4gICAgdmFyIG5hbWVDaGFuZ2UgPSBmdW5jdGlvbihuZXdOYW1lLCBwcm9qZWN0SWQpIHtcclxuICAgICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL3Byb2plY3RzLycrcHJvamVjdElkLCB7bmFtZTogbmV3TmFtZX0pLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3Byb2plY3RzLycrcHJvamVjdC5faWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRGVsZXRlIFByb2ogRmN0JywgcmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB1cGxvYWRQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJ2FwaS9wcm9qZWN0cy9zb3VuZGNsb3VkJywgeyBwcm9qZWN0IDogcHJvamVjdCB9ICkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0UHJvamVjdEluZm86IGdldFByb2plY3RJbmZvLFxyXG4gICAgICAgIGNyZWF0ZUFGb3JrOiBjcmVhdGVBRm9yayxcclxuICAgICAgICBuZXdQcm9qZWN0OiBuZXdQcm9qZWN0LCBcclxuICAgICAgICBkZWxldGVQcm9qZWN0OiBkZWxldGVQcm9qZWN0LFxyXG4gICAgICAgIG5hbWVDaGFuZ2U6IG5hbWVDaGFuZ2UsXHJcbiAgICAgICAgdXBsb2FkUHJvamVjdDogdXBsb2FkUHJvamVjdFxyXG4gICAgfTtcclxuXHJcbn0pO1xyXG4iLCJhcHAuZmFjdG9yeSgnUmVjb3JkZXJGY3QnLCBmdW5jdGlvbiAoJGh0dHAsIEF1dGhTZXJ2aWNlLCAkcSwgVG9uZVRyYWNrRmN0LCBBbmFseXNlckZjdCkge1xyXG5cclxuICAgIHZhciByZWNvcmRlckluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIHZhciBDb250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xyXG4gICAgICAgICAgICB2YXIgYXVkaW9Db250ZXh0ID0gbmV3IENvbnRleHQoKTtcclxuICAgICAgICAgICAgdmFyIHJlY29yZGVyO1xyXG5cclxuICAgICAgICAgICAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XHJcbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSAoXHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWFcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBuYXZpZ2F0b3Iud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lO1xyXG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xyXG5cclxuICAgICAgICAgICAgLy8gYXNrIGZvciBwZXJtaXNzaW9uXHJcbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcImF1ZGlvXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWFuZGF0b3J5XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dFY2hvQ2FuY2VsbGF0aW9uXCI6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dBdXRvR2FpbkNvbnRyb2xcIjogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ05vaXNlU3VwcHJlc3Npb25cIjogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0hpZ2hwYXNzRmlsdGVyXCI6IFwiZmFsc2VcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3B0aW9uYWxcIjogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoc3RyZWFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dFBvaW50ID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbiBBdWRpb05vZGUgZnJvbSB0aGUgc3RyZWFtLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbEF1ZGlvSW5wdXQgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF1ZGlvSW5wdXQgPSByZWFsQXVkaW9JbnB1dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXVkaW9JbnB1dC5jb25uZWN0KGlucHV0UG9pbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuYWx5c2VyIG5vZGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXNlck5vZGUuZmZ0U2l6ZSA9IDIwNDg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggYW5hbHlzZXJOb2RlICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSByZWNvcmRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRlciA9IG5ldyBSZWNvcmRlciggaW5wdXRQb2ludCApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgemVyb0dhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5nYWluLnZhbHVlID0gMC4wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIHplcm9HYWluICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmNvbm5lY3QoIGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbiApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShbcmVjb3JkZXIsIGFuYWx5c2VyTm9kZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBhdWRpbycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciByZWNvcmRTdGFydCA9IGZ1bmN0aW9uIChyZWNvcmRlcikge1xyXG4gICAgICAgIHJlY29yZGVyLmNsZWFyKCk7XHJcbiAgICAgICAgcmVjb3JkZXIucmVjb3JkKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlY29yZFN0b3AgPSBmdW5jdGlvbiAoaW5kZXgsIHJlY29yZGVyKSB7XHJcbiAgICAgICAgcmVjb3JkZXIuc3RvcCgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICAvLyBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgICAgIHJlY29yZGVyLmdldEJ1ZmZlcnMoZnVuY3Rpb24gKGJ1ZmZlcnMpIHtcclxuICAgICAgICAgICAgICAgIC8vZGlzcGxheSB3YXYgaW1hZ2VcclxuICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJ3YXZlZGlzcGxheVwiICsgIGluZGV4ICk7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzTG9vcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIndhdmVGb3JMb29wXCIgKyAgaW5kZXggKTtcclxuICAgICAgICAgICAgICAgIGRyYXdCdWZmZXIoIDMwMCwgMTAwLCBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSwgYnVmZmVyc1swXSApO1xyXG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMTk4LCA5OCwgY2FudmFzTG9vcC5nZXRDb250ZXh0KCcyZCcpLCBidWZmZXJzWzBdICk7XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0QnVmZmVyID0gYnVmZmVyc1swXTtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZSA9IGNhbnZhc0xvb3AudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoZSBPTkxZIHRpbWUgZ290QnVmZmVycyBpcyBjYWxsZWQgaXMgcmlnaHQgYWZ0ZXIgYSBuZXcgcmVjb3JkaW5nIGlzIGNvbXBsZXRlZCAtIFxyXG4gICAgICAgICAgICAgICAgLy8gc28gaGVyZSdzIHdoZXJlIHdlIHNob3VsZCBzZXQgdXAgdGhlIGRvd25sb2FkLlxyXG4gICAgICAgICAgICAgICAgcmVjb3JkZXIuZXhwb3J0V0FWKCBmdW5jdGlvbiAoIGJsb2IgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9uZWVkcyBhIHVuaXF1ZSBuYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb3JkZXIuc2V0dXBEb3dubG9hZCggYmxvYiwgXCJteVJlY29yZGluZzAud2F2XCIgKTtcclxuICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSBsb29wIHRpbWVcclxuICAgICAgICAgICAgICAgICAgICBUb25lVHJhY2tGY3QubG9vcEluaXRpYWxpemUoYmxvYiwgaW5kZXgsIFwibXlSZWNvcmRpbmcwLndhdlwiKS50aGVuKHJlc29sdmUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIFxyXG5cclxuICAgIFxyXG4gICAgdmFyIGNvbnZlcnRUb0Jhc2U2NCA9IGZ1bmN0aW9uICh0cmFjaykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdlYWNoIHRyYWNrJywgdHJhY2spO1xyXG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcbiAgICAgICAgICAgIGlmKHRyYWNrLnJhd0F1ZGlvKSB7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTCh0cmFjay5yYXdBdWRpbyk7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuXHJcblxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgc2VuZFRvQVdTOiBmdW5jdGlvbiAodHJhY2tzQXJyYXksIHByb2plY3RJZCwgcHJvamVjdE5hbWUpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWFkUHJvbWlzZXMgPSB0cmFja3NBcnJheS5tYXAoY29udmVydFRvQmFzZTY0KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5hbGwocmVhZFByb21pc2VzKS50aGVuKGZ1bmN0aW9uIChzdG9yZURhdGEpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0cmFja3NBcnJheS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaywgaSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdG9yZURhdGFbaV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2sucmF3QXVkaW8gPSBzdG9yZURhdGFbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrLmVmZmVjdHNSYWNrID0gdHJhY2suZWZmZWN0c1JhY2subWFwKGZ1bmN0aW9uIChlZmZlY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRUZGRUNUXCIsIGVmZmVjdCwgZWZmZWN0LndldC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWZmZWN0LndldC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvYXdzLycsIHsgdHJhY2tzIDogdHJhY2tzQXJyYXksIHByb2plY3RJZCA6IHByb2plY3RJZCwgcHJvamVjdE5hbWUgOiBwcm9qZWN0TmFtZSB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgaW4gc2VuZFRvQVdTRmFjdG9yeScsIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7IFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlY29yZGVySW5pdDogcmVjb3JkZXJJbml0LFxyXG4gICAgICAgIHJlY29yZFN0YXJ0OiByZWNvcmRTdGFydCxcclxuICAgICAgICByZWNvcmRTdG9wOiByZWNvcmRTdG9wXHJcbiAgICB9XHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnVG9uZVRpbWVsaW5lRmN0JywgZnVuY3Rpb24gKCRodHRwLCAkcSkge1xyXG5cclxuXHR2YXIgY3JlYXRlVHJhbnNwb3J0ID0gZnVuY3Rpb24gKGxvb3BFbmQpIHtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcCA9IHRydWU7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BTdGFydCA9ICcwbSc7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BFbmQgPSBsb29wRW5kLnRvU3RyaW5nKCkgKyAnbSc7XHJcblx0XHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcclxuXHJcblx0XHRcdGNyZWF0ZU1ldHJvbm9tZSgpLnRoZW4oZnVuY3Rpb24gKG1ldHJvbm9tZSkge1xyXG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHZhciBwb3NBcnIgPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpO1xyXG5cdFx0XHRcdFx0dmFyIGxlZnRQb3MgPSAoKHBhcnNlSW50KHBvc0FyclswXSkgKiAyMDAgKSArIChwYXJzZUludChwb3NBcnJbMV0pICogNTApICsgNTAwKS50b1N0cmluZygpICsgJ3B4JztcclxuXHRcdFx0XHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSBsZWZ0UG9zO1xyXG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XHJcblx0XHRcdFx0fSwgJzFtJyk7XHJcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3Vic3RyKDEpKTtcclxuXHRcdFx0XHRcdCQoJyNwb3NpdGlvblNlbGVjdG9yJykudmFsKFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnN1YnN0cigwLDEpKTtcclxuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xyXG5cdFx0XHRcdH0sICc0bicpO1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKG1ldHJvbm9tZSk7XHJcblx0XHRcdH0pO1xyXG4gICAgICAgIH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBjaGFuZ2VCcG0gPSBmdW5jdGlvbiAoYnBtKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5icG0udmFsdWUgPSBicG07XHJcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XHJcblx0fTtcclxuXHJcblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIG11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gLTEwMDtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciB1bk11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBjcmVhdGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0ICAgICAgICB2YXIgbWV0ID0gbmV3IFRvbmUuUGxheWVyKFwiL2FwaS93YXYvQ2xpY2sxLndhdlwiLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0KTtcclxuXHQgICAgICAgIH0pLnRvTWFzdGVyKCk7XHJcbiAgICAgICAgfSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGFkZExvb3BUb1RpbWVsaW5lID0gZnVuY3Rpb24gKHBsYXllciwgc3RhcnRUaW1lQXJyYXkpIHtcclxuXHJcblx0XHRpZihzdGFydFRpbWVBcnJheS5pbmRleE9mKDApID09PSAtMSkge1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHR9LCBcIjBtXCIpXHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHN0YXJ0VGltZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VGltZSkge1xyXG5cclxuXHRcdFx0dmFyIHN0YXJ0VGltZSA9IHN0YXJ0VGltZS50b1N0cmluZygpICsgJ20nO1xyXG5cclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTdGFydCcsIFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9LCBzdGFydFRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gdmFyIHN0b3BUaW1lID0gcGFyc2VJbnQoc3RhcnRUaW1lLnN1YnN0cigwLCBzdGFydFRpbWUubGVuZ3RoLTEpKSArIDEpLnRvU3RyaW5nKCkgKyBzdGFydFRpbWUuc3Vic3RyKC0xLDEpO1xyXG5cdFx0XHQvLy8vIGNvbnNvbGUubG9nKCdTVE9QJywgc3RvcCk7XHJcblx0XHRcdC8vLy8gdHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0Ly8vLyBcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdC8vLy8gfSwgc3RvcFRpbWUpO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHR9O1xyXG5cdFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBjcmVhdGVUcmFuc3BvcnQ6IGNyZWF0ZVRyYW5zcG9ydCxcclxuICAgICAgICBjaGFuZ2VCcG06IGNoYW5nZUJwbSxcclxuICAgICAgICBhZGRMb29wVG9UaW1lbGluZTogYWRkTG9vcFRvVGltZWxpbmUsXHJcbiAgICAgICAgY3JlYXRlTWV0cm9ub21lOiBjcmVhdGVNZXRyb25vbWUsXHJcbiAgICAgICAgc3RvcEFsbDogc3RvcEFsbCxcclxuICAgICAgICBtdXRlQWxsOiBtdXRlQWxsLFxyXG4gICAgICAgIHVuTXV0ZUFsbDogdW5NdXRlQWxsXHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1RvbmVUcmFja0ZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcclxuXHJcblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xyXG5cdFx0dmFyIHBsYXllciAgPSBuZXcgVG9uZS5QbGF5ZXIodXJsLCBkb25lRm4pO1xyXG5cdFx0Ly8gVE9ETzogcmVtb3ZlIHRvTWFzdGVyXHJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcclxuXHRcdC8vIHBsYXllci5zeW5jKCk7XHJcblx0XHQvLyBwbGF5ZXIubG9vcCA9IHRydWU7XHJcblx0XHRyZXR1cm4gcGxheWVyO1xyXG5cdH07XHJcblxyXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xyXG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdC8vUEFTU0VEIEEgQkxPQiBGUk9NIFJFQ09SREVSSlNGQUNUT1JZIC0gRFJPUFBFRCBPTiBNRUFTVVJFIDBcclxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuXHRcdFx0dmFyIGxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNhdmVcIitpbmRleCk7XHJcblx0XHRcdGxpbmsuaHJlZiA9IHVybDtcclxuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2JztcclxuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZyA9IGJsb2I7XHJcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdVUkwgPSB1cmw7XHJcblx0XHRcdHZhciBwbGF5ZXI7XHJcblx0XHRcdC8vIFRPRE86IHJlbW92ZSB0b01hc3RlclxyXG5cdFx0XHRwbGF5ZXIgPSBuZXcgVG9uZS5QbGF5ZXIobGluay5ocmVmLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBlZmZlY3RzSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGFycikge1xyXG5cclxuXHJcblx0XHR2YXIgY2hvcnVzID0gbmV3IFRvbmUuQ2hvcnVzKCk7XHJcblx0XHRjaG9ydXMubmFtZSA9IFwiQ2hvcnVzXCI7XHJcblx0XHR2YXIgcGhhc2VyID0gbmV3IFRvbmUuUGhhc2VyKCk7XHJcblx0XHRwaGFzZXIubmFtZSA9IFwiUGhhc2VyXCI7XHJcblx0XHR2YXIgZGlzdG9ydCA9IG5ldyBUb25lLkRpc3RvcnRpb24oKTtcclxuXHRcdGRpc3RvcnQubmFtZSA9IFwiRGlzdG9ydGlvblwiO1xyXG5cdFx0dmFyIHBpbmdwb25nID0gbmV3IFRvbmUuUGluZ1BvbmdEZWxheShcIjRtXCIpO1xyXG5cdFx0cGluZ3BvbmcubmFtZSA9IFwiUGluZyBQb25nXCI7XHJcblxyXG5cdFx0aWYgKGFyci5sZW5ndGgpIHtcclxuXHRcdFx0Y2hvcnVzLndldC52YWx1ZSA9IGFyclswXTtcclxuXHRcdFx0cGhhc2VyLndldC52YWx1ZSA9IGFyclsxXTtcclxuXHRcdFx0ZGlzdG9ydC53ZXQudmFsdWUgPSBhcnJbMl07XHJcblx0XHRcdHBpbmdwb25nLndldC52YWx1ZSA9IGFyclszXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Y2hvcnVzLmNvbm5lY3QocGhhc2VyKTtcclxuXHRcdHBoYXNlci5jb25uZWN0KGRpc3RvcnQpO1xyXG5cdFx0ZGlzdG9ydC5jb25uZWN0KHBpbmdwb25nKTtcclxuXHRcdHBpbmdwb25nLnRvTWFzdGVyKCk7XHJcblx0XHQvLyBwaW5ncG9uZy5jb25uZWN0KHZvbHVtZSk7XHJcblx0XHQvLyB2b2x1bWUudG9NYXN0ZXIoKTtcclxuXHJcblx0XHRyZXR1cm4gW2Nob3J1cywgcGhhc2VyLCBkaXN0b3J0LCBwaW5ncG9uZ107XHJcblx0fTtcclxuXHJcblx0dmFyIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG1lYXN1cmUpIHtcclxuXHRcdHJldHVybiBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9LCBtZWFzdXJlK1wibVwiKTtcclxuXHR9O1xyXG5cclxuXHR2YXIgcmVwbGFjZVRpbWVsaW5lTG9vcCA9IGZ1bmN0aW9uKHBsYXllciwgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xyXG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdvbGQgdGltZWxpbmUgaWQnLCBvbGRUaW1lbGluZUlkKTtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShwYXJzZUludChvbGRUaW1lbGluZUlkKSk7XHJcblx0XHRcdC8vIFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmVzKCk7XHJcblx0XHRcdHJlc29sdmUoY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChwbGF5ZXIsIG5ld01lYXN1cmUpKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblx0dmFyIGRlbGV0ZVRpbWVsaW5lTG9vcCA9IGZ1bmN0aW9uKHRpbWVsaW5lSWQpIHtcclxuXHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQodGltZWxpbmVJZCkpO1xyXG5cdH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBjcmVhdGVQbGF5ZXI6IGNyZWF0ZVBsYXllcixcclxuICAgICAgICBsb29wSW5pdGlhbGl6ZTogbG9vcEluaXRpYWxpemUsXHJcbiAgICAgICAgZWZmZWN0c0luaXRpYWxpemU6IGVmZmVjdHNJbml0aWFsaXplLFxyXG4gICAgICAgIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3A6IGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AsXHJcbiAgICAgICAgcmVwbGFjZVRpbWVsaW5lTG9vcDogcmVwbGFjZVRpbWVsaW5lTG9vcCxcclxuICAgICAgICBkZWxldGVUaW1lbGluZUxvb3A6IGRlbGV0ZVRpbWVsaW5lTG9vcFxyXG4gICAgfTtcclxuXHJcbn0pO1xyXG4iLCJhcHAuZmFjdG9yeSgndXNlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XHJcblx0cmV0dXJuIHtcclxuXHRcdGdldFVzZXJPYmo6IGZ1bmN0aW9uKHVzZXJJRCl7XHJcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ2FwaS91c2VycycsIHtwYXJhbXM6IHtfaWQ6IHVzZXJJRH19KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygncmVzb29uc2UgaXMnLCByZXNwb25zZS5kYXRhKVxyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Zm9sbG93OiBmdW5jdGlvbih1c2VyLCBsb2dnZWRJblVzZXIpe1xyXG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMnLHt1c2VyVG9Gb2xsb3c6IHVzZXIsIGxvZ2dlZEluVXNlcjogbG9nZ2VkSW5Vc2VyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvbGxvd1VzZXIgRmFjdG9yeSByZXNwb25zZScsIHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblxyXG5cdFx0dW5Gb2xsb3c6IGZ1bmN0aW9uKGZvbGxvd2VlLCBsb2dnZWRJblVzZXIpIHtcclxuXHRcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzJywge3VzZXJUb1VuZm9sbG93OiBmb2xsb3dlZSwgbG9nZ2VkSW5Vc2VyOiBsb2dnZWRJblVzZXJ9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygndW5Gb2xsb3cgcmVzcG9uc2UnLCByZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnZHJhZ2dhYmxlJywgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgLy8gdGhpcyBnaXZlcyB1cyB0aGUgbmF0aXZlIEpTIG9iamVjdFxyXG4gICAgdmFyIGVsID0gZWxlbWVudFswXTtcclxuICAgIFxyXG4gICAgZWwuZHJhZ2dhYmxlID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ3N0YXJ0JywgZnVuY3Rpb24oZSkge1xyXG5cclxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xyXG4gICAgICAgIGUuZGF0YVRyYW5zZmVyLnNldERhdGEoJ1RleHQnLCB0aGlzLmlkKTtcclxuICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ2RyYWcnKTtcclxuXHJcbiAgICAgICAgdmFyIGlkeCA9IHNjb3BlLnRyYWNrLmxvY2F0aW9uLmluZGV4T2YocGFyc2VJbnQoYXR0cnMucG9zaXRpb24pKTtcclxuICAgICAgICBzY29wZS50cmFjay5sb2NhdGlvbi5zcGxpY2UoaWR4LCAxKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9LFxyXG4gICAgICBmYWxzZVxyXG4gICAgKTtcclxuICAgIFxyXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VuZCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWcnKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH0sXHJcbiAgICAgIGZhbHNlXHJcbiAgICApO1xyXG5cclxuICB9XHJcbn0pO1xyXG5cclxuYXBwLmRpcmVjdGl2ZSgnZHJvcHBhYmxlJywgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHNjb3BlOiB7XHJcbiAgICAgIGRyb3A6ICcmJyAvLyBwYXJlbnRcclxuICAgIH0sXHJcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xyXG4gICAgICAvLyBhZ2FpbiB3ZSBuZWVkIHRoZSBuYXRpdmUgb2JqZWN0XHJcbiAgICAgIHZhciBlbCA9IGVsZW1lbnRbMF07XHJcbiAgICAgIFxyXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgIGUuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnbW92ZSc7XHJcbiAgICAgICAgICAvLyBhbGxvd3MgdXMgdG8gZHJvcFxyXG4gICAgICAgICAgaWYgKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmFsc2VcclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmFsc2VcclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdsZWF2ZScsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnb3ZlcicpO1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmFsc2VcclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAvLyBTdG9wcyBzb21lIGJyb3dzZXJzIGZyb20gcmVkaXJlY3RpbmcuXHJcbiAgICAgICAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnb3ZlcicpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyB1cG9uIGRyb3AsIGNoYW5naW5nIHBvc2l0aW9uIGFuZCB1cGRhdGluZyB0cmFjay5sb2NhdGlvbiBhcnJheSBvbiBzY29wZSBcclxuICAgICAgICAgIHZhciBpdGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZS5kYXRhVHJhbnNmZXIuZ2V0RGF0YSgnVGV4dCcpKTtcclxuICAgICAgICAgIHZhciB4cG9zaXRpb24gPSBwYXJzZUludCh0aGlzLmF0dHJpYnV0ZXMueHBvc2l0aW9uLnZhbHVlKTtcclxuICAgICAgICAgIHZhciBjaGlsZE5vZGVzID0gdGhpcy5jaGlsZE5vZGVzO1xyXG4gICAgICAgICAgdmFyIG9sZFRpbWVsaW5lSWQ7XHJcbiAgICAgICAgICB2YXIgdGhlQ2FudmFzO1xyXG5cclxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgIGlmIChjaGlsZE5vZGVzW2ldLmNsYXNzTmFtZSA9PT0gJ2NhbnZhcy1ib3gnKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbaV0uYXBwZW5kQ2hpbGQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC50cmFjay5sb2NhdGlvbi5wdXNoKHhwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC50cmFjay5sb2NhdGlvbi5zb3J0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICB2YXIgY2FudmFzTm9kZSA9IHRoaXMuY2hpbGROb2Rlc1tpXS5jaGlsZE5vZGVzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjYW52YXNOb2RlLmxlbmd0aDsgaisrKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhc05vZGVbal0ubm9kZU5hbWUgPT09ICdDQU5WQVMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FudmFzTm9kZVtqXS5hdHRyaWJ1dGVzLnBvc2l0aW9uLnZhbHVlID0geHBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9sZFRpbWVsaW5lSWQgPSBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVDYW52YXMgPSBjYW52YXNOb2RlW2pdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gICAgIFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcblxyXG4gICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50Lm1vdmVJblRpbWVsaW5lKG9sZFRpbWVsaW5lSWQsIHhwb3NpdGlvbikudGhlbihmdW5jdGlvbiAobmV3VGltZWxpbmVJZCkge1xyXG4gICAgICAgICAgICAgIHRoZUNhbnZhcy5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWUgPSBuZXdUaW1lbGluZUlkO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gY2FsbCB0aGUgZHJvcCBwYXNzZWQgZHJvcCBmdW5jdGlvblxyXG4gICAgICAgICAgc2NvcGUuJGFwcGx5KCdkcm9wKCknKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmFsc2VcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iLCJhcHAuZGlyZWN0aXZlKCdmb2xsb3dkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZm9sbG93L2ZvbGxvd0RpcmVjdGl2ZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJ1xyXG5cdH07XHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ0ZvbGxvd0RpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBBdXRoU2VydmljZSwgdXNlckZhY3Rvcnkpe1xyXG5cclxuXHJcblxyXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xyXG4gICAgICAgICBcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XHJcbiAgICAgICAgICBcdHVzZXJGYWN0b3J5LmdldFVzZXJPYmooJHN0YXRlUGFyYW1zLnRoZUlEKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG5cdCAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcclxuXHQgICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBpcycsIHVzZXIpO1xyXG5cclxuXHQgICAgICAgICAgICBpZigkc3RhdGUuY3VycmVudC5uYW1lID09PSBcInVzZXJQcm9maWxlLmZvbGxvd2Vyc1wiKXtcclxuXHQgICAgICAgICAgICBcdCRzY29wZS5mb2xsb3dzID0gdXNlci5mb2xsb3dlcnM7XHJcblx0ICAgICAgICAgICAgfSBlbHNle1xyXG5cdCAgICAgICAgICAgIFx0JHNjb3BlLmZvbGxvd3MgPSB1c2VyLmZvbGxvd2luZztcclxuXHQgICAgICAgICAgICBcdGlmKCRzdGF0ZVBhcmFtcy50aGVJRCA9PT0gbG9nZ2VkSW5Vc2VyLl9pZCkgJHNjb3BlLnNob3dCdXR0b24gPSB0cnVlO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICBjb25zb2xlLmxvZyhcImZvbGxvd09iaiBpc1wiLCAkc2NvcGUuZm9sbG93cywgJHN0YXRlUGFyYW1zKTtcclxuXHJcblx0ICAgIFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQkc2NvcGUuZ29Ub0ZvbGxvdyA9IGZ1bmN0aW9uKGZvbGxvdyl7XHJcblx0ICAgICAgY29uc29sZS5sb2coXCJjbGlja2VkXCIsIGZvbGxvdyk7XHJcblx0ICAgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHsgdGhlSUQ6IGZvbGxvdy5faWR9KTtcclxuXHQgICAgfVxyXG5cclxuXHQgICAgJHNjb3BlLnVuRm9sbG93ID0gZnVuY3Rpb24oZm9sbG93ZWUpIHtcclxuXHQgICAgXHRjb25zb2xlLmxvZyhcImNsaWNrZWRcIiwgZm9sbG93ZWUpO1xyXG5cdCAgICBcdHVzZXJGYWN0b3J5LnVuRm9sbG93KGZvbGxvd2VlLCAkc2NvcGUubG9nZ2VkSW5Vc2VyKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHQgICAgXHRcdGNvbnNvbGUubG9nKFwic3VjY2VzZnVsIHVuZm9sbG93XCIpO1xyXG5cdCAgICBcdH0pO1xyXG5cdCAgICB9XHJcblxyXG5cclxuXHRcclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcclxuICAgIH07XHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgc2NvcGU6IHt9LFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZXROYXZiYXIgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodXNlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VySWQgPSB1c2VyLl9pZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdQcm9maWxlJywgc3RhdGU6ICd1c2VyUHJvZmlsZSh7dGhlSUQ6IHVzZXJJZH0pJywgYXV0aDogdHJ1ZSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2V0TmF2YmFyKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBzY29wZS5pdGVtcyA9IFtcclxuICAgICAgICAgICAgLy8gICAgIC8vIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxyXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ1NpZ24gVXAnLCBzdGF0ZTogJ3NpZ251cCcgfSxcclxuICAgICAgICAgICAgLy8gICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ3VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XHJcbiAgICAgICAgICAgIC8vIF07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNldFVzZXIoKTtcclxuXHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0TmF2YmFyKTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHNldE5hdmJhcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdsb2FkaW5nR2lmJywgZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9sb2FkaW5nLWdpZi9sb2FkaW5nLmh0bWwnXHJcblx0fTtcclxufSk7IiwiYXBwLmRpcmVjdGl2ZSgncHJvamVjdGRpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInXHJcblx0fTtcclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcigncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBQcm9qZWN0RmN0LCBBdXRoU2VydmljZSl7XHJcblxyXG5cclxuXHJcblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcblx0XHRcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XHJcblx0XHRcdCRzY29wZS5kaXNwbGF5QVByb2plY3QgPSBmdW5jdGlvbihzb21ldGhpbmcpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdUSElORycsIHNvbWV0aGluZyk7XHJcblx0XHRcdFx0aWYoJHNjb3BlLmxvZ2dlZEluVXNlci5faWQgPT09ICRzdGF0ZVBhcmFtcy50aGVJRCl7XHJcblx0XHRcdFx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBzb21ldGhpbmcuX2lkfSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiZGlzcGxheWluZyBhIHByb2plY3RcIiwgJHNjb3BlLnBhcmVudCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdCRzY29wZS5tYWtlRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG5cdFx0XHRcdGlmKCFwcm9qZWN0LmZvcmtPcmlnaW4pIHByb2plY3QuZm9ya09yaWdpbiA9IHByb2plY3QuX2lkO1xyXG5cdFx0XHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XHJcblx0XHRcdFx0cHJvamVjdC5vd25lciA9IGxvZ2dlZEluVXNlci5faWQ7XHJcblx0XHRcdFx0ZGVsZXRlIHByb2plY3QuX2lkO1xyXG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKHByb2plY3QpO1xyXG5cdFx0XHRcdFByb2plY3RGY3QuY3JlYXRlQUZvcmsocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yayByZXNwb25zZSBpcycsIHJlc3BvbnNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLmRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRGVsZXRlUHJvamVjdCcsIHByb2plY3QpXHJcblx0XHRcdFx0UHJvamVjdEZjdC5kZWxldGVQcm9qZWN0KHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0RlbGV0ZSByZXF1ZXN0IGlzJywgcmVzcG9uc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUucG9zdFRvU291bmRjbG91ZCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdVcGxvYWRpbmcgUHJvamVjdCcsIHByb2plY3QpO1xyXG5cdFx0XHRcdFByb2plY3RGY3QudXBsb2FkUHJvamVjdChwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdVcGxvYWQgUmVxdWVzdCBpcycsIHJlc3BvbnNlKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fSk7XHJcblx0XHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3hpbVRyYWNrJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQW5hbHlzZXJGY3QsICRxKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmh0bWwnLFxyXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcblx0XHRcdHNjb3BlLmVmZmVjdFdldG5lc3NlcyA9IFt7XHJcblx0XHRcdFx0XHRuYW1lOiAnQ2hvcnVzJyxcclxuXHRcdFx0XHRcdGFtb3VudDogMFxyXG5cdFx0XHRcdH0se1xyXG5cdFx0XHRcdFx0bmFtZTogJ1BoYXNlcicsXHJcblx0XHRcdFx0XHRhbW91bnQ6IDBcclxuXHRcdFx0XHR9LHtcclxuXHRcdFx0XHRcdG5hbWU6ICdEaXN0b3J0aW9uJyxcclxuXHRcdFx0XHRcdGFtb3VudDogMFxyXG5cdFx0XHRcdH0se1xyXG5cdFx0XHRcdFx0bmFtZTogJ1BpbmdQb25nRGVsYXknLFxyXG5cdFx0XHRcdFx0YW1vdW50OiAwXHJcblx0XHRcdFx0fV07XHJcblx0XHRcdFx0c2NvcGUudm9sdW1lID0gbmV3IFRvbmUuVm9sdW1lKCk7XHJcblx0XHRcdFx0c2NvcGUudm9sdW1lLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbnZhc1Jvdy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XHJcblx0XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc0NsYXNzZXMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgdHJhY2tJbmRleCA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLmluZGV4T2Yoc2NvcGUudHJhY2spO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W2ldKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIGlkPSd3YXZlZGlzcGxheScgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIgKyB0cmFja0luZGV4LnRvU3RyaW5nKCkgKyBcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAwKVxyXG5cclxuXHRcdFx0c2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgsIHBvc2l0aW9uKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0RST1BQSU5HJyk7XHJcblx0XHRcdFx0Ly8gc2NvcGUudHJhY2sucGxheWVyLmxvb3AgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHQvLyB2YXIgcG9zaXRpb24gPSAwO1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHJcblx0XHRcdFx0aWYgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0Ly8gZHJvcCB0aGUgbG9vcCBvbiB0aGUgZmlyc3QgYXZhaWxhYmxlIGluZGV4XHRcdFx0XHRcclxuXHRcdFx0XHRcdHdoaWxlIChzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBvc2l0aW9uKSA+IC0xKSB7XHJcblx0XHRcdFx0XHRcdHBvc2l0aW9uKys7XHJcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly9hcHBlbmQgY2FudmFzIGVsZW1lbnRcclxuXHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICBpbmRleCArIFwiLVwiICsgcG9zaXRpb24gKyBcIicgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIraW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5wdXNoKHBvc2l0aW9uKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zb3J0KCk7XHJcblx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIHBvc2l0aW9uKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUubW92ZUluVGltZWxpbmUgPSBmdW5jdGlvbiAob2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xyXG5cdFx0XHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ0VMRU1FTlQnLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKTtcclxuXHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5yZXBsYWNlVGltZWxpbmVMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkudGhlbihyZXNvbHZlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fTtcclxuXHJcblxyXG5cdFx0XHRzY29wZS5hcHBlYXJPckRpc2FwcGVhciA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcclxuXHRcdFx0XHR2YXIgbG9vcEluZGV4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbik7XHJcblxyXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLm9uVGltZWxpbmUpIHtcclxuXHRcdFx0XHRcdGlmKGxvb3BJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5wdXNoKHBvc2l0aW9uKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgcG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0XHQvLyBhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwibWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiApO1xyXG5cdFx0XHRcdFx0XHQvL3JlbW92ZSBmcm9tIGxvY2F0aW9ucyBhcnJheVxyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zcGxpY2UobG9vcEluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgdGltZWxpbmVJZFxyXG5cdFx0XHRcdFx0XHRUb25lVHJhY2tGY3QuZGVsZXRlVGltZWxpbmVMb29wKCBjYW52YXMuYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlICk7XHJcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIGNhbnZhcyBpdGVtXHJcblx0XHRcdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQoZWxlbWVudCkge1xyXG5cdFx0XHRcdFx0XHQgICAgZWxlbWVudCAmJiBlbGVtZW50LnBhcmVudE5vZGUgJiYgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJlbW92ZUVsZW1lbnQoIGNhbnZhcyApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnTk8gRFJPUCcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjb3BlLnJlUmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1JFUkVDT1JEJyk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coc2NvcGUudHJhY2spO1xyXG5cdFx0XHRcdC8vY2hhbmdlIGFsbCBwYXJhbXMgYmFjayBhcyBpZiBlbXB0eSB0cmFja1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gbnVsbDtcclxuXHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucmF3QXVkaW8gPSBudWxsO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IG51bGw7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vZGlzcG9zZSBvZiBlZmZlY3RzUmFja1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrLmZvckVhY2goZnVuY3Rpb24gKGVmZmVjdCkge1xyXG5cdFx0XHRcdFx0ZWZmZWN0LmRpc3Bvc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHQvLyBzY29wZS50cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwwLDAsMF0pO1xyXG5cdFx0XHRcdC8vIHNjb3BlLnRyYWNrLnBsYXllci5jb25uZWN0KGVmZmVjdHNSYWNrWzBdKTtcclxuXHRcdFx0XHQvLyBzY29wZS52b2x1bWUgPSBuZXcgVG9uZS5Wb2x1bWUoKTtcclxuXHRcdFx0XHQvLyBzY29wZS50cmFjay5lZmZlY3RzUmFja1szXS5jb25uZWN0KHNjb3BlLnZvbHVtZSk7XHJcblx0XHRcdFx0Ly8gc2NvcGUudm9sdW1lLnRvTWFzdGVyKCk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJSQUNLXCIsIHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbiA9IFtdO1xyXG5cdFx0XHRcdC8vcmVtb3ZlIGFsbCBsb29wcyBmcm9tIFVJXHJcblx0XHRcdFx0dmFyIGxvb3BzVUkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCd0cmFja0xvb3AnK2luZGV4LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiTE9PUFNcIiwgbG9vcHNVSSk7XHJcblx0XHRcdFx0d2hpbGUobG9vcHNVSS5sZW5ndGggIT09IDApIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdMT09QUyBBUlInLCBsb29wc1VJKTtcclxuXHRcdFx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBsb29wc1VJLmxlbmd0aDtpKyspIHtcclxuXHRcdFx0XHRcdFx0bG9vcHNVSVtpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGxvb3BzVUlbaV0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dmFyIGxvb3BzVUkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCd0cmFja0xvb3AnK2luZGV4LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzY29wZS5zb2xvID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBvdGhlclRyYWNrcyA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLm1hcChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHRcdGlmKHRyYWNrICE9PSBzY29wZS50cmFjaykge1xyXG5cdFx0XHRcdFx0XHR0cmFjay5zaWxlbmNlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRyYWNrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pLmZpbHRlcihmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHRcdGlmKHRyYWNrICYmIHRyYWNrLnBsYXllcikgcmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0Y29uc29sZS5sb2cob3RoZXJUcmFja3MpO1xyXG5cdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKG90aGVyVHJhY2tzKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNjb3BlLnNpbGVuY2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0aWYoIXNjb3BlLnRyYWNrLnNpbGVuY2UpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IHRydWU7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUucmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHRcdFx0dmFyIHJlY29yZGVyID0gc2NvcGUucmVjb3JkZXI7XHJcblxyXG5cdFx0XHRcdHZhciBjb250aW51ZVVwZGF0ZSA9IHRydWU7XHJcblxyXG5cdFx0XHRcdC8vYW5hbHlzZXIgc3R1ZmZcclxuXHRcdCAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYW5hbHlzZXJcIitpbmRleCk7XHJcblx0XHQgICAgICAgIHZhciBhbmFseXNlckNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9IHNjb3BlLmFuYWx5c2VyTm9kZTtcclxuXHRcdFx0XHR2YXIgYW5hbHlzZXJJZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cclxuXHRcdFx0XHRzY29wZS50cmFjay5yZWNvcmRpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcclxuXHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlcik7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gdHJ1ZTtcclxuXHJcblxyXG5cdFx0XHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcclxuXHRcdFx0XHRcdHZhciBTUEFDSU5HID0gMztcclxuXHRcdFx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xyXG5cdFx0XHRcdFx0dmFyIG51bUJhcnMgPSBNYXRoLnJvdW5kKDMwMCAvIFNQQUNJTkcpO1xyXG5cdFx0XHRcdFx0dmFyIGZyZXFCeXRlRGF0YSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XHJcblxyXG5cdFx0XHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxyXG5cclxuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgMzAwLCAxMDApO1xyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1JztcclxuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcclxuXHRcdFx0XHRcdHZhciBtdWx0aXBsaWVyID0gYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50IC8gbnVtQmFycztcclxuXHJcblx0XHRcdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmb3IgZWFjaCBmcmVxdWVuY3kgYmluLlxyXG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcclxuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZSA9IDA7XHJcblx0XHRcdFx0XHRcdHZhciBvZmZzZXQgPSBNYXRoLmZsb29yKCBpICogbXVsdGlwbGllciApO1xyXG5cdFx0XHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcclxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGo8IG11bHRpcGxpZXI7IGorKylcclxuXHRcdFx0XHRcdFx0ICAgIG1hZ25pdHVkZSArPSBmcmVxQnl0ZURhdGFbb2Zmc2V0ICsgal07XHJcblx0XHRcdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XHJcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUyID0gZnJlcUJ5dGVEYXRhW2kgKiBtdWx0aXBsaWVyXTtcclxuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9IFwiaHNsKCBcIiArIE1hdGgucm91bmQoKGkqMzYwKS9udW1CYXJzKSArIFwiLCAxMDAlLCA1MCUpXCI7XHJcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYoY29udGludWVVcGRhdGUpIHtcclxuXHRcdFx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRmdW5jdGlvbiBlbmRSZWNvcmRpbmcoKSB7XHJcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlcikudGhlbihmdW5jdGlvbiAocGxheWVyKSB7XHJcblx0XHRcdFx0XHRcdC8vdHJhY2sgdmFyaWFibGVzXHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcclxuXHJcblx0XHRcdFx0XHRcdC8vY3JlYXRlIHBsYXllclxyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBwbGF5ZXI7XHJcblx0XHRcdFx0XHRcdHBsYXllci5jb25uZWN0KHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vc3RvcCBhbmFseXNlclxyXG5cdFx0XHRcdFx0XHRjb250aW51ZVVwZGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vc2V0IFByb2plY3QgdmFyc1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QudW5NdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZihUb25lLlRyYW5zcG9ydC5zdGF0ZSA9PT0gXCJzdG9wcGVkXCIpIHtcclxuXHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcclxuXHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0YXJ0KCk7XHJcblxyXG5cdFx0XHRcdFx0dmFyIGNsaWNrID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdGFydCgpO1xyXG5cdFx0XHRcdFx0fSwgNTAwKTtcclxuXHJcblx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdFx0XHR3aW5kb3cuY2xlYXJJbnRlcnZhbChjbGljayk7XHJcblx0XHRcdFx0XHRcdFx0ZW5kUmVjb3JkaW5nKCk7XHJcblxyXG5cdFx0XHRcdFx0fSwgNDAwMCk7XHJcblxyXG5cdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0XHR9LCAyMDUwKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1dISUxFIFBMQVlJTkcnKTtcclxuXHRcdFx0XHRcdHZhciBuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xyXG5cdFx0XHRcdFx0dmFyIGVuZEJhciA9IG5leHRCYXIgKyAxO1xyXG5cclxuXHRcdFx0XHRcdHZhciByZWNJZCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0XHRcdH0sIDUwKTtcclxuXHRcdFx0XHRcdH0sIG5leHRCYXIudG9TdHJpbmcoKSArIFwibVwiKTtcclxuXHJcblxyXG5cdFx0XHRcdFx0dmFyIHJlY0VuZElkID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHJlY0lkKTtcclxuXHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShyZWNFbmRJZCk7XHJcblx0XHRcdFx0XHRcdGVuZFJlY29yZGluZygpO1xyXG5cclxuXHRcdFx0XHRcdH0sIGVuZEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRzY29wZS52b2x1bWVDaGFuZ2UgPSBmdW5jdGlvbiAoYW1vdW50KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ZPTCBBTU9VTlQnLCBhbW91bnQpO1xyXG5cclxuXHQgICAgICAgICAgICBpZiAodHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcclxuXHQgICAgICAgICAgICB2YXIgdm9sdW1lID0gcGFyc2VGbG9hdChhbW91bnQgLyAxMDAsIDEwKTtcclxuXHQgICAgICAgICAgICBjb25zb2xlLmxvZygnQUZURVIgLyAxMDAsIDEwJywgdm9sdW1lKTtcclxuXHJcblxyXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLnBsYXllcikgc2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSAgPSBhbW91bnQgLSAyMDtcclxuXHRcdFx0fVxyXG5cdCAgICAgICAgLy8gc2NvcGUuJHdhdGNoKCd0cmFjay52b2x1bWUnLCBzY29wZS52b2x1bWVDaGFuZ2UpO1xyXG5cclxuXHRcdFx0c2NvcGUucHJldmlldyA9IGZ1bmN0aW9uKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcclxuXHRcdFx0XHR2YXIgbmV4dEJhcjtcclxuXHRcdFx0XHRpZighc2NvcGUuJHBhcmVudC5wcmV2aWV3aW5nSWQpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ05FWFQnLCBuZXh0QmFyKTtcclxuXHRcdFx0XHRcdHZhciBwbGF5TGF1bmNoID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgcHJldmlld0ludGV2YWwgPSBUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ1NIT1VMRCBQTEFZJyk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBsYXlMYXVuY2gpO1xyXG5cdFx0XHRcdFx0XHR9LCBcIjFtXCIpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LnByZXZpZXdpbmdJZCA9IHByZXZpZXdJbnRldmFsO1xyXG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnQUxSRUFEWSBQUkVWSUVXSU5HJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZWZmZWN0KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhhbW91bnQpO1xyXG5cclxuXHRcdFx0XHRlZmZlY3Qud2V0LnZhbHVlID0gYW1vdW50IC8gMTAwMDtcclxuXHRcdFx0fTtcclxuXHJcblx0XHR9XHJcblx0XHRcclxuXHJcblx0fVxyXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=