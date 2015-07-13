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

app.controller('HomeController', function ($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state, $mdToast) {
	var trackBucket = [];
	document.getElementsByTagName('navbar')[0].style.display = 'block';

	$scope.isLoggedIn = function () {
		return AuthService.isAuthenticated();
	};

	$scope.projects = function () {
		ProjectFct.getProjectInfo().then(function (projects) {
			console.log('PROJCS', projects);
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

	var activeUrl = null;

	$scope.paused = true;

	$scope.$on('wavesurferInit', function (e, wavesurfer) {
		$scope.wavesurfer = wavesurfer;

		$scope.wavesurfer.on('play', function () {
			$scope.paused = false;
		});

		$scope.wavesurfer.on('pause', function () {
			$scope.paused = true;
		});

		$scope.wavesurfer.on('finish', function () {
			$scope.paused = true;
			$scope.wavesurfer.seekTo(0);
			$scope.$apply();
		});
	});

	$scope.play = function (url) {
		if (!$scope.wavesurfer) {
			return;
		}

		activeUrl = url;

		$scope.wavesurfer.once('ready', function () {
			$scope.wavesurfer.play();
			$scope.$apply();
		});

		$scope.wavesurfer.load(activeUrl);
	};

	$scope.isPlaying = function (url) {
		return url == activeUrl;
	};
});

app.directive('wavesurfer', function () {
	return {
		restrict: 'E',

		link: function link($scope, $element, $attrs) {
			$element.css('display', 'block');

			var options = angular.extend({ container: $element[0] }, $attrs);
			var wavesurfer = WaveSurfer.create(options);

			if ($attrs.url) {
				wavesurfer.load($attrs.url, $attrs.data || null);
			}

			$scope.$emit('wavesurferInit', wavesurfer);
		}
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

				console.log('oldTimelineId', oldTimelineId);
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
app.directive('loadingGif', function () {
	return {
		restrict: 'E',
		templateUrl: 'js/common/directives/loading-gif/loading.html'
	};
});
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
			console.log('displaying a project', $scope.parent);
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
			scope.effectWetnesses = [0, 0, 0, 0];

			// scope.effectWetnesses = [{
			// 		name: 'Chorus',
			// 		amount: 0
			// 	},{
			// 		name: 'Phaser',
			// 		amount: 0
			// 	},{
			// 		name: 'Distortion',
			// 		amount: 0
			// 	},{
			// 		name: 'PingPongDelay',
			// 		amount: 0
			// 	}];
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
				scope.track.location.push(position);
				scope.track.location.sort();
				var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
				angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + index + '-' + position + '\' class=\'item trackLoop' + index + '\' style=\'position: absolute; background: url(' + scope.track.img + ');\' draggable></canvas>')(scope));
			};

			scope.moveInTimeline = function (oldTimelineId, newMeasure) {
				return new $q(function (resolve, reject) {
					console.log('ELEMENT', oldTimelineId, newMeasure);
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
				scope.track.effectsRack = ToneTrackFct.effectsInitialize([0, 0, 0, 0]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZvcmt3ZWIvZm9ya3dlYi5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9MYW5kaW5nUGFnZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTmV3UHJvamVjdENvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVGltZWxpbmVDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1VzZXJDb250cm9sbGVyLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9BbmFseXNlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRm9ya0ZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0hvbWVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1Byb2plY3RGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9sb2FkaW5nLWdpZi9sb2FkaW5nLWdpZi5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSx1QkFBQSxFQUFBO0FBQ0Esd0JBQUEsQ0FBQSxRQUFBLEdBQUEsa0NBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxHQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7OztBQUdBLEtBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxJQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBO0VBQ0EsQ0FBQTs7OztBQUlBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLE1BQUEsQ0FBQSw0QkFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBOzs7QUFHQSxVQUFBO0dBQ0E7O0FBRUEsTUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBLFVBQUE7R0FDQTs7O0FBR0EsT0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxPQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLE1BQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUN2REEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFVBQUE7QUFDQSxhQUFBLEVBQUEseUJBQUE7QUFDQSxZQUFBLEVBQUEsbUJBQUE7RUFDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7Ozs7Ozs7Ozs7Ozs7QUFhQSxZQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLEdBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FBSUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUNBLEtBQUEsRUFBQSxDQUNBLE1BQUEsQ0FBQSxLQUFBLENBQUE7O0dBRUEsSUFBQSxDQUFBLE9BQUEsRUFBQSxLQUFBLENBQUEsQ0FDQSxLQUFBLENBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQTtBQUNBLFVBQUEsRUFBQSxNQUFBO0FBQ0EsaUJBQUEsRUFBQSxLQUFBO0FBQ0EscUJBQUEsRUFBQSxNQUFBO0dBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxRQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLEdBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBSUEsQ0FBQSxDQUFBO0FDbERBLENBQUEsWUFBQTs7QUFFQSxhQUFBLENBQUE7OztBQUdBLEtBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsd0JBQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxJQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLGVBQUEsRUFBQSxxQkFBQTtBQUNBLGdCQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLHdCQUFBO0FBQ0EsZUFBQSxFQUFBLHFCQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUE7QUFDQSxNQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsTUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0dBQ0EsQ0FBQTtBQUNBLFNBQUE7QUFDQSxnQkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLENBQUEsQ0FDQSxXQUFBLEVBQ0EsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBOzs7Ozs7QUFNQSxPQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7SUFDQTs7Ozs7QUFLQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUVBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsV0FBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLE9BQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQTs7QUFFQSxNQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsT0FBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLEVBQUEsQ0FBQTtBQ3hJQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsQ0FBQSxjQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsT0FBQTtBQUNBLGFBQUEsRUFBQSxtQkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsc0JBQUE7QUFDQSxZQUFBLEVBQUEsdUJBQUE7QUFDQSxTQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLHlCQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQTtHQUNBO0VBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ3BCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFFBQUE7QUFDQSxhQUFBLEVBQUEscUJBQUE7QUFDQSxZQUFBLEVBQUEsV0FBQTtFQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxxQkFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtFQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBOzs7QUFHQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLGNBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxtRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsRUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsU0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxVQUFBLEVBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBSUEsS0FBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFdBQUEsR0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSx1QkFBQSxFQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLFNBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBOztBQUVBLFlBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsTUFBQSxLQUFBLGNBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO09BQ0E7TUFDQSxDQUFBOztBQUVBLFNBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtNQUNBLE1BQUE7QUFDQSxXQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtNQUNBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7SUFDQTtBQUNBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0dBQ0E7Ozs7QUFJQSxRQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsVUFBQSxHQUFBLEVBQUEsRUFBQSxVQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0E7OztBQUtBLGlCQUFBLENBQUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxjQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxNQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxHQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxNQUFBLEtBQUEsR0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsUUFBQSxHQUFBLFlBQUEsRUFFQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsTUFBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLHNCQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxjQUFBLENBQUEsa0JBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxLQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLEtBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0dBRUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxhQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxHQUFBLENBQUEseUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDbFFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsU0FBQTtBQUNBLGFBQUEsRUFBQSx1QkFBQTtBQUNBLFlBQUEsRUFBQSxZQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxxQkFBQTtBQUNBLGFBQUEsRUFBQSwwQkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTs7O0FBR0EsTUFBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLElBQUE7R0FDQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsd0JBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxPQUFBO0FBQ0EsYUFBQSxFQUFBLG1CQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxxQkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFdBQUE7QUFDQSxhQUFBLEVBQUEsdUJBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHVCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSx3QkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxZQUFBO0FBQ0EsYUFBQSxFQUFBLHdCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2pDQSxHQUFBLENBQUEsVUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxLQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsb0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxTQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFdBQUEsR0FBQSxRQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLFlBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLGFBQUEsRUFBQSxJQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUE7QUFDQSxZQUFBLEVBQUEsMENBQUE7SUFDQSxDQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLGtCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBOztBQUVBLEtBQUEsSUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFHQSxPQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLE1BQUEsSUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7R0FDQTs7QUFFQSxjQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxLQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0lBQ0EsTUFDQTtBQUNBLFFBQUEsR0FBQSxLQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBR0EsT0FBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLElBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBS0EsS0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLENBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLEVBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLEdBQUEsS0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxNQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLFVBQUE7R0FDQTs7QUFFQSxXQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLFNBQUEsR0FBQSxJQUFBLFNBQUEsQ0FBQTtFQUNBLENBQUE7Q0FLQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTs7QUFFQSxNQUFBLEVBQUEsY0FBQSxNQUFBLEVBQUEsUUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxTQUFBLEVBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxPQUFBLFVBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsTUFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsSUFBQSxJQUFBLElBQUEsQ0FBQSxDQUFBO0lBQ0E7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDbElBLEdBQUEsQ0FBQSxVQUFBLENBQUEsdUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxTQUFBLENBQUEsb0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLE1BQUEsQ0FBQTs7QUFHQSxPQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7QUFDQSxXQUFBLGNBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxPQUFBLFFBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQTs7QUFFQSxPQUFBLFVBQUEsR0FBQSxRQUFBLENBQUEsZUFBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsVUFBQSxHQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7SUFDQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO0dBQ0E7O0FBRUEsZ0JBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBSUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFFQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQy9DQSxHQUFBLENBQUEsVUFBQSxDQUFBLHNCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLGFBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2hCQSxHQUFBLENBQUEsVUFBQSxDQUFBLG9CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUE7O0FBRUEsS0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsTUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0E7O0FBRUEsT0FBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLFdBQUEsQ0FBQSxjQUFBLENBQUEsMEJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxNQUFBLE1BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLFdBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxNQUFBLEtBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7TUFFQTtLQUNBLENBQUE7QUFDQSxTQUFBLENBQUEsTUFBQSxHQUFBLFlBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsaUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsTUFBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQTs7QUFFQSxpQkFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7RUFFQSxDQUFBLENBQUE7Ozs7Ozs7O0FBUUEsT0FBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLENBQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxTQUFBLENBQUE7OztBQUdBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxhQUFBLEVBQ0EsT0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsSUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsZUFBQSxDQUFBOztJQUdBLEVBQUEsR0FBQSxDQUFBLENBQUE7R0FFQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0VBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsUUFBQSxHQUFBLFlBQUEsRUFFQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxNQUFBLFNBQUEsR0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLElBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEVBQUEsMEJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7R0FFQSxDQUFBLENBQUE7RUFDQSxDQUFBO0NBTUEsQ0FBQSxDQUFBOztBQ3RHQSxHQUFBLENBQUEsVUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsTUFBQSxNQUFBLENBQUEsWUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBLEtBQ0EsTUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLDRCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQUdBLENBQUEsQ0FBQTtBQy9CQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLFdBQUEsTUFBQSxHQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsT0FBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsUUFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFDQSxTQUFBLElBQUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7SUFDQTtBQUNBLE9BQUEsY0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBO0FBQ0EsUUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUdBLEtBQUEscUJBQUEsR0FBQSxTQUFBLHFCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsUUFBQTtBQUNBLGlCQUFBLEVBQUEsZUFBQTtBQUNBLHVCQUFBLEVBQUEscUJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDNUNBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLEtBQUEsTUFBQSxHQUFBLFNBQUEsTUFBQSxHQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsUUFBQTtBQUNBLFFBQUEsRUFBQSxNQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFFBQUE7QUFDQSxTQUFBLEVBQUEsaUJBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDYkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsS0FBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsU0FBQSxFQUFBOzs7QUFHQSxNQUFBLFNBQUEsR0FBQSxTQUFBLElBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGdCQUFBLEdBQUEsU0FBQSxJQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxVQUFBLENBQUEsZ0JBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLHlCQUFBLEVBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUdBLFFBQUE7QUFDQSxnQkFBQSxFQUFBLGNBQUE7QUFDQSxhQUFBLEVBQUEsV0FBQTtBQUNBLFlBQUEsRUFBQSxVQUFBO0FBQ0EsZUFBQSxFQUFBLGFBQUE7QUFDQSxZQUFBLEVBQUEsVUFBQTtBQUNBLGVBQUEsRUFBQSxhQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNuREEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLEtBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxHQUFBOztBQUVBLFNBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLElBQUEsTUFBQSxDQUFBLGtCQUFBLENBQUE7QUFDQSxPQUFBLFlBQUEsR0FBQSxJQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxRQUFBLENBQUE7O0FBRUEsT0FBQSxTQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxZQUFBLEdBQ0EsU0FBQSxDQUFBLFlBQUEsSUFDQSxTQUFBLENBQUEsa0JBQUEsSUFDQSxTQUFBLENBQUEsZUFBQSxJQUNBLFNBQUEsQ0FBQSxjQUFBLEFBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsRUFDQSxTQUFBLENBQUEsb0JBQUEsR0FBQSxTQUFBLENBQUEsMEJBQUEsSUFBQSxTQUFBLENBQUEsdUJBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEscUJBQUEsRUFDQSxTQUFBLENBQUEscUJBQUEsR0FBQSxTQUFBLENBQUEsMkJBQUEsSUFBQSxTQUFBLENBQUEsd0JBQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFlBQUEsQ0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSw0QkFBQSxFQUFBLE9BQUE7QUFDQSwyQkFBQSxFQUFBLE9BQUE7QUFDQSw0QkFBQSxFQUFBLE9BQUE7QUFDQSwwQkFBQSxFQUFBLE9BQUE7TUFDQTtBQUNBLGVBQUEsRUFBQSxFQUFBO0tBQ0E7SUFDQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBOzs7QUFHQSxRQUFBLGNBQUEsR0FBQSxZQUFBLENBQUEsdUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7OztBQUdBLFFBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7OztBQUdBLFlBQUEsR0FBQSxJQUFBLFFBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUEsQ0FBQTtJQUVBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxRQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsWUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxvQkFBQSxHQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7Ozs7QUFJQSxZQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsaUJBQUEsQ0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxrQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFJQSxLQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxNQUFBLEdBQUEsSUFBQSxVQUFBLEVBQUEsQ0FBQTs7QUFFQSxPQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtJQUNBLE1BQUE7QUFDQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBS0EsUUFBQTtBQUNBLFdBQUEsRUFBQSxtQkFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxPQUFBLFlBQUEsR0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLGVBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxTQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxRQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQTtPQUNBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFdBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSw4QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBRUE7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSxXQUFBO0FBQ0EsWUFBQSxFQUFBLFVBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDL0lBLFlBQUEsQ0FBQTs7QUNBQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLE9BQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLE1BQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsT0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsT0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxHQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLEdBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEscUJBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLGNBQUEsRUFBQTs7QUFFQSxNQUFBLGNBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0lBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtHQUVBOztBQUVBLGdCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLE9BQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7SUFDQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOzs7Ozs7O0dBUUEsQ0FBQSxDQUFBO0VBRUEsQ0FBQTs7QUFFQSxRQUFBO0FBQ0EsaUJBQUEsRUFBQSxlQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7QUFDQSxtQkFBQSxFQUFBLGlCQUFBO0FBQ0EsaUJBQUEsRUFBQSxlQUFBO0FBQ0EsU0FBQSxFQUFBLE9BQUE7QUFDQSxTQUFBLEVBQUEsT0FBQTtBQUNBLFdBQUEsRUFBQSxTQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNqR0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLEtBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxNQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7O0FBR0EsU0FBQSxNQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsY0FBQSxHQUFBLFNBQUEsY0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxJQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxlQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxPQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLE1BQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxRQUFBLElBQUEsUUFBQSxHQUFBLEtBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxrQkFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxDQUFBOztBQUVBLFNBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLGlCQUFBLEdBQUEsU0FBQSxpQkFBQSxDQUFBLEdBQUEsRUFBQTs7QUFHQSxNQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBO0FBQ0EsTUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQTtBQUNBLE1BQUEsT0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxZQUFBLENBQUE7QUFDQSxNQUFBLFFBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxhQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxHQUFBLFdBQUEsQ0FBQTs7QUFFQSxNQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7R0FDQTs7QUFFQSxRQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7Ozs7QUFJQSxTQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtHQUNBLEVBQUEsT0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLG1CQUFBLEdBQUEsU0FBQSxtQkFBQSxDQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsYUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxLQUFBLGtCQUFBLEdBQUEsU0FBQSxrQkFBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxRQUFBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxFQUFBLGNBQUE7QUFDQSxtQkFBQSxFQUFBLGlCQUFBO0FBQ0EsOEJBQUEsRUFBQSw0QkFBQTtBQUNBLHFCQUFBLEVBQUEsbUJBQUE7QUFDQSxvQkFBQSxFQUFBLGtCQUFBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUN0RkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBO0FBQ0EsWUFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFFBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSw2QkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFVBQUEsRUFBQSxrQkFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLGNBQUEsRUFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ3hCQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLE1BQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxhQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsSUFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsR0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsS0FBQSxDQUFBO0dBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxJQUFBLENBQUEsZ0JBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsS0FBQSxDQUFBO0dBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtFQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxPQUFBLEVBQUE7QUFDQSxPQUFBLEVBQUEsR0FBQTtBQUFBLEdBQ0E7QUFDQSxNQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLE9BQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsZ0JBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxLQUFBLENBQUEsWUFBQSxDQUFBLFVBQUEsR0FBQSxNQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxLQUFBLENBQUE7SUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxLQUFBLENBQUE7SUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxLQUFBLENBQUE7SUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOzs7QUFHQSxRQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBO0FBQ0EsUUFBQSxhQUFBLENBQUE7QUFDQSxRQUFBLFNBQUEsQ0FBQTs7QUFFQSxTQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFNBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFNBQUEsS0FBQSxZQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7O0FBRUEsVUFBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUE7O0FBRUEsV0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7O0FBRUEsV0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsUUFBQSxLQUFBLFFBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EscUJBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSxpQkFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtRQUVBO09BQ0E7TUFDQTtLQUNBOztBQUVBLFdBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxFQUFBLGFBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsYUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxTQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsS0FBQSxDQUFBO0lBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNoSEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsa0RBQUE7QUFDQSxZQUFBLEVBQUEsMkJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsMkJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxLQUFBLHVCQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7SUFDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsUUFBQSxZQUFBLENBQUEsS0FBQSxLQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7SUFDQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLE1BQUEsQ0FBQSxPQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7R0FFQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLG9CQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7Q0FJQSxDQUFBLENBQUE7QUMzQ0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxlQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSx5REFBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNOQSxHQUFBLENBQUEsU0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLCtDQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ0xBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLE9BQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLHlDQUFBO0FBQ0EsTUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLE9BQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxHQUFBO0FBQ0EsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsR0FBQSxDQUNBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQSw4QkFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsQ0FDQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBO0FBQ0EsWUFBQSxFQUFBLENBQUE7Ozs7Ozs7O0FBUUEsUUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsV0FBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLE9BQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxPQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxVQUFBLEVBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7R0FFQTs7RUFFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDOURBLEdBQUEsQ0FBQSxTQUFBLENBQUEsa0JBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLG9EQUFBO0FBQ0EsWUFBQSxFQUFBLDRCQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLDRCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFJQSxZQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsR0FBQSxLQUFBLFlBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtJQUNBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxzQkFBQSxFQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxFQUFBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLEVBQUEsSUFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBO0FBQ0EsWUFBQSxFQUFBLDBDQUFBO0lBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFVBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsa0JBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLGFBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxnQkFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLGFBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDdkRBLEdBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxRQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsdUNBQUE7QUFDQSxNQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxlQUFBLEdBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsWUFBQTtBQUNBLFFBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxTQUFBLGFBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQTs7QUFFQSxVQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsYUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFVBQUEsYUFBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLCtFQUFBLEdBQUEsVUFBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLGlEQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7T0FDQTtNQUNBO0tBQ0E7SUFDQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFFQSxRQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsRUFBQTs7QUFFQSxZQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxDQUFBO01BQ0E7S0FDQTs7O0FBR0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLFFBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLEtBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLDJCQUFBLEdBQUEsS0FBQSxHQUFBLGlEQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7SUFFQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxhQUFBLEVBQUEsVUFBQSxFQUFBO0FBQ0EsV0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxpQkFBQSxDQUFBLG1CQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUE7O0FBR0EsUUFBQSxDQUFBLGlCQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsU0FBQSxTQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLGlEQUFBLEdBQUEsUUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsMkJBQUEsR0FBQSxVQUFBLEdBQUEsaURBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSwwQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTtNQUNBLE1BQUE7OztVQU9BLGFBQUEsR0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxjQUFBLElBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxPQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtPQUNBOztBQVJBLFVBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLGtCQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFLQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO01BQ0E7S0FDQSxNQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtLQUNBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFFQSxTQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7Ozs7O0FBS0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsT0FBQSxDQUFBLE1BQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQTtBQUNBLFNBQUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxzQkFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsQ0FBQTtLQUNBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxLQUFBLENBQUE7TUFDQTtLQUNBLENBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsSUFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE9BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLFFBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBOztBQUVBLFFBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQTs7O0FBR0EsUUFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLGVBQUEsR0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxZQUFBLEdBQUEsS0FBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxDQUFBLGtCQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLGFBQUEsTUFBQSxHQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLFNBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLEdBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFVBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO01BQ0E7QUFDQSxTQUFBLGNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO01BQ0E7S0FDQTs7QUFFQSxhQUFBLFlBQUEsR0FBQTtBQUNBLGdCQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxvQkFBQSxDQUFBOzs7QUFHQSxXQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7OztBQUdBLG9CQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7OztBQUdBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO01BQ0EsQ0FBQSxDQUFBO0tBQ0E7QUFDQSxRQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLG9CQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTs7QUFFQSxTQUFBLEtBQUEsR0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO01BQ0EsRUFBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsRUFBQSxDQUFBO01BRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxpQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7TUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxNQUFBLEdBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLEtBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO09BQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtNQUNBLEVBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUdBLFNBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsRUFBQSxDQUFBO01BRUEsRUFBQSxNQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7QUFDQSxRQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxPQUFBLE1BQUEsS0FBQSxXQUFBLEVBQUEsT0FBQTtBQUNBLFFBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsR0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUdBLFFBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0lBQ0EsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxVQUFBLG1CQUFBLEVBQUE7QUFDQSxRQUFBLE9BQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxTQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO01BQ0EsTUFBQTtBQUNBLGFBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO01BQ0E7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO09BQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxHQUFBLGNBQUEsQ0FBQTtNQUNBLEVBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO0tBQ0E7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtJQUNBLENBQUE7R0FFQTs7RUFHQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICduZ1N0b3JhZ2UnLCAnbmdNYXRlcmlhbCcsICduZ0tub2InLCAncGxhbmd1bGFyJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uKHBsYW5ndWxhckNvbmZpZ1Byb3ZpZGVyKXtcbiAgICBwbGFuZ3VsYXJDb25maWdQcm92aWRlci5jbGllbnRJZCA9ICc0NWM1ZTYyMTJhYzU4YzczZTdkMDVmODYzNmE5YmYyMic7XG59KTtcblxuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ya3dlYicsIHtcbiAgICAgICAgdXJsOiAnL2Zvcmt3ZWInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Zvcmt3ZWIvZm9ya3dlYi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogXCJGb3JrV2ViQ29udHJvbGxlclwiXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9ya1dlYkNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBQcm9qZWN0RmN0LCBBdXRoU2VydmljZSwgRm9ya0ZhY3Rvcnkpe1xuXG5cdFx0Ly8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xuXHRcdC8vIFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcblx0XHQvLyBcdCRzY29wZS5kaXNwbGF5QVByb2plY3QgPSBmdW5jdGlvbihzb21ldGhpbmcpe1xuXHRcdC8vIFx0XHRjb25zb2xlLmxvZygnVEhJTkcnLCBzb21ldGhpbmcpO1xuXHRcdC8vIFx0XHRpZigkc2NvcGUubG9nZ2VkSW5Vc2VyLl9pZCA9PT0gJHN0YXRlUGFyYW1zLnRoZUlEKXtcblx0XHQvLyBcdFx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBzb21ldGhpbmcuX2lkfSk7XG5cdFx0Ly8gXHRcdH1cblx0XHQvLyBcdFx0Y29uc29sZS5sb2coXCJkaXNwbGF5aW5nIGEgcHJvamVjdFwiLCAkc2NvcGUucGFyZW50KTtcblx0XHQvLyBcdH1cblx0XHQvLyB9KTtcblxuXHRcdEZvcmtGYWN0b3J5LmdldFdlYigpLnRoZW4oZnVuY3Rpb24od2Vicyl7XG5cdCAgICAgICAgJHNjb3BlLmZvcmtzID0gd2Vicztcblx0ICAgICAgICBjb25zb2xlLmxvZygnd2VicyBhcmUnLCAkc2NvcGUuZm9ya3MpO1xuXHQgICAgXHRcblx0ICAgIFx0dmFyIGRhdGFzZXQgPSBbIDI1LCA3LCA1LCAyNiwgMTEgXTtcblx0ICAgIFx0XG5cblxuXHQgICAgXHRkMy5zZWxlY3QoJyN1aScpLnNlbGVjdEFsbChcImRpdlwiKS5kYXRhKGRhdGFzZXQpXG5cdCAgICBcdC5lbnRlcigpXG5cdCAgICBcdC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIFx0Ly8gLnRleHQoZnVuY3Rpb24oZCl7cmV0dXJuIFwiSSBjYW4gY291bnQgdXAgdG8gXCIgKyBkO30pXG5cdCAgICBcdC5hdHRyKFwiY2xhc3NcIiwgXCJiYXJcIilcblx0ICAgIFx0LnN0eWxlKHtcblx0XHRcdCAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snLFxuXHRcdFx0ICAgICd3aWR0aCc6ICcyMHB4Jyxcblx0XHRcdCAgICAnbWFyZ2luLXJpZ2h0JzogJzJweCcsXG5cdFx0XHQgICAgJ2JhY2tncm91bmQtY29sb3InOiAndGVhbCdcblx0XHRcdH0pXG5cdFx0XHQuc3R5bGUoXCJoZWlnaHRcIiwgZnVuY3Rpb24oZCl7XG5cdFx0XHRcdHJldHVybiAoZCAqIDUpICsgXCJweFwiO1xuXHRcdFx0fSk7XG5cblx0ICAgIH0pO1xuXG5cblx0XG59KTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCRsb2NhdGlvbikge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNpZ251cCA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coY3JlZGVudGlhbHMpO1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbiggb25TdWNjZXNzZnVsTG9naW4gKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIHNpZ251cCBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTsiLCIndXNlIHN0cmljdCc7XG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dnZWRJbkhvbWUnLCB7XG4gICAgICAgIHVybDogJy9ob21lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ0hvbWVDb250cm9sbGVyJ1xuICAgIH0pXG5cdC5zdGF0ZSgnaG9tZScse1xuXHRcdHVybDogJy8nLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvaG9tZS9sYW5kaW5nLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdMYW5kaW5nUGFnZUNvbnRyb2xsZXInLFxuXHRcdHJlc29sdmU6IHtcblx0XHRcdCBjaGVja0lmTG9nZ2VkSW46IGZ1bmN0aW9uIChBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cdFx0XHQgXHQvLyBjb25zb2xlLmxvZyhBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKSk7XG5cdFx0ICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG5cdFx0ICAgICAgICBcdGlmKHVzZXIpICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG5cdFx0ICAgICAgICB9KTtcblx0XHQgICAgfVxuXHRcdH1cblx0fSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvamVjdCcsIHtcbiAgICAgICAgdXJsOiAnL3Byb2plY3QvOnByb2plY3RJRCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcHJvamVjdC9wcm9qZWN0Lmh0bWwnXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1Byb2plY3RDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkY29tcGlsZSwgUmVjb3JkZXJGY3QsIFByb2plY3RGY3QsIFRvbmVUcmFja0ZjdCwgVG9uZVRpbWVsaW5lRmN0LCBBdXRoU2VydmljZSkge1xuXG5cdC8vd2luZG93IGV2ZW50c1xuXHR3aW5kb3cub25ibHVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUuc3RvcCgpO1xuXHRcdCRzY29wZS4kZGlnZXN0KCk7XG4gICAgfTtcbiAgICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gbGVhdmUgdGhpcyBwYWdlIGJlZm9yZSBzYXZpbmcgeW91ciB3b3JrP1wiO1xuXHR9O1xuXHR3aW5kb3cub251bmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZXMoKTtcblx0fVxuXHQkKCcudGltZWxpbmUtY29udGFpbmVyJykuc2Nyb2xsKGZ1bmN0aW9uKCl7XG5cdCAgICAkKCcudHJhY2tNYWluU2VjdGlvbicpLmNzcyh7XG5cdCAgICAgICAgJ2xlZnQnOiAkKHRoaXMpLnNjcm9sbExlZnQoKVxuXHQgICAgfSk7XG5cdH0pO1xuXG5cblxuXHR2YXIgbWF4TWVhc3VyZSA9IDA7XG5cblx0Ly8gbnVtYmVyIG9mIG1lYXN1cmVzIG9uIHRoZSB0aW1lbGluZVxuXHQkc2NvcGUubnVtTWVhc3VyZXMgPSBfLnJhbmdlKDAsIDYwKTtcblxuXHQvLyBsZW5ndGggb2YgdGhlIHRpbWVsaW5lXG5cdCRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcblxuXHQvL0luaXRpYWxpemUgcmVjb3JkZXIgb24gcHJvamVjdCBsb2FkXG5cdFJlY29yZGVyRmN0LnJlY29yZGVySW5pdCgpLnRoZW4oZnVuY3Rpb24gKHJldEFycikge1xuXHRcdCRzY29wZS5yZWNvcmRlciA9IHJldEFyclswXTtcblx0XHQkc2NvcGUuYW5hbHlzZXJOb2RlID0gcmV0QXJyWzFdO1xuXHR9KS5jYXRjaChmdW5jdGlvbiAoZSl7XG4gICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pO1xuXG5cdCRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcblx0JHNjb3BlLnRyYWNrcyA9IFtdO1xuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XG5cdCRzY29wZS5wcm9qZWN0SWQgPSAkc3RhdGVQYXJhbXMucHJvamVjdElEO1xuXHQkc2NvcGUucG9zaXRpb24gPSAwO1xuXHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xuXHQkc2NvcGUuY3VycmVudGx5UmVjb3JkaW5nID0gZmFsc2U7XG5cdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xuXHQkc2NvcGUuem9vbSA9IDEwMDtcblxuXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCRzY29wZS5wcm9qZWN0SWQpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcblx0XHR2YXIgbG9hZGVkID0gMDtcblx0XHRjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xuXHRcdCRzY29wZS5wcm9qZWN0TmFtZSA9IHByb2plY3QubmFtZTtcblxuXHRcdGlmIChwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcblxuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3QudHJhY2tzLmxlbmd0aCcsIHByb2plY3QudHJhY2tzLmxlbmd0aCk7XG5cblx0XHRcdHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cblx0XHRcdFx0dmFyIGxvYWRhYmxlVHJhY2tzID0gW107XG5cblx0XHRcdFx0cHJvamVjdC50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcblx0XHRcdFx0XHRpZiAodHJhY2sudXJsKSB7XG5cdFx0XHRcdFx0XHRsb2FkYWJsZVRyYWNrcysrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xuXG5cdFx0XHRcdFx0dmFyIGRvbmVMb2FkaW5nID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRcdFx0XHRsb2FkZWQrKztcblxuXHRcdFx0XHRcdFx0aWYobG9hZGVkID09PSBsb2FkYWJsZVRyYWNrcykge1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUuJGRpZ2VzdCgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHR2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdHJhY2subG9jYXRpb24pO1xuXHRcdFx0XHRcdGlmKG1heCArIDIgPiBtYXhNZWFzdXJlKSBtYXhNZWFzdXJlID0gbWF4ICsgMjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xuXHRcdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdC8vIFRPRE86IHRoaXMgaXMgYXNzdW1pbmcgdGhhdCBhIHBsYXllciBleGlzdHNcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xuXHRcdFx0XHRcdC8vaW5pdCBlZmZlY3RzLCBjb25uZWN0LCBhbmQgYWRkIHRvIHNjb3BlXG5cblx0XHRcdFx0XHR0cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZSh0cmFjay5lZmZlY3RzUmFjayk7XG5cdFx0XHRcdFx0dHJhY2sucGxheWVyLmNvbm5lY3QodHJhY2suZWZmZWN0c1JhY2tbMF0pO1xuXG5cdFx0XHRcdFx0aWYodHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QuYWRkTG9vcFRvVGltZWxpbmUodHJhY2sucGxheWVyLCB0cmFjay5sb2NhdGlvbik7XG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gdHJ1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRyYWNrLmVtcHR5ID0gdHJ1ZTtcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcbiAgICBcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcbiAgICBcdFx0XHRcdHRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcbiAgICBcdFx0XHRcdHRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLCAwLCAwLCAwXSk7XG4gICAgXHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBudWxsO1xuICAgIFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKHRyYWNrKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzY29wZS5tYXhNZWFzdXJlID0gMzI7XG4gIFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgXHRcdFx0XHR2YXIgb2JqID0ge307XG4gICAgXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xuICAgIFx0XHRcdFx0b2JqLnJlY29yZGluZyA9IGZhbHNlO1xuICAgIFx0XHRcdFx0b2JqLm9uVGltZWxpbmUgPSBmYWxzZTtcbiAgICBcdFx0XHRcdG9iai5wcmV2aWV3aW5nID0gZmFsc2U7XG4gICAgXHRcdFx0XHRvYmouc2lsZW5jZSA9IGZhbHNlO1xuICAgIFx0XHRcdFx0b2JqLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLCAwLCAwLCAwXSk7XG4gICAgXHRcdFx0XHRvYmoucGxheWVyID0gbnVsbDtcbiAgICBcdFx0XHRcdG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcbiAgICBcdFx0XHRcdG9iai5sb2NhdGlvbiA9IFtdO1xuICAgIFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XG4gIFx0XHRcdH1cbiAgXHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcblx0XHR9XG5cblx0XHQvL2R5bmFtaWNhbGx5IHNldCBtZWFzdXJlc1xuXHRcdC8vaWYgbGVzcyB0aGFuIDE2IHNldCAxOCBhcyBtaW5pbXVtXG5cdFx0JHNjb3BlLm51bU1lYXN1cmVzID0gW107XG5cdFx0aWYobWF4TWVhc3VyZSA8IDMyKSBtYXhNZWFzdXJlID0gMzI7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXhNZWFzdXJlOyBpKyspIHtcblx0XHRcdCRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xuXHRcdH1cblx0XHQvLyBjb25zb2xlLmxvZygnTUVBU1VSRVMnLCAkc2NvcGUubnVtTWVhc3VyZXMpO1xuXG5cblxuXHRcdFRvbmVUaW1lbGluZUZjdC5jcmVhdGVUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcblx0XHRcdCRzY29wZS5tZXRyb25vbWUgPSBtZXRyb25vbWU7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcblx0XHR9KTtcblx0XHRUb25lVGltZWxpbmVGY3QuY2hhbmdlQnBtKHByb2plY3QuYnBtKTtcblxuXHR9KTtcblxuXHQkc2NvcGUuanVtcFRvTWVhc3VyZSA9IGZ1bmN0aW9uKG1lYXN1cmUpIHtcblx0XHRpZihtYXhNZWFzdXJlID4gbWVhc3VyZSkge1xuXHRcdFx0JHNjb3BlLnBvc2l0aW9uID0gbWVhc3VyZTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uID0gbWVhc3VyZS50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0XHQkc2NvcGUubW92ZVBsYXloZWFkKG1lYXN1cmUpO1xuXHRcdH1cblx0fVxuXG5cdCRzY29wZS5tb3ZlUGxheWhlYWQgPSBmdW5jdGlvbiAobnVtYmVyTWVhc3VyZXMpIHtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3Vic3RyKDEpKTtcblx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gKG51bWJlck1lYXN1cmVzICogMjAwICsgMzAwKS50b1N0cmluZygpKydweCc7XG5cdH1cblxuXHQkc2NvcGUuem9vbU91dCA9IGZ1bmN0aW9uKCkge1xuXHRcdCRzY29wZS56b29tIC09IDEwO1xuXHRcdHZhciB6b29tID0gKCRzY29wZS56b29tIC0gMTApLnRvU3RyaW5nKCkgKyBcIiVcIjtcblx0XHQkKCcudGltZWxpbmUtY29udGFpbmVyJykuY3NzKCd6b29tJywgem9vbSk7XG5cdFx0Y29uc29sZS5sb2coJ09VVCcsICRzY29wZS56b29tKTtcblx0fTtcblxuXHQkc2NvcGUuem9vbUluID0gZnVuY3Rpb24oKSB7XG5cdFx0JHNjb3BlLnpvb20gKz0gMTA7XG5cdFx0dmFyIHpvb20gPSAoJHNjb3BlLnpvb20gKyAxMCkudG9TdHJpbmcoKSArIFwiJVwiO1xuXHRcdCQoJy50aW1lbGluZS1jb250YWluZXInKS5jc3MoJ3pvb20nLCB6b29tKTtcblx0XHRjb25zb2xlLmxvZygnSU4nLCAkc2NvcGUuem9vbSk7XG5cdH07XG5cblx0JHNjb3BlLmRyb3BJblRpbWVsaW5lID0gZnVuY3Rpb24gKGluZGV4KSB7XG5cdFx0dmFyIHRyYWNrID0gc2NvcGUudHJhY2tzW2luZGV4XTtcblx0fTtcblxuXHQkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cblx0fTtcblxuXG5cdCRzY29wZS5wbGF5ID0gZnVuY3Rpb24gKCkge1xuXHRcdCRzY29wZS5wbGF5aW5nID0gdHJ1ZTtcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcblx0fTtcblx0JHNjb3BlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xuXHRcdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXTtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCI6MDowXCIpO1xuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAoJHNjb3BlLnBvc2l0aW9uICogMjAwICsgMzAwKS50b1N0cmluZygpKydweCc7XG5cdFx0VG9uZS5UcmFuc3BvcnQucGF1c2UoKTtcblx0fTtcblx0JHNjb3BlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cdFx0JHNjb3BlLnBsYXlpbmcgPSBmYWxzZTtcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcblx0XHRUb25lVGltZWxpbmVGY3Quc3RvcEFsbCgkc2NvcGUudHJhY2tzKTtcblx0XHQkc2NvcGUucG9zaXRpb24gPSAwO1xuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcblx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gJzMwMHB4Jztcblx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCI6MDowXCIpO1xuXHRcdCQoJyNwb3NpdGlvblNlbGVjdG9yJykudmFsKFwiMFwiKTtcblx0XHQvL3N0b3AgYW5kIHRyYWNrIGN1cnJlbnRseSBiZWluZyBwcmV2aWV3ZWRcblx0XHRpZigkc2NvcGUucHJldmlld2luZ0lkKSB7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhckludGVydmFsKCRzY29wZS5wcmV2aWV3aW5nSWQpO1xuXHRcdFx0JHNjb3BlLnByZXZpZXdpbmdJZCA9IG51bGw7XG5cdFx0fVxuXHR9XG5cdCRzY29wZS5uYW1lQ2hhbmdlID0gZnVuY3Rpb24obmV3TmFtZSkge1xuXHRcdGNvbnNvbGUubG9nKCdORVcnLCBuZXdOYW1lKTtcblx0XHRpZihuZXdOYW1lKSB7XG5cdFx0XHQkc2NvcGUubmFtZUVycm9yID0gZmFsc2U7XG5cdFx0XHRQcm9qZWN0RmN0Lm5hbWVDaGFuZ2UobmV3TmFtZSwgJHNjb3BlLnByb2plY3RJZCkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJSRVNcIiwgcmVzcG9uc2UpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzY29wZS5uYW1lRXJyb3IgPSBcIllvdSBtdXN0IHNldCBhIG5hbWUhXCI7XG5cdFx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBcIlVudGl0bGVkXCI7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdE5hbWVJbnB1dCcpLmZvY3VzKCk7XG5cdFx0fVxuXHR9XG5cblx0JHNjb3BlLnRvZ2dsZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZigkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9PT0gMCkge1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS5vbiA9IGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcblxuXHRcdH1cblx0fVxuXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoJHNjb3BlLnRyYWNrcywgJHNjb3BlLnByb2plY3RJZCwgJHNjb3BlLnByb2plY3ROYW1lKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAvLyB3YXZlIGxvZ2ljXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcblxuICAgIH0pO1xuICB9O1xuICBcbiAgJHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJQcm9maWxlJywge1xuICAgICAgICB1cmw6ICcvdXNlcnByb2ZpbGUvOnRoZUlEJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3VzZXJwcm9maWxlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInLFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5hcnRpc3RJbmZvJywge1xuICAgICAgICB1cmw6ICcvaW5mbycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9pbmZvLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXG4gICAgfSlcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLnByb2plY3QnLCB7XG4gICAgICAgIHVybDogJy9wcm9qZWN0cycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9wcm9qZWN0cy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xuICAgIH0pXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5mb2xsb3dlcnMnLCB7XG4gICAgICAgIHVybDogJy9mb2xsb3dlcnMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93ZXJzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXG4gICAgfSlcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2luZycsIHtcbiAgICAgICAgdXJsOiAnL2ZvbGxvd2luZycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dpbmcuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcbiAgICB9KTtcblxufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFRvbmVUcmFja0ZjdCwgUHJvamVjdEZjdCwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsICRtZFRvYXN0KSB7XG5cdHZhciB0cmFja0J1Y2tldCA9IFtdO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuXG5cdCRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5wcm9qZWN0cyA9IGZ1bmN0aW9uICgpe1xuICAgIFx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygpLnRoZW4oZnVuY3Rpb24ocHJvamVjdHMpe1xuICAgIFx0XHRjb25zb2xlLmxvZygnUFJPSkNTJywgcHJvamVjdHMpO1xuICAgIFx0XHQkc2NvcGUuYWxsUHJvamVjdHMgPSBwcm9qZWN0cztcbiAgICBcdH0pO1xuICAgIH07XG5cdCRzY29wZS5wcm9qZWN0cygpO1xuXG5cblx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvZ2dlZEluVXNlcicsIGxvZ2dlZEluVXNlcik7XG5cdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcblx0XHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XG5cdFx0XHRkZWxldGUgcHJvamVjdC5faWQ7XG5cdFx0XHRjb25zb2xlLmxvZyhwcm9qZWN0KTtcblx0XHRcdCRtZFRvYXN0LnNob3coe1xuXHRcdFx0XHRoaWRlRGVsYXk6IDIwMDAsXG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tIHJpZ2h0Jyxcblx0XHRcdFx0dGVtcGxhdGU6XCI8bWQtdG9hc3Q+IEl0J3MgYmVlbiBmb3JrZWQgPC9tZC10b2FzdD5cIlxuXHRcdFx0fSk7XG5cblx0XHRcdFByb2plY3RGY3QuY3JlYXRlQUZvcmsocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JrIHJlc3BvbnNlIGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0fSk7XG5cdFx0fSlcblx0XG5cdH1cblx0XHRcblx0dmFyIHN0b3AgPWZhbHNlO1xuXG5cblx0JHNjb3BlLnNhbXBsZVRyYWNrID0gZnVuY3Rpb24odHJhY2spe1xuXG5cdFx0aWYoc3RvcD09PXRydWUpe1xuXHRcdFx0JHNjb3BlLnBsYXllci5zdG9wKCk7XG5cdFx0fVxuXG5cdFx0VG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGZ1bmN0aW9uKHBsYXllcil7XG5cdFx0XHQkc2NvcGUucGxheWVyID0gcGxheWVyO1xuXHRcdFx0aWYoc3RvcCA9PT0gZmFsc2Upe1xuXHRcdFx0XHRzdG9wID0gdHJ1ZTtcblx0XHRcdFx0JHNjb3BlLnBsYXllci5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0c3RvcCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblxuXHQkc2NvcGUuZ2V0VXNlclByb2ZpbGUgPSBmdW5jdGlvbih1c2VyKXtcblx0ICAgIC8vIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCB1c2VyKTtcblx0ICAgICRzdGF0ZS5nbygndXNlclByb2ZpbGUnLCB7dGhlSUQ6IHVzZXIuX2lkfSk7XG5cdH1cblxuXG5cblxuXHR2YXIgYWN0aXZlVXJsID0gbnVsbDtcblxuICAgICRzY29wZS5wYXVzZWQgPSB0cnVlO1xuXG4gICAgJHNjb3BlLiRvbignd2F2ZXN1cmZlckluaXQnLCBmdW5jdGlvbiAoZSwgd2F2ZXN1cmZlcikge1xuICAgICAgICAkc2NvcGUud2F2ZXN1cmZlciA9IHdhdmVzdXJmZXI7XG5cbiAgICAgICAgJHNjb3BlLndhdmVzdXJmZXIub24oJ3BsYXknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUucGF1c2VkID0gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS53YXZlc3VyZmVyLm9uKCdwYXVzZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUud2F2ZXN1cmZlci5vbignZmluaXNoJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnBhdXNlZCA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUud2F2ZXN1cmZlci5zZWVrVG8oMCk7XG4gICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnBsYXkgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIGlmICghJHNjb3BlLndhdmVzdXJmZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGFjdGl2ZVVybCA9IHVybDtcblxuICAgICAgICAkc2NvcGUud2F2ZXN1cmZlci5vbmNlKCdyZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS53YXZlc3VyZmVyLnBsYXkoKTtcbiAgICAgICAgICAgICRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLndhdmVzdXJmZXIubG9hZChhY3RpdmVVcmwpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNQbGF5aW5nID0gZnVuY3Rpb24gKHVybCkge1xuICAgICAgICByZXR1cm4gdXJsID09IGFjdGl2ZVVybDtcbiAgICB9O1xuXG4gICAgXG5cblxufSk7XG5cbmFwcC5kaXJlY3RpdmUoJ3dhdmVzdXJmZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcblxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XG4gICAgICAgICAgICAkZWxlbWVudC5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcblxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZCh7IGNvbnRhaW5lcjogJGVsZW1lbnRbMF0gfSwgJGF0dHJzKTtcbiAgICAgICAgICAgIHZhciB3YXZlc3VyZmVyID0gV2F2ZVN1cmZlci5jcmVhdGUob3B0aW9ucyk7XG5cbiAgICAgICAgICAgIGlmICgkYXR0cnMudXJsKSB7XG4gICAgICAgICAgICAgICAgd2F2ZXN1cmZlci5sb2FkKCRhdHRycy51cmwsICRhdHRycy5kYXRhIHx8IG51bGwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3dhdmVzdXJmZXJJbml0Jywgd2F2ZXN1cmZlcik7XG4gICAgICAgIH1cbiAgICB9O1xufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ0xhbmRpbmdQYWdlQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCBUb25lVHJhY2tGY3QsICRzdGF0ZSkge1xuICAgIC8vICQoJyNmdWxscGFnZScpLmZ1bGxwYWdlKCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ25hdmJhcicpWzBdLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblxuXG4gICAgJHNjb3BlLmdvVG9Gb3JtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdGZ1bmN0aW9uIHNjcm9sbFRvQm90dG9tKGR1cmF0aW9uKSB7XG5cdFx0ICAgIGlmIChkdXJhdGlvbiA8PSAwKSByZXR1cm47XG5cblx0XHRcdHZhciBkaWZmZXJlbmNlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCAtIHdpbmRvdy5zY3JvbGxZO1xuXHRcdFx0dmFyIHBlclRpY2sgPSBkaWZmZXJlbmNlIC8gZHVyYXRpb24gKiAxMDtcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0d2luZG93LnNjcm9sbCgwLCB3aW5kb3cuc2Nyb2xsWSArIHBlclRpY2spO1xuXHRcdFx0XHRzY3JvbGxUb0JvdHRvbShkdXJhdGlvbiAtIDEwKTtcblx0XHRcdH0sIDEwKTtcblx0XHR9XG5cblx0XHRzY3JvbGxUb0JvdHRvbSgxMDAwKTtcbiAgICB9O1xuXG4gICAgXG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24obG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ05ld1Byb2plY3RDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgUHJvamVjdEZjdCwgJHN0YXRlKXtcblx0JHNjb3BlLnVzZXI7XG5cblx0IEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdCBcdCRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCAkc2NvcGUudXNlci51c2VybmFtZSlcbiAgICB9KTtcblxuXHQgJHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xuXHQgXHRQcm9qZWN0RmN0Lm5ld1Byb2plY3QoJHNjb3BlLnVzZXIpLnRoZW4oZnVuY3Rpb24ocHJvamVjdElkKXtcblx0IFx0XHRjb25zb2xlLmxvZygnU3VjY2VzcyBpcycsIHByb2plY3RJZClcblx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHByb2plY3RJZH0pO1x0IFx0XG5cdFx0fSlcblxuXHQgfVxuXG59KSIsImFwcC5jb250cm9sbGVyKCdUaW1lbGluZUNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRsb2NhbFN0b3JhZ2UsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCkge1xuICBcbiAgdmFyIHdhdkFycmF5ID0gW107XG4gIFxuICAkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCA2MDsgaSsrKSB7XG4gICAgJHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XG4gIH1cblxuICAkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XG4gICRzY29wZS50cmFja3MgPSBbXTtcbiAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuXG5cbiAgUHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygnNTU5NGMyMGFkMDc1OWNkNDBjZTUxZTE0JykudGhlbihmdW5jdGlvbiAocHJvamVjdCkge1xuXG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIGNvbnNvbGUubG9nKCdQUk9KRUNUJywgcHJvamVjdCk7XG5cbiAgICAgIGlmIChwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcbiAgICAgICAgcHJvamVjdC50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgICAgIHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgICAgICAgICBpZihsb2FkZWQgPT09IHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAvLyBUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xuICAgICAgICAgICAgVG9uZVRpbWVsaW5lRmN0LmFkZExvb3BUb1RpbWVsaW5lKHRyYWNrLnBsYXllciwgdHJhY2subG9jYXRpb24pO1xuICAgICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKHRyYWNrKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xuICAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgICBvYmoubmFtZSA9ICdUcmFjayAnICsgKGkrMSk7XG4gICAgICAgICAgb2JqLmxvY2F0aW9uID0gW107XG4gICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgVG9uZVRpbWVsaW5lRmN0LmdldFRyYW5zcG9ydChwcm9qZWN0LmVuZE1lYXN1cmUpO1xuICAgICAgVG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XG5cbiAgfSk7XG5cbiAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihhVXNlcil7XG4gIC8vICAgICAkc2NvcGUudGhlVXNlciA9IGFVc2VyO1xuICAvLyAgICAgLy8gJHN0YXRlUGFyYW1zLnRoZUlEID0gYVVzZXIuX2lkXG4gIC8vICAgICBjb25zb2xlLmxvZyhcImlkXCIsICRzdGF0ZVBhcmFtcyk7XG4gIC8vIH0pO1xuXG4gICRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoZSwgaW5kZXgpIHtcblxuICBcdGUgPSBlLnRvRWxlbWVudDtcblxuICAgICAgICAvLyBzdGFydCByZWNvcmRpbmdcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0IHJlY29yZGluZycpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFhdWRpb1JlY29yZGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGUuY2xhc3NMaXN0LmFkZChcInJlY29yZGluZ1wiKTtcbiAgICAgICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xuICAgICAgICBhdWRpb1JlY29yZGVyLnJlY29yZCgpO1xuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1ZGlvUmVjb3JkZXIuc3RvcCgpO1xuICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcbiAgICAgICAgICBcbiAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XG4gICAgICAgICAgICAvLyAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcblxuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgXG4gICAgICAgIH0sIDIwMDApO1xuXG4gIH1cblxuICAkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cbiAgfTtcblxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgdmFyIGF3c1RyYWNrcyA9ICRzY29wZS50cmFja3MuZmlsdGVyKGZ1bmN0aW9uKHRyYWNrLGluZGV4KXtcbiAgICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pe1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIFJlY29yZGVyRmN0LnNlbmRUb0FXUyhhd3NUcmFja3MsICc1NTk1YTdmYWFhOTAxYWQ2MzIzNGY5MjAnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAvLyB3YXZlIGxvZ2ljXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcblxuICAgIH0pO1xuICB9O1xuXG5cblx0XG5cblxufSk7XG5cblxuIiwiXG5hcHAuY29udHJvbGxlcignVXNlckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGVQYXJhbXMsIHVzZXJGYWN0b3J5KSB7XG5cbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XG4gICAgICAgIFxuICAgICAgICAgICRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XG5cbiAgICAgICAgICB1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGlzJywgdXNlciwgJHN0YXRlKTtcbiAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgICRzY29wZS5kaXNwbGF5U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICBpZigkc2NvcGUuc2hvd1NldHRpbmdzKSAkc2NvcGUuc2hvd1NldHRpbmdzID0gZmFsc2U7XG4gICAgICAgIGVsc2UgJHNjb3BlLnNob3dTZXR0aW5ncyA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5zaG93U2V0dGluZ3MpO1xuICAgIH1cblxuICAgICRzY29wZS5mb2xsb3cgPSBmdW5jdGlvbih1c2VyKXtcbiAgICAgIHVzZXJGYWN0b3J5LmZvbGxvdyh1c2VyLCAkc2NvcGUubG9nZ2VkSW5Vc2VyKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgY29uc29sZS5sb2coJ0ZvbGxvdyBjb250cm9sbGVyIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRpc3BsYXlXZWIgPSBmdW5jdGlvbigpe1xuICAgICAgY29uc29sZS5sb2coXCJjbGlja2VkXCIpO1xuICAgICAgJHN0YXRlLmdvKCdmb3Jrd2ViJyk7XG4gICAgfVxuXG5cbn0pOyIsImFwcC5mYWN0b3J5KCdBbmFseXNlckZjdCcsIGZ1bmN0aW9uKCkge1xuXG5cdHZhciB1cGRhdGVBbmFseXNlcnMgPSBmdW5jdGlvbiAoYW5hbHlzZXJDb250ZXh0LCBhbmFseXNlck5vZGUsIGNvbnRpbnVlVXBkYXRlKSB7XG5cblx0XHRmdW5jdGlvbiB1cGRhdGUoKSB7XG5cdFx0XHR2YXIgU1BBQ0lORyA9IDM7XG5cdFx0XHR2YXIgQkFSX1dJRFRIID0gMTtcblx0XHRcdHZhciBudW1CYXJzID0gTWF0aC5yb3VuZCgzMDAgLyBTUEFDSU5HKTtcblx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xuXG5cdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXG5cblx0XHRcdGFuYWx5c2VyQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgMzAwLCAxMDApO1xuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1Jztcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcblx0XHRcdHZhciBtdWx0aXBsaWVyID0gYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50IC8gbnVtQmFycztcblxuXHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgKytpKSB7XG5cdFx0XHRcdHZhciBtYWduaXR1ZGUgPSAwO1xuXHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcblx0XHRcdFx0Ly8gZ290dGEgc3VtL2F2ZXJhZ2UgdGhlIGJsb2NrLCBvciB3ZSBtaXNzIG5hcnJvdy1iYW5kd2lkdGggc3Bpa2VzXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqPCBtdWx0aXBsaWVyOyBqKyspXG5cdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xuXHRcdFx0XHRtYWduaXR1ZGUgPSBtYWduaXR1ZGUgLyBtdWx0aXBsaWVyO1xuXHRcdFx0XHR2YXIgbWFnbml0dWRlMiA9IGZyZXFCeXRlRGF0YVtpICogbXVsdGlwbGllcl07XG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xuXHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFJlY3QoaSAqIFNQQUNJTkcsIDEwMCwgQkFSX1dJRFRILCAtbWFnbml0dWRlKTtcblx0XHRcdH1cblx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0fVxuXG5cblx0dmFyIGNhbmNlbEFuYWx5c2VyVXBkYXRlcyA9IGZ1bmN0aW9uIChhbmFseXNlcklkKSB7XG5cdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XG5cdH1cblx0cmV0dXJuIHtcblx0XHR1cGRhdGVBbmFseXNlcnM6IHVwZGF0ZUFuYWx5c2Vycyxcblx0XHRjYW5jZWxBbmFseXNlclVwZGF0ZXM6IGNhbmNlbEFuYWx5c2VyVXBkYXRlc1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuZmFjdG9yeSgnRm9ya0ZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0V2ViID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2ZvcmtzJykudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFdlYjogZ2V0V2ViXG4gICAgfTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ0hvbWVGY3QnLCBmdW5jdGlvbigkaHR0cCl7XG5cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VyJywge3BhcmFtczoge19pZDogdXNlcn19KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc3VjY2Vzcyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Y2Nlc3MuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1Byb2plY3RGY3QnLCBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0UHJvamVjdEluZm8gPSBmdW5jdGlvbiAocHJvamVjdElkKSB7XG5cbiAgICAgICAgLy9pZiBjb21pbmcgZnJvbSBIb21lQ29udHJvbGxlciBhbmQgbm8gSWQgaXMgcGFzc2VkLCBzZXQgaXQgdG8gJ2FsbCdcbiAgICAgICAgdmFyIHByb2plY3RpZCA9IHByb2plY3RJZCB8fCAnYWxsJztcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9qZWN0cy8nICsgcHJvamVjdGlkIHx8IHByb2plY3RpZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBjcmVhdGVBRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMvJywgcHJvamVjdCkudGhlbihmdW5jdGlvbihmb3JrKXtcbiAgICBcdFx0XHRyZXR1cm4gZm9yay5kYXRhO1xuICAgIFx0fSk7XG4gICAgfVxuICAgIHZhciBuZXdQcm9qZWN0ID0gZnVuY3Rpb24odXNlcil7XG4gICAgXHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9wcm9qZWN0cycse293bmVyOnVzZXIuX2lkLCBuYW1lOidVbnRpdGxlZCcsIGJwbToxMjAsIGVuZE1lYXN1cmU6IDMyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgXHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgIFx0fSk7XG4gICAgfVxuICAgIHZhciBuYW1lQ2hhbmdlID0gZnVuY3Rpb24obmV3TmFtZSwgcHJvamVjdElkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvcHJvamVjdHMvJytwcm9qZWN0SWQsIHtuYW1lOiBuZXdOYW1lfSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBkZWxldGVQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvcHJvamVjdHMvJytwcm9qZWN0Ll9pZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRGVsZXRlIFByb2ogRmN0JywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIHVwbG9hZFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJ2FwaS9wcm9qZWN0cy9zb3VuZGNsb3VkJywgeyBwcm9qZWN0IDogcHJvamVjdCB9ICkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFByb2plY3RJbmZvOiBnZXRQcm9qZWN0SW5mbyxcbiAgICAgICAgY3JlYXRlQUZvcms6IGNyZWF0ZUFGb3JrLFxuICAgICAgICBuZXdQcm9qZWN0OiBuZXdQcm9qZWN0LCBcbiAgICAgICAgZGVsZXRlUHJvamVjdDogZGVsZXRlUHJvamVjdCxcbiAgICAgICAgbmFtZUNoYW5nZTogbmFtZUNoYW5nZSxcbiAgICAgICAgdXBsb2FkUHJvamVjdDogdXBsb2FkUHJvamVjdFxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JlY29yZGVyRmN0JywgZnVuY3Rpb24gKCRodHRwLCBBdXRoU2VydmljZSwgJHEsIFRvbmVUcmFja0ZjdCwgQW5hbHlzZXJGY3QpIHtcblxuICAgIHZhciByZWNvcmRlckluaXQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciBDb250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgICAgICAgICAgdmFyIGF1ZGlvQ29udGV4dCA9IG5ldyBDb250ZXh0KCk7XG4gICAgICAgICAgICB2YXIgcmVjb3JkZXI7XG5cbiAgICAgICAgICAgIHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IChcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWFcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5jYW5jZWxBbmltYXRpb25GcmFtZSlcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBuYXZpZ2F0b3Iud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lO1xuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBuYXZpZ2F0b3Iud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cbiAgICAgICAgICAgIC8vIGFzayBmb3IgcGVybWlzc2lvblxuICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJhdWRpb1wiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtYW5kYXRvcnlcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dFY2hvQ2FuY2VsbGF0aW9uXCI6IFwiZmFsc2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nQXV0b0dhaW5Db250cm9sXCI6IFwiZmFsc2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nTm9pc2VTdXBwcmVzc2lvblwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0hpZ2hwYXNzRmlsdGVyXCI6IFwiZmFsc2VcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJvcHRpb25hbFwiOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlucHV0UG9pbnQgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW4gQXVkaW9Ob2RlIGZyb20gdGhlIHN0cmVhbS5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWFsQXVkaW9JbnB1dCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF1ZGlvSW5wdXQgPSByZWFsQXVkaW9JbnB1dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1ZGlvSW5wdXQuY29ubmVjdChpbnB1dFBvaW50KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuYWx5c2VyIG5vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhbmFseXNlck5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5c2VyTm9kZS5mZnRTaXplID0gMjA0ODtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggYW5hbHlzZXJOb2RlICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHJlY29yZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRlciA9IG5ldyBSZWNvcmRlciggaW5wdXRQb2ludCApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHplcm9HYWluID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmdhaW4udmFsdWUgPSAwLjA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIHplcm9HYWluICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5jb25uZWN0KCBhdWRpb0NvbnRleHQuZGVzdGluYXRpb24gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShbcmVjb3JkZXIsIGFuYWx5c2VyTm9kZV0pO1xuXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBhdWRpbycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgcmVjb3JkU3RhcnQgPSBmdW5jdGlvbiAocmVjb3JkZXIpIHtcbiAgICAgICAgcmVjb3JkZXIuY2xlYXIoKTtcbiAgICAgICAgcmVjb3JkZXIucmVjb3JkKCk7XG4gICAgfVxuXG4gICAgdmFyIHJlY29yZFN0b3AgPSBmdW5jdGlvbiAoaW5kZXgsIHJlY29yZGVyKSB7XG4gICAgICAgIHJlY29yZGVyLnN0b3AoKTtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAvLyBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XG4gICAgICAgICAgICByZWNvcmRlci5nZXRCdWZmZXJzKGZ1bmN0aW9uIChidWZmZXJzKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwbGF5IHdhdiBpbWFnZVxuICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJ3YXZlZGlzcGxheVwiICsgIGluZGV4ICk7XG4gICAgICAgICAgICAgICAgdmFyIGNhbnZhc0xvb3AgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJ3YXZlRm9yTG9vcFwiICsgIGluZGV4ICk7XG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMzAwLCAxMDAsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBidWZmZXJzWzBdICk7XG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMTk4LCA5OCwgY2FudmFzTG9vcC5nZXRDb250ZXh0KCcyZCcpLCBidWZmZXJzWzBdICk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxhdGVzdEJ1ZmZlciA9IGJ1ZmZlcnNbMF07XG4gICAgICAgICAgICAgICAgd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlID0gY2FudmFzTG9vcC50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XG5cbiAgICAgICAgICAgICAgICAvLyB0aGUgT05MWSB0aW1lIGdvdEJ1ZmZlcnMgaXMgY2FsbGVkIGlzIHJpZ2h0IGFmdGVyIGEgbmV3IHJlY29yZGluZyBpcyBjb21wbGV0ZWQgLSBcbiAgICAgICAgICAgICAgICAvLyBzbyBoZXJlJ3Mgd2hlcmUgd2Ugc2hvdWxkIHNldCB1cCB0aGUgZG93bmxvYWQuXG4gICAgICAgICAgICAgICAgcmVjb3JkZXIuZXhwb3J0V0FWKCBmdW5jdGlvbiAoIGJsb2IgKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vbmVlZHMgYSB1bmlxdWUgbmFtZVxuICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmRlci5zZXR1cERvd25sb2FkKCBibG9iLCBcIm15UmVjb3JkaW5nMC53YXZcIiApO1xuICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSBsb29wIHRpbWVcbiAgICAgICAgICAgICAgICAgICAgVG9uZVRyYWNrRmN0Lmxvb3BJbml0aWFsaXplKGJsb2IsIGluZGV4LCBcIm15UmVjb3JkaW5nMC53YXZcIikudGhlbihyZXNvbHZlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFxuXG4gICAgXG4gICAgdmFyIGNvbnZlcnRUb0Jhc2U2NCA9IGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICBjb25zb2xlLmxvZygnZWFjaCB0cmFjaycsIHRyYWNrKTtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pIHtcbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTCh0cmFjay5yYXdBdWRpbyk7XG4gICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cblxuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZW5kVG9BV1M6IGZ1bmN0aW9uICh0cmFja3NBcnJheSwgcHJvamVjdElkLCBwcm9qZWN0TmFtZSkge1xuXG4gICAgICAgICAgICB2YXIgcmVhZFByb21pc2VzID0gdHJhY2tzQXJyYXkubWFwKGNvbnZlcnRUb0Jhc2U2NCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkcS5hbGwocmVhZFByb21pc2VzKS50aGVuKGZ1bmN0aW9uIChzdG9yZURhdGEpIHtcblxuICAgICAgICAgICAgICAgIHRyYWNrc0FycmF5LmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdG9yZURhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrLnJhd0F1ZGlvID0gc3RvcmVEYXRhW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2suZWZmZWN0c1JhY2sgPSB0cmFjay5lZmZlY3RzUmFjay5tYXAoZnVuY3Rpb24gKGVmZmVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRUZGRUNUXCIsIGVmZmVjdCwgZWZmZWN0LndldC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVmZmVjdC53ZXQudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvYXdzLycsIHsgdHJhY2tzIDogdHJhY2tzQXJyYXksIHByb2plY3RJZCA6IHByb2plY3RJZCwgcHJvamVjdE5hbWUgOiBwcm9qZWN0TmFtZSB9KVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBpbiBzZW5kVG9BV1NGYWN0b3J5JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgcmVjb3JkZXJJbml0OiByZWNvcmRlckluaXQsXG4gICAgICAgIHJlY29yZFN0YXJ0OiByZWNvcmRTdGFydCxcbiAgICAgICAgcmVjb3JkU3RvcDogcmVjb3JkU3RvcFxuICAgIH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdUb25lVGltZWxpbmVGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XG5cblx0dmFyIGNyZWF0ZVRyYW5zcG9ydCA9IGZ1bmN0aW9uIChsb29wRW5kKSB7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcCA9IHRydWU7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wU3RhcnQgPSAnMG0nO1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcEVuZCA9IGxvb3BFbmQudG9TdHJpbmcoKSArICdtJztcblx0XHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcblxuXHRcdFx0Y3JlYXRlTWV0cm9ub21lKCkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR2YXIgcG9zQXJyID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKTtcblx0XHRcdFx0XHR2YXIgbGVmdFBvcyA9ICgocGFyc2VJbnQocG9zQXJyWzBdKSAqIDIwMCApICsgKHBhcnNlSW50KHBvc0FyclsxXSkgKiA1MCkgKyA1MDApLnRvU3RyaW5nKCkgKyAncHgnO1xuXHRcdFx0XHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSBsZWZ0UG9zO1xuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xuXHRcdFx0XHR9LCAnMW0nKTtcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdCQoJyN0aW1lbGluZVBvc2l0aW9uJykudmFsKFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnN1YnN0cigxKSk7XG5cdFx0XHRcdFx0JCgnI3Bvc2l0aW9uU2VsZWN0b3InKS52YWwoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3Vic3RyKDAsMSkpO1xuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xuXHRcdFx0XHR9LCAnNG4nKTtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0cm9ub21lKTtcblx0XHRcdH0pO1xuICAgICAgICB9KTtcblx0fTtcblxuXHR2YXIgY2hhbmdlQnBtID0gZnVuY3Rpb24gKGJwbSkge1xuXHRcdFRvbmUuVHJhbnNwb3J0LmJwbS52YWx1ZSA9IGJwbTtcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XG5cdH07XG5cblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIG11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciB1bk11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciBjcmVhdGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgIHZhciBtZXQgPSBuZXcgVG9uZS5QbGF5ZXIoXCIvYXBpL3dhdi9DbGljazEud2F2XCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0KTtcblx0ICAgICAgICB9KS50b01hc3RlcigpO1xuICAgICAgICB9KTtcblx0fTtcblxuXHR2YXIgYWRkTG9vcFRvVGltZWxpbmUgPSBmdW5jdGlvbiAocGxheWVyLCBzdGFydFRpbWVBcnJheSkge1xuXG5cdFx0aWYoc3RhcnRUaW1lQXJyYXkuaW5kZXhPZigwKSA9PT0gLTEpIHtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xuXHRcdFx0fSwgXCIwbVwiKVxuXG5cdFx0fVxuXG5cdFx0c3RhcnRUaW1lQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRUaW1lKSB7XG5cblx0XHRcdHZhciBzdGFydFRpbWUgPSBzdGFydFRpbWUudG9TdHJpbmcoKSArICdtJztcblxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnU3RhcnQnLCBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbik7XG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xuXHRcdFx0fSwgc3RhcnRUaW1lKTtcblxuXHRcdFx0Ly8gdmFyIHN0b3BUaW1lID0gcGFyc2VJbnQoc3RhcnRUaW1lLnN1YnN0cigwLCBzdGFydFRpbWUubGVuZ3RoLTEpKSArIDEpLnRvU3RyaW5nKCkgKyBzdGFydFRpbWUuc3Vic3RyKC0xLDEpO1xuXHRcdFx0Ly8vLyBjb25zb2xlLmxvZygnU1RPUCcsIHN0b3ApO1xuXHRcdFx0Ly8vLyB0cmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8vLyBcdHBsYXllci5zdG9wKCk7XG5cdFx0XHQvLy8vIH0sIHN0b3BUaW1lKTtcblxuXHRcdH0pO1xuXG5cdH07XG5cdFxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZVRyYW5zcG9ydDogY3JlYXRlVHJhbnNwb3J0LFxuICAgICAgICBjaGFuZ2VCcG06IGNoYW5nZUJwbSxcbiAgICAgICAgYWRkTG9vcFRvVGltZWxpbmU6IGFkZExvb3BUb1RpbWVsaW5lLFxuICAgICAgICBjcmVhdGVNZXRyb25vbWU6IGNyZWF0ZU1ldHJvbm9tZSxcbiAgICAgICAgc3RvcEFsbDogc3RvcEFsbCxcbiAgICAgICAgbXV0ZUFsbDogbXV0ZUFsbCxcbiAgICAgICAgdW5NdXRlQWxsOiB1bk11dGVBbGxcbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdUb25lVHJhY2tGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XG5cblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xuXHRcdHZhciBwbGF5ZXIgID0gbmV3IFRvbmUuUGxheWVyKHVybCwgZG9uZUZuKTtcblx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcblx0XHQvLyBwbGF5ZXIuc3luYygpO1xuXHRcdC8vIHBsYXllci5sb29wID0gdHJ1ZTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0Ly9QQVNTRUQgQSBCTE9CIEZST00gUkVDT1JERVJKU0ZBQ1RPUlkgLSBEUk9QUEVEIE9OIE1FQVNVUkUgMFxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdHZhciBsaW5rID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYXZlXCIraW5kZXgpO1xuXHRcdFx0bGluay5ocmVmID0gdXJsO1xuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2Jztcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmcgPSBibG9iO1xuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZ1VSTCA9IHVybDtcblx0XHRcdHZhciBwbGF5ZXI7XG5cdFx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIGVmZmVjdHNJbml0aWFsaXplID0gZnVuY3Rpb24oYXJyKSB7XG5cblxuXHRcdHZhciBjaG9ydXMgPSBuZXcgVG9uZS5DaG9ydXMoKTtcblx0XHRjaG9ydXMubmFtZSA9IFwiQ2hvcnVzXCI7XG5cdFx0dmFyIHBoYXNlciA9IG5ldyBUb25lLlBoYXNlcigpO1xuXHRcdHBoYXNlci5uYW1lID0gXCJQaGFzZXJcIjtcblx0XHR2YXIgZGlzdG9ydCA9IG5ldyBUb25lLkRpc3RvcnRpb24oKTtcblx0XHRkaXN0b3J0Lm5hbWUgPSBcIkRpc3RvcnRpb25cIjtcblx0XHR2YXIgcGluZ3BvbmcgPSBuZXcgVG9uZS5QaW5nUG9uZ0RlbGF5KFwiNG1cIik7XG5cdFx0cGluZ3BvbmcubmFtZSA9IFwiUGluZyBQb25nXCI7XG5cblx0XHRpZiAoYXJyLmxlbmd0aCkge1xuXHRcdFx0Y2hvcnVzLndldC52YWx1ZSA9IGFyclswXTtcblx0XHRcdHBoYXNlci53ZXQudmFsdWUgPSBhcnJbMV07XG5cdFx0XHRkaXN0b3J0LndldC52YWx1ZSA9IGFyclsyXTtcblx0XHRcdHBpbmdwb25nLndldC52YWx1ZSA9IGFyclszXTtcblx0XHR9XG5cdFx0XG5cdFx0Y2hvcnVzLmNvbm5lY3QocGhhc2VyKTtcblx0XHRwaGFzZXIuY29ubmVjdChkaXN0b3J0KTtcblx0XHRkaXN0b3J0LmNvbm5lY3QocGluZ3BvbmcpO1xuXHRcdHBpbmdwb25nLnRvTWFzdGVyKCk7XG5cdFx0Ly8gcGluZ3BvbmcuY29ubmVjdCh2b2x1bWUpO1xuXHRcdC8vIHZvbHVtZS50b01hc3RlcigpO1xuXG5cdFx0cmV0dXJuIFtjaG9ydXMsIHBoYXNlciwgZGlzdG9ydCwgcGluZ3BvbmddO1xuXHR9O1xuXG5cdHZhciBjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wID0gZnVuY3Rpb24ocGxheWVyLCBtZWFzdXJlKSB7XG5cdFx0cmV0dXJuIFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xuXHRcdFx0XHRwbGF5ZXIuc3RhcnQoKTtcblx0XHRcdH0sIG1lYXN1cmUrXCJtXCIpO1xuXHR9O1xuXG5cdHZhciByZXBsYWNlVGltZWxpbmVMb29wID0gZnVuY3Rpb24ocGxheWVyLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKSB7XG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb2xkIHRpbWVsaW5lIGlkJywgb2xkVGltZWxpbmVJZCk7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KG9sZFRpbWVsaW5lSWQpKTtcblx0XHRcdC8vIFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmVzKCk7XG5cdFx0XHRyZXNvbHZlKGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AocGxheWVyLCBuZXdNZWFzdXJlKSk7XG5cdFx0fSk7XG5cdH07XG5cdHZhciBkZWxldGVUaW1lbGluZUxvb3AgPSBmdW5jdGlvbih0aW1lbGluZUlkKSB7XG5cdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShwYXJzZUludCh0aW1lbGluZUlkKSk7XG5cdH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBjcmVhdGVQbGF5ZXI6IGNyZWF0ZVBsYXllcixcbiAgICAgICAgbG9vcEluaXRpYWxpemU6IGxvb3BJbml0aWFsaXplLFxuICAgICAgICBlZmZlY3RzSW5pdGlhbGl6ZTogZWZmZWN0c0luaXRpYWxpemUsXG4gICAgICAgIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3A6IGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AsXG4gICAgICAgIHJlcGxhY2VUaW1lbGluZUxvb3A6IHJlcGxhY2VUaW1lbGluZUxvb3AsXG4gICAgICAgIGRlbGV0ZVRpbWVsaW5lTG9vcDogZGVsZXRlVGltZWxpbmVMb29wXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgndXNlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XG5cdHJldHVybiB7XG5cdFx0Z2V0VXNlck9iajogZnVuY3Rpb24odXNlcklEKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ2FwaS91c2VycycsIHtwYXJhbXM6IHtfaWQ6IHVzZXJJRH19KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc29vbnNlIGlzJywgcmVzcG9uc2UuZGF0YSlcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Zm9sbG93OiBmdW5jdGlvbih1c2VyLCBsb2dnZWRJblVzZXIpe1xuXHRcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzJyx7dXNlclRvRm9sbG93OiB1c2VyLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9sbG93VXNlciBGYWN0b3J5IHJlc3BvbnNlJywgcmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdHVuRm9sbG93OiBmdW5jdGlvbihmb2xsb3dlZSwgbG9nZ2VkSW5Vc2VyKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMnLCB7dXNlclRvVW5mb2xsb3c6IGZvbGxvd2VlLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZygndW5Gb2xsb3cgcmVzcG9uc2UnLCByZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnZHJhZ2dhYmxlJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XG4gICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICBcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xuICAgIFxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xuICAgICAgICBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKCdUZXh0JywgdGhpcy5pZCk7XG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnZHJhZycpO1xuXG4gICAgICAgIHZhciBpZHggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBhcnNlSW50KGF0dHJzLnBvc2l0aW9uKSk7XG4gICAgICAgIHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG4gICAgXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VuZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG5cbiAgfVxufSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Ryb3BwYWJsZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBkcm9wOiAnJicgLy8gcGFyZW50XG4gICAgfSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgLy8gYWdhaW4gd2UgbmVlZCB0aGUgbmF0aXZlIG9iamVjdFxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcbiAgICAgICAgICAvLyBhbGxvd3MgdXMgdG8gZHJvcFxuICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBmYWxzZVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdsZWF2ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgICAgXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cbiAgICAgICAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdXBvbiBkcm9wLCBjaGFuZ2luZyBwb3NpdGlvbiBhbmQgdXBkYXRpbmcgdHJhY2subG9jYXRpb24gYXJyYXkgb24gc2NvcGUgXG4gICAgICAgICAgdmFyIGl0ZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlLmRhdGFUcmFuc2Zlci5nZXREYXRhKCdUZXh0JykpO1xuICAgICAgICAgIHZhciB4cG9zaXRpb24gPSBwYXJzZUludCh0aGlzLmF0dHJpYnV0ZXMueHBvc2l0aW9uLnZhbHVlKTtcbiAgICAgICAgICB2YXIgY2hpbGROb2RlcyA9IHRoaXMuY2hpbGROb2RlcztcbiAgICAgICAgICB2YXIgb2xkVGltZWxpbmVJZDtcbiAgICAgICAgICB2YXIgdGhlQ2FudmFzO1xuXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgIGlmIChjaGlsZE5vZGVzW2ldLmNsYXNzTmFtZSA9PT0gJ2NhbnZhcy1ib3gnKSB7XG5cbiAgICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1tpXS5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC50cmFjay5sb2NhdGlvbi5wdXNoKHhwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQudHJhY2subG9jYXRpb24uc29ydCgpO1xuXG4gICAgICAgICAgICAgICAgICB2YXIgY2FudmFzTm9kZSA9IHRoaXMuY2hpbGROb2Rlc1tpXS5jaGlsZE5vZGVzO1xuXG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc05vZGUubGVuZ3RoOyBqKyspIHtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW52YXNOb2RlW2pdLm5vZGVOYW1lID09PSAnQ0FOVkFTJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMucG9zaXRpb24udmFsdWUgPSB4cG9zaXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9sZFRpbWVsaW5lSWQgPSBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlQ2FudmFzID0gY2FudmFzTm9kZVtqXTtcblxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGNvbnNvbGUubG9nKCdvbGRUaW1lbGluZUlkJywgb2xkVGltZWxpbmVJZCk7XG4gICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50Lm1vdmVJblRpbWVsaW5lKG9sZFRpbWVsaW5lSWQsIHhwb3NpdGlvbikudGhlbihmdW5jdGlvbiAobmV3VGltZWxpbmVJZCkge1xuICAgICAgICAgICAgICB0aGVDYW52YXMuYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlID0gbmV3VGltZWxpbmVJZDtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIGNhbGwgdGhlIGRyb3AgcGFzc2VkIGRyb3AgZnVuY3Rpb25cbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgfVxuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2ZvbGxvd2RpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJ1xuXHR9O1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRzdGF0ZSwgQXV0aFNlcnZpY2UsIHVzZXJGYWN0b3J5KXtcblxuXG5cblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XG4gICAgICAgICBcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XG4gICAgICAgICAgXHR1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcblx0ICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuXHQgICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBpcycsIHVzZXIpO1xuXG5cdCAgICAgICAgICAgIGlmKCRzdGF0ZS5jdXJyZW50Lm5hbWUgPT09IFwidXNlclByb2ZpbGUuZm9sbG93ZXJzXCIpe1xuXHQgICAgICAgICAgICBcdCRzY29wZS5mb2xsb3dzID0gdXNlci5mb2xsb3dlcnM7XG5cdCAgICAgICAgICAgIH0gZWxzZXtcblx0ICAgICAgICAgICAgXHQkc2NvcGUuZm9sbG93cyA9IHVzZXIuZm9sbG93aW5nO1xuXHQgICAgICAgICAgICBcdGlmKCRzdGF0ZVBhcmFtcy50aGVJRCA9PT0gbG9nZ2VkSW5Vc2VyLl9pZCkgJHNjb3BlLnNob3dCdXR0b24gPSB0cnVlO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZm9sbG93T2JqIGlzXCIsICRzY29wZS5mb2xsb3dzLCAkc3RhdGVQYXJhbXMpO1xuXG5cdCAgICBcdH0pO1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLmdvVG9Gb2xsb3cgPSBmdW5jdGlvbihmb2xsb3cpe1xuXHQgICAgICBjb25zb2xlLmxvZyhcImNsaWNrZWRcIiwgZm9sbG93KTtcblx0ICAgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHsgdGhlSUQ6IGZvbGxvdy5faWR9KTtcblx0ICAgIH1cblxuXHQgICAgJHNjb3BlLnVuRm9sbG93ID0gZnVuY3Rpb24oZm9sbG93ZWUpIHtcblx0ICAgIFx0Y29uc29sZS5sb2coXCJjbGlja2VkXCIsIGZvbGxvd2VlKTtcblx0ICAgIFx0dXNlckZhY3RvcnkudW5Gb2xsb3coZm9sbG93ZWUsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHQgICAgXHRcdGNvbnNvbGUubG9nKFwic3VjY2VzZnVsIHVuZm9sbG93XCIpO1xuXHQgICAgXHR9KTtcblx0ICAgIH1cblxuXG5cdFxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2xvYWRpbmdHaWYnLCBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2xvYWRpbmctZ2lmL2xvYWRpbmcuaHRtbCdcblx0fTtcbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHZhciBzZXROYXZiYXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpe1xuICAgICAgICAgICAgICAgICAgICBpZih1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VySWQgPSB1c2VyLl9pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdQcm9maWxlJywgc3RhdGU6ICd1c2VyUHJvZmlsZSh7dGhlSUQ6IHVzZXJJZH0pJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXROYXZiYXIoKTtcblxuICAgICAgICAgICAgLy8gc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ3Byb2plY3QnIH0sXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ1NpZ24gVXAnLCBzdGF0ZTogJ3NpZ251cCcgfSxcbiAgICAgICAgICAgIC8vICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICd1c2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgLy8gXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXROYXZiYXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCBzZXROYXZiYXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3Byb2plY3RkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvamVjdC9wcm9qZWN0RGlyZWN0aXZlLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcidcblx0fTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcigncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBQcm9qZWN0RmN0LCBBdXRoU2VydmljZSwgJG1kVG9hc3Qpe1xuXG5cblxuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcblx0XHRcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XG5cdFx0XHQkc2NvcGUuZGlzcGxheUFQcm9qZWN0ID0gZnVuY3Rpb24oc29tZXRoaW5nKXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RISU5HJywgc29tZXRoaW5nKTtcblx0XHRcdFx0aWYoJHNjb3BlLmxvZ2dlZEluVXNlci5faWQgPT09ICRzdGF0ZVBhcmFtcy50aGVJRCl7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogc29tZXRoaW5nLl9pZH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiZGlzcGxheWluZyBhIHByb2plY3RcIiwgJHNjb3BlLnBhcmVudCk7XG5cdFx0XHR9XG5cblx0XHRcdCRzY29wZS5tYWtlRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuXHRcdFx0XHRpZighcHJvamVjdC5mb3JrT3JpZ2luKSBwcm9qZWN0LmZvcmtPcmlnaW4gPSBwcm9qZWN0Ll9pZDtcblx0XHRcdFx0JG1kVG9hc3Quc2hvdyh7XG5cdFx0XHRcdGhpZGVEZWxheTogMjAwMCxcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxuXHRcdFx0XHR0ZW1wbGF0ZTpcIjxtZC10b2FzdD4gSXQncyBiZWVuIGZvcmtlZCA8L21kLXRvYXN0PlwiXG5cdFx0XHR9KTtcblxuXHRcdFx0XHRwcm9qZWN0LmZvcmtJRCA9IHByb2plY3QuX2lkO1xuXHRcdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcblx0XHRcdFx0ZGVsZXRlIHByb2plY3QuX2lkO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhwcm9qZWN0KTtcblx0XHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yayByZXNwb25zZSBpcycsIHJlc3BvbnNlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdCRzY29wZS5kZWxldGVQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdEZWxldGVQcm9qZWN0JywgcHJvamVjdClcblx0XHRcdFx0UHJvamVjdEZjdC5kZWxldGVQcm9qZWN0KHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdEZWxldGUgcmVxdWVzdCBpcycsIHJlc3BvbnNlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdCRzY29wZS5wb3N0VG9Tb3VuZGNsb3VkID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdVcGxvYWRpbmcgUHJvamVjdCcsIHByb2plY3QpO1xuXHRcdFx0XHRQcm9qZWN0RmN0LnVwbG9hZFByb2plY3QocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1VwbG9hZCBSZXF1ZXN0IGlzJywgcmVzcG9uc2UpO1xuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cdFx0fSk7XG5cdFxufSk7IiwiYXBwLmRpcmVjdGl2ZSgneGltVHJhY2snLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHN0YXRlUGFyYW1zLCAkY29tcGlsZSwgUmVjb3JkZXJGY3QsIFByb2plY3RGY3QsIFRvbmVUcmFja0ZjdCwgVG9uZVRpbWVsaW5lRmN0LCBBbmFseXNlckZjdCwgJHEpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdHJhY2svdHJhY2suaHRtbCcsXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cdFx0XHRzY29wZS5lZmZlY3RXZXRuZXNzZXMgPSBbMCwwLDAsMF07XG5cblx0XHRcdC8vIHNjb3BlLmVmZmVjdFdldG5lc3NlcyA9IFt7XG5cdFx0XHQvLyBcdFx0bmFtZTogJ0Nob3J1cycsXG5cdFx0XHQvLyBcdFx0YW1vdW50OiAwXG5cdFx0XHQvLyBcdH0se1xuXHRcdFx0Ly8gXHRcdG5hbWU6ICdQaGFzZXInLFxuXHRcdFx0Ly8gXHRcdGFtb3VudDogMFxuXHRcdFx0Ly8gXHR9LHtcblx0XHRcdC8vIFx0XHRuYW1lOiAnRGlzdG9ydGlvbicsXG5cdFx0XHQvLyBcdFx0YW1vdW50OiAwXG5cdFx0XHQvLyBcdH0se1xuXHRcdFx0Ly8gXHRcdG5hbWU6ICdQaW5nUG9uZ0RlbGF5Jyxcblx0XHRcdC8vIFx0XHRhbW91bnQ6IDBcblx0XHRcdC8vIFx0fV07XG5cdFx0XHRcdHNjb3BlLnZvbHVtZSA9IG5ldyBUb25lLlZvbHVtZSgpO1xuXHRcdFx0XHRzY29wZS52b2x1bWUudm9sdW1lLnZhbHVlID0gMDtcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2YXIgY2FudmFzUm93ID0gZWxlbWVudFswXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYW52YXMtYm94Jyk7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY2FudmFzUm93Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XG5cdFxuXHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzQ2xhc3Nlcy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcblxuXHRcdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W2ldKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIGlkPSd3YXZlZGlzcGxheScgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIgKyB0cmFja0luZGV4LnRvU3RyaW5nKCkgKyBcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSwgMClcblxuXHRcdFx0c2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgsIHBvc2l0aW9uKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdEUk9QUElORycpO1xuXHRcdFx0XHQvLyBzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xuXHRcdFx0XHRzY29wZS50cmFjay5vblRpbWVsaW5lID0gdHJ1ZTtcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xuXHRcdFx0XHQvLyB2YXIgcG9zaXRpb24gPSAwO1xuXHRcdFx0XHR2YXIgY2FudmFzUm93ID0gZWxlbWVudFswXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYW52YXMtYm94Jyk7XG5cblx0XHRcdFx0aWYgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vIGRyb3AgdGhlIGxvb3Agb24gdGhlIGZpcnN0IGF2YWlsYWJsZSBpbmRleFx0XHRcdFx0XG5cdFx0XHRcdFx0d2hpbGUgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmluZGV4T2YocG9zaXRpb24pID4gLTEpIHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uKys7XG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vYXBwZW5kIGNhbnZhcyBlbGVtZW50XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnB1c2gocG9zaXRpb24pO1xuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zb3J0KCk7XG5cdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBwb3NpdGlvbik7XG5cdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIGluZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIitpbmRleCtcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcblx0XHRcdH1cblxuXHRcdFx0c2NvcGUubW92ZUluVGltZWxpbmUgPSBmdW5jdGlvbiAob2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xuXHRcdFx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRUxFTUVOVCcsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpO1xuXHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5yZXBsYWNlVGltZWxpbmVMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkudGhlbihyZXNvbHZlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXG5cblx0XHRcdHNjb3BlLmFwcGVhck9yRGlzYXBwZWFyID0gZnVuY3Rpb24ocG9zaXRpb24pIHtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciB0cmFja0luZGV4ID0gc2NvcGUuJHBhcmVudC50cmFja3MuaW5kZXhPZihzY29wZS50cmFjayk7XG5cdFx0XHRcdHZhciBsb29wSW5kZXggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBvc2l0aW9uKTtcblxuXHRcdFx0XHRpZihzY29wZS50cmFjay5vblRpbWVsaW5lKSB7XG5cdFx0XHRcdFx0aWYobG9vcEluZGV4ID09PSAtMSkge1xuXHRcdFx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24ucHVzaChwb3NpdGlvbik7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zb3J0KCk7XG5cdFx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgcG9zaXRpb24pO1xuXHRcdFx0XHRcdFx0Ly8gYW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1twb3NpdGlvbl0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgcG9zaXRpb24gKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgdHJhY2tJbmRleCArIFwiLVwiICsgcG9zaXRpb24gKyBcIicgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIrdHJhY2tJbmRleCtcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcblx0XHRcdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK3RyYWNrSW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIm1kaXNwbGF5XCIgKyAgdHJhY2tJbmRleCArIFwiLVwiICsgcG9zaXRpb24gKTtcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIGZyb20gbG9jYXRpb25zIGFycmF5XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zcGxpY2UobG9vcEluZGV4LCAxKTtcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIHRpbWVsaW5lSWRcblx0XHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5kZWxldGVUaW1lbGluZUxvb3AoIGNhbnZhcy5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWUgKTtcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIGNhbnZhcyBpdGVtXG5cdFx0XHRcdFx0XHRmdW5jdGlvbiByZW1vdmVFbGVtZW50KGVsZW1lbnQpIHtcblx0XHRcdFx0XHRcdCAgICBlbGVtZW50ICYmIGVsZW1lbnQucGFyZW50Tm9kZSAmJiBlbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbWVudCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZW1vdmVFbGVtZW50KCBjYW52YXMgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ05PIERST1AnKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUucmVSZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1JFUkVDT1JEJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKHNjb3BlLnRyYWNrKTtcblx0XHRcdFx0Ly9jaGFuZ2UgYWxsIHBhcmFtcyBiYWNrIGFzIGlmIGVtcHR5IHRyYWNrXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcblx0XHRcdFx0c2NvcGUudHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBudWxsO1xuXHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJhd0F1ZGlvID0gbnVsbDtcblx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gbnVsbDtcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xuXHRcdFx0XHQvL2Rpc3Bvc2Ugb2YgZWZmZWN0c1JhY2tcblx0XHRcdFx0c2NvcGUudHJhY2suZWZmZWN0c1JhY2suZm9yRWFjaChmdW5jdGlvbiAoZWZmZWN0KSB7XG5cdFx0XHRcdFx0ZWZmZWN0LmRpc3Bvc2UoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLDAsMCwwXSk7XG5cdFx0XHRcdC8vIHNjb3BlLnRyYWNrLnBsYXllci5jb25uZWN0KGVmZmVjdHNSYWNrWzBdKTtcblx0XHRcdFx0Ly8gc2NvcGUudm9sdW1lID0gbmV3IFRvbmUuVm9sdW1lKCk7XG5cdFx0XHRcdC8vIHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrWzNdLmNvbm5lY3Qoc2NvcGUudm9sdW1lKTtcblx0XHRcdFx0Ly8gc2NvcGUudm9sdW1lLnRvTWFzdGVyKCk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUkFDS1wiLCBzY29wZS50cmFjay5lZmZlY3RzUmFjayk7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uID0gW107XG5cdFx0XHRcdC8vcmVtb3ZlIGFsbCBsb29wcyBmcm9tIFVJXG5cdFx0XHRcdHZhciBsb29wc1VJID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgndHJhY2tMb29wJytpbmRleC50b1N0cmluZygpKTtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJMT09QU1wiLCBsb29wc1VJKTtcblx0XHRcdFx0d2hpbGUobG9vcHNVSS5sZW5ndGggIT09IDApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnTE9PUFMgQVJSJywgbG9vcHNVSSk7XG5cdFx0XHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGxvb3BzVUkubGVuZ3RoO2krKykge1xuXHRcdFx0XHRcdFx0bG9vcHNVSVtpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGxvb3BzVUlbaV0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR2YXIgbG9vcHNVSSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3RyYWNrTG9vcCcraW5kZXgudG9TdHJpbmcoKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc3RvcCgpO1xuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUuc29sbyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dmFyIG90aGVyVHJhY2tzID0gc2NvcGUuJHBhcmVudC50cmFja3MubWFwKGZ1bmN0aW9uICh0cmFjaykge1xuXHRcdFx0XHRcdGlmKHRyYWNrICE9PSBzY29wZS50cmFjaykge1xuXHRcdFx0XHRcdFx0dHJhY2suc2lsZW5jZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJhY2s7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KS5maWx0ZXIoZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRcdFx0aWYodHJhY2sgJiYgdHJhY2sucGxheWVyKSByZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSlcblxuXHRcdFx0XHRjb25zb2xlLmxvZyhvdGhlclRyYWNrcyk7XG5cdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKG90aGVyVHJhY2tzKTtcblx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcblx0XHRcdH1cblxuXHRcdFx0c2NvcGUuc2lsZW5jZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYoIXNjb3BlLnRyYWNrLnNpbGVuY2UpIHtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gLTEwMDtcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2NvcGUucmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XG5cdFx0XHRcdHZhciByZWNvcmRlciA9IHNjb3BlLnJlY29yZGVyO1xuXG5cdFx0XHRcdHZhciBjb250aW51ZVVwZGF0ZSA9IHRydWU7XG5cblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxuXHRcdCAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYW5hbHlzZXJcIitpbmRleCk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xuXHRcdFx0XHR2YXIgYW5hbHlzZXJJZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcblx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RhcnQocmVjb3JkZXIpO1xuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XG5cdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gdHJ1ZTtcblxuXG5cdFx0XHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRcdFx0XHR2YXIgU1BBQ0lORyA9IDM7XG5cdFx0XHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XG5cdFx0XHRcdFx0dmFyIG51bUJhcnMgPSBNYXRoLnJvdW5kKDMwMCAvIFNQQUNJTkcpO1xuXHRcdFx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xuXG5cdFx0XHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxuXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1Jztcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XG5cdFx0XHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xuXG5cdFx0XHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZSA9IDA7XG5cdFx0XHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcblx0XHRcdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGo8IG11bHRpcGxpZXI7IGorKylcblx0XHRcdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xuXHRcdFx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUyID0gZnJlcUJ5dGVEYXRhW2kgKiBtdWx0aXBsaWVyXTtcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBlbmRSZWNvcmRpbmcoKSB7XG5cdFx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RvcChpbmRleCwgcmVjb3JkZXIpLnRoZW4oZnVuY3Rpb24gKHBsYXllcikge1xuXHRcdFx0XHRcdFx0Ly90cmFjayB2YXJpYWJsZXNcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJhd0F1ZGlvID0gd2luZG93LmxhdGVzdFJlY29yZGluZztcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcblxuXHRcdFx0XHRcdFx0Ly9jcmVhdGUgcGxheWVyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBwbGF5ZXI7XG5cdFx0XHRcdFx0XHRwbGF5ZXIuY29ubmVjdChzY29wZS50cmFjay5lZmZlY3RzUmFja1swXSk7XG5cblx0XHRcdFx0XHRcdC8vc3RvcCBhbmFseXNlclxuXHRcdFx0XHRcdFx0Y29udGludWVVcGRhdGUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggYW5hbHlzZXJJZCApO1xuXG5cdFx0XHRcdFx0XHQvL3NldCBQcm9qZWN0IHZhcnNcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0b3AoKTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LnN0b3AoKTtcblx0XHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC51bk11dGVBbGwoc2NvcGUuJHBhcmVudC50cmFja3MpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xuXHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcblx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdGFydCgpO1xuXG5cdFx0XHRcdFx0dmFyIGNsaWNrID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0b3AoKTtcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0YXJ0KCk7XG5cdFx0XHRcdFx0fSwgNTAwKTtcblxuXHRcdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR3aW5kb3cuY2xlYXJJbnRlcnZhbChjbGljayk7XG5cdFx0XHRcdFx0XHRcdGVuZFJlY29yZGluZygpO1xuXG5cdFx0XHRcdFx0fSwgNDAwMCk7XG5cblx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XG5cdFx0XHRcdFx0fSwgMjA1MCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1dISUxFIFBMQVlJTkcnKTtcblx0XHRcdFx0XHR2YXIgbmV4dEJhciA9IHBhcnNlSW50KFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF0pICsgMTtcblx0XHRcdFx0XHR2YXIgZW5kQmFyID0gbmV4dEJhciArIDE7XG5cblx0XHRcdFx0XHR2YXIgcmVjSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XG5cdFx0XHRcdFx0XHR9LCA1MCk7XG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xuXG5cblx0XHRcdFx0XHR2YXIgcmVjRW5kSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHJlY0lkKTtcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocmVjRW5kSWQpO1xuXHRcdFx0XHRcdFx0ZW5kUmVjb3JkaW5nKCk7XG5cblx0XHRcdFx0XHR9LCBlbmRCYXIudG9TdHJpbmcoKSArIFwibVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c2NvcGUudm9sdW1lQ2hhbmdlID0gZnVuY3Rpb24gKGFtb3VudCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnVk9MIEFNT1VOVCcsIGFtb3VudCk7XG5cblx0ICAgICAgICAgICAgaWYgKHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnKSByZXR1cm47XG5cdCAgICAgICAgICAgIHZhciB2b2x1bWUgPSBwYXJzZUZsb2F0KGFtb3VudCAvIDEwMCwgMTApO1xuXHQgICAgICAgICAgICBjb25zb2xlLmxvZygnQUZURVIgLyAxMDAsIDEwJywgdm9sdW1lKTtcblxuXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLnBsYXllcikgc2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSAgPSBhbW91bnQgLSAyMDtcblx0XHRcdH1cblx0ICAgICAgICAvLyBzY29wZS4kd2F0Y2goJ3RyYWNrLnZvbHVtZScsIHNjb3BlLnZvbHVtZUNoYW5nZSk7XG5cblx0XHRcdHNjb3BlLnByZXZpZXcgPSBmdW5jdGlvbihjdXJyZW50bHlQcmV2aWV3aW5nKSB7XG5cdFx0XHRcdHZhciBuZXh0QmFyO1xuXHRcdFx0XHRpZighc2NvcGUuJHBhcmVudC5wcmV2aWV3aW5nSWQpIHtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gdHJ1ZTtcblxuXHRcdFx0XHRcdGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xuXHRcdFx0XHRcdFx0bmV4dEJhciA9IHBhcnNlSW50KFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF0pO1xuXHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bmV4dEJhciA9IHBhcnNlSW50KFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF0pICsgMTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ05FWFQnLCBuZXh0QmFyKTtcblx0XHRcdFx0XHR2YXIgcGxheUxhdW5jaCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHRcdFx0XHR2YXIgcHJldmlld0ludGV2YWwgPSBUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdTSE9VTEQgUExBWScpO1xuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcblx0XHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShwbGF5TGF1bmNoKTtcblx0XHRcdFx0XHRcdH0sIFwiMW1cIik7XG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LnByZXZpZXdpbmdJZCA9IHByZXZpZXdJbnRldmFsO1xuXHRcdFx0XHRcdH0sIG5leHRCYXIudG9TdHJpbmcoKSArIFwibVwiKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnQUxSRUFEWSBQUkVWSUVXSU5HJyk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdHNjb3BlLmNoYW5nZVdldG5lc3MgPSBmdW5jdGlvbihlZmZlY3QsIGFtb3VudCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlZmZlY3QpO1xuXHRcdFx0XHRjb25zb2xlLmxvZyhhbW91bnQpO1xuXG5cdFx0XHRcdGVmZmVjdC53ZXQudmFsdWUgPSBhbW91bnQgLyAxMDAwO1xuXHRcdFx0fTtcblxuXHRcdH1cblx0XHRcblxuXHR9XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=