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

		var w = 900;
		var h = 500;
		var svg = d3.select('#ui').append('svg').attr('width', w).attr('height', h);

		// create force layout in memory
		var force = d3.layout.force().nodes(nodes).links(links).size([900, 500]).linkDistance([w / nodeArr.length]);

		var fisheye = d3.fisheye.circular().radius(200).distortion(2);

		// append a group for each data element
		var node = svg.selectAll('circle').data(nodes).enter().append('g').call(force.drag).attr('class', 'nodeObj');

		// append circle onto each 'g' node
		node.append('circle').attr('fill', 'green').attr('r', 10);

		force.on('tick', function (e) {
			node.attr('transform', function (d, i) {
				return 'translate(' + d.x + ', ' + d.y + ')';
			});

			link.attr('x1', function (d) {
				return d.source.x;
			}).attr('y1', function (d) {
				return d.source.y;
			}).attr('x2', function (d) {
				return d.target.x;
			}).attr('y2', function (d) {
				return d.target.y;
			});
		});

		var link = svg.selectAll('line').data(links).enter().append('line').attr('stroke', 'grey');

		force.start();

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
		};
		userFactory.unFollow(followee, $scope.loggedInUser).then(function (response) {
			console.log('succesful', response);
			$scope.$digest();
		});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZvcmt3ZWIvZm9ya3dlYi5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwicHJvamVjdC9wcm9qZWN0LmpzIiwibG9naW4vbG9naW4uanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvQW5hbHlzZXJGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL0ZvcmtGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Ib21lRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Qcm9qZWN0RmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9SZWNvcmRlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvU29ja2V0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Ub25lVGltZWxpbmVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUcmFja0ZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlckZhY3RvcnkuanMiLCJjb21tb24vY29udHJvbGxlcnMvSG9tZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTGFuZGluZ1BhZ2VDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL05ld1Byb2plY3RDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1RpbWVsaW5lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Vc2VyQ29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2ZvbGxvdy9mb2xsb3dEaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9kcmFnZ2FibGUvZHJhZ2dhYmxlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9sb2FkaW5nLWdpZi9sb2FkaW5nLWdpZi5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxLQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtFQUNBLENBQUE7Ozs7QUFJQSxXQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxNQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsVUFBQTtHQUNBOztBQUVBLE1BQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxFQUFBOzs7QUFHQSxVQUFBO0dBQ0E7OztBQUdBLE9BQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTs7QUFFQSxhQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsT0FBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7SUFDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbERBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxVQUFBO0FBQ0EsYUFBQSxFQUFBLHlCQUFBO0FBQ0EsWUFBQSxFQUFBLG1CQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsT0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxPQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxNQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxNQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxLQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsT0FBQTtBQUNBLGFBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQTtBQUNBLGFBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBO0FBQ0EsVUFBQSxJQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLEtBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxNQUFBLEtBQUEsR0FBQSxPQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsTUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FDQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOzs7QUFJQSxNQUFBLEtBQUEsR0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUNBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FDQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBLENBQ0EsWUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxHQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLENBQ0EsTUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUNBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7O0FBSUEsTUFBQSxJQUFBLEdBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsS0FBQSxFQUFBLENBQ0EsTUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTs7O0FBR0EsTUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxXQUFBLFlBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBSUEsTUFBQSxJQUFBLEdBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsS0FBQSxFQUFBLENBQ0EsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxFQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLEVBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLEdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsV0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLElBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBO0lBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxXQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtJQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsSUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsV0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7SUFBQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNoSEEsQ0FBQSxZQUFBOztBQUVBLGFBQUEsQ0FBQTs7O0FBR0EsS0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSx3QkFBQSxDQUFBLENBQUE7O0FBRUEsS0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxNQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHNCQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsTUFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOzs7OztBQUtBLElBQUEsQ0FBQSxRQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsY0FBQSxFQUFBLG9CQUFBO0FBQ0EsYUFBQSxFQUFBLG1CQUFBO0FBQ0EsZUFBQSxFQUFBLHFCQUFBO0FBQ0EsZ0JBQUEsRUFBQSxzQkFBQTtBQUNBLGtCQUFBLEVBQUEsd0JBQUE7QUFDQSxlQUFBLEVBQUEscUJBQUE7RUFDQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxNQUFBLFVBQUEsR0FBQTtBQUNBLE1BQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxNQUFBLEVBQUEsV0FBQSxDQUFBLGFBQUE7QUFDQSxNQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxNQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7R0FDQSxDQUFBO0FBQ0EsU0FBQTtBQUNBLGdCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFVBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7R0FDQSxDQUNBLENBQUEsQ0FBQTtFQUNBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7Ozs7QUFJQSxNQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7Ozs7OztBQU1BLE9BQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtJQUNBOzs7OztBQUtBLFVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBRUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLFVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxXQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsT0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBOztBQUVBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNkJBQUEsRUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxNQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsZ0JBQUEsRUFBQSxZQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLE1BQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxPQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQTtFQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBO0FDeElBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxPQUFBO0FBQ0EsYUFBQSxFQUFBLG1CQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxzQkFBQTtBQUNBLFlBQUEsRUFBQSx1QkFBQTtBQUNBLFNBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEseUJBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7RUFDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDcEJBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxxQkFBQTtBQUNBLGFBQUEsRUFBQSx5QkFBQTtFQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBOzs7QUFHQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLGNBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxtRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsRUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsU0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxVQUFBLEVBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7O0FBSUEsS0FBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxPQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFdBQUEsR0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBOztBQUVBLE1BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSx1QkFBQSxFQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLFNBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBOztBQUVBLFlBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsTUFBQSxLQUFBLGNBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO09BQ0E7TUFDQSxDQUFBOztBQUVBLFNBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtNQUNBLE1BQUE7QUFDQSxXQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtNQUNBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7SUFDQTtBQUNBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0dBQ0E7Ozs7QUFJQSxRQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsVUFBQSxHQUFBLEVBQUEsRUFBQSxVQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0E7OztBQUtBLGlCQUFBLENBQUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtFQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsTUFBQSxVQUFBLEdBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxjQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxNQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxHQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxNQUFBLEtBQUEsR0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxPQUFBLENBQUEsUUFBQSxHQUFBLFlBQUEsRUFFQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLE1BQUEsTUFBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxHQUFBLHNCQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxjQUFBLENBQUEsa0JBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0E7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLE1BQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxLQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxTQUFBLENBQUEsRUFBQSxHQUFBLEtBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxTQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0dBRUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxhQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxHQUFBLENBQUEseUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsU0FBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDbFFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsUUFBQTtBQUNBLGFBQUEsRUFBQSxxQkFBQTtBQUNBLFlBQUEsRUFBQSxXQUFBO0VBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsT0FBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxTQUFBO0FBQ0EsYUFBQSxFQUFBLHVCQUFBO0FBQ0EsWUFBQSxFQUFBLFlBQUE7RUFDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzNCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLHFCQUFBO0FBQ0EsYUFBQSxFQUFBLDBCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBOzs7QUFHQSxNQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsSUFBQTtHQUNBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx3QkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUEsbUJBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHFCQUFBLEVBQUE7QUFDQSxLQUFBLEVBQUEsV0FBQTtBQUNBLGFBQUEsRUFBQSx1QkFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQTtFQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLEtBQUEsRUFBQSxZQUFBO0FBQ0EsYUFBQSxFQUFBLHdCQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBO0VBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx1QkFBQSxFQUFBO0FBQ0EsS0FBQSxFQUFBLFlBQUE7QUFDQSxhQUFBLEVBQUEsd0JBQUE7QUFDQSxZQUFBLEVBQUEsZ0JBQUE7RUFDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDakNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFlBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsZUFBQSxFQUFBLFlBQUEsRUFBQSxjQUFBLEVBQUE7O0FBRUEsV0FBQSxNQUFBLEdBQUE7QUFDQSxPQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxPQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLG9CQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxPQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsR0FBQSxPQUFBLENBQUE7OztBQUdBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxHQUFBLFNBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxTQUFBLEdBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtJQUNBO0FBQ0EsT0FBQSxjQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7QUFDQSxRQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBR0EsS0FBQSxxQkFBQSxHQUFBLFNBQUEscUJBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7QUFDQSxRQUFBO0FBQ0EsaUJBQUEsRUFBQSxlQUFBO0FBQ0EsdUJBQUEsRUFBQSxxQkFBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUM1Q0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsS0FBQSxNQUFBLEdBQUEsU0FBQSxNQUFBLEdBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxRQUFBO0FBQ0EsUUFBQSxFQUFBLE1BQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDYkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQTtBQUNBLFNBQUEsRUFBQSxpQkFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxFQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQTtFQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNiQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxLQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxTQUFBLEVBQUE7OztBQUdBLE1BQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxLQUFBLENBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLElBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsZ0JBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsS0FBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxVQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBO0FBQ0EsS0FBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLFNBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxnQkFBQSxHQUFBLFNBQUEsRUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxLQUFBLFVBQUEsQ0FBQSxnQkFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLGFBQUEsR0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEseUJBQUEsRUFBQSxFQUFBLE9BQUEsRUFBQSxPQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBR0EsUUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLGFBQUEsRUFBQSxXQUFBO0FBQ0EsWUFBQSxFQUFBLFVBQUE7QUFDQSxlQUFBLEVBQUEsYUFBQTtBQUNBLFlBQUEsRUFBQSxVQUFBO0FBQ0EsZUFBQSxFQUFBLGFBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ25EQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsS0FBQSxZQUFBLEdBQUEsU0FBQSxZQUFBLEdBQUE7O0FBRUEsU0FBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxPQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsSUFBQSxNQUFBLENBQUEsa0JBQUEsQ0FBQTtBQUNBLE9BQUEsWUFBQSxHQUFBLElBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLFFBQUEsQ0FBQTs7QUFFQSxPQUFBLFNBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFlBQUEsR0FDQSxTQUFBLENBQUEsWUFBQSxJQUNBLFNBQUEsQ0FBQSxrQkFBQSxJQUNBLFNBQUEsQ0FBQSxlQUFBLElBQ0EsU0FBQSxDQUFBLGNBQUEsQUFDQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxvQkFBQSxFQUNBLFNBQUEsQ0FBQSxvQkFBQSxHQUFBLFNBQUEsQ0FBQSwwQkFBQSxJQUFBLFNBQUEsQ0FBQSx1QkFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxxQkFBQSxFQUNBLFNBQUEsQ0FBQSxxQkFBQSxHQUFBLFNBQUEsQ0FBQSwyQkFBQSxJQUFBLFNBQUEsQ0FBQSx3QkFBQSxDQUFBOzs7QUFHQSxZQUFBLENBQUEsWUFBQSxDQUNBO0FBQ0EsV0FBQSxFQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLDRCQUFBLEVBQUEsT0FBQTtBQUNBLDJCQUFBLEVBQUEsT0FBQTtBQUNBLDRCQUFBLEVBQUEsT0FBQTtBQUNBLDBCQUFBLEVBQUEsT0FBQTtNQUNBO0FBQ0EsZUFBQSxFQUFBLEVBQUE7S0FDQTtJQUNBLEVBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7OztBQUdBLFFBQUEsY0FBQSxHQUFBLFlBQUEsQ0FBQSx1QkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7O0FBR0EsUUFBQSxZQUFBLEdBQUEsWUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7O0FBR0EsWUFBQSxHQUFBLElBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxRQUFBLEdBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBLENBQUEsQ0FBQSxDQUFBO0lBRUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFFQSxLQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLFFBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxZQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLG9CQUFBLEdBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7OztBQUlBLFlBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxpQkFBQSxDQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLGtCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUlBLEtBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLE1BQUEsR0FBQSxJQUFBLFVBQUEsRUFBQSxDQUFBOztBQUVBLE9BQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxhQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0lBQ0EsTUFBQTtBQUNBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTs7QUFLQSxRQUFBO0FBQ0EsV0FBQSxFQUFBLG1CQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLE9BQUEsWUFBQSxHQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxFQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFNBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLFFBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBO09BQ0EsQ0FBQSxDQUFBO01BQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxDQUFBLDhCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FFQTtBQUNBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsYUFBQSxFQUFBLFdBQUE7QUFDQSxZQUFBLEVBQUEsVUFBQTtFQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUMvSUEsWUFBQSxDQUFBOztBQ0FBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsT0FBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtLQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsTUFBQSxDQUFBLG1CQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLE1BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLE9BQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxPQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsR0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxxQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxpQkFBQSxHQUFBLFNBQUEsaUJBQUEsQ0FBQSxNQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLE1BQUEsY0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7SUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0dBRUE7O0FBRUEsZ0JBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsT0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtJQUNBLEVBQUEsU0FBQSxDQUFBLENBQUE7Ozs7Ozs7R0FRQSxDQUFBLENBQUE7RUFFQSxDQUFBOztBQUVBLFFBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUE7QUFDQSxXQUFBLEVBQUEsU0FBQTtBQUNBLG1CQUFBLEVBQUEsaUJBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUE7QUFDQSxTQUFBLEVBQUEsT0FBQTtBQUNBLFNBQUEsRUFBQSxPQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2pHQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsS0FBQSxZQUFBLEdBQUEsU0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOzs7QUFHQSxTQUFBLE1BQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLElBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLGVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsUUFBQSxHQUFBLFFBQUEsSUFBQSxRQUFBLEdBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxlQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLGtCQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsT0FBQSxNQUFBLENBQUE7O0FBRUEsU0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7SUFDQSxDQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsR0FBQSxFQUFBOztBQUdBLE1BQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxNQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBO0FBQ0EsTUFBQSxPQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsSUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLE1BQUEsUUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsV0FBQSxDQUFBOztBQUVBLE1BQUEsR0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFFBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7OztBQUlBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsS0FBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0dBQ0EsRUFBQSxPQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLEtBQUEsbUJBQUEsR0FBQSxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxTQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLEtBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsTUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLFFBQUE7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsaUJBQUE7QUFDQSw4QkFBQSxFQUFBLDRCQUFBO0FBQ0EscUJBQUEsRUFBQSxtQkFBQTtBQUNBLG9CQUFBLEVBQUEsa0JBQUE7RUFDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3RGQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUE7QUFDQSxZQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFFBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSw2QkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBOztBQUVBLFVBQUEsRUFBQSxrQkFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLGNBQUEsRUFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBO0VBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ3hCQSxHQUFBLENBQUEsVUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxLQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsb0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxTQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxXQUFBLEdBQUEsUUFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtBQUNBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7QUFHQSxPQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLEVBQUEsSUFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBO0FBQ0EsWUFBQSxFQUFBLDBDQUFBO0lBQ0EsQ0FBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTs7QUFFQSxLQUFBLElBQUEsR0FBQSxLQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLFdBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxNQUFBLElBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0dBQ0E7O0FBRUEsY0FBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxPQUFBLElBQUEsS0FBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtJQUNBLE1BQ0E7QUFDQSxRQUFBLEdBQUEsS0FBQSxDQUFBO0lBQ0E7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUdBLE9BQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBOztBQ2xFQSxHQUFBLENBQUEsVUFBQSxDQUFBLHVCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsU0FBQSxDQUFBLG9CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxNQUFBLENBQUE7O0FBR0EsT0FBQSxDQUFBLFNBQUEsR0FBQSxZQUFBO0FBQ0EsV0FBQSxjQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsT0FBQSxRQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUE7O0FBRUEsT0FBQSxVQUFBLEdBQUEsUUFBQSxDQUFBLGVBQUEsQ0FBQSxZQUFBLEdBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLE9BQUEsT0FBQSxHQUFBLFVBQUEsR0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtHQUNBOztBQUVBLGdCQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUlBLE9BQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBO0VBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxTQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMvQ0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxzQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTtFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNoQkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxvQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBOztBQUVBLEtBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLE1BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtFQUNBOztBQUVBLE9BQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFHQSxXQUFBLENBQUEsY0FBQSxDQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsTUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7O0FBRUEsTUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7QUFDQSxXQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7O01BRUE7S0FDQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLE1BQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtJQUNBO0dBQ0E7O0FBRUEsaUJBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0VBRUEsQ0FBQSxDQUFBOzs7Ozs7OztBQVFBLE9BQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLEdBQUEsR0FBQSxDQUFBLENBQUEsU0FBQSxDQUFBOzs7QUFHQSxTQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLENBQUEsYUFBQSxFQUNBLE9BQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLElBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTs7SUFHQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0dBRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtFQUVBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsTUFBQSxTQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsT0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxJQUFBLENBQUE7SUFDQTtHQUNBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxFQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0dBRUEsQ0FBQSxDQUFBO0VBQ0EsQ0FBQTtDQU1BLENBQUEsQ0FBQTs7QUN0R0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7O0FBRUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxPQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsR0FBQSx3RUFBQSxDQUFBO0lBQ0E7O0FBRUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxLQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtLQUNBO0lBQ0E7R0FHQSxDQUFBLENBQUE7RUFDQSxDQUFBLENBQUE7Ozs7Ozs7QUFTQSxPQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxHQUFBLENBQUEsNEJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtFQUNBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtFQUNBLENBQUE7Q0FHQSxDQUFBLENBQUE7QUMzQ0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsa0RBQUE7QUFDQSxZQUFBLEVBQUEsMkJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsMkJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsWUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsT0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsS0FBQSx1QkFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0lBQ0EsTUFBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFFBQUEsWUFBQSxDQUFBLEtBQUEsS0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO0lBQ0E7O0dBR0EsQ0FBQSxDQUFBO0FBSEEsRUFJQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7RUFDQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLE9BQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsUUFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFFBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7SUFDQTtHQUNBLENBQUE7QUFDQSxhQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7R0FDQSxDQUFBLENBQUE7RUFDQSxDQUFBO0NBSUEsQ0FBQSxDQUFBO0FDakRBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxRQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsTUFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxJQUFBLENBQUEsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxJQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsT0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxLQUFBLENBQUE7R0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLElBQUEsQ0FBQSxnQkFBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLE9BQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxLQUFBLENBQUE7R0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBO0VBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLE9BQUEsRUFBQTtBQUNBLE9BQUEsRUFBQSxHQUFBO0FBQUEsR0FDQTtBQUNBLE1BQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUE7O0FBRUEsT0FBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxnQkFBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLEtBQUEsQ0FBQSxZQUFBLENBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQTtJQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsS0FBQSxDQUFBLGdCQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7OztBQUdBLFFBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsU0FBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUE7QUFDQSxRQUFBLGFBQUEsQ0FBQTtBQUNBLFFBQUEsU0FBQSxDQUFBOztBQUVBLFNBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsU0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBLFlBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTs7QUFFQSxVQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQTs7QUFFQSxXQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTs7QUFFQSxXQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxRQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxxQkFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQTtBQUNBLGlCQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1FBRUE7T0FDQTtNQUNBO0tBQ0E7O0FBRUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxhQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7OztBQUdBLFNBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxLQUFBLENBQUE7SUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBO0dBQ0E7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ2hIQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLHlEQUFBO0VBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ05BLEdBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsK0NBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTEEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsUUFBQTtBQUNBLFVBQUEsRUFBQSxHQUFBO0FBQ0EsT0FBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUEseUNBQUE7QUFDQSxNQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7O0FBRUEsT0FBQSxTQUFBLEdBQUEsU0FBQSxTQUFBLEdBQUE7QUFDQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxTQUFBLEVBQUEsS0FBQSxFQUFBLDhCQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUNBLENBQUE7TUFDQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUE7QUFDQSxZQUFBLEVBQUEsQ0FBQTs7Ozs7Ozs7QUFRQSxRQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxXQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsV0FBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtJQUNBLENBQUE7O0FBRUEsT0FBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUE7QUFDQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLE9BQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLFVBQUEsRUFBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtHQUVBOztFQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUM5REEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxrQkFBQSxFQUFBLFlBQUE7QUFDQSxRQUFBO0FBQ0EsVUFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsb0RBQUE7QUFDQSxZQUFBLEVBQUEsNEJBQUE7RUFDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsNEJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsUUFBQSxFQUFBOztBQUlBLFlBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxRQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLE9BQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxHQUFBLEtBQUEsWUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0lBQ0E7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLHNCQUFBLEVBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsT0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEVBQUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLGFBQUEsRUFBQSxJQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUE7QUFDQSxZQUFBLEVBQUEsMENBQUE7SUFDQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxPQUFBLENBQUEsR0FBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0lBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGdCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7RUFFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUN2REEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUE7QUFDQSxVQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSx1Q0FBQTtBQUNBLE1BQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxDQUFBLGVBQUEsR0FBQSxDQUFBO0FBQ0EsUUFBQSxFQUFBLFFBQUE7QUFDQSxVQUFBLEVBQUEsQ0FBQTtJQUNBLEVBQUE7QUFDQSxRQUFBLEVBQUEsUUFBQTtBQUNBLFVBQUEsRUFBQSxDQUFBO0lBQ0EsRUFBQTtBQUNBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxFQUFBLENBQUE7SUFDQSxFQUFBO0FBQ0EsUUFBQSxFQUFBLGVBQUE7QUFDQSxVQUFBLEVBQUEsQ0FBQTtJQUNBLENBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFlBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsU0FBQSxhQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUE7O0FBRUEsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLGFBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxVQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSwrRUFBQSxHQUFBLFVBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO09BQ0E7TUFDQTtLQUNBO0lBQ0EsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsWUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsQ0FBQTtNQUNBO0tBQ0E7OztBQUdBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxRQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsR0FBQSwyQkFBQSxHQUFBLEtBQUEsR0FBQSxpREFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO0lBRUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsYUFBQSxFQUFBLFVBQUEsRUFBQTtBQUNBLFdBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUdBLFFBQUEsQ0FBQSxpQkFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFNBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLFNBQUEsU0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLGFBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLFFBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLDJCQUFBLEdBQUEsVUFBQSxHQUFBLGlEQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxNQUFBOzs7VUFPQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsY0FBQSxJQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7T0FDQTs7QUFSQSxVQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxrQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBS0EsbUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtNQUNBO0tBQ0EsTUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOzs7Ozs7QUFNQSxXQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxzQkFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsTUFBQSxLQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtNQUNBO0FBQ0EsU0FBQSxPQUFBLEdBQUEsUUFBQSxDQUFBLHNCQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0E7QUFDQSxRQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0lBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLEtBQUEsQ0FBQTtNQUNBO0tBQ0EsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUEsS0FBQSxJQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsT0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7SUFDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBOzs7QUFHQSxRQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsZUFBQSxHQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxRQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsWUFBQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsU0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFNBQUEsQ0FBQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsYUFBQSxNQUFBLEdBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSxVQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFDQSxTQUFBLElBQUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsVUFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7TUFDQTtBQUNBLFNBQUEsY0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7TUFDQTtLQUNBOztBQUVBLGFBQUEsWUFBQSxHQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsZUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsTUFBQSxDQUFBLG9CQUFBLENBQUE7OztBQUdBLFdBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7O0FBR0Esb0JBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7O0FBR0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsT0FBQSxDQUFBLGtCQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7TUFDQSxDQUFBLENBQUE7S0FDQTtBQUNBLFFBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0Esb0JBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7TUFDQSxFQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxhQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxFQUFBLENBQUE7TUFFQSxFQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLGlCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtNQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLENBQUEsQ0FBQTtBQUNBLFNBQUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxTQUFBLE1BQUEsR0FBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLFNBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7T0FDQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO01BQ0EsRUFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBR0EsU0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxFQUFBLENBQUE7TUFFQSxFQUFBLE1BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTtLQUNBO0lBQ0EsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxZQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsTUFBQSxLQUFBLFdBQUEsRUFBQSxPQUFBO0FBQ0EsUUFBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxHQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBR0EsUUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7SUFDQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsT0FBQSxHQUFBLFVBQUEsbUJBQUEsRUFBQTtBQUNBLFFBQUEsT0FBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFNBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsYUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7TUFDQSxNQUFBO0FBQ0EsYUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7TUFDQTtBQUNBLFlBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLFdBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7T0FDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEdBQUEsY0FBQSxDQUFBO01BQ0EsRUFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQSxNQUFBO0FBQ0EsWUFBQSxDQUFBLEdBQUEsQ0FBQSxvQkFBQSxDQUFBLENBQUE7S0FDQTtJQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGFBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0lBQ0EsQ0FBQTtHQUVBOztFQUdBLENBQUE7Q0FDQSxDQUFBLENBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnbmdTdG9yYWdlJywgJ25nTWF0ZXJpYWwnLCAnbmdLbm9iJ10pO1xyXG5cclxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xyXG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxyXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXHJcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XHJcbn0pO1xyXG5cclxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxyXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XHJcblxyXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cclxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXHJcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cclxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcclxuXHJcbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XHJcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXHJcbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xyXG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxyXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xyXG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXHJcbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcclxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxyXG4gICAgICAgICAgICBpZiAodXNlcikge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcblxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ya3dlYicsIHtcclxuICAgICAgICB1cmw6ICcvZm9ya3dlYicsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9mb3Jrd2ViL2Zvcmt3ZWIuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogXCJGb3JrV2ViQ29udHJvbGxlclwiXHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ0ZvcmtXZWJDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRzdGF0ZSwgUHJvamVjdEZjdCwgQXV0aFNlcnZpY2UsIEZvcmtGYWN0b3J5KXtcclxuXHJcblx0Rm9ya0ZhY3RvcnkuZ2V0V2ViKCkudGhlbihmdW5jdGlvbih3ZWJzKXtcclxuXHRcdCRzY29wZS5ub2RlcyA9IFtdO1xyXG4gICAgXHR2YXIgbGlua0FyciA9IFtdO1xyXG4gICAgICAgIHdlYnMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICBcdHZhciBhcnIgPSBbXTtcclxuICAgICAgICBcdGFyci5wdXNoKG5vZGUpO1xyXG4gICAgICAgIFx0dmFyIG5ld2FyciA9IGFyci5jb25jYXQobm9kZS5icmFuY2gpO1xyXG4gICAgICAgIFx0JHNjb3BlLm5vZGVzLnB1c2gobmV3YXJyKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJuZXR3b3JrXCIsICRzY29wZS5ub2Rlcyk7XHJcblx0XHR2YXIgdGVzdEEgPSBbXTtcclxuXHRcdHZhciBjb3VudGVyID0gMDtcclxuXHRcdCRzY29wZS5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVBcnIpe1xyXG5cdFx0XHRmb3IgKHZhciBqID0gMTsgaiA8IG5vZGVBcnIubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICBcdFx0dmFyIGFMaW5rID0ge1xyXG4gICAgICAgIFx0XHRcdCdzb3VyY2UnOiBjb3VudGVyLFxyXG4gICAgICAgIFx0XHRcdCd0YXJnZXQnOiBqICsgY291bnRlcixcclxuICAgICAgICBcdFx0XHQnd2VpZ2h0JzogM1xyXG4gICAgICAgIFx0XHR9XHJcbiAgICAgICAgXHRcdGxpbmtBcnIucHVzaChhTGluayk7XHJcbiAgICAgICAgXHR9O1xyXG4gICAgXHRcdGNvdW50ZXIgKz0gKG5vZGVBcnIubGVuZ3RoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHZhciBub2RlQXJyID0gW107XHJcblx0XHRub2RlQXJyID0gbm9kZUFyci5jb25jYXQuYXBwbHkobm9kZUFyciwgJHNjb3BlLm5vZGVzKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiUExFQVNFXCIsIGxpbmtBcnIsIG5vZGVBcnIpO1xyXG5cdFx0dmFyIG5vZGVzID0gbm9kZUFycjtcclxuXHRcdHZhciBsaW5rcyA9IGxpbmtBcnI7XHJcblxyXG5cdFx0dmFyIHcgPSA5MDA7XHJcblx0XHR2YXIgaCA9IDUwMDtcclxuXHRcdHZhciBzdmcgPSBkMy5zZWxlY3QoJyN1aScpIFxyXG5cdFx0ICAgICAgLmFwcGVuZCgnc3ZnJylcclxuXHRcdCAgICAgIC5hdHRyKCd3aWR0aCcsIHcpXHJcblx0XHQgICAgICAuYXR0cignaGVpZ2h0JywgaCk7XHJcblxyXG5cclxuXHRcdC8vIGNyZWF0ZSBmb3JjZSBsYXlvdXQgaW4gbWVtb3J5XHJcblx0XHR2YXIgZm9yY2UgPSBkMy5sYXlvdXQuZm9yY2UoKVxyXG5cdFx0ICAgICAgLm5vZGVzKG5vZGVzKVxyXG5cdFx0ICAgICAgLmxpbmtzKGxpbmtzKVxyXG5cdFx0ICAgICAgLnNpemUoWzkwMCwgNTAwXSlcclxuXHRcdCAgICAgIC5saW5rRGlzdGFuY2UoW3cgLyhub2RlQXJyLmxlbmd0aCldKTtcclxuXHRcdFxyXG5cdFx0dmFyIGZpc2hleWUgPSBkMy5maXNoZXllLmNpcmN1bGFyKClcclxuXHRcdCAgICBcdFx0XHQucmFkaXVzKDIwMClcclxuXHRcdCAgICBcdFx0XHQuZGlzdG9ydGlvbigyKTtcclxuXHJcblxyXG5cdFx0Ly8gYXBwZW5kIGEgZ3JvdXAgZm9yIGVhY2ggZGF0YSBlbGVtZW50XHJcblx0XHR2YXIgbm9kZSA9IHN2Zy5zZWxlY3RBbGwoJ2NpcmNsZScpXHJcblx0XHQgICAgICAuZGF0YShub2RlcykuZW50ZXIoKVxyXG5cdFx0ICAgICAgLmFwcGVuZCgnZycpXHJcblx0XHQgICAgICAuY2FsbChmb3JjZS5kcmFnKVxyXG5cdFx0ICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVPYmpcIik7XHJcblxyXG5cdFx0Ly8gYXBwZW5kIGNpcmNsZSBvbnRvIGVhY2ggJ2cnIG5vZGVcclxuXHRcdG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxyXG5cdFx0ICAgICAgLmF0dHIoJ2ZpbGwnLCBcImdyZWVuXCIpXHJcblx0XHQgICAgICAuYXR0cigncicsIDEwKTtcclxuXHJcblxyXG5cdFx0Zm9yY2Uub24oJ3RpY2snLCBmdW5jdGlvbihlKSB7XHJcblx0ICAgICAgbm9kZS5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XHJcblx0ICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJysgZC54ICsnLCAnKyBkLnkgKycpJztcclxuXHQgICAgICB9KVxyXG5cclxuXHQgICAgICBsaW5rXHJcblx0ICAgICAgICAgICAgLmF0dHIoJ3gxJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zb3VyY2UueCB9KVxyXG5cdCAgICAgICAgICAgIC5hdHRyKCd5MScsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLnkgfSlcclxuXHQgICAgICAgICAgICAuYXR0cigneDInLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC54IH0pXHJcblx0ICAgICAgICAgICAgLmF0dHIoJ3kyJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQueSB9KVxyXG5cdFx0fSk7XHJcblxyXG5cclxuXHJcblx0XHR2YXIgbGluayA9IHN2Zy5zZWxlY3RBbGwoJ2xpbmUnKVxyXG5cdFx0ICAgICAgLmRhdGEobGlua3MpLmVudGVyKClcclxuXHRcdCAgICAgIC5hcHBlbmQoJ2xpbmUnKVxyXG5cdFx0ICAgICAgLmF0dHIoJ3N0cm9rZScsIFwiZ3JleVwiKVxyXG5cclxuXHRcdGZvcmNlLnN0YXJ0KCk7XHJcblx0XHRcclxuXHRcdHN2Zy5vbihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbigpIHtcclxuXHRcdCAgZmlzaGV5ZS5mb2N1cyhkMy5tb3VzZSh0aGlzKSk7XHJcblxyXG5cdFx0ICAgIG5vZGUuZWFjaChmdW5jdGlvbihkKSB7IGQuZmlzaGV5ZSA9IGZpc2hleWUoZCk7IH0pXHJcblx0XHQgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5maXNoZXllLng7IH0pXHJcblx0ICBcdCAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmZpc2hleWUueTsgfSlcclxuXHRcdCAgICAgICAgLmF0dHIoXCJyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuZmlzaGV5ZS56ICogNC41OyB9KTtcclxuXHJcblx0XHQgICAgbGluay5hdHRyKFwieDFcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zb3VyY2UuZmlzaGV5ZS54OyB9KVxyXG5cdFx0ICAgICAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc291cmNlLmZpc2hleWUueTsgfSlcclxuXHRcdCAgICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5maXNoZXllLng7IH0pXHJcblx0XHQgICAgICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQuZmlzaGV5ZS55OyB9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cdFxyXG59KTsiLCIoZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXHJcbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XHJcblxyXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcclxuXHJcbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCRsb2NhdGlvbikge1xyXG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XHJcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXHJcbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxyXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cclxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XHJcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcclxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcclxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXHJcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXHJcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxyXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcclxuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcclxuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxyXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXHJcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXHJcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xyXG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xyXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcclxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xyXG5cclxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXHJcbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxyXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxyXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXHJcbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cclxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cclxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXHJcbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cclxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcclxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNpZ251cCA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhjcmVkZW50aWFscyk7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgY3JlZGVudGlhbHMpXHJcbiAgICAgICAgICAgICAgICAudGhlbiggb25TdWNjZXNzZnVsTG9naW4gKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBzaWdudXAgY3JlZGVudGlhbHMuJyB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcclxuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcclxuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7XHJcblxyXG59KSgpOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dnZWRJbkhvbWUnLCB7XHJcbiAgICAgICAgdXJsOiAnL2hvbWUnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0hvbWVDb250cm9sbGVyJ1xyXG4gICAgfSlcclxuXHQuc3RhdGUoJ2hvbWUnLHtcclxuXHRcdHVybDogJy8nLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9ob21lL2xhbmRpbmcuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnTGFuZGluZ1BhZ2VDb250cm9sbGVyJyxcclxuXHRcdHJlc29sdmU6IHtcclxuXHRcdFx0IGNoZWNrSWZMb2dnZWRJbjogZnVuY3Rpb24gKEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHRcdFx0IFx0Ly8gY29uc29sZS5sb2coQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkpO1xyXG5cdFx0ICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XHJcblx0XHQgICAgICAgIFx0aWYodXNlcikgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcclxuXHRcdCAgICAgICAgfSk7XHJcblx0XHQgICAgfVxyXG5cdFx0fVxyXG5cdH0pO1xyXG59KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2plY3QnLCB7XHJcbiAgICAgICAgdXJsOiAnL3Byb2plY3QvOnByb2plY3RJRCcsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9qZWN0L3Byb2plY3QuaHRtbCdcclxuICAgIH0pO1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQXV0aFNlcnZpY2UpIHtcclxuXHJcblx0Ly93aW5kb3cgZXZlbnRzXHJcblx0d2luZG93Lm9uYmx1ciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkc2NvcGUuc3RvcCgpO1xyXG5cdFx0JHNjb3BlLiRkaWdlc3QoKTtcclxuICAgIH07XHJcbiAgICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBsZWF2ZSB0aGlzIHBhZ2UgYmVmb3JlIHNhdmluZyB5b3VyIHdvcms/XCI7XHJcblx0fTtcclxuXHR3aW5kb3cub251bmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lcygpO1xyXG5cdH1cclxuXHQkKCcudGltZWxpbmUtY29udGFpbmVyJykuc2Nyb2xsKGZ1bmN0aW9uKCl7XHJcblx0ICAgICQoJy50cmFja01haW5TZWN0aW9uJykuY3NzKHtcclxuXHQgICAgICAgICdsZWZ0JzogJCh0aGlzKS5zY3JvbGxMZWZ0KClcclxuXHQgICAgfSk7XHJcblx0fSk7XHJcblxyXG5cclxuXHJcblx0dmFyIG1heE1lYXN1cmUgPSAwO1xyXG5cclxuXHQvLyBudW1iZXIgb2YgbWVhc3VyZXMgb24gdGhlIHRpbWVsaW5lXHJcblx0JHNjb3BlLm51bU1lYXN1cmVzID0gXy5yYW5nZSgwLCA2MCk7XHJcblxyXG5cdC8vIGxlbmd0aCBvZiB0aGUgdGltZWxpbmVcclxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcblxyXG5cdC8vSW5pdGlhbGl6ZSByZWNvcmRlciBvbiBwcm9qZWN0IGxvYWRcclxuXHRSZWNvcmRlckZjdC5yZWNvcmRlckluaXQoKS50aGVuKGZ1bmN0aW9uIChyZXRBcnIpIHtcclxuXHRcdCRzY29wZS5yZWNvcmRlciA9IHJldEFyclswXTtcclxuXHRcdCRzY29wZS5hbmFseXNlck5vZGUgPSByZXRBcnJbMV07XHJcblx0fSkuY2F0Y2goZnVuY3Rpb24gKGUpe1xyXG4gICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coZSk7XHJcbiAgICB9KTtcclxuXHJcblx0JHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG5cdCRzY29wZS50cmFja3MgPSBbXTtcclxuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0JHNjb3BlLnByb2plY3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9qZWN0SUQ7XHJcblx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xyXG5cdCRzY29wZS5jdXJyZW50bHlSZWNvcmRpbmcgPSBmYWxzZTtcclxuXHQkc2NvcGUucHJldmlld2luZ0lkID0gbnVsbDtcclxuXHQkc2NvcGUuem9vbSA9IDEwMDtcclxuXHJcblx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblx0XHR2YXIgbG9hZGVkID0gMDtcclxuXHRcdGNvbnNvbGUubG9nKCdQUk9KRUNUJywgcHJvamVjdCk7XHJcblx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBwcm9qZWN0Lm5hbWU7XHJcblxyXG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3QudHJhY2tzLmxlbmd0aCcsIHByb2plY3QudHJhY2tzLmxlbmd0aCk7XHJcblxyXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cclxuXHRcdFx0XHR2YXIgbG9hZGFibGVUcmFja3MgPSBbXTtcclxuXHJcblx0XHRcdFx0cHJvamVjdC50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHRcdGlmICh0cmFjay51cmwpIHtcclxuXHRcdFx0XHRcdFx0bG9hZGFibGVUcmFja3MrKztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xyXG5cclxuXHRcdFx0XHRcdHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdFx0XHRcdGxvYWRlZCsrO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYobG9hZGVkID09PSBsb2FkYWJsZVRyYWNrcykge1xyXG5cdFx0XHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRkaWdlc3QoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHR2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdHJhY2subG9jYXRpb24pO1xyXG5cdFx0XHRcdFx0aWYobWF4ICsgMiA+IG1heE1lYXN1cmUpIG1heE1lYXN1cmUgPSBtYXggKyAyO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dHJhY2sucmVjb3JkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGFzc3VtaW5nIHRoYXQgYSBwbGF5ZXIgZXhpc3RzXHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG5cdFx0XHRcdFx0Ly9pbml0IGVmZmVjdHMsIGNvbm5lY3QsIGFuZCBhZGQgdG8gc2NvcGVcclxuXHJcblx0XHRcdFx0XHR0cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZSh0cmFjay5lZmZlY3RzUmFjayk7XHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIuY29ubmVjdCh0cmFjay5lZmZlY3RzUmFja1swXSk7XHJcblxyXG5cdFx0XHRcdFx0aWYodHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcclxuXHRcdFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IHRydWU7XHJcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xyXG4gICAgXHRcdFx0XHR0cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdHRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLCAwLCAwLCAwXSk7XHJcbiAgICBcdFx0XHRcdHRyYWNrLnBsYXllciA9IG51bGw7XHJcbiAgICBcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdCRzY29wZS5tYXhNZWFzdXJlID0gMzI7XHJcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcclxuICAgIFx0XHRcdFx0dmFyIG9iaiA9IHt9O1xyXG4gICAgXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xyXG4gICAgXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5vblRpbWVsaW5lID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5zaWxlbmNlID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwgMCwgMCwgMF0pO1xyXG4gICAgXHRcdFx0XHRvYmoucGxheWVyID0gbnVsbDtcclxuICAgIFx0XHRcdFx0b2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xyXG4gICAgXHRcdFx0XHRvYmoubG9jYXRpb24gPSBbXTtcclxuICAgIFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XHJcbiAgXHRcdFx0fVxyXG4gIFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly9keW5hbWljYWxseSBzZXQgbWVhc3VyZXNcclxuXHRcdC8vaWYgbGVzcyB0aGFuIDE2IHNldCAxOCBhcyBtaW5pbXVtXHJcblx0XHQkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcclxuXHRcdGlmKG1heE1lYXN1cmUgPCAzMikgbWF4TWVhc3VyZSA9IDMyO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXhNZWFzdXJlOyBpKyspIHtcclxuXHRcdFx0JHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XHJcblx0XHR9XHJcblx0XHQvLyBjb25zb2xlLmxvZygnTUVBU1VSRVMnLCAkc2NvcGUubnVtTWVhc3VyZXMpO1xyXG5cclxuXHJcblxyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LmNyZWF0ZVRyYW5zcG9ydChwcm9qZWN0LmVuZE1lYXN1cmUpLnRoZW4oZnVuY3Rpb24gKG1ldHJvbm9tZSkge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lID0gbWV0cm9ub21lO1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gdHJ1ZTtcclxuXHRcdH0pO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHQkc2NvcGUuanVtcFRvTWVhc3VyZSA9IGZ1bmN0aW9uKG1lYXN1cmUpIHtcclxuXHRcdGlmKG1heE1lYXN1cmUgPiBtZWFzdXJlKSB7XHJcblx0XHRcdCRzY29wZS5wb3NpdGlvbiA9IG1lYXN1cmU7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uID0gbWVhc3VyZS50b1N0cmluZygpICsgXCI6MDowXCI7XHJcblx0XHRcdCRzY29wZS5tb3ZlUGxheWhlYWQobWVhc3VyZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQkc2NvcGUubW92ZVBsYXloZWFkID0gZnVuY3Rpb24gKG51bWJlck1lYXN1cmVzKSB7XHJcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zdWJzdHIoMSkpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IChudW1iZXJNZWFzdXJlcyAqIDIwMCArIDMwMCkudG9TdHJpbmcoKSsncHgnO1xyXG5cdH1cclxuXHJcblx0JHNjb3BlLnpvb21PdXQgPSBmdW5jdGlvbigpIHtcclxuXHRcdCRzY29wZS56b29tIC09IDEwO1xyXG5cdFx0dmFyIHpvb20gPSAoJHNjb3BlLnpvb20gLSAxMCkudG9TdHJpbmcoKSArIFwiJVwiO1xyXG5cdFx0JCgnLnRpbWVsaW5lLWNvbnRhaW5lcicpLmNzcygnem9vbScsIHpvb20pO1xyXG5cdFx0Y29uc29sZS5sb2coJ09VVCcsICRzY29wZS56b29tKTtcclxuXHR9O1xyXG5cclxuXHQkc2NvcGUuem9vbUluID0gZnVuY3Rpb24oKSB7XHJcblx0XHQkc2NvcGUuem9vbSArPSAxMDtcclxuXHRcdHZhciB6b29tID0gKCRzY29wZS56b29tICsgMTApLnRvU3RyaW5nKCkgKyBcIiVcIjtcclxuXHRcdCQoJy50aW1lbGluZS1jb250YWluZXInKS5jc3MoJ3pvb20nLCB6b29tKTtcclxuXHRcdGNvbnNvbGUubG9nKCdJTicsICRzY29wZS56b29tKTtcclxuXHR9O1xyXG5cclxuXHQkc2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdHZhciB0cmFjayA9IHNjb3BlLnRyYWNrc1tpbmRleF07XHJcblx0fTtcclxuXHJcblx0JHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHR9O1xyXG5cclxuXHJcblx0JHNjb3BlLnBsYXkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHQkc2NvcGUucGxheWluZyA9IHRydWU7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG5cdH07XHJcblx0JHNjb3BlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JHNjb3BlLnBsYXlpbmcgPSBmYWxzZTtcclxuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XHJcblx0XHQkc2NvcGUucG9zaXRpb24gPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpWzBdO1xyXG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCI6MDowXCIpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICgkc2NvcGUucG9zaXRpb24gKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4JztcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnBhdXNlKCk7XHJcblx0fTtcclxuXHQkc2NvcGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XHJcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xyXG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcclxuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAnMzAwcHgnO1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RvcCgpO1xyXG5cdFx0JCgnI3RpbWVsaW5lUG9zaXRpb24nKS52YWwoXCI6MDowXCIpO1xyXG5cdFx0JCgnI3Bvc2l0aW9uU2VsZWN0b3InKS52YWwoXCIwXCIpO1xyXG5cdFx0Ly9zdG9wIGFuZCB0cmFjayBjdXJyZW50bHkgYmVpbmcgcHJldmlld2VkXHJcblx0XHRpZigkc2NvcGUucHJldmlld2luZ0lkKSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFySW50ZXJ2YWwoJHNjb3BlLnByZXZpZXdpbmdJZCk7XHJcblx0XHRcdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHQkc2NvcGUubmFtZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcclxuXHRcdGNvbnNvbGUubG9nKCdORVcnLCBuZXdOYW1lKTtcclxuXHRcdGlmKG5ld05hbWUpIHtcclxuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IGZhbHNlO1xyXG5cdFx0XHRQcm9qZWN0RmN0Lm5hbWVDaGFuZ2UobmV3TmFtZSwgJHNjb3BlLnByb2plY3RJZCkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlJFU1wiLCByZXNwb25zZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IFwiWW91IG11c3Qgc2V0IGEgbmFtZSFcIjtcclxuXHRcdFx0JHNjb3BlLnByb2plY3ROYW1lID0gXCJVbnRpdGxlZFwiO1xyXG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdE5hbWVJbnB1dCcpLmZvY3VzKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQkc2NvcGUudG9nZ2xlTWV0cm9ub21lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYoJHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPT09IDApIHtcclxuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLm9uID0gZmFsc2U7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdCRzY29wZS5tZXRyb25vbWUub24gPSB0cnVlO1xyXG5cclxuXHRcdH1cclxuXHR9XHJcblxyXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKCRzY29wZS50cmFja3MsICRzY29wZS5wcm9qZWN0SWQsICRzY29wZS5wcm9qZWN0TmFtZSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB3YXZlIGxvZ2ljXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xyXG5cclxuICAgIH0pO1xyXG4gIH07XHJcbiAgXHJcbiAgJHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgfTtcclxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XHJcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xyXG5cclxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xyXG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuXHJcbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24obG9naW5JbmZvKSB7XHJcblxyXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XHJcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XHJcblxyXG4gICAgJHNjb3BlLnNpZ251cCA9IHt9O1xyXG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuXHJcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcclxuXHJcbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuICAgICAgICBjb25zb2xlLmxvZyhzaWdudXBJbmZvKTtcclxuICAgICAgICBBdXRoU2VydmljZS5zaWdudXAoc2lnbnVwSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJQcm9maWxlJywge1xyXG4gICAgICAgIHVybDogJy91c2VycHJvZmlsZS86dGhlSUQnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci91c2VycHJvZmlsZS5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInLFxyXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmFydGlzdEluZm8nLCB7XHJcbiAgICAgICAgdXJsOiAnL2luZm8nLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9pbmZvLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLnByb2plY3QnLCB7XHJcbiAgICAgICAgdXJsOiAnL3Byb2plY3RzJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvcHJvamVjdHMuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSlcclxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuZm9sbG93ZXJzJywge1xyXG4gICAgICAgIHVybDogJy9mb2xsb3dlcnMnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dlcnMuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSlcclxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuZm9sbG93aW5nJywge1xyXG4gICAgICAgIHVybDogJy9mb2xsb3dpbmcnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dpbmcuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbiIsImFwcC5mYWN0b3J5KCdBbmFseXNlckZjdCcsIGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgdXBkYXRlQW5hbHlzZXJzID0gZnVuY3Rpb24gKGFuYWx5c2VyQ29udGV4dCwgYW5hbHlzZXJOb2RlLCBjb250aW51ZVVwZGF0ZSkge1xyXG5cclxuXHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcclxuXHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xyXG5cdFx0XHR2YXIgQkFSX1dJRFRIID0gMTtcclxuXHRcdFx0dmFyIG51bUJhcnMgPSBNYXRoLnJvdW5kKDMwMCAvIFNQQUNJTkcpO1xyXG5cdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcclxuXHJcblx0XHRcdGFuYWx5c2VyTm9kZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnl0ZURhdGEpOyBcclxuXHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgMzAwLCAxMDApO1xyXG5cdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gJyNGNkQ1NjUnO1xyXG5cdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XHJcblx0XHRcdHZhciBtdWx0aXBsaWVyID0gYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50IC8gbnVtQmFycztcclxuXHJcblx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgKytpKSB7XHJcblx0XHRcdFx0dmFyIG1hZ25pdHVkZSA9IDA7XHJcblx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XHJcblx0XHRcdFx0Ly8gZ290dGEgc3VtL2F2ZXJhZ2UgdGhlIGJsb2NrLCBvciB3ZSBtaXNzIG5hcnJvdy1iYW5kd2lkdGggc3Bpa2VzXHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGo8IG11bHRpcGxpZXI7IGorKylcclxuXHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcclxuXHRcdFx0XHRtYWduaXR1ZGUgPSBtYWduaXR1ZGUgLyBtdWx0aXBsaWVyO1xyXG5cdFx0XHRcdHZhciBtYWduaXR1ZGUyID0gZnJlcUJ5dGVEYXRhW2kgKiBtdWx0aXBsaWVyXTtcclxuXHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcclxuXHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFJlY3QoaSAqIFNQQUNJTkcsIDEwMCwgQkFSX1dJRFRILCAtbWFnbml0dWRlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xyXG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcclxuXHR9XHJcblxyXG5cclxuXHR2YXIgY2FuY2VsQW5hbHlzZXJVcGRhdGVzID0gZnVuY3Rpb24gKGFuYWx5c2VySWQpIHtcclxuXHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggYW5hbHlzZXJJZCApO1xyXG5cdH1cclxuXHRyZXR1cm4ge1xyXG5cdFx0dXBkYXRlQW5hbHlzZXJzOiB1cGRhdGVBbmFseXNlcnMsXHJcblx0XHRjYW5jZWxBbmFseXNlclVwZGF0ZXM6IGNhbmNlbEFuYWx5c2VyVXBkYXRlc1xyXG5cdH1cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnRm9ya0ZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XHJcblxyXG4gICAgdmFyIGdldFdlYiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2ZvcmtzJykudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFdlYjogZ2V0V2ViXHJcbiAgICB9O1xyXG5cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnSG9tZUZjdCcsIGZ1bmN0aW9uKCRodHRwKXtcclxuXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbih1c2VyKXtcclxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VyJywge3BhcmFtczoge19pZDogdXNlcn19KVxyXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihzdWNjZXNzKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdWNjZXNzLmRhdGE7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdQcm9qZWN0RmN0JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cclxuICAgIHZhciBnZXRQcm9qZWN0SW5mbyA9IGZ1bmN0aW9uIChwcm9qZWN0SWQpIHtcclxuXHJcbiAgICAgICAgLy9pZiBjb21pbmcgZnJvbSBIb21lQ29udHJvbGxlciBhbmQgbm8gSWQgaXMgcGFzc2VkLCBzZXQgaXQgdG8gJ2FsbCdcclxuICAgICAgICB2YXIgcHJvamVjdGlkID0gcHJvamVjdElkIHx8ICdhbGwnO1xyXG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvamVjdHMvJyArIHByb2plY3RpZCB8fCBwcm9qZWN0aWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGNyZWF0ZUFGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzLycsIHByb2plY3QpLnRoZW4oZnVuY3Rpb24oZm9yayl7XHJcbiAgICBcdFx0XHRyZXR1cm4gZm9yay5kYXRhO1xyXG4gICAgXHR9KTtcclxuICAgIH1cclxuICAgIHZhciBuZXdQcm9qZWN0ID0gZnVuY3Rpb24odXNlcil7XHJcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzJyx7b3duZXI6dXNlci5faWQsIG5hbWU6J1VudGl0bGVkJywgYnBtOjEyMCwgZW5kTWVhc3VyZTogMzJ9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgIFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgIFx0fSk7XHJcbiAgICB9XHJcbiAgICB2YXIgbmFtZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld05hbWUsIHByb2plY3RJZCkge1xyXG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvcHJvamVjdHMvJytwcm9qZWN0SWQsIHtuYW1lOiBuZXdOYW1lfSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvcHJvamVjdHMvJytwcm9qZWN0Ll9pZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEZWxldGUgUHJvaiBGY3QnLCByZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHVwbG9hZFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnYXBpL3Byb2plY3RzL3NvdW5kY2xvdWQnLCB7IHByb2plY3QgOiBwcm9qZWN0IH0gKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBnZXRQcm9qZWN0SW5mbzogZ2V0UHJvamVjdEluZm8sXHJcbiAgICAgICAgY3JlYXRlQUZvcms6IGNyZWF0ZUFGb3JrLFxyXG4gICAgICAgIG5ld1Byb2plY3Q6IG5ld1Byb2plY3QsIFxyXG4gICAgICAgIGRlbGV0ZVByb2plY3Q6IGRlbGV0ZVByb2plY3QsXHJcbiAgICAgICAgbmFtZUNoYW5nZTogbmFtZUNoYW5nZSxcclxuICAgICAgICB1cGxvYWRQcm9qZWN0OiB1cGxvYWRQcm9qZWN0XHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsImFwcC5mYWN0b3J5KCdSZWNvcmRlckZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgQXV0aFNlcnZpY2UsICRxLCBUb25lVHJhY2tGY3QsIEFuYWx5c2VyRmN0KSB7XHJcblxyXG4gICAgdmFyIHJlY29yZGVySW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgdmFyIENvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgICAgIHZhciBhdWRpb0NvbnRleHQgPSBuZXcgQ29udGV4dCgpO1xyXG4gICAgICAgICAgICB2YXIgcmVjb3JkZXI7XHJcblxyXG4gICAgICAgICAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IChcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5jYW5jZWxBbmltYXRpb25GcmFtZSlcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jYW5jZWxBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWU7XHJcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSlcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBuYXZpZ2F0b3Iud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XHJcblxyXG4gICAgICAgICAgICAvLyBhc2sgZm9yIHBlcm1pc3Npb25cclxuICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXVkaW9cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtYW5kYXRvcnlcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0VjaG9DYW5jZWxsYXRpb25cIjogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0F1dG9HYWluQ29udHJvbFwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nTm9pc2VTdXBwcmVzc2lvblwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nSGlnaHBhc3NGaWx0ZXJcIjogXCJmYWxzZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJvcHRpb25hbFwiOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChzdHJlYW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlucHV0UG9pbnQgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIEF1ZGlvTm9kZSBmcm9tIHRoZSBzdHJlYW0uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWFsQXVkaW9JbnB1dCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXVkaW9JbnB1dCA9IHJlYWxBdWRpb0lucHV0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdWRpb0lucHV0LmNvbm5lY3QoaW5wdXRQb2ludCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW5hbHlzZXIgbm9kZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5c2VyTm9kZS5mZnRTaXplID0gMjA0ODtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCBhbmFseXNlck5vZGUgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHJlY29yZGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZGVyID0gbmV3IFJlY29yZGVyKCBpbnB1dFBvaW50ICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB6ZXJvR2FpbiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmdhaW4udmFsdWUgPSAwLjA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggemVyb0dhaW4gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uY29ubmVjdCggYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFtyZWNvcmRlciwgYW5hbHlzZXJOb2RlXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlY29yZFN0YXJ0ID0gZnVuY3Rpb24gKHJlY29yZGVyKSB7XHJcbiAgICAgICAgcmVjb3JkZXIuY2xlYXIoKTtcclxuICAgICAgICByZWNvcmRlci5yZWNvcmQoKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVjb3JkU3RvcCA9IGZ1bmN0aW9uIChpbmRleCwgcmVjb3JkZXIpIHtcclxuICAgICAgICByZWNvcmRlci5zdG9wKCk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIC8vIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcclxuICAgICAgICAgICAgcmVjb3JkZXIuZ2V0QnVmZmVycyhmdW5jdGlvbiAoYnVmZmVycykge1xyXG4gICAgICAgICAgICAgICAgLy9kaXNwbGF5IHdhdiBpbWFnZVxyXG4gICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIndhdmVkaXNwbGF5XCIgKyAgaW5kZXggKTtcclxuICAgICAgICAgICAgICAgIHZhciBjYW52YXNMb29wID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZUZvckxvb3BcIiArICBpbmRleCApO1xyXG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMzAwLCAxMDAsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBidWZmZXJzWzBdICk7XHJcbiAgICAgICAgICAgICAgICBkcmF3QnVmZmVyKCAxOTgsIDk4LCBjYW52YXNMb29wLmdldENvbnRleHQoJzJkJyksIGJ1ZmZlcnNbMF0gKTtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RCdWZmZXIgPSBidWZmZXJzWzBdO1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlID0gY2FudmFzTG9vcC50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhlIE9OTFkgdGltZSBnb3RCdWZmZXJzIGlzIGNhbGxlZCBpcyByaWdodCBhZnRlciBhIG5ldyByZWNvcmRpbmcgaXMgY29tcGxldGVkIC0gXHJcbiAgICAgICAgICAgICAgICAvLyBzbyBoZXJlJ3Mgd2hlcmUgd2Ugc2hvdWxkIHNldCB1cCB0aGUgZG93bmxvYWQuXHJcbiAgICAgICAgICAgICAgICByZWNvcmRlci5leHBvcnRXQVYoIGZ1bmN0aW9uICggYmxvYiApIHtcclxuICAgICAgICAgICAgICAgICAgICAvL25lZWRzIGEgdW5pcXVlIG5hbWVcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmRlci5zZXR1cERvd25sb2FkKCBibG9iLCBcIm15UmVjb3JkaW5nMC53YXZcIiApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIGxvb3AgdGltZVxyXG4gICAgICAgICAgICAgICAgICAgIFRvbmVUcmFja0ZjdC5sb29wSW5pdGlhbGl6ZShibG9iLCBpbmRleCwgXCJteVJlY29yZGluZzAud2F2XCIpLnRoZW4ocmVzb2x2ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgXHJcblxyXG4gICAgXHJcbiAgICB2YXIgY29udmVydFRvQmFzZTY0ID0gZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2VhY2ggdHJhY2snLCB0cmFjayk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pIHtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKHRyYWNrLnJhd0F1ZGlvKTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG5cclxuXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzZW5kVG9BV1M6IGZ1bmN0aW9uICh0cmFja3NBcnJheSwgcHJvamVjdElkLCBwcm9qZWN0TmFtZSkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlYWRQcm9taXNlcyA9IHRyYWNrc0FycmF5Lm1hcChjb252ZXJ0VG9CYXNlNjQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICRxLmFsbChyZWFkUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKHN0b3JlRGF0YSkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRyYWNrc0FycmF5LmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3JlRGF0YVtpXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFjay5yYXdBdWRpbyA9IHN0b3JlRGF0YVtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2suZWZmZWN0c1JhY2sgPSB0cmFjay5lZmZlY3RzUmFjay5tYXAoZnVuY3Rpb24gKGVmZmVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFRkZFQ1RcIiwgZWZmZWN0LCBlZmZlY3Qud2V0LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlZmZlY3Qud2V0LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9hd3MvJywgeyB0cmFja3MgOiB0cmFja3NBcnJheSwgcHJvamVjdElkIDogcHJvamVjdElkLCBwcm9qZWN0TmFtZSA6IHByb2plY3ROYW1lIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBpbiBzZW5kVG9BV1NGYWN0b3J5JywgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTsgXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVjb3JkZXJJbml0OiByZWNvcmRlckluaXQsXHJcbiAgICAgICAgcmVjb3JkU3RhcnQ6IHJlY29yZFN0YXJ0LFxyXG4gICAgICAgIHJlY29yZFN0b3A6IHJlY29yZFN0b3BcclxuICAgIH1cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdUb25lVGltZWxpbmVGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XHJcblxyXG5cdHZhciBjcmVhdGVUcmFuc3BvcnQgPSBmdW5jdGlvbiAobG9vcEVuZCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wID0gdHJ1ZTtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcFN0YXJ0ID0gJzBtJztcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcEVuZCA9IGxvb3BFbmQudG9TdHJpbmcoKSArICdtJztcclxuXHRcdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cclxuXHRcdFx0Y3JlYXRlTWV0cm9ub21lKCkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XHJcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0dmFyIHBvc0FyciA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6Jyk7XHJcblx0XHRcdFx0XHR2YXIgbGVmdFBvcyA9ICgocGFyc2VJbnQocG9zQXJyWzBdKSAqIDIwMCApICsgKHBhcnNlSW50KHBvc0FyclsxXSkgKiA1MCkgKyA1MDApLnRvU3RyaW5nKCkgKyAncHgnO1xyXG5cdFx0XHRcdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IGxlZnRQb3M7XHJcblx0XHRcdFx0XHRtZXRyb25vbWUuc3RhcnQoKTtcclxuXHRcdFx0XHR9LCAnMW0nKTtcclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHQkKCcjdGltZWxpbmVQb3NpdGlvbicpLnZhbChUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zdWJzdHIoMSkpO1xyXG5cdFx0XHRcdFx0JCgnI3Bvc2l0aW9uU2VsZWN0b3InKS52YWwoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3Vic3RyKDAsMSkpO1xyXG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XHJcblx0XHRcdFx0fSwgJzRuJyk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0cm9ub21lKTtcclxuXHRcdFx0fSk7XHJcbiAgICAgICAgfSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGNoYW5nZUJwbSA9IGZ1bmN0aW9uIChicG0pIHtcclxuXHRcdFRvbmUuVHJhbnNwb3J0LmJwbS52YWx1ZSA9IGJwbTtcclxuXHRcdHJldHVybiBUb25lLlRyYW5zcG9ydDtcclxuXHR9O1xyXG5cclxuXHR2YXIgc3RvcEFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcclxuXHRcdHRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci5zdG9wKCk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgbXV0ZUFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcclxuXHRcdHRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIHVuTXV0ZUFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcclxuXHRcdHRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGNyZWF0ZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHQgICAgICAgIHZhciBtZXQgPSBuZXcgVG9uZS5QbGF5ZXIoXCIvYXBpL3dhdi9DbGljazEud2F2XCIsIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShtZXQpO1xyXG5cdCAgICAgICAgfSkudG9NYXN0ZXIoKTtcclxuICAgICAgICB9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgYWRkTG9vcFRvVGltZWxpbmUgPSBmdW5jdGlvbiAocGxheWVyLCBzdGFydFRpbWVBcnJheSkge1xyXG5cclxuXHRcdGlmKHN0YXJ0VGltZUFycmF5LmluZGV4T2YoMCkgPT09IC0xKSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdH0sIFwiMG1cIilcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0c3RhcnRUaW1lQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRUaW1lKSB7XHJcblxyXG5cdFx0XHR2YXIgc3RhcnRUaW1lID0gc3RhcnRUaW1lLnRvU3RyaW5nKCkgKyAnbSc7XHJcblxyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1N0YXJ0JywgVG9uZS5UcmFuc3BvcnQucG9zaXRpb24pO1xyXG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0cGxheWVyLnN0YXJ0KCk7XHJcblx0XHRcdH0sIHN0YXJ0VGltZSk7XHJcblxyXG5cdFx0XHQvLyB2YXIgc3RvcFRpbWUgPSBwYXJzZUludChzdGFydFRpbWUuc3Vic3RyKDAsIHN0YXJ0VGltZS5sZW5ndGgtMSkpICsgMSkudG9TdHJpbmcoKSArIHN0YXJ0VGltZS5zdWJzdHIoLTEsMSk7XHJcblx0XHRcdC8vLy8gY29uc29sZS5sb2coJ1NUT1AnLCBzdG9wKTtcclxuXHRcdFx0Ly8vLyB0cmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHQvLy8vIFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdFx0Ly8vLyB9LCBzdG9wVGltZSk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdH07XHJcblx0XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGNyZWF0ZVRyYW5zcG9ydDogY3JlYXRlVHJhbnNwb3J0LFxyXG4gICAgICAgIGNoYW5nZUJwbTogY2hhbmdlQnBtLFxyXG4gICAgICAgIGFkZExvb3BUb1RpbWVsaW5lOiBhZGRMb29wVG9UaW1lbGluZSxcclxuICAgICAgICBjcmVhdGVNZXRyb25vbWU6IGNyZWF0ZU1ldHJvbm9tZSxcclxuICAgICAgICBzdG9wQWxsOiBzdG9wQWxsLFxyXG4gICAgICAgIG11dGVBbGw6IG11dGVBbGwsXHJcbiAgICAgICAgdW5NdXRlQWxsOiB1bk11dGVBbGxcclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnVG9uZVRyYWNrRmN0JywgZnVuY3Rpb24gKCRodHRwLCAkcSkge1xyXG5cclxuXHR2YXIgY3JlYXRlUGxheWVyID0gZnVuY3Rpb24gKHVybCwgZG9uZUZuKSB7XHJcblx0XHR2YXIgcGxheWVyICA9IG5ldyBUb25lLlBsYXllcih1cmwsIGRvbmVGbik7XHJcblx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcclxuXHRcdHBsYXllci50b01hc3RlcigpO1xyXG5cdFx0Ly8gcGxheWVyLnN5bmMoKTtcclxuXHRcdC8vIHBsYXllci5sb29wID0gdHJ1ZTtcclxuXHRcdHJldHVybiBwbGF5ZXI7XHJcblx0fTtcclxuXHJcblx0dmFyIGxvb3BJbml0aWFsaXplID0gZnVuY3Rpb24oYmxvYiwgaW5kZXgsIGZpbGVuYW1lKSB7XHJcblx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0Ly9QQVNTRUQgQSBCTE9CIEZST00gUkVDT1JERVJKU0ZBQ1RPUlkgLSBEUk9QUEVEIE9OIE1FQVNVUkUgMFxyXG5cdFx0XHR2YXIgdXJsID0gKHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0XHR2YXIgbGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2F2ZVwiK2luZGV4KTtcclxuXHRcdFx0bGluay5ocmVmID0gdXJsO1xyXG5cdFx0XHRsaW5rLmRvd25sb2FkID0gZmlsZW5hbWUgfHwgJ291dHB1dCcraW5kZXgrJy53YXYnO1xyXG5cdFx0XHR3aW5kb3cubGF0ZXN0UmVjb3JkaW5nID0gYmxvYjtcclxuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZ1VSTCA9IHVybDtcclxuXHRcdFx0dmFyIHBsYXllcjtcclxuXHRcdFx0Ly8gVE9ETzogcmVtb3ZlIHRvTWFzdGVyXHJcblx0XHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRyZXNvbHZlKHBsYXllcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGVmZmVjdHNJbml0aWFsaXplID0gZnVuY3Rpb24oYXJyKSB7XHJcblxyXG5cclxuXHRcdHZhciBjaG9ydXMgPSBuZXcgVG9uZS5DaG9ydXMoKTtcclxuXHRcdGNob3J1cy5uYW1lID0gXCJDaG9ydXNcIjtcclxuXHRcdHZhciBwaGFzZXIgPSBuZXcgVG9uZS5QaGFzZXIoKTtcclxuXHRcdHBoYXNlci5uYW1lID0gXCJQaGFzZXJcIjtcclxuXHRcdHZhciBkaXN0b3J0ID0gbmV3IFRvbmUuRGlzdG9ydGlvbigpO1xyXG5cdFx0ZGlzdG9ydC5uYW1lID0gXCJEaXN0b3J0aW9uXCI7XHJcblx0XHR2YXIgcGluZ3BvbmcgPSBuZXcgVG9uZS5QaW5nUG9uZ0RlbGF5KFwiNG1cIik7XHJcblx0XHRwaW5ncG9uZy5uYW1lID0gXCJQaW5nIFBvbmdcIjtcclxuXHJcblx0XHRpZiAoYXJyLmxlbmd0aCkge1xyXG5cdFx0XHRjaG9ydXMud2V0LnZhbHVlID0gYXJyWzBdO1xyXG5cdFx0XHRwaGFzZXIud2V0LnZhbHVlID0gYXJyWzFdO1xyXG5cdFx0XHRkaXN0b3J0LndldC52YWx1ZSA9IGFyclsyXTtcclxuXHRcdFx0cGluZ3Bvbmcud2V0LnZhbHVlID0gYXJyWzNdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRjaG9ydXMuY29ubmVjdChwaGFzZXIpO1xyXG5cdFx0cGhhc2VyLmNvbm5lY3QoZGlzdG9ydCk7XHJcblx0XHRkaXN0b3J0LmNvbm5lY3QocGluZ3BvbmcpO1xyXG5cdFx0cGluZ3BvbmcudG9NYXN0ZXIoKTtcclxuXHRcdC8vIHBpbmdwb25nLmNvbm5lY3Qodm9sdW1lKTtcclxuXHRcdC8vIHZvbHVtZS50b01hc3RlcigpO1xyXG5cclxuXHRcdHJldHVybiBbY2hvcnVzLCBwaGFzZXIsIGRpc3RvcnQsIHBpbmdwb25nXTtcclxuXHR9O1xyXG5cclxuXHR2YXIgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCA9IGZ1bmN0aW9uKHBsYXllciwgbWVhc3VyZSkge1xyXG5cdFx0cmV0dXJuIFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0cGxheWVyLnN0YXJ0KCk7XHJcblx0XHRcdH0sIG1lYXN1cmUrXCJtXCIpO1xyXG5cdH07XHJcblxyXG5cdHZhciByZXBsYWNlVGltZWxpbmVMb29wID0gZnVuY3Rpb24ocGxheWVyLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKSB7XHJcblx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ29sZCB0aW1lbGluZSBpZCcsIG9sZFRpbWVsaW5lSWQpO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KG9sZFRpbWVsaW5lSWQpKTtcclxuXHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZXMoKTtcclxuXHRcdFx0cmVzb2x2ZShjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHBsYXllciwgbmV3TWVhc3VyZSkpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHR2YXIgZGVsZXRlVGltZWxpbmVMb29wID0gZnVuY3Rpb24odGltZWxpbmVJZCkge1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShwYXJzZUludCh0aW1lbGluZUlkKSk7XHJcblx0fTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGNyZWF0ZVBsYXllcjogY3JlYXRlUGxheWVyLFxyXG4gICAgICAgIGxvb3BJbml0aWFsaXplOiBsb29wSW5pdGlhbGl6ZSxcclxuICAgICAgICBlZmZlY3RzSW5pdGlhbGl6ZTogZWZmZWN0c0luaXRpYWxpemUsXHJcbiAgICAgICAgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcDogY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCxcclxuICAgICAgICByZXBsYWNlVGltZWxpbmVMb29wOiByZXBsYWNlVGltZWxpbmVMb29wLFxyXG4gICAgICAgIGRlbGV0ZVRpbWVsaW5lTG9vcDogZGVsZXRlVGltZWxpbmVMb29wXHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsImFwcC5mYWN0b3J5KCd1c2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Z2V0VXNlck9iajogZnVuY3Rpb24odXNlcklEKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXJzJywge3BhcmFtczoge19pZDogdXNlcklEfX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdyZXNvb25zZSBpcycsIHJlc3BvbnNlLmRhdGEpXHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHJcblx0XHRmb2xsb3c6IGZ1bmN0aW9uKHVzZXIsIGxvZ2dlZEluVXNlcil7XHJcblx0XHRcdHJldHVybiAkaHR0cC5wdXQoJ2FwaS91c2Vycycse3VzZXJUb0ZvbGxvdzogdXNlciwgbG9nZ2VkSW5Vc2VyOiBsb2dnZWRJblVzZXJ9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9sbG93VXNlciBGYWN0b3J5IHJlc3BvbnNlJywgcmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHJcblx0XHR1bkZvbGxvdzogZnVuY3Rpb24oZm9sbG93ZWUsIGxvZ2dlZEluVXNlcikge1xyXG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMnLCB7dXNlclRvVW5mb2xsb3c6IGZvbGxvd2VlLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCd1bkZvbGxvdyByZXNwb25zZScsIHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG59KTsiLCJhcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBUb25lVHJhY2tGY3QsIFByb2plY3RGY3QsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCAkbWRUb2FzdCkge1xyXG5cdHZhciB0cmFja0J1Y2tldCA9IFtdO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ25hdmJhcicpWzBdLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblxyXG5cdCRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcclxuICAgIH07XHJcblxyXG4gICAgJHNjb3BlLnByb2plY3RzID0gZnVuY3Rpb24gKCl7XHJcbiAgICBcdFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oKS50aGVuKGZ1bmN0aW9uKHByb2plY3RzKXtcclxuICAgIFx0XHQkc2NvcGUuYWxsUHJvamVjdHMgPSBwcm9qZWN0cztcclxuICAgIFx0fSk7XHJcbiAgICB9O1xyXG5cdCRzY29wZS5wcm9qZWN0cygpO1xyXG5cclxuXHJcblx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdsb2dnZWRJblVzZXInLCBsb2dnZWRJblVzZXIpO1xyXG5cdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcclxuXHRcdFx0cHJvamVjdC5mb3JrSUQgPSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0ZGVsZXRlIHByb2plY3QuX2lkO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhwcm9qZWN0KTtcclxuXHRcdFx0JG1kVG9hc3Quc2hvdyh7XHJcblx0XHRcdFx0aGlkZURlbGF5OiAyMDAwLFxyXG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tIHJpZ2h0JyxcclxuXHRcdFx0XHR0ZW1wbGF0ZTpcIjxtZC10b2FzdD4gSXQncyBiZWVuIGZvcmtlZCA8L21kLXRvYXN0PlwiXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9yayByZXNwb25zZSBpcycsIHJlc3BvbnNlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cdFxyXG5cdH1cclxuXHRcdFxyXG5cdHZhciBzdG9wID1mYWxzZTtcclxuXHJcblxyXG5cdCRzY29wZS5zYW1wbGVUcmFjayA9IGZ1bmN0aW9uKHRyYWNrKXtcclxuXHJcblx0XHRpZihzdG9wPT09dHJ1ZSl7XHJcblx0XHRcdCRzY29wZS5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBmdW5jdGlvbihwbGF5ZXIpe1xyXG5cdFx0XHQkc2NvcGUucGxheWVyID0gcGxheWVyO1xyXG5cdFx0XHRpZihzdG9wID09PSBmYWxzZSl7XHJcblx0XHRcdFx0c3RvcCA9IHRydWU7XHJcblx0XHRcdFx0JHNjb3BlLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblx0XHRcdFx0c3RvcCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cclxuXHQkc2NvcGUuZ2V0VXNlclByb2ZpbGUgPSBmdW5jdGlvbih1c2VyKXtcclxuXHQgICAgLy8gY29uc29sZS5sb2coXCJjbGlja2VkXCIsIHVzZXIpO1xyXG5cdCAgICAkc3RhdGUuZ28oJ3VzZXJQcm9maWxlJywge3RoZUlEOiB1c2VyLl9pZH0pO1xyXG5cdH1cclxuXHJcbiAgICBcclxuXHJcblxyXG59KTtcclxuIiwiYXBwLmNvbnRyb2xsZXIoJ0xhbmRpbmdQYWdlQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCBUb25lVHJhY2tGY3QsICRzdGF0ZSkge1xyXG4gICAgLy8gJCgnI2Z1bGxwYWdlJykuZnVsbHBhZ2UoKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblxyXG5cclxuICAgICRzY29wZS5nb1RvRm9ybXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBcdGZ1bmN0aW9uIHNjcm9sbFRvQm90dG9tKGR1cmF0aW9uKSB7XHJcblx0XHQgICAgaWYgKGR1cmF0aW9uIDw9IDApIHJldHVybjtcclxuXHJcblx0XHRcdHZhciBkaWZmZXJlbmNlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCAtIHdpbmRvdy5zY3JvbGxZO1xyXG5cdFx0XHR2YXIgcGVyVGljayA9IGRpZmZlcmVuY2UgLyBkdXJhdGlvbiAqIDEwO1xyXG5cclxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR3aW5kb3cuc2Nyb2xsKDAsIHdpbmRvdy5zY3JvbGxZICsgcGVyVGljayk7XHJcblx0XHRcdFx0c2Nyb2xsVG9Cb3R0b20oZHVyYXRpb24gLSAxMCk7XHJcblx0XHRcdH0sIDEwKTtcclxuXHRcdH1cclxuXHJcblx0XHRzY3JvbGxUb0JvdHRvbSgxMDAwKTtcclxuICAgIH07XHJcblxyXG4gICAgXHJcblxyXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xyXG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFwcC5jb250cm9sbGVyKCdOZXdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFByb2plY3RGY3QsICRzdGF0ZSl7XHJcblx0JHNjb3BlLnVzZXI7XHJcblxyXG5cdCBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG5cdCBcdCRzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICBjb25zb2xlLmxvZygndXNlciBpcycsICRzY29wZS51c2VyLnVzZXJuYW1lKVxyXG4gICAgfSk7XHJcblxyXG5cdCAkc2NvcGUubmV3UHJvamVjdEJ1dCA9IGZ1bmN0aW9uKCl7XHJcblx0IFx0UHJvamVjdEZjdC5uZXdQcm9qZWN0KCRzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHByb2plY3RJZCl7XHJcblx0IFx0XHRjb25zb2xlLmxvZygnU3VjY2VzcyBpcycsIHByb2plY3RJZClcclxuXHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogcHJvamVjdElkfSk7XHQgXHRcclxuXHRcdH0pXHJcblxyXG5cdCB9XHJcblxyXG59KSIsImFwcC5jb250cm9sbGVyKCdUaW1lbGluZUNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRsb2NhbFN0b3JhZ2UsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCkge1xyXG4gIFxyXG4gIHZhciB3YXZBcnJheSA9IFtdO1xyXG4gIFxyXG4gICRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgNjA7IGkrKykge1xyXG4gICAgJHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XHJcbiAgfVxyXG5cclxuICAkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcbiAgJHNjb3BlLnRyYWNrcyA9IFtdO1xyXG4gICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHJcblxyXG4gIFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJzU1OTRjMjBhZDA3NTljZDQwY2U1MWUxNCcpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcclxuXHJcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xyXG4gICAgICBjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xyXG5cclxuICAgICAgaWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG4gICAgICAgIHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgICAgIHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGxvYWRlZCsrO1xyXG4gICAgICAgICAgICAgICAgaWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRyYWNrLnBsYXllciA9IFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBkb25lTG9hZGluZyk7XHJcbiAgICAgICAgICAgIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcclxuICAgICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKHRyYWNrKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xyXG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgICAgICAgb2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xyXG4gICAgICAgICAgb2JqLmxvY2F0aW9uID0gW107XHJcbiAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5nZXRUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKTtcclxuICAgICAgVG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XHJcblxyXG4gIH0pO1xyXG5cclxuICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcclxuICAvLyAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcclxuICAvLyAgICAgLy8gJHN0YXRlUGFyYW1zLnRoZUlEID0gYVVzZXIuX2lkXHJcbiAgLy8gICAgIGNvbnNvbGUubG9nKFwiaWRcIiwgJHN0YXRlUGFyYW1zKTtcclxuICAvLyB9KTtcclxuXHJcbiAgJHNjb3BlLnJlY29yZCA9IGZ1bmN0aW9uIChlLCBpbmRleCkge1xyXG5cclxuICBcdGUgPSBlLnRvRWxlbWVudDtcclxuXHJcbiAgICAgICAgLy8gc3RhcnQgcmVjb3JkaW5nXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0IHJlY29yZGluZycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghYXVkaW9SZWNvcmRlcilcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICBlLmNsYXNzTGlzdC5hZGQoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xyXG4gICAgICAgIGF1ZGlvUmVjb3JkZXIucmVjb3JkKCk7XHJcblxyXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5zdG9wKCk7XHJcbiAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XHJcbiAgICAgICAgICAgIC8vICRzY29wZS50cmFja3NbaW5kZXhdLnJhd0ltYWdlID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlO1xyXG5cclxuICAgICAgICAgIH0sIDUwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICB9LCAyMDAwKTtcclxuXHJcbiAgfVxyXG5cclxuICAkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIH07XHJcblxyXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgdmFyIGF3c1RyYWNrcyA9ICRzY29wZS50cmFja3MuZmlsdGVyKGZ1bmN0aW9uKHRyYWNrLGluZGV4KXtcclxuICAgICAgICAgICAgICBpZih0cmFjay5yYXdBdWRpbyl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoYXdzVHJhY2tzLCAnNTU5NWE3ZmFhYTkwMWFkNjMyMzRmOTIwJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB3YXZlIGxvZ2ljXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xyXG5cclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuXHRcclxuXHJcblxyXG59KTtcclxuXHJcblxyXG4iLCJcclxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgJHN0YXRlUGFyYW1zLCB1c2VyRmFjdG9yeSkge1xyXG4gICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgJHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuXHJcbiAgICAgICAgICB1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xyXG4gICAgICAgICAgICBpZighJHNjb3BlLnVzZXIucHJvZnBpYyl7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLnVzZXIucHJvZnBpYyA9IFwiaHR0cHM6Ly93d3cubWRyMTAxLmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wNS9wbGFjZWhvbGRlci11c2VyLmpwZ1wiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdXNlci5mb2xsb3dlcnMubGVuZ3RoOyBpICsrKXtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygkc3RhdGVQYXJhbXMudGhlSUQsIHVzZXIuZm9sbG93ZXJzW2ldLl9pZCk7XHJcbiAgICAgICAgICAgICAgaWYodXNlci5mb2xsb3dlcnNbaV0uX2lkID09PSBsb2dnZWRJblVzZXIuX2lkKXtcclxuICAgICAgICAgICAgICAgICRzY29wZS5mb2xsb3dTdGF0dXMgPSB0cnVlO1xyXG4gICAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcblxyXG5cclxuICAgIC8vICRzY29wZS5kaXNwbGF5U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xyXG4gICAgLy8gICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcclxuICAgIC8vICAgICBjb25zb2xlLmxvZygkc2NvcGUuc2hvd1NldHRpbmdzKTtcclxuICAgIC8vIH1cclxuXHJcbiAgICAkc2NvcGUuZm9sbG93ID0gZnVuY3Rpb24odXNlcil7XHJcbiAgICAgIHVzZXJGYWN0b3J5LmZvbGxvdyh1c2VyLCAkc2NvcGUubG9nZ2VkSW5Vc2VyKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICBjb25zb2xlLmxvZygnRm9sbG93IGNvbnRyb2xsZXIgcmVzcG9uc2UnLCByZXNwb25zZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgJHNjb3BlLmZvbGxvd1N0YXR1cyA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgJHNjb3BlLmRpc3BsYXlXZWIgPSBmdW5jdGlvbigpe1xyXG4gICAgICAkc3RhdGUuZ28oJ2Zvcmt3ZWInKTtcclxuICAgIH1cclxuXHJcblxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdmb2xsb3dkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZm9sbG93L2ZvbGxvd0RpcmVjdGl2ZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJ1xyXG5cdH07XHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ0ZvbGxvd0RpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBBdXRoU2VydmljZSwgdXNlckZhY3Rvcnkpe1xyXG5cclxuXHJcblxyXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xyXG4gICAgICAgICBcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XHJcbiAgICAgICAgICBcdHVzZXJGYWN0b3J5LmdldFVzZXJPYmooJHN0YXRlUGFyYW1zLnRoZUlEKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG5cdCAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcclxuXHJcblx0ICAgICAgICAgICAgaWYoJHN0YXRlLmN1cnJlbnQubmFtZSA9PT0gXCJ1c2VyUHJvZmlsZS5mb2xsb3dlcnNcIil7XHJcblx0ICAgICAgICAgICAgXHQkc2NvcGUuZm9sbG93cyA9IHVzZXIuZm9sbG93ZXJzO1xyXG5cdCAgICAgICAgICAgIH0gZWxzZXtcclxuXHQgICAgICAgICAgICBcdCRzY29wZS5mb2xsb3dzID0gdXNlci5mb2xsb3dpbmc7XHJcblx0ICAgICAgICAgICAgXHRpZigkc3RhdGVQYXJhbXMudGhlSUQgPT09IGxvZ2dlZEluVXNlci5faWQpICRzY29wZS5zaG93QnV0dG9uID0gdHJ1ZTtcclxuXHQgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJmb2xsb3dPYmogaXNcIiwgJHNjb3BlLmZvbGxvd3MsICRzdGF0ZVBhcmFtcyk7XHJcblxyXG5cdCAgICBcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0JHNjb3BlLmdvVG9Gb2xsb3cgPSBmdW5jdGlvbihmb2xsb3cpe1xyXG5cdCAgICAgIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCBmb2xsb3cpO1xyXG5cdCAgICAgICRzdGF0ZS5nbygndXNlclByb2ZpbGUnLCB7IHRoZUlEOiBmb2xsb3cuX2lkfSk7XHJcblx0ICAgIH1cclxuXHJcblx0ICAgICRzY29wZS51bkZvbGxvdyA9IGZ1bmN0aW9uKGZvbGxvd2VlKSB7XHJcblx0ICAgIFx0Y29uc29sZS5sb2coJHNjb3BlLmZvbGxvd3MpO1xyXG4gICAgXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgJHNjb3BlLmZvbGxvd3MubGVuZ3RoOyBpKyspIHtcclxuICAgIFx0XHRcdFx0aWYoJHNjb3BlLmZvbGxvd3NbaV0uX2lkID09PSBmb2xsb3dlZS5faWQpe1xyXG4gICAgXHRcdFx0XHRcdHZhciBkZWwgPSAkc2NvcGUuZm9sbG93cy5zcGxpY2UoaSwgMSk7XHJcbiAgICBcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJkZWxldGVcIiwgZGVsLCAkc2NvcGUuZm9sbG93cyk7XHJcbiAgICBcdFx0XHRcdH1cclxuICAgIFx0XHR9O1xyXG5cdCAgICBcdHVzZXJGYWN0b3J5LnVuRm9sbG93KGZvbGxvd2VlLCAkc2NvcGUubG9nZ2VkSW5Vc2VyKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHQgICAgXHRcdGNvbnNvbGUubG9nKFwic3VjY2VzZnVsXCIsIHJlc3BvbnNlKTtcclxuXHQgICAgXHRcdCRzY29wZS4kZGlnZXN0KCk7XHRcclxuXHQgICAgXHR9KTtcclxuXHQgICAgfVxyXG5cclxuXHJcblx0XHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2RyYWdnYWJsZScsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgIC8vIHRoaXMgZ2l2ZXMgdXMgdGhlIG5hdGl2ZSBKUyBvYmplY3RcclxuICAgIHZhciBlbCA9IGVsZW1lbnRbMF07XHJcbiAgICBcclxuICAgIGVsLmRyYWdnYWJsZSA9IHRydWU7XHJcbiAgICBcclxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKGUpIHtcclxuXHJcbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9ICdtb3ZlJztcclxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKCdUZXh0JywgdGhpcy5pZCk7XHJcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdkcmFnJyk7XHJcblxyXG4gICAgICAgIHZhciBpZHggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBhcnNlSW50KGF0dHJzLnBvc2l0aW9uKSk7XHJcbiAgICAgICAgc2NvcGUudHJhY2subG9jYXRpb24uc3BsaWNlKGlkeCwgMSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSxcclxuICAgICAgZmFsc2VcclxuICAgICk7XHJcbiAgICBcclxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbmQnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJyk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9LFxyXG4gICAgICBmYWxzZVxyXG4gICAgKTtcclxuXHJcbiAgfVxyXG59KTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Ryb3BwYWJsZScsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBzY29wZToge1xyXG4gICAgICBkcm9wOiAnJicgLy8gcGFyZW50XHJcbiAgICB9LFxyXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcclxuICAgICAgLy8gYWdhaW4gd2UgbmVlZCB0aGUgbmF0aXZlIG9iamVjdFxyXG4gICAgICB2YXIgZWwgPSBlbGVtZW50WzBdO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICBlLmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ21vdmUnO1xyXG4gICAgICAgICAgLy8gYWxsb3dzIHVzIHRvIGRyb3BcclxuICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ292ZXInKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ292ZXInKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnbGVhdmUnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgLy8gU3RvcHMgc29tZSBicm93c2VycyBmcm9tIHJlZGlyZWN0aW5nLlxyXG4gICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gdXBvbiBkcm9wLCBjaGFuZ2luZyBwb3NpdGlvbiBhbmQgdXBkYXRpbmcgdHJhY2subG9jYXRpb24gYXJyYXkgb24gc2NvcGUgXHJcbiAgICAgICAgICB2YXIgaXRlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGUuZGF0YVRyYW5zZmVyLmdldERhdGEoJ1RleHQnKSk7XHJcbiAgICAgICAgICB2YXIgeHBvc2l0aW9uID0gcGFyc2VJbnQodGhpcy5hdHRyaWJ1dGVzLnhwb3NpdGlvbi52YWx1ZSk7XHJcbiAgICAgICAgICB2YXIgY2hpbGROb2RlcyA9IHRoaXMuY2hpbGROb2RlcztcclxuICAgICAgICAgIHZhciBvbGRUaW1lbGluZUlkO1xyXG4gICAgICAgICAgdmFyIHRoZUNhbnZhcztcclxuXHJcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICBpZiAoY2hpbGROb2Rlc1tpXS5jbGFzc05hbWUgPT09ICdjYW52YXMtYm94Jykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgdGhpcy5jaGlsZE5vZGVzW2ldLmFwcGVuZENoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQudHJhY2subG9jYXRpb24ucHVzaCh4cG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhc05vZGUgPSB0aGlzLmNoaWxkTm9kZXNbaV0uY2hpbGROb2RlcztcclxuXHJcbiAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzTm9kZS5sZW5ndGg7IGorKykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW52YXNOb2RlW2pdLm5vZGVOYW1lID09PSAnQ0FOVkFTJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy5wb3NpdGlvbi52YWx1ZSA9IHhwb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRUaW1lbGluZUlkID0gY2FudmFzTm9kZVtqXS5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlQ2FudmFzID0gY2FudmFzTm9kZVtqXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9ICAgICBcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc29sZS5sb2coJ29sZFRpbWVsaW5lSWQnLCBvbGRUaW1lbGluZUlkKTtcclxuICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC5tb3ZlSW5UaW1lbGluZShvbGRUaW1lbGluZUlkLCB4cG9zaXRpb24pLnRoZW4oZnVuY3Rpb24gKG5ld1RpbWVsaW5lSWQpIHtcclxuICAgICAgICAgICAgICB0aGVDYW52YXMuYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlID0gbmV3VGltZWxpbmVJZDtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIGNhbGwgdGhlIGRyb3AgcGFzc2VkIGRyb3AgZnVuY3Rpb25cclxuICAgICAgICAgIHNjb3BlLiRhcHBseSgnZHJvcCgpJyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcclxuICAgIH07XHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2xvYWRpbmdHaWYnLCBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2xvYWRpbmctZ2lmL2xvYWRpbmcuaHRtbCdcclxuXHR9O1xyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB7fSxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0TmF2YmFyID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlcklkID0gdXNlci5faWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnUHJvZmlsZScsIHN0YXRlOiAndXNlclByb2ZpbGUoe3RoZUlEOiB1c2VySWR9KScsIGF1dGg6IHRydWUgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNldE5hdmJhcigpO1xyXG5cclxuICAgICAgICAgICAgLy8gc2NvcGUuaXRlbXMgPSBbXHJcbiAgICAgICAgICAgIC8vICAgICAvLyB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAncHJvamVjdCcgfSxcclxuICAgICAgICAgICAgLy8gICAgIC8vIHsgbGFiZWw6ICdTaWduIFVwJywgc3RhdGU6ICdzaWdudXAnIH0sXHJcbiAgICAgICAgICAgIC8vICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICd1c2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxyXG4gICAgICAgICAgICAvLyBdO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzZXRVc2VyKCk7XHJcblxyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldE5hdmJhcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCBzZXROYXZiYXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYXBwLmRpcmVjdGl2ZSgncHJvamVjdGRpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInXHJcblx0fTtcclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcigncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBQcm9qZWN0RmN0LCBBdXRoU2VydmljZSwgJG1kVG9hc3Qpe1xyXG5cclxuXHJcblxyXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xyXG5cdFx0XHQkc2NvcGUubG9nZ2VkSW5Vc2VyID0gbG9nZ2VkSW5Vc2VyO1xyXG5cdFx0XHQkc2NvcGUuZGlzcGxheUFQcm9qZWN0ID0gZnVuY3Rpb24oc29tZXRoaW5nKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnVEhJTkcnLCBzb21ldGhpbmcpO1xyXG5cdFx0XHRcdGlmKCRzY29wZS5sb2dnZWRJblVzZXIuX2lkID09PSAkc3RhdGVQYXJhbXMudGhlSUQpe1xyXG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogc29tZXRoaW5nLl9pZH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcImRpc3BsYXlpbmcgYSBwcm9qZWN0XCIsICRzY29wZS5wYXJlbnQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUubWFrZUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHRcdFx0XHRpZighcHJvamVjdC5mb3JrT3JpZ2luKSBwcm9qZWN0LmZvcmtPcmlnaW4gPSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0XHQkbWRUb2FzdC5zaG93KHtcclxuXHRcdFx0XHRoaWRlRGVsYXk6IDIwMDAsXHJcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxyXG5cdFx0XHRcdHRlbXBsYXRlOlwiPG1kLXRvYXN0PiBJdCdzIGJlZW4gZm9ya2VkIDwvbWQtdG9hc3Q+XCJcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XHJcblx0XHRcdFx0cHJvamVjdC5vd25lciA9IGxvZ2dlZEluVXNlci5faWQ7XHJcblx0XHRcdFx0ZGVsZXRlIHByb2plY3QuX2lkO1xyXG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKHByb2plY3QpO1xyXG5cdFx0XHRcdFByb2plY3RGY3QuY3JlYXRlQUZvcmsocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yayByZXNwb25zZSBpcycsIHJlc3BvbnNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLmRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRGVsZXRlUHJvamVjdCcsIHByb2plY3QpXHJcblx0XHRcdFx0UHJvamVjdEZjdC5kZWxldGVQcm9qZWN0KHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0RlbGV0ZSByZXF1ZXN0IGlzJywgcmVzcG9uc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUucG9zdFRvU291bmRjbG91ZCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdVcGxvYWRpbmcgUHJvamVjdCcsIHByb2plY3QpO1xyXG5cdFx0XHRcdFByb2plY3RGY3QudXBsb2FkUHJvamVjdChwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdVcGxvYWQgUmVxdWVzdCBpcycsIHJlc3BvbnNlKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fSk7XHJcblx0XHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3hpbVRyYWNrJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQW5hbHlzZXJGY3QsICRxKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmh0bWwnLFxyXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcblx0XHRcdHNjb3BlLmVmZmVjdFdldG5lc3NlcyA9IFt7XHJcblx0XHRcdFx0XHRuYW1lOiAnQ2hvcnVzJyxcclxuXHRcdFx0XHRcdGFtb3VudDogMFxyXG5cdFx0XHRcdH0se1xyXG5cdFx0XHRcdFx0bmFtZTogJ1BoYXNlcicsXHJcblx0XHRcdFx0XHRhbW91bnQ6IDBcclxuXHRcdFx0XHR9LHtcclxuXHRcdFx0XHRcdG5hbWU6ICdEaXN0b3J0aW9uJyxcclxuXHRcdFx0XHRcdGFtb3VudDogMFxyXG5cdFx0XHRcdH0se1xyXG5cdFx0XHRcdFx0bmFtZTogJ1BpbmdQb25nRGVsYXknLFxyXG5cdFx0XHRcdFx0YW1vdW50OiAwXHJcblx0XHRcdFx0fV07XHJcblx0XHRcdFx0c2NvcGUudm9sdW1lID0gbmV3IFRvbmUuVm9sdW1lKCk7XHJcblx0XHRcdFx0c2NvcGUudm9sdW1lLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbnZhc1Jvdy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XHJcblx0XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc0NsYXNzZXMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgdHJhY2tJbmRleCA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLmluZGV4T2Yoc2NvcGUudHJhY2spO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W2ldKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIGlkPSd3YXZlZGlzcGxheScgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIgKyB0cmFja0luZGV4LnRvU3RyaW5nKCkgKyBcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAwKVxyXG5cclxuXHRcdFx0c2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgsIHBvc2l0aW9uKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0RST1BQSU5HJyk7XHJcblx0XHRcdFx0Ly8gc2NvcGUudHJhY2sucGxheWVyLmxvb3AgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHQvLyB2YXIgcG9zaXRpb24gPSAwO1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHJcblx0XHRcdFx0aWYgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0Ly8gZHJvcCB0aGUgbG9vcCBvbiB0aGUgZmlyc3QgYXZhaWxhYmxlIGluZGV4XHRcdFx0XHRcclxuXHRcdFx0XHRcdHdoaWxlIChzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBvc2l0aW9uKSA+IC0xKSB7XHJcblx0XHRcdFx0XHRcdHBvc2l0aW9uKys7XHJcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly9hcHBlbmQgY2FudmFzIGVsZW1lbnRcclxuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5wdXNoKHBvc2l0aW9uKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zb3J0KCk7XHJcblx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIHBvc2l0aW9uKTtcclxuXHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICBpbmRleCArIFwiLVwiICsgcG9zaXRpb24gKyBcIicgY2xhc3M9J2l0ZW0gdHJhY2tMb29wXCIraW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUubW92ZUluVGltZWxpbmUgPSBmdW5jdGlvbiAob2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xyXG5cdFx0XHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0VMRU1FTlQnLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKTtcclxuXHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5yZXBsYWNlVGltZWxpbmVMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkudGhlbihyZXNvbHZlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fTtcclxuXHJcblxyXG5cdFx0XHRzY29wZS5hcHBlYXJPckRpc2FwcGVhciA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcclxuXHRcdFx0XHR2YXIgbG9vcEluZGV4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbik7XHJcblxyXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLm9uVGltZWxpbmUpIHtcclxuXHRcdFx0XHRcdGlmKGxvb3BJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5wdXNoKHBvc2l0aW9uKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgcG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0XHQvLyBhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwibWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiApO1xyXG5cdFx0XHRcdFx0XHQvL3JlbW92ZSBmcm9tIGxvY2F0aW9ucyBhcnJheVxyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zcGxpY2UobG9vcEluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgdGltZWxpbmVJZFxyXG5cdFx0XHRcdFx0XHRUb25lVHJhY2tGY3QuZGVsZXRlVGltZWxpbmVMb29wKCBjYW52YXMuYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlICk7XHJcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIGNhbnZhcyBpdGVtXHJcblx0XHRcdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQoZWxlbWVudCkge1xyXG5cdFx0XHRcdFx0XHQgICAgZWxlbWVudCAmJiBlbGVtZW50LnBhcmVudE5vZGUgJiYgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJlbW92ZUVsZW1lbnQoIGNhbnZhcyApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnTk8gRFJPUCcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjb3BlLnJlUmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1JFUkVDT1JEJyk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coc2NvcGUudHJhY2spO1xyXG5cdFx0XHRcdC8vY2hhbmdlIGFsbCBwYXJhbXMgYmFjayBhcyBpZiBlbXB0eSB0cmFja1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gbnVsbDtcclxuXHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucmF3QXVkaW8gPSBudWxsO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IG51bGw7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vZGlzcG9zZSBvZiBlZmZlY3RzUmFja1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrLmZvckVhY2goZnVuY3Rpb24gKGVmZmVjdCkge1xyXG5cdFx0XHRcdFx0ZWZmZWN0LmRpc3Bvc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHQvLyBzY29wZS50cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwwLDAsMF0pO1xyXG5cdFx0XHRcdC8vIHNjb3BlLnRyYWNrLnBsYXllci5jb25uZWN0KGVmZmVjdHNSYWNrWzBdKTtcclxuXHRcdFx0XHQvLyBzY29wZS52b2x1bWUgPSBuZXcgVG9uZS5Wb2x1bWUoKTtcclxuXHRcdFx0XHQvLyBzY29wZS50cmFjay5lZmZlY3RzUmFja1szXS5jb25uZWN0KHNjb3BlLnZvbHVtZSk7XHJcblx0XHRcdFx0Ly8gc2NvcGUudm9sdW1lLnRvTWFzdGVyKCk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJSQUNLXCIsIHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbiA9IFtdO1xyXG5cdFx0XHRcdC8vcmVtb3ZlIGFsbCBsb29wcyBmcm9tIFVJXHJcblx0XHRcdFx0dmFyIGxvb3BzVUkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCd0cmFja0xvb3AnK2luZGV4LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiTE9PUFNcIiwgbG9vcHNVSSk7XHJcblx0XHRcdFx0d2hpbGUobG9vcHNVSS5sZW5ndGggIT09IDApIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdMT09QUyBBUlInLCBsb29wc1VJKTtcclxuXHRcdFx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBsb29wc1VJLmxlbmd0aDtpKyspIHtcclxuXHRcdFx0XHRcdFx0bG9vcHNVSVtpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGxvb3BzVUlbaV0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dmFyIGxvb3BzVUkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCd0cmFja0xvb3AnK2luZGV4LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzY29wZS5zb2xvID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBvdGhlclRyYWNrcyA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLm1hcChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHRcdGlmKHRyYWNrICE9PSBzY29wZS50cmFjaykge1xyXG5cdFx0XHRcdFx0XHR0cmFjay5zaWxlbmNlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRyYWNrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pLmZpbHRlcihmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHRcdGlmKHRyYWNrICYmIHRyYWNrLnBsYXllcikgcmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0Y29uc29sZS5sb2cob3RoZXJUcmFja3MpO1xyXG5cdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKG90aGVyVHJhY2tzKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNjb3BlLnNpbGVuY2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0aWYoIXNjb3BlLnRyYWNrLnNpbGVuY2UpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IHRydWU7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUucmVjb3JkID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHRcdFx0dmFyIHJlY29yZGVyID0gc2NvcGUucmVjb3JkZXI7XHJcblxyXG5cdFx0XHRcdHZhciBjb250aW51ZVVwZGF0ZSA9IHRydWU7XHJcblxyXG5cdFx0XHRcdC8vYW5hbHlzZXIgc3R1ZmZcclxuXHRcdCAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYW5hbHlzZXJcIitpbmRleCk7XHJcblx0XHQgICAgICAgIHZhciBhbmFseXNlckNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9IHNjb3BlLmFuYWx5c2VyTm9kZTtcclxuXHRcdFx0XHR2YXIgYW5hbHlzZXJJZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cclxuXHRcdFx0XHRzY29wZS50cmFjay5yZWNvcmRpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcclxuXHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlcik7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gdHJ1ZTtcclxuXHJcblxyXG5cdFx0XHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcclxuXHRcdFx0XHRcdHZhciBTUEFDSU5HID0gMztcclxuXHRcdFx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xyXG5cdFx0XHRcdFx0dmFyIG51bUJhcnMgPSBNYXRoLnJvdW5kKDMwMCAvIFNQQUNJTkcpO1xyXG5cdFx0XHRcdFx0dmFyIGZyZXFCeXRlRGF0YSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XHJcblxyXG5cdFx0XHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxyXG5cclxuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgMzAwLCAxMDApO1xyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1JztcclxuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcclxuXHRcdFx0XHRcdHZhciBtdWx0aXBsaWVyID0gYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50IC8gbnVtQmFycztcclxuXHJcblx0XHRcdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmb3IgZWFjaCBmcmVxdWVuY3kgYmluLlxyXG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcclxuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZSA9IDA7XHJcblx0XHRcdFx0XHRcdHZhciBvZmZzZXQgPSBNYXRoLmZsb29yKCBpICogbXVsdGlwbGllciApO1xyXG5cdFx0XHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcclxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGo8IG11bHRpcGxpZXI7IGorKylcclxuXHRcdFx0XHRcdFx0ICAgIG1hZ25pdHVkZSArPSBmcmVxQnl0ZURhdGFbb2Zmc2V0ICsgal07XHJcblx0XHRcdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XHJcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUyID0gZnJlcUJ5dGVEYXRhW2kgKiBtdWx0aXBsaWVyXTtcclxuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9IFwiaHNsKCBcIiArIE1hdGgucm91bmQoKGkqMzYwKS9udW1CYXJzKSArIFwiLCAxMDAlLCA1MCUpXCI7XHJcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYoY29udGludWVVcGRhdGUpIHtcclxuXHRcdFx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRmdW5jdGlvbiBlbmRSZWNvcmRpbmcoKSB7XHJcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlcikudGhlbihmdW5jdGlvbiAocGxheWVyKSB7XHJcblx0XHRcdFx0XHRcdC8vdHJhY2sgdmFyaWFibGVzXHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcclxuXHJcblx0XHRcdFx0XHRcdC8vY3JlYXRlIHBsYXllclxyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBwbGF5ZXI7XHJcblx0XHRcdFx0XHRcdHBsYXllci5jb25uZWN0KHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vc3RvcCBhbmFseXNlclxyXG5cdFx0XHRcdFx0XHRjb250aW51ZVVwZGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vc2V0IFByb2plY3QgdmFyc1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuY3VycmVudGx5UmVjb3JkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QudW5NdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZihUb25lLlRyYW5zcG9ydC5zdGF0ZSA9PT0gXCJzdG9wcGVkXCIpIHtcclxuXHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcclxuXHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0YXJ0KCk7XHJcblxyXG5cdFx0XHRcdFx0dmFyIGNsaWNrID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdGFydCgpO1xyXG5cdFx0XHRcdFx0fSwgNTAwKTtcclxuXHJcblx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdFx0XHR3aW5kb3cuY2xlYXJJbnRlcnZhbChjbGljayk7XHJcblx0XHRcdFx0XHRcdFx0ZW5kUmVjb3JkaW5nKCk7XHJcblxyXG5cdFx0XHRcdFx0fSwgNDAwMCk7XHJcblxyXG5cdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0XHR9LCAyMDUwKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1dISUxFIFBMQVlJTkcnKTtcclxuXHRcdFx0XHRcdHZhciBuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xyXG5cdFx0XHRcdFx0dmFyIGVuZEJhciA9IG5leHRCYXIgKyAxO1xyXG5cclxuXHRcdFx0XHRcdHZhciByZWNJZCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0XHRcdH0sIDUwKTtcclxuXHRcdFx0XHRcdH0sIG5leHRCYXIudG9TdHJpbmcoKSArIFwibVwiKTtcclxuXHJcblxyXG5cdFx0XHRcdFx0dmFyIHJlY0VuZElkID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHJlY0lkKTtcclxuXHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShyZWNFbmRJZCk7XHJcblx0XHRcdFx0XHRcdGVuZFJlY29yZGluZygpO1xyXG5cclxuXHRcdFx0XHRcdH0sIGVuZEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRzY29wZS52b2x1bWVDaGFuZ2UgPSBmdW5jdGlvbiAoYW1vdW50KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ZPTCBBTU9VTlQnLCBhbW91bnQpO1xyXG5cclxuXHQgICAgICAgICAgICBpZiAodHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcclxuXHQgICAgICAgICAgICB2YXIgdm9sdW1lID0gcGFyc2VGbG9hdChhbW91bnQgLyAxMDAsIDEwKTtcclxuXHQgICAgICAgICAgICBjb25zb2xlLmxvZygnQUZURVIgLyAxMDAsIDEwJywgdm9sdW1lKTtcclxuXHJcblxyXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLnBsYXllcikgc2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSAgPSBhbW91bnQgLSAyMDtcclxuXHRcdFx0fVxyXG5cdCAgICAgICAgLy8gc2NvcGUuJHdhdGNoKCd0cmFjay52b2x1bWUnLCBzY29wZS52b2x1bWVDaGFuZ2UpO1xyXG5cclxuXHRcdFx0c2NvcGUucHJldmlldyA9IGZ1bmN0aW9uKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcclxuXHRcdFx0XHR2YXIgbmV4dEJhcjtcclxuXHRcdFx0XHRpZighc2NvcGUuJHBhcmVudC5wcmV2aWV3aW5nSWQpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ05FWFQnLCBuZXh0QmFyKTtcclxuXHRcdFx0XHRcdHZhciBwbGF5TGF1bmNoID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgcHJldmlld0ludGV2YWwgPSBUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ1NIT1VMRCBQTEFZJyk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBsYXlMYXVuY2gpO1xyXG5cdFx0XHRcdFx0XHR9LCBcIjFtXCIpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LnByZXZpZXdpbmdJZCA9IHByZXZpZXdJbnRldmFsO1xyXG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnQUxSRUFEWSBQUkVWSUVXSU5HJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZWZmZWN0KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhhbW91bnQpO1xyXG5cclxuXHRcdFx0XHRlZmZlY3Qud2V0LnZhbHVlID0gYW1vdW50IC8gMTAwMDtcclxuXHRcdFx0fTtcclxuXHJcblx0XHR9XHJcblx0XHRcclxuXHJcblx0fVxyXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=