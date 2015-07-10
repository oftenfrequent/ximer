'use strict';
var app = angular.module('FullstackGeneratedApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'ngStorage', 'ngMaterial']);

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

				AuthService.getLoggedInUser().then(function (loggedInUser) {
								$scope.loggedInUser = loggedInUser;
								$scope.displayAProject = function (something) {
												console.log('THING', something);
												if ($scope.loggedInUser._id === $stateParams.theID) {
																$state.go('project', { projectID: something._id });
												}
												console.log('displaying a project', $scope.parent);
								};
				});

				ForkFactory.getWeb().then(function (webs) {
								$scope.forks = webs;
								console.log('webs are', $scope.forks);
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
								controller: 'LandingPageController'
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
				$scope.nameChanging = false;
				$scope.tracks = [];
				$scope.loading = true;
				$scope.projectId = $stateParams.projectID;
				$scope.position = 0;
				$scope.playing = false;
				$scope.currentlyRecording = false;
				$scope.previewingId = null;

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
								if (maxMeasure < 32) maxMeasure = 34;
								for (var i = 0; i < maxMeasure; i++) {
												$scope.numMeasures.push(i);
								}
								console.log('MEASURES', $scope.numMeasures);

								ToneTimelineFct.createTransport(project.endMeasure).then(function (metronome) {
												$scope.metronome = metronome;
								});
								ToneTimelineFct.changeBpm(project.bpm);
				});

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
								console.log('POS', $scope.position);
								var playHead = document.getElementById('playbackHead');
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
								//stop and track currently being previewed
								if ($scope.previewingId) {
												Tone.Transport.clearInterval($scope.previewingId);
												$scope.previewingId = null;
								}
				};
				$scope.nameClick = function () {
								console.log('NAME Clicked');
								$scope.nameChanging = true;
								document.getElementById('projectNameInput').focus();
				};
				$scope.nameChange = function (newName) {
								console.log('NEW', newName);
								if (newName) {
												$scope.nameChanging = false;
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
								} else {
												$scope.metronome.volume.value = 0;
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

app.controller('HomeController', function ($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state, $mdToast) {
				console.log('in Home controller');
				var trackBucket = [];
				console.log('HASDFJANDSJ');
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
				$scope.isLoggedIn = function () {
								return AuthService.isAuthenticated();
				};
				if ($scope.isLoggedIn()) $state.go('loggedInHome');
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
								return $http.post('api/projects/soundcloud').then(function (response) {
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
																drawBuffer(300, 100, canvas.getContext('2d'), buffers[0]);
																window.latestBuffer = buffers[0];
																window.latestRecordingImage = canvas.toDataURL('image/png');

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
																				console.log(Tone.Transport.position);
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
								var phaser = new Tone.Phaser();
								var distort = new Tone.Distortion();
								var pingpong = new Tone.PingPongDelay('1m');

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
'use strict';
app.directive('fullstackLogo', function () {
				return {
								restrict: 'E',
								templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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

								$scope.uploadProject = function (project) {
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
												setTimeout(function () {
																var canvasRow = element[0].getElementsByClassName('canvas-box');
																for (var i = 0; i < canvasRow.length; i++) {
																				var canvasClasses = canvasRow[i].parentNode.classList;

																				for (var j = 0; j < canvasClasses.length; j++) {
																								if (canvasClasses[j] === 'taken') {
																												angular.element(canvasRow[i]).append($compile('<canvas width=\'198\' height=\'98\' id=\'wavedisplay\' class=\'item\' style=\'position: absolute; background: url(data:image/png;base64,' + scope.track.img + ');\' draggable></canvas>')(scope));
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

																// adding raw image to db
																if (!scope.track.img) {
																				scope.track.img = window.latestRecordingImage.replace(/^data:image\/png;base64,/, '');
																}
																scope.track.location.push(position);
																scope.track.location.sort();
																var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
																angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + index + '-' + position + '\' class=\'item trackLoop' + index + '\' style=\'position: absolute; background: url(data:image/png;base64,' + scope.track.img + ');\' draggable></canvas>')(scope));
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
																								angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + trackIndex + '-' + position + '\' class=\'item trackLoop' + trackIndex + '\' style=\'position: absolute; background: url(data:image/png;base64,' + scope.track.img + ');\' draggable></canvas>')(scope));
																								// console.log('track', scope.track);
																								// angular.element(canvasRow[position]).append($compile("<canvas width='198' height='98' position='" + position + "' timelineId='"+timelineId+"' id='mdisplay" +  trackIndex + "-" + position + "' class='item trackLoop"+trackIndex+"' style='position: absolute;' draggable></canvas>")(scope));
																								// var canvas = document.getElementById( "mdisplay" +  trackIndex + "-" + position );
																								// drawBuffer( 198, 98, canvas.getContext('2d'), scope.track.buffer );
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
																scope.track.location = [];
																//remove all loops from UI
																var loopsUI = document.getElementsByClassName('trackLoop' + index.toString());
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
																if (Tone.Transport.state === 'stopped') {
																				ToneTimelineFct.muteAll(scope.$parent.tracks);
																				scope.$parent.metronome.start();

																				var click = window.setInterval(function () {
																								scope.$parent.metronome.stop();
																								scope.$parent.metronome.start();
																				}, 500);

																				window.setTimeout(function () {
																								RecorderFct.recordStop(index, recorder).then(function (player) {
																												scope.track.recording = false;
																												scope.track.empty = false;
																												continueUpdate = false;
																												window.cancelAnimationFrame(analyserId);
																												scope.track.player = player;
																												// scope.track.player.loop = true;
																												scope.track.buffer = window.latestBuffer;
																												scope.track.rawAudio = window.latestRecording;
																												player.connect(scope.track.effectsRack[0]);
																												scope.$parent.metronome.stop();
																												window.clearInterval(click);
																												scope.$parent.currentlyRecording = false;
																												scope.$parent.stop();
																												ToneTimelineFct.unMuteAll(scope.$parent.tracks);
																								});
																				}, 4000);

																				window.setTimeout(function () {
																								RecorderFct.recordStart(recorder, index);
																				}, 2000);
																} else {
																				console.log('WHILE PLAYING');
																				var nextBar = parseInt(Tone.Transport.position.split(':')[0]) + 1;
																				var endBar = nextBar + 1;

																				var recId = Tone.Transport.setTimeline(function () {
																								RecorderFct.recordStart(recorder, index);
																				}, nextBar.toString() + 'm');

																				var recEndId = Tone.Transport.setTimeline(function () {
																								console.log('TICKBACK ERROR?');
																								Tone.Transport.clearTimeline(parseInt(recId));
																								Tone.Transport.clearTimeline(parseInt(recEndId));
																								RecorderFct.recordStop(index, recorder).then(function (player) {
																												scope.track.recording = false;
																												scope.track.empty = false;
																												continueUpdate = false;
																												window.cancelAnimationFrame(analyserId);
																												scope.track.player = player;
																												// scope.track.player.loop = true;
																												scope.track.buffer = window.latestBuffer;
																												scope.track.rawAudio = window.latestRecording;
																												player.connect(scope.track.effectsRack[0]);
																												scope.$parent.currentlyRecording = false;
																												scope.$parent.stop();
																												// Tone.Transport.stop();
																												// scope.$parent.metronome.stop();
																								});
																				}, endBar.toString() + 'm');
																}
												};
												scope.preview = function (currentlyPreviewing) {
																// if(Tone.Transport.state === "stopped") {
																// 	if(currentlyPreviewing) {
																// 		scope.track.player.stop();
																// 		scope.track.previewing = false;
																// 	} else {
																// 		scope.track.player.start();
																// 		scope.track.previewing = true;
																// 	}
																// } else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZvcmt3ZWIvZm9ya3dlYi5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwicHJvamVjdC9wcm9qZWN0LmpzIiwibG9naW4vbG9naW4uanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9MYW5kaW5nUGFnZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTmV3UHJvamVjdENvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVGltZWxpbmVDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1VzZXJDb250cm9sbGVyLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9BbmFseXNlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRm9ya0ZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0hvbWVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1Byb2plY3RGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbG9hZGluZy1naWYvbG9hZGluZy1naWYuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBOztBQUVBLHFCQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLHNCQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxHQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7OztBQUdBLFFBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxJQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBO0tBQ0EsQ0FBQTs7OztBQUlBLGNBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBOzs7QUFHQSxtQkFBQTtTQUNBOztBQUVBLFlBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxFQUFBOzs7QUFHQSxtQkFBQTtTQUNBOzs7QUFHQSxhQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxnQkFBQSxJQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0EsTUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNsREEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxVQUFBO0FBQ0EsbUJBQUEsRUFBQSx5QkFBQTtBQUNBLGtCQUFBLEVBQUEsbUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsR0FBQSxLQUFBLFlBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7YUFDQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHNCQUFBLEVBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUM1QkEsQ0FBQSxZQUFBOztBQUVBLGdCQUFBLENBQUE7OztBQUdBLFFBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsd0JBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxPQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLG9CQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtBQUNBLHNCQUFBLEVBQUEsc0JBQUE7QUFDQSx3QkFBQSxFQUFBLHdCQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsVUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsYUFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtTQUNBLENBQUE7QUFDQSxlQUFBO0FBQ0EseUJBQUEsRUFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7U0FDQSxDQUNBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7Ozs7QUFJQSxZQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBOzs7Ozs7QUFNQSxnQkFBQSxJQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBOzs7OztBQUtBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FFQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsaUJBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNkJBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxFQUFBLENBQUE7QUN4SUEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxPQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxzQkFBQTtBQUNBLGtCQUFBLEVBQUEsdUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDWkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxxQkFBQTtBQUNBLG1CQUFBLEVBQUEseUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxRQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLFdBQUEsRUFBQTs7O0FBR0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsY0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsbUVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxlQUFBLENBQUEsWUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsWUFBQSxHQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsU0FBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLFlBQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsUUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLGtCQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSx1QkFBQSxFQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLG9CQUFBLGNBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsdUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLHNDQUFBLEVBQUEsQ0FBQTtxQkFDQTtpQkFDQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTs7QUFFQSx3QkFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7O0FBRUEsOEJBQUEsRUFBQSxDQUFBOztBQUVBLDRCQUFBLE1BQUEsS0FBQSxjQUFBLEVBQUE7QUFDQSxrQ0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxrQ0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO3lCQUNBO3FCQUNBLENBQUE7O0FBRUEsd0JBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSx5QkFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEseUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOzs7QUFHQSx5QkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLHdCQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsdUNBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO3FCQUNBLE1BQUE7QUFDQSw2QkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7cUJBQ0E7QUFDQSwwQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7aUJBQ0EsTUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtpQkFDQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0E7QUFDQSxrQkFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7U0FDQTs7OztBQUlBLGNBQUEsQ0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxVQUFBLEdBQUEsRUFBQSxFQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxhQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0E7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7O0FBSUEsdUJBQUEsQ0FBQSxlQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsWUFBQSxLQUFBLEdBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBOztBQUVBLFlBQUEsTUFBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLGNBQUEsQ0FBQSxrQkFBQSxDQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxPQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFVBQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxzQkFBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxjQUFBLENBQUEsa0JBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxLQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzlOQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxxQkFBQTtBQUNBLGtCQUFBLEVBQUEsV0FBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBO0FBQ0Esa0JBQUEsRUFBQSxZQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEscUJBQUE7QUFDQSxtQkFBQSxFQUFBLDBCQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQTs7O0FBR0EsWUFBQSxFQUFBO0FBQ0Esd0JBQUEsRUFBQSxJQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHdCQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsT0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxxQkFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFdBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSx3QkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHVCQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsWUFBQTtBQUNBLG1CQUFBLEVBQUEsd0JBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2pDQSxHQUFBLENBQUEsVUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG9CQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsb0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsR0FBQSxRQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUdBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsS0FBQSxHQUFBLFlBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsbUJBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSx5QkFBQSxFQUFBLElBQUE7QUFDQSx3QkFBQSxFQUFBLGNBQUE7QUFDQSx3QkFBQSxFQUFBLDBDQUFBO2FBQ0EsQ0FBQSxDQUFBOztBQUVBLHNCQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLGtCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFFBQUEsSUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFHQSxVQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFlBQUEsSUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO1NBQ0E7O0FBRUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGdCQUFBLElBQUEsS0FBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2FBQ0EsTUFDQTtBQUNBLG9CQUFBLEdBQUEsS0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUdBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7O0FBRUEsY0FBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBOztBQ3BFQSxHQUFBLENBQUEsVUFBQSxDQUFBLHVCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxRQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxNQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxvQkFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsTUFBQSxDQUFBOztBQUdBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLGlCQUFBLGNBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxRQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUE7O0FBRUEsZ0JBQUEsVUFBQSxHQUFBLFFBQUEsQ0FBQSxlQUFBLENBQUEsWUFBQSxHQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSxnQkFBQSxPQUFBLEdBQUEsVUFBQSxHQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxZQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSw4QkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTthQUNBLEVBQUEsRUFBQSxDQUFBLENBQUE7U0FDQTs7QUFFQSxzQkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFJQSxVQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbkRBLEdBQUEsQ0FBQSxVQUFBLENBQUEsc0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsYUFBQSxHQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDaEJBLEdBQUEsQ0FBQSxVQUFBLENBQUEsb0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQTs7QUFFQSxRQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsY0FBQSxDQUFBLGNBQUEsQ0FBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLFlBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLFlBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7QUFDQSwwQkFBQSxFQUFBLENBQUE7QUFDQSx3QkFBQSxNQUFBLEtBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSw4QkFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7O3FCQUVBO2lCQUNBLENBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0EsaUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7O0FBRUEsdUJBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOzs7Ozs7OztBQVFBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLFNBQUEsR0FBQSxDQUFBLENBQUEsU0FBQSxDQUFBOzs7QUFHQSxlQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsYUFBQSxFQUNBLE9BQUE7O0FBRUEsU0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxlQUFBLENBQUE7O2FBR0EsRUFBQSxHQUFBLENBQUEsQ0FBQTtTQUVBLEVBQUEsSUFBQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBOztBQUVBLFlBQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsRUFBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBTUEsQ0FBQSxDQUFBOztBQ3RHQSxHQUFBLENBQUEsVUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7O0FBRUEsY0FBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FHQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxNQUFBLENBQUEsWUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBLEtBQ0EsTUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsNEJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBR0EsQ0FBQSxDQUFBO0FDakNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFlBQUE7O0FBRUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsZUFBQSxFQUFBLFlBQUEsRUFBQSxjQUFBLEVBQUE7O0FBRUEsaUJBQUEsTUFBQSxHQUFBO0FBQ0EsZ0JBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxZQUFBLEdBQUEsSUFBQSxVQUFBLENBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSx3QkFBQSxDQUFBLG9CQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsMkJBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxnQkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLG9CQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSx5QkFBQSxHQUFBLFNBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7YUFDQTtBQUNBLGdCQUFBLGNBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7QUFDQSxjQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBR0EsUUFBQSxxQkFBQSxHQUFBLFNBQUEscUJBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxXQUFBO0FBQ0EsdUJBQUEsRUFBQSxlQUFBO0FBQ0EsNkJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUM1Q0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxNQUFBLEdBQUEsU0FBQSxNQUFBLEdBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFdBQUE7QUFDQSxlQUFBLEVBQUEsaUJBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNiQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxTQUFBLEVBQUE7OztBQUdBLFlBQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxLQUFBLENBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLElBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsZUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLFVBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLFNBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxnQkFBQSxHQUFBLFNBQUEsRUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxVQUFBLENBQUEsZ0JBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGFBQUEsR0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEseUJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFFBQUEsQ0FBQSxJ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LFFBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLG9CQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLG9CQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxZQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxvQkFBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7Ozs7QUFJQSx3QkFBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLGdDQUFBLENBQUEsY0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsa0JBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUlBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxnQkFBQSxNQUFBLEdBQUEs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LENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDRCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsU0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLEdBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEscUJBQUEsRUFBQSxZQUFBO0FBQ0EsdUJBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGlCQUFBLEdBQUEsU0FBQSxpQkFBQSxDQUFBLE1BQUEsRUFBQSxjQUFBLEVBQUE7O0FBRUEsWUFBQSxjQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxzQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO2FBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtTQUVBOztBQUVBLHNCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsR0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLGdCQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTthQUNBLEVBQUEsU0FBQSxDQUFBLENBQUE7Ozs7Ozs7U0FRQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFdBQUE7QUFDQSx1QkFBQSxFQUFBLGVBQUE7QUFDQSxpQkFBQSxFQUFBLFNBQUE7QUFDQSx5QkFBQSxFQUFBLGlCQUFBO0FBQ0EsdUJBQUEsRUFBQSxlQUFBO0FBQ0EsZUFBQSxFQUFBLE9BQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDaEdBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxRQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7OztBQUdBLGVBQUEsTUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLGdCQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLElBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLGVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLE1BQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsUUFBQSxHQUFBLFFBQUEsSUFBQSxRQUFBLEdBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsa0JBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxnQkFBQSxNQUFBLENBQUE7O0FBRUEsa0JBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsRUFBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxpQkFBQSxHQUFBLFNBQUEsaUJBQUEsQ0FBQSxHQUFBLEVBQUE7O0FBR0EsWUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsT0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsYUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLFlBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQTs7QUFFQSxjQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7U0FDQSxFQUFBLE9BQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxtQkFBQSxHQUFBLFNBQUEsbUJBQUEsQ0FBQSxNQUFBLEVBQUEsYUFBQSxFQUFBLFVBQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsYUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxrQkFBQSxHQUFBLFNBQUEsa0JBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLG9CQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsY0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7QUFDQSxvQ0FBQSxFQUFBLDRCQUFBO0FBQ0EsMkJBQUEsRUFBQSxtQkFBQTtBQUNBLDBCQUFBLEVBQUEsa0JBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2hGQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBOztBQUVBLGNBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsSUFBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLDZCQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBOztBQUVBLGdCQUFBLEVBQUEsa0JBQUEsUUFBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsY0FBQSxFQUFBLFFBQUEsRUFBQSxZQUFBLEVBQUEsWUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUN4QkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxZQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBOztBQUVBLGFBQUEsQ0FBQSxZQUFBLENBQUEsYUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsZ0JBQUEsR0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxLQUFBLENBQUE7U0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxnQkFBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQTtTQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7S0FFQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQUEsU0FDQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUE7O0FBRUEsZ0JBQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLEdBQUEsTUFBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBOztBQUVBLG9CQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7O0FBR0Esb0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLFNBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQTtBQUNBLG9CQUFBLGFBQUEsQ0FBQTtBQUNBLG9CQUFBLFNBQUEsQ0FBQTs7QUFFQSxxQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSx3QkFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBLFlBQUEsRUFBQTs7QUFFQSw0QkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTs7QUFFQSw0QkFBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUE7O0FBRUEsNkJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBOztBQUVBLGdDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxRQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsMENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSw2Q0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQTtBQUNBLHlDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOzZCQUVBO3lCQUNBO3FCQUNBO2lCQUNBOztBQUdBLHFCQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLDZCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsYUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTs7O0FBR0EscUJBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNoSEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxrREFBQTtBQUNBLGtCQUFBLEVBQUEsMkJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsMkJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxnQkFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsS0FBQSx1QkFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0Esb0JBQUEsWUFBQSxDQUFBLEtBQUEsS0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO2FBQ0E7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxjQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxZQUFBLENBQUEsQ0FBQTtTQUVBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxvQkFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBSUEsQ0FBQSxDQUFBO0FDM0NBLEdBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSwrQ0FBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNMQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLHlDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsR0FBQTtBQUNBLDJCQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esd0JBQUEsSUFBQSxFQUFBO0FBQ0EsNkJBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxTQUFBLEVBQUEsS0FBQSxFQUFBLDhCQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUNBLENBQUE7cUJBQ0E7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtBQUNBLHFCQUFBLEVBQUEsQ0FBQTs7Ozs7Ozs7QUFRQSxpQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLHVCQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLDJCQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSwwQkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGdCQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLDJCQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EscUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxtQkFBQSxFQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7U0FFQTs7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDOURBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5REFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNOQSxHQUFBLENBQUEsU0FBQSxDQUFBLGtCQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG9EQUFBO0FBQ0Esa0JBQUEsRUFBQSw0QkFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSw0QkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFJQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxHQUFBLEtBQUEsWUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTthQUNBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsc0JBQUEsRUFBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEVBQUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsS0FBQSxHQUFBLFlBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxtQkFBQSxPQUFBLENBQUEsR0FBQSxDQUFBOztBQUVBLHNCQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLGtCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLGFBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsYUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDakRBLEdBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxRQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx1Q0FBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxlQUFBLEdBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsWUFBQTtBQUNBLG9CQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLHdCQUFBLGFBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQTs7QUFFQSx5QkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLGFBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSw0QkFBQSxhQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsT0FBQSxFQUFBO0FBQ0EsbUNBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSwwSUFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO3lCQUNBO3FCQUNBO2lCQUNBO2FBQ0EsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFFQSxvQkFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBOztBQUVBLDJCQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGdDQUFBLEVBQUEsQ0FBQTtxQkFDQTtpQkFDQTs7O0FBR0Esb0JBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsb0JBQUEsQ0FBQSxPQUFBLENBQUEsMEJBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTtpQkFDQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLGlEQUFBLEdBQUEsUUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLGtCQUFBLEdBQUEsS0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsMkJBQUEsR0FBQSxLQUFBLEdBQUEsdUVBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSwwQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTthQUVBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxhQUFBLEVBQUEsVUFBQSxFQUFBO0FBQ0EsdUJBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLGdDQUFBLENBQUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBR0EsaUJBQUEsQ0FBQSxpQkFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG9CQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLHdCQUFBLFNBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLDRCQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSw0QkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLGlEQUFBLEdBQUEsUUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsMkJBQUEsR0FBQSxVQUFBLEdBQUEsdUVBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSwwQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTs7Ozs7cUJBS0EsTUFBQTs7OzRCQU9BLGFBQUEsR0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxtQ0FBQSxJQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7eUJBQ0E7O0FBUkEsNEJBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsNkJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsb0NBQUEsQ0FBQSxrQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBS0EscUNBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtxQkFDQTtpQkFDQSxNQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7aUJBQ0E7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFFQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFB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QSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDJCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsT0FBQSxDQUFBLGtCQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLHlCQUFBLE1BQUEsR0FBQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsZ0NBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLG1DQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsbUNBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsbUNBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EseUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSw0QkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsNEJBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLDZCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsaUNBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsNEJBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLHVDQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO3FCQUNBO0FBQ0Esd0JBQUEsY0FBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO3FCQUNBO2lCQUNBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsbUNBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTs7QUFFQSx3QkFBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO3FCQUNBLEVBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsMEJBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLG1DQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxpQ0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLDBDQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxpQ0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsZUFBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGtDQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxpQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLDJDQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7eUJBQ0EsQ0FBQSxDQUFBO3FCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsMEJBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLG1DQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtxQkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO2lCQUNBLE1BQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsTUFBQSxHQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsd0JBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxtQ0FBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7cUJBQ0EsRUFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBR0Esd0JBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSwrQkFBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7QUFDQSw0QkFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSw0QkFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsUUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSwwQ0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGtDQUFBLENBQUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7O0FBRUEsaUNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxpQ0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTtBQUNBLGtDQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxpQ0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBOzs7eUJBR0EsQ0FBQSxDQUFBO3FCQUVBLEVBQUEsTUFBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO2lCQUNBO2FBQ0EsQ0FBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxHQUFBLFVBQUEsbUJBQUEsRUFBQTs7Ozs7Ozs7OztBQVVBLG9CQUFBLE9BQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLHdCQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLCtCQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7cUJBQ0EsTUFBQTtBQUNBLCtCQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtxQkFDQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsNEJBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxtQ0FBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLGdDQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTt5QkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxHQUFBLGNBQUEsQ0FBQTtxQkFDQSxFQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTtpQkFDQSxNQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO2lCQUNBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLGFBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLHNCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQTtTQUVBOztLQUdBLENBQUE7Q0FDQSxDQUFBLENBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnbmdTdG9yYWdlJywgJ25nTWF0ZXJpYWwnXSk7XHJcblxyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XHJcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cclxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcclxufSk7XHJcblxyXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXHJcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxyXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcclxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxyXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xyXG5cclxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcclxuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cclxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XHJcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXHJcbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XHJcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cclxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxyXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXHJcbiAgICAgICAgICAgIGlmICh1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmb3Jrd2ViJywge1xyXG4gICAgICAgIHVybDogJy9mb3Jrd2ViJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Zvcmt3ZWIvZm9ya3dlYi5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiBcIkZvcmtXZWJDb250cm9sbGVyXCJcclxuICAgIH0pO1xyXG5cclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcignRm9ya1dlYkNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBQcm9qZWN0RmN0LCBBdXRoU2VydmljZSwgRm9ya0ZhY3Rvcnkpe1xyXG5cclxuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcclxuXHRcdFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuXHRcdFx0JHNjb3BlLmRpc3BsYXlBUHJvamVjdCA9IGZ1bmN0aW9uKHNvbWV0aGluZyl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RISU5HJywgc29tZXRoaW5nKTtcclxuXHRcdFx0XHRpZigkc2NvcGUubG9nZ2VkSW5Vc2VyLl9pZCA9PT0gJHN0YXRlUGFyYW1zLnRoZUlEKXtcclxuXHRcdFx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHNvbWV0aGluZy5faWR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJkaXNwbGF5aW5nIGEgcHJvamVjdFwiLCAkc2NvcGUucGFyZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Rm9ya0ZhY3RvcnkuZ2V0V2ViKCkudGhlbihmdW5jdGlvbih3ZWJzKXtcclxuXHQgICAgICAgICRzY29wZS5mb3JrcyA9IHdlYnM7XHJcblx0ICAgICAgICBjb25zb2xlLmxvZygnd2VicyBhcmUnLCAkc2NvcGUuZm9ya3MpO1xyXG5cdCAgICB9KTtcclxuXHRcclxufSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxyXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xyXG5cclxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XHJcblxyXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcclxuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xyXG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xyXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcclxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXHJcbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xyXG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXHJcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXHJcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxyXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxyXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcclxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XHJcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XHJcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcclxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxyXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxyXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcclxuICAgICAgICAgICAgJyRpbmplY3RvcicsXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcclxuXHJcbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxyXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cclxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcclxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxyXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXHJcbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXHJcbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxyXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcclxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zaWdudXAgPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coY3JlZGVudGlhbHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIGNyZWRlbnRpYWxzKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oIG9uU3VjY2Vzc2Z1bExvZ2luIClcclxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgc2lnbnVwIGNyZWRlbnRpYWxzLicgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcclxuXHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XHJcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pO1xyXG5cclxufSkoKTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9nZ2VkSW5Ib21lJywge1xyXG4gICAgICAgIHVybDogJy9ob21lJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcidcclxuICAgIH0pXHJcblx0LnN0YXRlKCdob21lJyx7XHJcblx0XHR1cmw6ICcvJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvaG9tZS9sYW5kaW5nLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0xhbmRpbmdQYWdlQ29udHJvbGxlcidcclxuXHR9KTtcclxufSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9qZWN0Jywge1xyXG4gICAgICAgIHVybDogJy9wcm9qZWN0Lzpwcm9qZWN0SUQnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcHJvamVjdC9wcm9qZWN0Lmh0bWwnXHJcbiAgICB9KTtcclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcignUHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEF1dGhTZXJ2aWNlKSB7XHJcblxyXG5cdC8vd2luZG93IGV2ZW50c1xyXG5cdHdpbmRvdy5vbmJsdXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgJHNjb3BlLnN0b3AoKTtcclxuXHRcdCRzY29wZS4kZGlnZXN0KCk7XHJcbiAgICB9O1xyXG4gICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gbGVhdmUgdGhpcyBwYWdlIGJlZm9yZSBzYXZpbmcgeW91ciB3b3JrP1wiO1xyXG5cdH07XHJcblx0d2luZG93Lm9udW5sb2FkID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZXMoKTtcclxuXHR9XHJcblxyXG5cdHZhciBtYXhNZWFzdXJlID0gMDtcclxuXHJcblx0Ly8gbnVtYmVyIG9mIG1lYXN1cmVzIG9uIHRoZSB0aW1lbGluZVxyXG5cdCRzY29wZS5udW1NZWFzdXJlcyA9IF8ucmFuZ2UoMCwgNjApO1xyXG5cclxuXHQvLyBsZW5ndGggb2YgdGhlIHRpbWVsaW5lXHJcblx0JHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG5cclxuXHQvL0luaXRpYWxpemUgcmVjb3JkZXIgb24gcHJvamVjdCBsb2FkXHJcblx0UmVjb3JkZXJGY3QucmVjb3JkZXJJbml0KCkudGhlbihmdW5jdGlvbiAocmV0QXJyKSB7XHJcblx0XHQkc2NvcGUucmVjb3JkZXIgPSByZXRBcnJbMF07XHJcblx0XHQkc2NvcGUuYW5hbHlzZXJOb2RlID0gcmV0QXJyWzFdO1xyXG5cdH0pLmNhdGNoKGZ1bmN0aW9uIChlKXtcclxuICAgICAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBhdWRpbycpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xyXG4gICAgfSk7XHJcblxyXG5cdCRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcclxuXHQkc2NvcGUubmFtZUNoYW5naW5nID0gZmFsc2U7XHJcblx0JHNjb3BlLnRyYWNrcyA9IFtdO1xyXG5cdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHQkc2NvcGUucHJvamVjdElkID0gJHN0YXRlUGFyYW1zLnByb2plY3RJRDtcclxuXHQkc2NvcGUucG9zaXRpb24gPSAwO1xyXG5cdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XHJcblx0JHNjb3BlLmN1cnJlbnRseVJlY29yZGluZyA9IGZhbHNlO1xyXG5cdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xyXG5cclxuXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCRzY29wZS5wcm9qZWN0SWQpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcclxuXHRcdHZhciBsb2FkZWQgPSAwO1xyXG5cdFx0Y29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcclxuXHRcdCRzY29wZS5wcm9qZWN0TmFtZSA9IHByb2plY3QubmFtZTtcclxuXHJcblx0XHRpZiAocHJvamVjdC50cmFja3MubGVuZ3RoKSB7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZygncHJvamVjdC50cmFja3MubGVuZ3RoJywgcHJvamVjdC50cmFja3MubGVuZ3RoKTtcclxuXHJcblx0XHRcdHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XHJcblxyXG5cdFx0XHRcdHZhciBsb2FkYWJsZVRyYWNrcyA9IFtdO1xyXG5cclxuXHRcdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xyXG5cdFx0XHRcdFx0XHRsb2FkYWJsZVRyYWNrcysrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRpZiAodHJhY2sudXJsKSB7XHJcblxyXG5cdFx0XHRcdFx0dmFyIGRvbmVMb2FkaW5nID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0XHRcdFx0bG9hZGVkKys7XHJcblxyXG5cdFx0XHRcdFx0XHRpZihsb2FkZWQgPT09IGxvYWRhYmxlVHJhY2tzKSB7XHJcblx0XHRcdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHQkc2NvcGUuJGRpZ2VzdCgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdHZhciBtYXggPSBNYXRoLm1heC5hcHBseShudWxsLCB0cmFjay5sb2NhdGlvbik7XHJcblx0XHRcdFx0XHRpZihtYXggKyAyID4gbWF4TWVhc3VyZSkgbWF4TWVhc3VyZSA9IG1heCArIDI7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdHRyYWNrLmVtcHR5ID0gZmFsc2U7XHJcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdC8vIFRPRE86IHRoaXMgaXMgYXNzdW1pbmcgdGhhdCBhIHBsYXllciBleGlzdHNcclxuXHRcdFx0XHRcdHRyYWNrLnBsYXllciA9IFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBkb25lTG9hZGluZyk7XHJcblx0XHRcdFx0XHQvL2luaXQgZWZmZWN0cywgY29ubmVjdCwgYW5kIGFkZCB0byBzY29wZVxyXG5cclxuXHRcdFx0XHRcdHRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKHRyYWNrLmVmZmVjdHNSYWNrKTtcclxuXHRcdFx0XHRcdHRyYWNrLnBsYXllci5jb25uZWN0KHRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcclxuXHJcblx0XHRcdFx0XHRpZih0cmFjay5sb2NhdGlvbi5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0LmFkZExvb3BUb1RpbWVsaW5lKHRyYWNrLnBsYXllciwgdHJhY2subG9jYXRpb24pO1xyXG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRyYWNrLmVtcHR5ID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG4gICAgXHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdHRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoWzAsIDAsIDAsIDBdKTtcclxuICAgIFx0XHRcdFx0dHJhY2sucGxheWVyID0gbnVsbDtcclxuICAgIFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKHRyYWNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JHNjb3BlLm1heE1lYXN1cmUgPSAzMjtcclxuICBcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDg7IGkrKykge1xyXG4gICAgXHRcdFx0XHR2YXIgb2JqID0ge307XHJcbiAgICBcdFx0XHRcdG9iai5lbXB0eSA9IHRydWU7XHJcbiAgICBcdFx0XHRcdG9iai5yZWNvcmRpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0b2JqLm9uVGltZWxpbmUgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0b2JqLnByZXZpZXdpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0b2JqLnNpbGVuY2UgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0b2JqLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLCAwLCAwLCAwXSk7XHJcbiAgICBcdFx0XHRcdG9iai5wbGF5ZXIgPSBudWxsO1xyXG4gICAgXHRcdFx0XHRvYmoubmFtZSA9ICdUcmFjayAnICsgKGkrMSk7XHJcbiAgICBcdFx0XHRcdG9iai5sb2NhdGlvbiA9IFtdO1xyXG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcclxuICBcdFx0XHR9XHJcbiAgXHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvL2R5bmFtaWNhbGx5IHNldCBtZWFzdXJlc1xyXG5cdFx0Ly9pZiBsZXNzIHRoYW4gMTYgc2V0IDE4IGFzIG1pbmltdW1cclxuXHRcdCRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xyXG5cdFx0aWYobWF4TWVhc3VyZSA8IDMyKSBtYXhNZWFzdXJlID0gMzQ7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1heE1lYXN1cmU7IGkrKykge1xyXG5cdFx0XHQkc2NvcGUubnVtTWVhc3VyZXMucHVzaChpKTtcclxuXHRcdH1cclxuXHRcdGNvbnNvbGUubG9nKCdNRUFTVVJFUycsICRzY29wZS5udW1NZWFzdXJlcyk7XHJcblxyXG5cclxuXHJcblx0XHRUb25lVGltZWxpbmVGY3QuY3JlYXRlVHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XHJcblx0XHRcdCRzY29wZS5tZXRyb25vbWUgPSBtZXRyb25vbWU7XHJcblx0XHR9KTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xyXG5cclxuXHR9KTtcclxuXHJcblx0JHNjb3BlLmRyb3BJblRpbWVsaW5lID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHR2YXIgdHJhY2sgPSBzY29wZS50cmFja3NbaW5kZXhdO1xyXG5cdH1cclxuXHJcblx0JHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHR9O1xyXG5cclxuXHQkc2NvcGUucGxheSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdCRzY29wZS5wbGF5aW5nID0gdHJ1ZTtcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uID0gJHNjb3BlLnBvc2l0aW9uLnRvU3RyaW5nKCkgKyBcIjowOjBcIjtcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcblx0fVxyXG5cdCRzY29wZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XHJcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xyXG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXTtcclxuXHRcdGNvbnNvbGUubG9nKCdQT1MnLCAkc2NvcGUucG9zaXRpb24pO1xyXG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICgkc2NvcGUucG9zaXRpb24gKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4JztcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnBhdXNlKCk7XHJcblx0fVxyXG5cdCRzY29wZS5zdG9wID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JHNjb3BlLnBsYXlpbmcgPSBmYWxzZTtcclxuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XHJcblx0XHQkc2NvcGUucG9zaXRpb24gPSAwO1xyXG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICczMDBweCc7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XHJcblx0XHQvL3N0b3AgYW5kIHRyYWNrIGN1cnJlbnRseSBiZWluZyBwcmV2aWV3ZWRcclxuXHRcdGlmKCRzY29wZS5wcmV2aWV3aW5nSWQpIHtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJJbnRlcnZhbCgkc2NvcGUucHJldmlld2luZ0lkKTtcclxuXHRcdFx0JHNjb3BlLnByZXZpZXdpbmdJZCA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cdCRzY29wZS5uYW1lQ2xpY2sgPSBmdW5jdGlvbigpIHtcclxuXHRcdGNvbnNvbGUubG9nKCdOQU1FIENsaWNrZWQnKTtcclxuXHRcdCRzY29wZS5uYW1lQ2hhbmdpbmcgPSB0cnVlO1xyXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Byb2plY3ROYW1lSW5wdXQnKS5mb2N1cygpO1xyXG5cdH1cclxuXHQkc2NvcGUubmFtZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcclxuXHRcdGNvbnNvbGUubG9nKCdORVcnLCBuZXdOYW1lKTtcclxuXHRcdGlmKG5ld05hbWUpIHtcclxuXHRcdFx0JHNjb3BlLm5hbWVDaGFuZ2luZyA9IGZhbHNlO1xyXG5cdFx0XHQkc2NvcGUubmFtZUVycm9yID0gZmFsc2U7XHJcblx0XHRcdFByb2plY3RGY3QubmFtZUNoYW5nZShuZXdOYW1lLCAkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUkVTXCIsIHJlc3BvbnNlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQkc2NvcGUubmFtZUVycm9yID0gXCJZb3UgbXVzdCBzZXQgYSBuYW1lIVwiO1xyXG5cdFx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBcIlVudGl0bGVkXCI7XHJcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9qZWN0TmFtZUlucHV0JykuZm9jdXMoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdCRzY29wZS50b2dnbGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZigkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9PT0gMCkge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IC0xMDA7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIFJlY29yZGVyRmN0LnNlbmRUb0FXUygkc2NvcGUudHJhY2tzLCAkc2NvcGUucHJvamVjdElkLCAkc2NvcGUucHJvamVjdE5hbWUpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcclxuXHJcbiAgICB9KTtcclxuICB9O1xyXG4gIFxyXG4gICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcclxuICAgIH07XHJcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xyXG4gICAgICAgIHVybDogJy9sb2dpbicsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAkc2NvcGUubG9naW4gPSB7fTtcclxuICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xyXG4gICAgICAgIHVybDogJy9zaWdudXAnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcclxuICAgIH0pO1xyXG5cclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xyXG5cclxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcclxuICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XHJcblxyXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XHJcbiAgICAgICAgQXV0aFNlcnZpY2Uuc2lnbnVwKHNpZ251cEluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VyUHJvZmlsZScsIHtcclxuICAgICAgICB1cmw6ICcvdXNlcnByb2ZpbGUvOnRoZUlEJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvdXNlcnByb2ZpbGUuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJyxcclxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5hcnRpc3RJbmZvJywge1xyXG4gICAgICAgIHVybDogJy9pbmZvJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvaW5mby5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXHJcbiAgICB9KVxyXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5wcm9qZWN0Jywge1xyXG4gICAgICAgIHVybDogJy9wcm9qZWN0cycsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2plY3RzLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2VycycsIHtcclxuICAgICAgICB1cmw6ICcvZm9sbG93ZXJzJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93ZXJzLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2luZycsIHtcclxuICAgICAgICB1cmw6ICcvZm9sbG93aW5nJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93aW5nLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pO1xyXG5cclxufSk7XHJcblxyXG4iLCJhcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBUb25lVHJhY2tGY3QsIFByb2plY3RGY3QsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCAkbWRUb2FzdCkge1xyXG5cdGNvbnNvbGUubG9nKCdpbiBIb21lIGNvbnRyb2xsZXInKTtcclxuXHR2YXIgdHJhY2tCdWNrZXQgPSBbXTtcclxuXHRjb25zb2xlLmxvZygnSEFTREZKQU5EU0onKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG5cclxuXHQkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICB9O1xyXG5cclxuICAgICRzY29wZS5wcm9qZWN0cyA9IGZ1bmN0aW9uICgpe1xyXG4gICAgXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCkudGhlbihmdW5jdGlvbihwcm9qZWN0cyl7XHJcbiAgICBcdFx0JHNjb3BlLmFsbFByb2plY3RzID0gcHJvamVjdHM7XHJcbiAgICBcdH0pO1xyXG4gICAgfTtcclxuXHQkc2NvcGUucHJvamVjdHMoKTtcclxuXHJcblxyXG5cdCRzY29wZS5tYWtlRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xyXG5cdFx0XHRjb25zb2xlLmxvZygnbG9nZ2VkSW5Vc2VyJywgbG9nZ2VkSW5Vc2VyKTtcclxuXHRcdFx0cHJvamVjdC5vd25lciA9IGxvZ2dlZEluVXNlci5faWQ7XHJcblx0XHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XHJcblx0XHRcdGRlbGV0ZSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0Y29uc29sZS5sb2cocHJvamVjdCk7XHJcblx0XHRcdCRtZFRvYXN0LnNob3coe1xyXG5cdFx0XHRcdGhpZGVEZWxheTogMjAwMCxcclxuXHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXHJcblx0XHRcdFx0dGVtcGxhdGU6XCI8bWQtdG9hc3Q+IEl0J3MgYmVlbiBmb3JrZWQgPC9tZC10b2FzdD5cIlxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdFByb2plY3RGY3QuY3JlYXRlQUZvcmsocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmsgcmVzcG9uc2UgaXMnLCByZXNwb25zZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHRcclxuXHR9XHJcblx0XHRcclxuXHR2YXIgc3RvcCA9ZmFsc2U7XHJcblxyXG5cclxuXHQkc2NvcGUuc2FtcGxlVHJhY2sgPSBmdW5jdGlvbih0cmFjayl7XHJcblxyXG5cdFx0aWYoc3RvcD09PXRydWUpe1xyXG5cdFx0XHQkc2NvcGUucGxheWVyLnN0b3AoKTtcclxuXHRcdH1cclxuXHJcblx0XHRUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZnVuY3Rpb24ocGxheWVyKXtcclxuXHRcdFx0JHNjb3BlLnBsYXllciA9IHBsYXllcjtcclxuXHRcdFx0aWYoc3RvcCA9PT0gZmFsc2Upe1xyXG5cdFx0XHRcdHN0b3AgPSB0cnVlO1xyXG5cdFx0XHRcdCRzY29wZS5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNle1xyXG5cdFx0XHRcdHN0b3AgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHJcblx0JHNjb3BlLmdldFVzZXJQcm9maWxlID0gZnVuY3Rpb24odXNlcil7XHJcblx0ICAgIC8vIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCB1c2VyKTtcclxuXHQgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHt0aGVJRDogdXNlci5faWR9KTtcclxuXHR9XHJcblxyXG4gICAgXHJcblxyXG5cclxufSk7XHJcbiIsImFwcC5jb250cm9sbGVyKCdMYW5kaW5nUGFnZUNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgVG9uZVRyYWNrRmN0LCAkc3RhdGUpIHtcclxuICAgICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcclxuICAgIH07XHJcbiAgICBpZigkc2NvcGUuaXNMb2dnZWRJbigpKSAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgLy8gJCgnI2Z1bGxwYWdlJykuZnVsbHBhZ2UoKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCduYXZiYXInKVswXS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblxyXG5cclxuICAgICRzY29wZS5nb1RvRm9ybXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBcdGZ1bmN0aW9uIHNjcm9sbFRvQm90dG9tKGR1cmF0aW9uKSB7XHJcblx0XHQgICAgaWYgKGR1cmF0aW9uIDw9IDApIHJldHVybjtcclxuXHJcblx0XHRcdHZhciBkaWZmZXJlbmNlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCAtIHdpbmRvdy5zY3JvbGxZO1xyXG5cdFx0XHR2YXIgcGVyVGljayA9IGRpZmZlcmVuY2UgLyBkdXJhdGlvbiAqIDEwO1xyXG5cclxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR3aW5kb3cuc2Nyb2xsKDAsIHdpbmRvdy5zY3JvbGxZICsgcGVyVGljayk7XHJcblx0XHRcdFx0c2Nyb2xsVG9Cb3R0b20oZHVyYXRpb24gLSAxMCk7XHJcblx0XHRcdH0sIDEwKTtcclxuXHRcdH1cclxuXHJcblx0XHRzY3JvbGxUb0JvdHRvbSgxMDAwKTtcclxuICAgIH07XHJcblxyXG4gICAgXHJcblxyXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xyXG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFwcC5jb250cm9sbGVyKCdOZXdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFByb2plY3RGY3QsICRzdGF0ZSl7XHJcblx0JHNjb3BlLnVzZXI7XHJcblxyXG5cdCBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG5cdCBcdCRzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICBjb25zb2xlLmxvZygndXNlciBpcycsICRzY29wZS51c2VyLnVzZXJuYW1lKVxyXG4gICAgfSk7XHJcblxyXG5cdCAkc2NvcGUubmV3UHJvamVjdEJ1dCA9IGZ1bmN0aW9uKCl7XHJcblx0IFx0UHJvamVjdEZjdC5uZXdQcm9qZWN0KCRzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHByb2plY3RJZCl7XHJcblx0IFx0XHRjb25zb2xlLmxvZygnU3VjY2VzcyBpcycsIHByb2plY3RJZClcclxuXHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogcHJvamVjdElkfSk7XHQgXHRcclxuXHRcdH0pXHJcblxyXG5cdCB9XHJcblxyXG59KSIsImFwcC5jb250cm9sbGVyKCdUaW1lbGluZUNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRsb2NhbFN0b3JhZ2UsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCkge1xyXG4gIFxyXG4gIHZhciB3YXZBcnJheSA9IFtdO1xyXG4gIFxyXG4gICRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgNjA7IGkrKykge1xyXG4gICAgJHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XHJcbiAgfVxyXG5cclxuICAkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcbiAgJHNjb3BlLnRyYWNrcyA9IFtdO1xyXG4gICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHJcblxyXG4gIFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJzU1OTRjMjBhZDA3NTljZDQwY2U1MWUxNCcpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcclxuXHJcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xyXG4gICAgICBjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xyXG5cclxuICAgICAgaWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG4gICAgICAgIHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgICAgIHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGxvYWRlZCsrO1xyXG4gICAgICAgICAgICAgICAgaWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRyYWNrLnBsYXllciA9IFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBkb25lTG9hZGluZyk7XHJcbiAgICAgICAgICAgIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcclxuICAgICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKHRyYWNrKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xyXG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgICAgICAgb2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xyXG4gICAgICAgICAgb2JqLmxvY2F0aW9uID0gW107XHJcbiAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5nZXRUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKTtcclxuICAgICAgVG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XHJcblxyXG4gIH0pO1xyXG5cclxuICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcclxuICAvLyAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcclxuICAvLyAgICAgLy8gJHN0YXRlUGFyYW1zLnRoZUlEID0gYVVzZXIuX2lkXHJcbiAgLy8gICAgIGNvbnNvbGUubG9nKFwiaWRcIiwgJHN0YXRlUGFyYW1zKTtcclxuICAvLyB9KTtcclxuXHJcbiAgJHNjb3BlLnJlY29yZCA9IGZ1bmN0aW9uIChlLCBpbmRleCkge1xyXG5cclxuICBcdGUgPSBlLnRvRWxlbWVudDtcclxuXHJcbiAgICAgICAgLy8gc3RhcnQgcmVjb3JkaW5nXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0IHJlY29yZGluZycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghYXVkaW9SZWNvcmRlcilcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICBlLmNsYXNzTGlzdC5hZGQoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xyXG4gICAgICAgIGF1ZGlvUmVjb3JkZXIucmVjb3JkKCk7XHJcblxyXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5zdG9wKCk7XHJcbiAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XHJcbiAgICAgICAgICAgIC8vICRzY29wZS50cmFja3NbaW5kZXhdLnJhd0ltYWdlID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlO1xyXG5cclxuICAgICAgICAgIH0sIDUwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICB9LCAyMDAwKTtcclxuXHJcbiAgfVxyXG5cclxuICAkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIH07XHJcblxyXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgdmFyIGF3c1RyYWNrcyA9ICRzY29wZS50cmFja3MuZmlsdGVyKGZ1bmN0aW9uKHRyYWNrLGluZGV4KXtcclxuICAgICAgICAgICAgICBpZih0cmFjay5yYXdBdWRpbyl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoYXdzVHJhY2tzLCAnNTU5NWE3ZmFhYTkwMWFkNjMyMzRmOTIwJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB3YXZlIGxvZ2ljXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xyXG5cclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuXHRcclxuXHJcblxyXG59KTtcclxuXHJcblxyXG4iLCJcclxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgJHN0YXRlUGFyYW1zLCB1c2VyRmFjdG9yeSkge1xyXG5cclxuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcclxuICAgICAgICBcclxuICAgICAgICAgICRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XHJcblxyXG4gICAgICAgICAgdXNlckZhY3RvcnkuZ2V0VXNlck9iaigkc3RhdGVQYXJhbXMudGhlSUQpLnRoZW4oZnVuY3Rpb24odXNlcil7XHJcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCB1c2VyLCAkc3RhdGUpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgJHNjb3BlLmRpc3BsYXlTZXR0aW5ncyA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgaWYoJHNjb3BlLnNob3dTZXR0aW5ncykgJHNjb3BlLnNob3dTZXR0aW5ncyA9IGZhbHNlO1xyXG4gICAgICAgIGVsc2UgJHNjb3BlLnNob3dTZXR0aW5ncyA9IHRydWU7XHJcbiAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnNob3dTZXR0aW5ncyk7XHJcbiAgICB9XHJcblxyXG4gICAgJHNjb3BlLmZvbGxvdyA9IGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgICB1c2VyRmFjdG9yeS5mb2xsb3codXNlciwgJHNjb3BlLmxvZ2dlZEluVXNlcikudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0ZvbGxvdyBjb250cm9sbGVyIHJlc3BvbnNlJywgcmVzcG9uc2UpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAkc2NvcGUuZGlzcGxheVdlYiA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiKTtcclxuICAgICAgJHN0YXRlLmdvKCdmb3Jrd2ViJyk7XHJcbiAgICB9XHJcblxyXG5cclxufSk7IiwiYXBwLmZhY3RvcnkoJ0FuYWx5c2VyRmN0JywgZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciB1cGRhdGVBbmFseXNlcnMgPSBmdW5jdGlvbiAoYW5hbHlzZXJDb250ZXh0LCBhbmFseXNlck5vZGUsIGNvbnRpbnVlVXBkYXRlKSB7XHJcblxyXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xyXG5cdFx0XHR2YXIgU1BBQ0lORyA9IDM7XHJcblx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xyXG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XHJcblx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xyXG5cclxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxyXG5cclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcclxuXHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xyXG5cclxuXHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcclxuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcclxuXHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcclxuXHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxyXG5cdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xyXG5cdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XHJcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XHJcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cdH1cclxuXHJcblxyXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xyXG5cdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XHJcblx0fVxyXG5cdHJldHVybiB7XHJcblx0XHR1cGRhdGVBbmFseXNlcnM6IHVwZGF0ZUFuYWx5c2VycyxcclxuXHRcdGNhbmNlbEFuYWx5c2VyVXBkYXRlczogY2FuY2VsQW5hbHlzZXJVcGRhdGVzXHJcblx0fVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdGb3JrRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcclxuXHJcbiAgICB2YXIgZ2V0V2ViID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZm9ya3MnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0V2ViOiBnZXRXZWJcclxuICAgIH07XHJcblxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdIb21lRmN0JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXInLCB7cGFyYW1zOiB7X2lkOiB1c2VyfX0pXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Y2Nlc3MuZGF0YTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1Byb2plY3RGY3QnLCBmdW5jdGlvbigkaHR0cCl7XHJcblxyXG4gICAgdmFyIGdldFByb2plY3RJbmZvID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xyXG5cclxuICAgICAgICAvL2lmIGNvbWluZyBmcm9tIEhvbWVDb250cm9sbGVyIGFuZCBubyBJZCBpcyBwYXNzZWQsIHNldCBpdCB0byAnYWxsJ1xyXG4gICAgICAgIHZhciBwcm9qZWN0aWQgPSBwcm9qZWN0SWQgfHwgJ2FsbCc7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9qZWN0cy8nICsgcHJvamVjdGlkIHx8IHByb2plY3RpZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgY3JlYXRlQUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMvJywgcHJvamVjdCkudGhlbihmdW5jdGlvbihmb3JrKXtcclxuICAgIFx0XHRcdHJldHVybiBmb3JrLmRhdGE7XHJcbiAgICBcdH0pO1xyXG4gICAgfVxyXG4gICAgdmFyIG5ld1Byb2plY3QgPSBmdW5jdGlvbih1c2VyKXtcclxuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMnLHtvd25lcjp1c2VyLl9pZCwgbmFtZTonVW50aXRsZWQnLCBicG06MTIwLCBlbmRNZWFzdXJlOiAzMn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgXHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgXHR9KTtcclxuICAgIH1cclxuICAgIHZhciBuYW1lQ2hhbmdlID0gZnVuY3Rpb24obmV3TmFtZSwgcHJvamVjdElkKSB7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS9wcm9qZWN0cy8nK3Byb2plY3RJZCwge25hbWU6IG5ld05hbWV9KS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkZWxldGVQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS9wcm9qZWN0cy8nK3Byb2plY3QuX2lkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0RlbGV0ZSBQcm9qIEZjdCcsIHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdXBsb2FkUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCdhcGkvcHJvamVjdHMvc291bmRjbG91ZCcpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFByb2plY3RJbmZvOiBnZXRQcm9qZWN0SW5mbyxcclxuICAgICAgICBjcmVhdGVBRm9yazogY3JlYXRlQUZvcmssXHJcbiAgICAgICAgbmV3UHJvamVjdDogbmV3UHJvamVjdCwgXHJcbiAgICAgICAgZGVsZXRlUHJvamVjdDogZGVsZXRlUHJvamVjdCxcclxuICAgICAgICBuYW1lQ2hhbmdlOiBuYW1lQ2hhbmdlLFxyXG4gICAgICAgIHVwbG9hZFByb2plY3Q6IHVwbG9hZFByb2plY3RcclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiYXBwLmZhY3RvcnkoJ1JlY29yZGVyRmN0JywgZnVuY3Rpb24gKCRodHRwLCBBdXRoU2VydmljZSwgJHEsIFRvbmVUcmFja0ZjdCwgQW5hbHlzZXJGY3QpIHtcclxuXHJcbiAgICB2YXIgcmVjb3JkZXJJbml0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICB2YXIgQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcclxuICAgICAgICAgICAgdmFyIGF1ZGlvQ29udGV4dCA9IG5ldyBDb250ZXh0KCk7XHJcbiAgICAgICAgICAgIHZhciByZWNvcmRlcjtcclxuXHJcbiAgICAgICAgICAgIHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xyXG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gKFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pDYW5jZWxBbmltYXRpb25GcmFtZTtcclxuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1velJlcXVlc3RBbmltYXRpb25GcmFtZTtcclxuXHJcbiAgICAgICAgICAgIC8vIGFzayBmb3IgcGVybWlzc2lvblxyXG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhdWRpb1wiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1hbmRhdG9yeVwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nRWNob0NhbmNlbGxhdGlvblwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nQXV0b0dhaW5Db250cm9sXCI6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dOb2lzZVN1cHByZXNzaW9uXCI6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dIaWdocGFzc0ZpbHRlclwiOiBcImZhbHNlXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9wdGlvbmFsXCI6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHN0cmVhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXRQb2ludCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW4gQXVkaW9Ob2RlIGZyb20gdGhlIHN0cmVhbS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWxBdWRpb0lucHV0ID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdWRpb0lucHV0ID0gcmVhbEF1ZGlvSW5wdXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1ZGlvSW5wdXQuY29ubmVjdChpbnB1dFBvaW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbmFseXNlciBub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhbmFseXNlck5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHlzZXJOb2RlLmZmdFNpemUgPSAyMDQ4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIGFuYWx5c2VyTm9kZSApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgcmVjb3JkZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoIGlucHV0UG9pbnQgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHplcm9HYWluID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uZ2Fpbi52YWx1ZSA9IDAuMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCB6ZXJvR2FpbiApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5jb25uZWN0KCBhdWRpb0NvbnRleHQuZGVzdGluYXRpb24gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoW3JlY29yZGVyLCBhbmFseXNlck5vZGVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVjb3JkU3RhcnQgPSBmdW5jdGlvbiAocmVjb3JkZXIpIHtcclxuICAgICAgICByZWNvcmRlci5jbGVhcigpO1xyXG4gICAgICAgIHJlY29yZGVyLnJlY29yZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciByZWNvcmRTdG9wID0gZnVuY3Rpb24gKGluZGV4LCByZWNvcmRlcikge1xyXG4gICAgICAgIHJlY29yZGVyLnN0b3AoKTtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgLy8gZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgICAgICByZWNvcmRlci5nZXRCdWZmZXJzKGZ1bmN0aW9uIChidWZmZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAvL2Rpc3BsYXkgd2F2IGltYWdlXHJcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZWRpc3BsYXlcIiArICBpbmRleCApO1xyXG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMzAwLCAxMDAsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBidWZmZXJzWzBdICk7XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0QnVmZmVyID0gYnVmZmVyc1swXTtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZSA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhlIE9OTFkgdGltZSBnb3RCdWZmZXJzIGlzIGNhbGxlZCBpcyByaWdodCBhZnRlciBhIG5ldyByZWNvcmRpbmcgaXMgY29tcGxldGVkIC0gXHJcbiAgICAgICAgICAgICAgICAvLyBzbyBoZXJlJ3Mgd2hlcmUgd2Ugc2hvdWxkIHNldCB1cCB0aGUgZG93bmxvYWQuXHJcbiAgICAgICAgICAgICAgICByZWNvcmRlci5leHBvcnRXQVYoIGZ1bmN0aW9uICggYmxvYiApIHtcclxuICAgICAgICAgICAgICAgICAgICAvL25lZWRzIGEgdW5pcXVlIG5hbWVcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmRlci5zZXR1cERvd25sb2FkKCBibG9iLCBcIm15UmVjb3JkaW5nMC53YXZcIiApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIGxvb3AgdGltZVxyXG4gICAgICAgICAgICAgICAgICAgIFRvbmVUcmFja0ZjdC5sb29wSW5pdGlhbGl6ZShibG9iLCBpbmRleCwgXCJteVJlY29yZGluZzAud2F2XCIpLnRoZW4ocmVzb2x2ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgXHJcblxyXG4gICAgXHJcbiAgICB2YXIgY29udmVydFRvQmFzZTY0ID0gZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2VhY2ggdHJhY2snLCB0cmFjayk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pIHtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKHRyYWNrLnJhd0F1ZGlvKTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG5cclxuXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzZW5kVG9BV1M6IGZ1bmN0aW9uICh0cmFja3NBcnJheSwgcHJvamVjdElkLCBwcm9qZWN0TmFtZSkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlYWRQcm9taXNlcyA9IHRyYWNrc0FycmF5Lm1hcChjb252ZXJ0VG9CYXNlNjQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICRxLmFsbChyZWFkUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKHN0b3JlRGF0YSkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRyYWNrc0FycmF5LmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3JlRGF0YVtpXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFjay5yYXdBdWRpbyA9IHN0b3JlRGF0YVtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2suZWZmZWN0c1JhY2sgPSB0cmFjay5lZmZlY3RzUmFjay5tYXAoZnVuY3Rpb24gKGVmZmVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFRkZFQ1RcIiwgZWZmZWN0LCBlZmZlY3Qud2V0LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlZmZlY3Qud2V0LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9hd3MvJywgeyB0cmFja3MgOiB0cmFja3NBcnJheSwgcHJvamVjdElkIDogcHJvamVjdElkLCBwcm9qZWN0TmFtZSA6IHByb2plY3ROYW1lIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBpbiBzZW5kVG9BV1NGYWN0b3J5JywgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTsgXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVjb3JkZXJJbml0OiByZWNvcmRlckluaXQsXHJcbiAgICAgICAgcmVjb3JkU3RhcnQ6IHJlY29yZFN0YXJ0LFxyXG4gICAgICAgIHJlY29yZFN0b3A6IHJlY29yZFN0b3BcclxuICAgIH1cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdUb25lVGltZWxpbmVGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XHJcblxyXG5cdHZhciBjcmVhdGVUcmFuc3BvcnQgPSBmdW5jdGlvbiAobG9vcEVuZCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wID0gdHJ1ZTtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcFN0YXJ0ID0gJzBtJztcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcEVuZCA9IGxvb3BFbmQudG9TdHJpbmcoKSArICdtJztcclxuXHRcdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cclxuXHRcdFx0Y3JlYXRlTWV0cm9ub21lKCkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XHJcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0dmFyIHBvc0FyciA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6Jyk7XHJcblx0XHRcdFx0XHR2YXIgbGVmdFBvcyA9ICgocGFyc2VJbnQocG9zQXJyWzBdKSAqIDIwMCApICsgKHBhcnNlSW50KHBvc0FyclsxXSkgKiA1MCkgKyA1MDApLnRvU3RyaW5nKCkgKyAncHgnO1xyXG5cdFx0XHRcdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IGxlZnRQb3M7XHJcblx0XHRcdFx0XHRtZXRyb25vbWUuc3RhcnQoKTtcclxuXHRcdFx0XHR9LCAnMW0nKTtcclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhUb25lLlRyYW5zcG9ydC5wb3NpdGlvbik7XHJcblx0XHRcdFx0XHRtZXRyb25vbWUuc3RhcnQoKTtcclxuXHRcdFx0XHR9LCAnNG4nKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShtZXRyb25vbWUpO1xyXG5cdFx0XHR9KTtcclxuICAgICAgICB9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgY2hhbmdlQnBtID0gZnVuY3Rpb24gKGJwbSkge1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuYnBtLnZhbHVlID0gYnBtO1xyXG5cdFx0cmV0dXJuIFRvbmUuVHJhbnNwb3J0O1xyXG5cdH07XHJcblxyXG5cdHZhciBzdG9wQWxsID0gZnVuY3Rpb24gKHRyYWNrcykge1xyXG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XHJcblx0XHRcdGlmKHRyYWNrLnBsYXllcikgdHJhY2sucGxheWVyLnN0b3AoKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBtdXRlQWxsID0gZnVuY3Rpb24gKHRyYWNrcykge1xyXG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XHJcblx0XHRcdGlmKHRyYWNrLnBsYXllcikgdHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IC0xMDA7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgdW5NdXRlQWxsID0gZnVuY3Rpb24gKHRyYWNrcykge1xyXG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XHJcblx0XHRcdGlmKHRyYWNrLnBsYXllcikgdHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgY3JlYXRlTWV0cm9ub21lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdCAgICAgICAgdmFyIG1ldCA9IG5ldyBUb25lLlBsYXllcihcIi9hcGkvd2F2L0NsaWNrMS53YXZcIiwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKG1ldCk7XHJcblx0ICAgICAgICB9KS50b01hc3RlcigpO1xyXG4gICAgICAgIH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBhZGRMb29wVG9UaW1lbGluZSA9IGZ1bmN0aW9uIChwbGF5ZXIsIHN0YXJ0VGltZUFycmF5KSB7XHJcblxyXG5cdFx0aWYoc3RhcnRUaW1lQXJyYXkuaW5kZXhPZigwKSA9PT0gLTEpIHtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdFx0fSwgXCIwbVwiKVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRzdGFydFRpbWVBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChzdGFydFRpbWUpIHtcclxuXHJcblx0XHRcdHZhciBzdGFydFRpbWUgPSBzdGFydFRpbWUudG9TdHJpbmcoKSArICdtJztcclxuXHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU3RhcnQnLCBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbik7XHJcblx0XHRcdFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0fSwgc3RhcnRUaW1lKTtcclxuXHJcblx0XHRcdC8vIHZhciBzdG9wVGltZSA9IHBhcnNlSW50KHN0YXJ0VGltZS5zdWJzdHIoMCwgc3RhcnRUaW1lLmxlbmd0aC0xKSkgKyAxKS50b1N0cmluZygpICsgc3RhcnRUaW1lLnN1YnN0cigtMSwxKTtcclxuXHRcdFx0Ly8vLyBjb25zb2xlLmxvZygnU1RPUCcsIHN0b3ApO1xyXG5cdFx0XHQvLy8vIHRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdC8vLy8gXHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHQvLy8vIH0sIHN0b3BUaW1lKTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0fTtcclxuXHRcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgY3JlYXRlVHJhbnNwb3J0OiBjcmVhdGVUcmFuc3BvcnQsXHJcbiAgICAgICAgY2hhbmdlQnBtOiBjaGFuZ2VCcG0sXHJcbiAgICAgICAgYWRkTG9vcFRvVGltZWxpbmU6IGFkZExvb3BUb1RpbWVsaW5lLFxyXG4gICAgICAgIGNyZWF0ZU1ldHJvbm9tZTogY3JlYXRlTWV0cm9ub21lLFxyXG4gICAgICAgIHN0b3BBbGw6IHN0b3BBbGwsXHJcbiAgICAgICAgbXV0ZUFsbDogbXV0ZUFsbCxcclxuICAgICAgICB1bk11dGVBbGw6IHVuTXV0ZUFsbFxyXG4gICAgfTtcclxuXHJcbn0pO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdUb25lVHJhY2tGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XHJcblxyXG5cdHZhciBjcmVhdGVQbGF5ZXIgPSBmdW5jdGlvbiAodXJsLCBkb25lRm4pIHtcclxuXHRcdHZhciBwbGF5ZXIgID0gbmV3IFRvbmUuUGxheWVyKHVybCwgZG9uZUZuKTtcclxuXHRcdC8vIFRPRE86IHJlbW92ZSB0b01hc3RlclxyXG5cdFx0cGxheWVyLnRvTWFzdGVyKCk7XHJcblx0XHQvLyBwbGF5ZXIuc3luYygpO1xyXG5cdFx0Ly8gcGxheWVyLmxvb3AgPSB0cnVlO1xyXG5cdFx0cmV0dXJuIHBsYXllcjtcclxuXHR9O1xyXG5cclxuXHR2YXIgbG9vcEluaXRpYWxpemUgPSBmdW5jdGlvbihibG9iLCBpbmRleCwgZmlsZW5hbWUpIHtcclxuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHQvL1BBU1NFRCBBIEJMT0IgRlJPTSBSRUNPUkRFUkpTRkFDVE9SWSAtIERST1BQRUQgT04gTUVBU1VSRSAwXHJcblx0XHRcdHZhciB1cmwgPSAod2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcblx0XHRcdHZhciBsaW5rID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYXZlXCIraW5kZXgpO1xyXG5cdFx0XHRsaW5rLmhyZWYgPSB1cmw7XHJcblx0XHRcdGxpbmsuZG93bmxvYWQgPSBmaWxlbmFtZSB8fCAnb3V0cHV0JytpbmRleCsnLndhdic7XHJcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmcgPSBibG9iO1xyXG5cdFx0XHR3aW5kb3cubGF0ZXN0UmVjb3JkaW5nVVJMID0gdXJsO1xyXG5cdFx0XHR2YXIgcGxheWVyO1xyXG5cdFx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcclxuXHRcdFx0cGxheWVyID0gbmV3IFRvbmUuUGxheWVyKGxpbmsuaHJlZiwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHJlc29sdmUocGxheWVyKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgZWZmZWN0c0luaXRpYWxpemUgPSBmdW5jdGlvbihhcnIpIHtcclxuXHJcblxyXG5cdFx0dmFyIGNob3J1cyA9IG5ldyBUb25lLkNob3J1cygpO1xyXG5cdFx0dmFyIHBoYXNlciA9IG5ldyBUb25lLlBoYXNlcigpO1xyXG5cdFx0dmFyIGRpc3RvcnQgPSBuZXcgVG9uZS5EaXN0b3J0aW9uKCk7XHJcblx0XHR2YXIgcGluZ3BvbmcgPSBuZXcgVG9uZS5QaW5nUG9uZ0RlbGF5KFwiMW1cIik7XHJcblxyXG5cdFx0aWYgKGFyci5sZW5ndGgpIHtcclxuXHRcdFx0Y2hvcnVzLndldC52YWx1ZSA9IGFyclswXTtcclxuXHRcdFx0cGhhc2VyLndldC52YWx1ZSA9IGFyclsxXTtcclxuXHRcdFx0ZGlzdG9ydC53ZXQudmFsdWUgPSBhcnJbMl07XHJcblx0XHRcdHBpbmdwb25nLndldC52YWx1ZSA9IGFyclszXTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Y2hvcnVzLmNvbm5lY3QocGhhc2VyKTtcclxuXHRcdHBoYXNlci5jb25uZWN0KGRpc3RvcnQpO1xyXG5cdFx0ZGlzdG9ydC5jb25uZWN0KHBpbmdwb25nKTtcclxuXHRcdHBpbmdwb25nLnRvTWFzdGVyKCk7XHJcblxyXG5cdFx0cmV0dXJuIFtjaG9ydXMsIHBoYXNlciwgZGlzdG9ydCwgcGluZ3BvbmddO1xyXG5cdH07XHJcblxyXG5cdHZhciBjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wID0gZnVuY3Rpb24ocGxheWVyLCBtZWFzdXJlKSB7XHJcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0fSwgbWVhc3VyZStcIm1cIik7XHJcblx0fTtcclxuXHJcblx0dmFyIHJlcGxhY2VUaW1lbGluZUxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpIHtcclxuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnb2xkIHRpbWVsaW5lIGlkJywgb2xkVGltZWxpbmVJZCk7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQob2xkVGltZWxpbmVJZCkpO1xyXG5cdFx0XHQvLyBUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lcygpO1xyXG5cdFx0XHRyZXNvbHZlKGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AocGxheWVyLCBuZXdNZWFzdXJlKSk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cdHZhciBkZWxldGVUaW1lbGluZUxvb3AgPSBmdW5jdGlvbih0aW1lbGluZUlkKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KHRpbWVsaW5lSWQpKTtcclxuXHR9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgY3JlYXRlUGxheWVyOiBjcmVhdGVQbGF5ZXIsXHJcbiAgICAgICAgbG9vcEluaXRpYWxpemU6IGxvb3BJbml0aWFsaXplLFxyXG4gICAgICAgIGVmZmVjdHNJbml0aWFsaXplOiBlZmZlY3RzSW5pdGlhbGl6ZSxcclxuICAgICAgICBjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wOiBjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wLFxyXG4gICAgICAgIHJlcGxhY2VUaW1lbGluZUxvb3A6IHJlcGxhY2VUaW1lbGluZUxvb3AsXHJcbiAgICAgICAgZGVsZXRlVGltZWxpbmVMb29wOiBkZWxldGVUaW1lbGluZUxvb3BcclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiYXBwLmZhY3RvcnkoJ3VzZXJGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cdHJldHVybiB7XHJcblx0XHRnZXRVc2VyT2JqOiBmdW5jdGlvbih1c2VySUQpe1xyXG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCdhcGkvdXNlcnMnLCB7cGFyYW1zOiB7X2lkOiB1c2VySUR9fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc29vbnNlIGlzJywgcmVzcG9uc2UuZGF0YSlcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdGZvbGxvdzogZnVuY3Rpb24odXNlciwgbG9nZ2VkSW5Vc2VyKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzJyx7dXNlclRvRm9sbG93OiB1c2VyLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb2xsb3dVc2VyIEZhY3RvcnkgcmVzcG9uc2UnLCByZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdHVuRm9sbG93OiBmdW5jdGlvbihmb2xsb3dlZSwgbG9nZ2VkSW5Vc2VyKSB7XHJcblx0XHRcdHJldHVybiAkaHR0cC5wdXQoJ2FwaS91c2VycycsIHt1c2VyVG9VbmZvbGxvdzogZm9sbG93ZWUsIGxvZ2dlZEluVXNlcjogbG9nZ2VkSW5Vc2VyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ3VuRm9sbG93IHJlc3BvbnNlJywgcmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2RyYWdnYWJsZScsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgIC8vIHRoaXMgZ2l2ZXMgdXMgdGhlIG5hdGl2ZSBKUyBvYmplY3RcclxuICAgIHZhciBlbCA9IGVsZW1lbnRbMF07XHJcbiAgICBcclxuICAgIGVsLmRyYWdnYWJsZSA9IHRydWU7XHJcbiAgICBcclxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKGUpIHtcclxuXHJcbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9ICdtb3ZlJztcclxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKCdUZXh0JywgdGhpcy5pZCk7XHJcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdkcmFnJyk7XHJcblxyXG4gICAgICAgIHZhciBpZHggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBhcnNlSW50KGF0dHJzLnBvc2l0aW9uKSk7XHJcbiAgICAgICAgc2NvcGUudHJhY2subG9jYXRpb24uc3BsaWNlKGlkeCwgMSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSxcclxuICAgICAgZmFsc2VcclxuICAgICk7XHJcbiAgICBcclxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbmQnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJyk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9LFxyXG4gICAgICBmYWxzZVxyXG4gICAgKTtcclxuXHJcbiAgfVxyXG59KTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Ryb3BwYWJsZScsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBzY29wZToge1xyXG4gICAgICBkcm9wOiAnJicgLy8gcGFyZW50XHJcbiAgICB9LFxyXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcclxuICAgICAgLy8gYWdhaW4gd2UgbmVlZCB0aGUgbmF0aXZlIG9iamVjdFxyXG4gICAgICB2YXIgZWwgPSBlbGVtZW50WzBdO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICBlLmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ21vdmUnO1xyXG4gICAgICAgICAgLy8gYWxsb3dzIHVzIHRvIGRyb3BcclxuICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ292ZXInKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ292ZXInKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnbGVhdmUnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgLy8gU3RvcHMgc29tZSBicm93c2VycyBmcm9tIHJlZGlyZWN0aW5nLlxyXG4gICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gdXBvbiBkcm9wLCBjaGFuZ2luZyBwb3NpdGlvbiBhbmQgdXBkYXRpbmcgdHJhY2subG9jYXRpb24gYXJyYXkgb24gc2NvcGUgXHJcbiAgICAgICAgICB2YXIgaXRlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGUuZGF0YVRyYW5zZmVyLmdldERhdGEoJ1RleHQnKSk7XHJcbiAgICAgICAgICB2YXIgeHBvc2l0aW9uID0gcGFyc2VJbnQodGhpcy5hdHRyaWJ1dGVzLnhwb3NpdGlvbi52YWx1ZSk7XHJcbiAgICAgICAgICB2YXIgY2hpbGROb2RlcyA9IHRoaXMuY2hpbGROb2RlcztcclxuICAgICAgICAgIHZhciBvbGRUaW1lbGluZUlkO1xyXG4gICAgICAgICAgdmFyIHRoZUNhbnZhcztcclxuXHJcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICBpZiAoY2hpbGROb2Rlc1tpXS5jbGFzc05hbWUgPT09ICdjYW52YXMtYm94Jykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgdGhpcy5jaGlsZE5vZGVzW2ldLmFwcGVuZENoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQudHJhY2subG9jYXRpb24ucHVzaCh4cG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgdmFyIGNhbnZhc05vZGUgPSB0aGlzLmNoaWxkTm9kZXNbaV0uY2hpbGROb2RlcztcclxuXHJcbiAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzTm9kZS5sZW5ndGg7IGorKykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW52YXNOb2RlW2pdLm5vZGVOYW1lID09PSAnQ0FOVkFTJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy5wb3NpdGlvbi52YWx1ZSA9IHhwb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRUaW1lbGluZUlkID0gY2FudmFzTm9kZVtqXS5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlQ2FudmFzID0gY2FudmFzTm9kZVtqXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9ICAgICBcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG5cclxuICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC5tb3ZlSW5UaW1lbGluZShvbGRUaW1lbGluZUlkLCB4cG9zaXRpb24pLnRoZW4oZnVuY3Rpb24gKG5ld1RpbWVsaW5lSWQpIHtcclxuICAgICAgICAgICAgICB0aGVDYW52YXMuYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlID0gbmV3VGltZWxpbmVJZDtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIGNhbGwgdGhlIGRyb3AgcGFzc2VkIGRyb3AgZnVuY3Rpb25cclxuICAgICAgICAgIHNjb3BlLiRhcHBseSgnZHJvcCgpJyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbHNlXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuIiwiYXBwLmRpcmVjdGl2ZSgnZm9sbG93ZGlyZWN0aXZlJywgZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2ZvbGxvdy9mb2xsb3dEaXJlY3RpdmUuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnRm9sbG93RGlyZWN0aXZlQ29udHJvbGxlcidcclxuXHR9O1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRzdGF0ZSwgQXV0aFNlcnZpY2UsIHVzZXJGYWN0b3J5KXtcclxuXHJcblxyXG5cclxuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcclxuICAgICAgICAgXHQkc2NvcGUubG9nZ2VkSW5Vc2VyID0gbG9nZ2VkSW5Vc2VyO1xyXG4gICAgICAgICAgXHR1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuXHQgICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XHJcblx0ICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCB1c2VyKTtcclxuXHJcblx0ICAgICAgICAgICAgaWYoJHN0YXRlLmN1cnJlbnQubmFtZSA9PT0gXCJ1c2VyUHJvZmlsZS5mb2xsb3dlcnNcIil7XHJcblx0ICAgICAgICAgICAgXHQkc2NvcGUuZm9sbG93cyA9IHVzZXIuZm9sbG93ZXJzO1xyXG5cdCAgICAgICAgICAgIH0gZWxzZXtcclxuXHQgICAgICAgICAgICBcdCRzY29wZS5mb2xsb3dzID0gdXNlci5mb2xsb3dpbmc7XHJcblx0ICAgICAgICAgICAgXHRpZigkc3RhdGVQYXJhbXMudGhlSUQgPT09IGxvZ2dlZEluVXNlci5faWQpICRzY29wZS5zaG93QnV0dG9uID0gdHJ1ZTtcclxuXHQgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgY29uc29sZS5sb2coXCJmb2xsb3dPYmogaXNcIiwgJHNjb3BlLmZvbGxvd3MsICRzdGF0ZVBhcmFtcyk7XHJcblxyXG5cdCAgICBcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0JHNjb3BlLmdvVG9Gb2xsb3cgPSBmdW5jdGlvbihmb2xsb3cpe1xyXG5cdCAgICAgIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCBmb2xsb3cpO1xyXG5cdCAgICAgICRzdGF0ZS5nbygndXNlclByb2ZpbGUnLCB7IHRoZUlEOiBmb2xsb3cuX2lkfSk7XHJcblx0ICAgIH1cclxuXHJcblx0ICAgICRzY29wZS51bkZvbGxvdyA9IGZ1bmN0aW9uKGZvbGxvd2VlKSB7XHJcblx0ICAgIFx0Y29uc29sZS5sb2coXCJjbGlja2VkXCIsIGZvbGxvd2VlKTtcclxuXHQgICAgXHR1c2VyRmFjdG9yeS51bkZvbGxvdyhmb2xsb3dlZSwgJHNjb3BlLmxvZ2dlZEluVXNlcikudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0ICAgIFx0XHRjb25zb2xlLmxvZyhcInN1Y2Nlc2Z1bCB1bmZvbGxvd1wiKTtcclxuXHQgICAgXHR9KTtcclxuXHQgICAgfVxyXG5cclxuXHJcblx0XHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2xvYWRpbmdHaWYnLCBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2xvYWRpbmctZ2lmL2xvYWRpbmcuaHRtbCdcclxuXHR9O1xyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB7fSxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0TmF2YmFyID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlcklkID0gdXNlci5faWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnUHJvZmlsZScsIHN0YXRlOiAndXNlclByb2ZpbGUoe3RoZUlEOiB1c2VySWR9KScsIGF1dGg6IHRydWUgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNldE5hdmJhcigpO1xyXG5cclxuICAgICAgICAgICAgLy8gc2NvcGUuaXRlbXMgPSBbXHJcbiAgICAgICAgICAgIC8vICAgICAvLyB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAncHJvamVjdCcgfSxcclxuICAgICAgICAgICAgLy8gICAgIC8vIHsgbGFiZWw6ICdTaWduIFVwJywgc3RhdGU6ICdzaWdudXAnIH0sXHJcbiAgICAgICAgICAgIC8vICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICd1c2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxyXG4gICAgICAgICAgICAvLyBdO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzZXRVc2VyKCk7XHJcblxyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldE5hdmJhcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCBzZXROYXZiYXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcclxuICAgIH07XHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3Byb2plY3RkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvamVjdC9wcm9qZWN0RGlyZWN0aXZlLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ3Byb2plY3RkaXJlY3RpdmVDb250cm9sbGVyJ1xyXG5cdH07XHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ3Byb2plY3RkaXJlY3RpdmVDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRzdGF0ZSwgUHJvamVjdEZjdCwgQXV0aFNlcnZpY2Upe1xyXG5cclxuXHJcblxyXG5cdFx0QXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xyXG5cdFx0XHQkc2NvcGUubG9nZ2VkSW5Vc2VyID0gbG9nZ2VkSW5Vc2VyO1xyXG5cdFx0XHQkc2NvcGUuZGlzcGxheUFQcm9qZWN0ID0gZnVuY3Rpb24oc29tZXRoaW5nKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnVEhJTkcnLCBzb21ldGhpbmcpO1xyXG5cdFx0XHRcdGlmKCRzY29wZS5sb2dnZWRJblVzZXIuX2lkID09PSAkc3RhdGVQYXJhbXMudGhlSUQpe1xyXG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogc29tZXRoaW5nLl9pZH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcImRpc3BsYXlpbmcgYSBwcm9qZWN0XCIsICRzY29wZS5wYXJlbnQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUubWFrZUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHRcdFx0XHRpZighcHJvamVjdC5mb3JrT3JpZ2luKSBwcm9qZWN0LmZvcmtPcmlnaW4gPSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0XHRwcm9qZWN0LmZvcmtJRCA9IHByb2plY3QuX2lkO1xyXG5cdFx0XHRcdHByb2plY3Qub3duZXIgPSBsb2dnZWRJblVzZXIuX2lkO1xyXG5cdFx0XHRcdGRlbGV0ZSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhwcm9qZWN0KTtcclxuXHRcdFx0XHRQcm9qZWN0RmN0LmNyZWF0ZUFGb3JrKHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmsgcmVzcG9uc2UgaXMnLCByZXNwb25zZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdCRzY29wZS5kZWxldGVQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0RlbGV0ZVByb2plY3QnLCBwcm9qZWN0KVxyXG5cdFx0XHRcdFByb2plY3RGY3QuZGVsZXRlUHJvamVjdChwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdEZWxldGUgcmVxdWVzdCBpcycsIHJlc3BvbnNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLnVwbG9hZFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnVXBsb2FkaW5nIFByb2plY3QnLCBwcm9qZWN0KTtcclxuXHRcdFx0XHRQcm9qZWN0RmN0LnVwbG9hZFByb2plY3QocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnVXBsb2FkIFJlcXVlc3QgaXMnLCByZXNwb25zZSk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0fVxyXG5cclxuXHRcdH0pO1xyXG5cdFxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCd4aW1UcmFjaycsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEFuYWx5c2VyRmN0LCAkcSkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5odG1sJyxcclxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG5cdFx0XHRzY29wZS5lZmZlY3RXZXRuZXNzZXMgPSBbMCwwLDAsMF07XHJcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbnZhc1Jvdy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XHJcblx0XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc0NsYXNzZXMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcclxuXHRcdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W2ldKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIGlkPSd3YXZlZGlzcGxheScgY2xhc3M9J2l0ZW0nIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIDApXHJcblxyXG5cdFx0XHRzY29wZS5kcm9wSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChpbmRleCwgcG9zaXRpb24pIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRFJPUFBJTkcnKTtcclxuXHRcdFx0XHQvLyBzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IGZhbHNlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vIHZhciBwb3NpdGlvbiA9IDA7XHJcblx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xyXG5cclxuXHRcdFx0XHRpZiAoc2NvcGUudHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHQvLyBkcm9wIHRoZSBsb29wIG9uIHRoZSBmaXJzdCBhdmFpbGFibGUgaW5kZXhcdFx0XHRcdFxyXG5cdFx0XHRcdFx0d2hpbGUgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmluZGV4T2YocG9zaXRpb24pID4gLTEpIHtcclxuXHRcdFx0XHRcdFx0cG9zaXRpb24rKztcclxuXHRcdFx0XHRcdH1cdFx0XHRcdFx0XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBhZGRpbmcgcmF3IGltYWdlIHRvIGRiXHJcblx0XHRcdFx0aWYgKCFzY29wZS50cmFjay5pbWcpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZS5yZXBsYWNlKC9eZGF0YTppbWFnZVxcL3BuZztiYXNlNjQsLywgXCJcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnB1c2gocG9zaXRpb24pO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcclxuXHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgcG9zaXRpb24pO1xyXG5cdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIGluZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIitpbmRleCtcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUubW92ZUluVGltZWxpbmUgPSBmdW5jdGlvbiAob2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xyXG5cdFx0XHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ0VMRU1FTlQnLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKTtcclxuXHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5yZXBsYWNlVGltZWxpbmVMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkudGhlbihyZXNvbHZlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fTtcclxuXHJcblxyXG5cdFx0XHRzY29wZS5hcHBlYXJPckRpc2FwcGVhciA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcclxuXHRcdFx0XHR2YXIgbG9vcEluZGV4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbik7XHJcblxyXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLm9uVGltZWxpbmUpIHtcclxuXHRcdFx0XHRcdGlmKGxvb3BJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5wdXNoKHBvc2l0aW9uKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgcG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cdFx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygndHJhY2snLCBzY29wZS50cmFjayk7XHJcblx0XHRcdFx0XHRcdC8vIGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK3RyYWNrSW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHRcdC8vIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XHJcblx0XHRcdFx0XHRcdC8vIGRyYXdCdWZmZXIoIDE5OCwgOTgsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBzY29wZS50cmFjay5idWZmZXIgKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XHJcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIGZyb20gbG9jYXRpb25zIGFycmF5XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShsb29wSW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHQvL3JlbW92ZSB0aW1lbGluZUlkXHJcblx0XHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5kZWxldGVUaW1lbGluZUxvb3AoIGNhbnZhcy5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWUgKTtcclxuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgY2FudmFzIGl0ZW1cclxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24gcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XHJcblx0XHRcdFx0XHRcdCAgICBlbGVtZW50ICYmIGVsZW1lbnQucGFyZW50Tm9kZSAmJiBlbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbWVudCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmVtb3ZlRWxlbWVudCggY2FudmFzICk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdOTyBEUk9QJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUucmVSZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnUkVSRUNPUkQnKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhzY29wZS50cmFjayk7XHJcblx0XHRcdFx0Ly9jaGFuZ2UgYWxsIHBhcmFtcyBiYWNrIGFzIGlmIGVtcHR5IHRyYWNrXHJcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBudWxsO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IG51bGw7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gbnVsbDtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly9kaXNwb3NlIG9mIGVmZmVjdHNSYWNrXHJcblx0XHRcdFx0c2NvcGUudHJhY2suZWZmZWN0c1JhY2suZm9yRWFjaChmdW5jdGlvbiAoZWZmZWN0KSB7XHJcblx0XHRcdFx0XHRlZmZlY3QuZGlzcG9zZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLDAsMCwwXSk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24gPSBbXTtcclxuXHRcdFx0XHQvL3JlbW92ZSBhbGwgbG9vcHMgZnJvbSBVSVxyXG5cdFx0XHRcdHZhciBsb29wc1VJID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgndHJhY2tMb29wJytpbmRleC50b1N0cmluZygpKTtcclxuXHRcdFx0XHR3aGlsZShsb29wc1VJLmxlbmd0aCAhPT0gMCkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0xPT1BTIEFSUicsIGxvb3BzVUkpO1xyXG5cdFx0XHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGxvb3BzVUkubGVuZ3RoO2krKykge1xyXG5cdFx0XHRcdFx0XHRsb29wc1VJW2ldLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobG9vcHNVSVtpXSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR2YXIgbG9vcHNVSSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3RyYWNrTG9vcCcraW5kZXgudG9TdHJpbmcoKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjb3BlLnNvbG8gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0dmFyIG90aGVyVHJhY2tzID0gc2NvcGUuJHBhcmVudC50cmFja3MubWFwKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRcdFx0aWYodHJhY2sgIT09IHNjb3BlLnRyYWNrKSB7XHJcblx0XHRcdFx0XHRcdHRyYWNrLnNpbGVuY2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJhY2s7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSkuZmlsdGVyKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRcdFx0aWYodHJhY2sgJiYgdHJhY2sucGxheWVyKSByZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhvdGhlclRyYWNrcyk7XHJcblx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0Lm11dGVBbGwob3RoZXJUcmFja3MpO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUuc2lsZW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRpZighc2NvcGUudHJhY2suc2lsZW5jZSkge1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IC0xMDA7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gdHJ1ZTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0XHR2YXIgcmVjb3JkZXIgPSBzY29wZS5yZWNvcmRlcjtcclxuXHJcblx0XHRcdFx0dmFyIGNvbnRpbnVlVXBkYXRlID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxyXG5cdFx0ICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhbmFseXNlclwiK2luZGV4KTtcclxuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xyXG5cdFx0XHRcdHZhciBhbmFseXNlcklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblxyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUuJHBhcmVudC5jdXJyZW50bHlSZWNvcmRpbmcgPSB0cnVlO1xyXG5cclxuXHJcblx0XHRcdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xyXG5cdFx0XHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xyXG5cdFx0XHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XHJcblx0XHRcdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XHJcblx0XHRcdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcclxuXHJcblx0XHRcdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXHJcblxyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XHJcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gJyNGNkQ1NjUnO1xyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cdFx0XHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xyXG5cclxuXHRcdFx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXHJcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcclxuXHRcdFx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XHJcblx0XHRcdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xyXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxyXG5cdFx0XHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcclxuXHRcdFx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcclxuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xyXG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcclxuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYoVG9uZS5UcmFuc3BvcnQuc3RhdGUgPT09IFwic3RvcHBlZFwiKSB7XHJcblx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QubXV0ZUFsbChzY29wZS4kcGFyZW50LnRyYWNrcyk7XHJcblx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdGFydCgpO1xyXG5cclxuXHRcdFx0XHRcdHZhciBjbGljayA9IHdpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RhcnQoKTtcclxuXHRcdFx0XHRcdH0sIDUwMCk7XHJcblxyXG5cdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0b3AoaW5kZXgsIHJlY29yZGVyKS50aGVuKGZ1bmN0aW9uIChwbGF5ZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlVXBkYXRlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gcGxheWVyO1xyXG5cdFx0XHRcdFx0XHRcdC8vIHNjb3BlLnRyYWNrLnBsYXllci5sb29wID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5idWZmZXIgPSB3aW5kb3cubGF0ZXN0QnVmZmVyO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJhd0F1ZGlvID0gd2luZG93LmxhdGVzdFJlY29yZGluZztcclxuXHRcdFx0XHRcdFx0XHRwbGF5ZXIuY29ubmVjdChzY29wZS50cmFjay5lZmZlY3RzUmFja1swXSk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdHdpbmRvdy5jbGVhckludGVydmFsKGNsaWNrKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LmN1cnJlbnRseVJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC51bk11dGVBbGwoc2NvcGUuJHBhcmVudC50cmFja3MpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0sIDQwMDApO1xyXG5cclxuXHRcdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlciwgaW5kZXgpO1xyXG5cdFx0XHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdXSElMRSBQTEFZSU5HJyk7XHJcblx0XHRcdFx0XHR2YXIgbmV4dEJhciA9IHBhcnNlSW50KFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF0pICsgMTtcclxuXHRcdFx0XHRcdHZhciBlbmRCYXIgPSBuZXh0QmFyICsgMTtcclxuXHJcblx0XHRcdFx0XHR2YXIgcmVjSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0XHR9LCBuZXh0QmFyLnRvU3RyaW5nKCkgKyBcIm1cIik7XHJcblxyXG5cclxuXHRcdFx0XHRcdHZhciByZWNFbmRJZCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ1RJQ0tCQUNLIEVSUk9SPycpO1xyXG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KHJlY0lkKSk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQocmVjRW5kSWQpKTtcclxuXHRcdFx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RvcChpbmRleCwgcmVjb3JkZXIpLnRoZW4oZnVuY3Rpb24gKHBsYXllcikge1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0Y29udGludWVVcGRhdGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBwbGF5ZXI7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2NvcGUudHJhY2sucGxheWVyLmxvb3AgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmJ1ZmZlciA9IHdpbmRvdy5sYXRlc3RCdWZmZXI7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xyXG5cdFx0XHRcdFx0XHRcdHBsYXllci5jb25uZWN0KHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LmN1cnJlbnRseVJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0XHQvLyBzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdH0sIGVuZEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRzY29wZS5wcmV2aWV3ID0gZnVuY3Rpb24oY3VycmVudGx5UHJldmlld2luZykge1xyXG5cdFx0XHRcdC8vIGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xyXG5cdFx0XHRcdC8vIFx0aWYoY3VycmVudGx5UHJldmlld2luZykge1xyXG5cdFx0XHRcdC8vIFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdC8vIFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gXHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHQvLyBcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IHRydWU7XHJcblx0XHRcdFx0Ly8gXHR9XHJcblx0XHRcdFx0Ly8gfSBlbHNlIHtcclxuXHRcdFx0XHR2YXIgbmV4dEJhcjtcclxuXHRcdFx0XHRpZighc2NvcGUuJHBhcmVudC5wcmV2aWV3aW5nSWQpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ05FWFQnLCBuZXh0QmFyKTtcclxuXHRcdFx0XHRcdHZhciBwbGF5TGF1bmNoID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgcHJldmlld0ludGV2YWwgPSBUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ1NIT1VMRCBQTEFZJyk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBsYXlMYXVuY2gpO1xyXG5cdFx0XHRcdFx0XHR9LCBcIjFtXCIpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LnByZXZpZXdpbmdJZCA9IHByZXZpZXdJbnRldmFsO1xyXG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnQUxSRUFEWSBQUkVWSUVXSU5HJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZWZmZWN0KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhhbW91bnQpO1xyXG5cclxuXHRcdFx0XHRlZmZlY3Qud2V0LnZhbHVlID0gYW1vdW50IC8gMTAwMDtcclxuXHRcdFx0fTtcclxuXHJcblx0XHR9XHJcblx0XHRcclxuXHJcblx0fVxyXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=