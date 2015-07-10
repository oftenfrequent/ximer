'use strict';
var app = angular.module('FullstackGeneratedApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'ngStorage']);

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
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });

    $stateProvider.state('home.landing', {
        url: '/landing',
        templateUrl: 'js/home/landing.html'
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
            $state.go('home');
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

    window.onblur = function () {
        $scope.stop();
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

    ProjectFct.getProjectInfo($scope.projectId).then(function (project) {
        var loaded = 0;
        console.log('PROJECT', project);
        $scope.projectName = project.name;

        if (project.tracks.length) {

            project.tracks.forEach(function (track) {

                if (track.url) {
                    var doneLoading = function doneLoading() {
                        loaded++;
                        if (loaded === project.tracks.length) {
                            $scope.loading = false;
                            // Tone.Transport.start();
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
    };
    $scope.nameChange = function (newName) {
        $scope.nameChanging = false;
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
            $state.go('home');
        })['catch'](function () {
            $scope.error = 'Invalid login credentials.';
        });
    };
});

app.controller('HomeController', function ($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state) {
    console.log('in Home controller');
    var trackBucket = [];
    $scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };

    $scope.projects = function () {
        console.log('in here');
        ProjectFct.getProjectInfo().then(function (projects) {
            $scope.allProjects = projects;
            // console.log('All Projects are', projects)
        });
    };
    $scope.projects();

    $scope.makeFork = function (project) {};
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
        console.log('clicked', user);
        $state.go('userProfile', { theID: user._id });
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
        console.log('getting');

        $scope.loggedInUser = loggedInUser;

        userFactory.getUserObj($stateParams.theID).then(function (user) {
            $scope.user = user;
            console.log('user is', user);
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

    $scope.logMe = function () {
        console.log($scope.user);
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
            return $http.put('api/users/', fork.data).then(function (response) {
                return response.data;
            });
        });
    };
    var newProject = function newProject(user) {
        return $http.post('/api/projects', { owner: user._id, name: 'Untitled', bpm: 120, endMeasure: 32 }).then(function (response) {
            return response.data;
        });
    };

    var deleteProject = function deleteProject(project) {
        return $http['delete']('/api/projects/' + project._id).then(function (response) {
            console.log('Delete Proj Fct', response.data);
            return response.data;
        });
    };

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork,
        newProject: newProject,
        deleteProject: deleteProject
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
        var pingpong = new Tone.PingPongDelay();

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

    // AuthService.getLoggedInUser().then(function(loggedInUser){

    //        	$scope.loggedInUser = loggedInUser;

    //         	userFactory.getUserObj($stateParams.theID).then(function(user){
    //            $scope.user = user;
    //            console.log('user is', user);
    //    	});
    // });

    $scope.goToFollower = function (myFollower) {
        console.log('clicked', myFollower);
        $state.go('userProfile', { theID: myFollower._id });
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
                    scope.userId = user._id;
                    scope.items = [{ label: 'Home', state: 'home' }, { label: 'Profile', state: 'userProfile({theID: userId})', auth: true }];
                });
            };
            setNavbar();

            scope.items = [{ label: 'Home', state: 'project' },
            // { label: 'Sign Up', state: 'signup' },
            { label: 'Members Only', state: 'userProfile', auth: true }];

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
            project.owner = loggedInUser._id;
            project.forkID = project._id;
            delete project._id;
            console.log(project);
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

            scope.dropInTimeline = function (index) {

                scope.track.player.loop = false;
                scope.track.player.stop();
                scope.track.onTimeline = true;
                var position = 0;
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
                        angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + trackIndex + '-' + position + '\' class=\'item\' style=\'position: absolute; background: url(data:image/png;base64,' + scope.track.img + ');\' draggable></canvas>')(scope));
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
                    for (var i = 0; i < loopsUI.length; i++) {
                        loopsUI[i].parentNode.removeChild(loopsUI[i]);
                    }
                    var loopsUI = document.getElementsByClassName('trackLoop' + index.toString());
                }
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
                ToneTimelineFct.muteAll(scope.$parent.tracks);
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

                window.setTimeout(function () {
                    RecorderFct.recordStop(index, recorder).then(function (player) {
                        scope.track.recording = false;
                        scope.track.empty = false;
                        continueUpdate = false;
                        window.cancelAnimationFrame(analyserId);
                        scope.track.player = player;
                        scope.track.player.loop = true;
                        scope.track.buffer = window.latestBuffer;
                        scope.track.rawAudio = window.latestRecording;
                        player.connect(scope.track.effectsRack[0]);
                        scope.$parent.metronome.stop();
                        window.clearInterval(click);

                        scope.$parent.stop();
                        ToneTimelineFct.unMuteAll(scope.$parent.tracks);
                    });
                }, 4000);

                window.setTimeout(function () {
                    RecorderFct.recordStart(recorder, index);
                }, 2000);
                scope.$parent.metronome.start();

                var click = window.setInterval(function () {
                    scope.$parent.metronome.stop();
                    scope.$parent.metronome.start();
                }, 500);
            };
            scope.preview = function (currentlyPreviewing) {
                console.log(currentlyPreviewing);
                if (currentlyPreviewing) {
                    scope.track.player.stop();
                    scope.track.previewing = false;
                } else {
                    scope.track.player.start();
                    scope.track.previewing = true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJ1c2VyL3VzZXJwcm9maWxlLmpzIiwic2lnbnVwL3NpZ251cC5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9OZXdQcm9qZWN0Q29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9UaW1lbGluZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVXNlckNvbnRyb2xsZXIuanMiLCJjb21tb24vZmFjdG9yaWVzL0FuYWx5c2VyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Ib21lRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Qcm9qZWN0RmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9SZWNvcmRlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvU29ja2V0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Ub25lVGltZWxpbmVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUcmFja0ZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlckZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9kcmFnZ2FibGUvZHJhZ2dhYmxlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2plY3QvcHJvamVjdERpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLElBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7QUFJQSxjQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7QUFFQSxZQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7O0FBR0EsYUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbERBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsc0JBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxNQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7QUFDQSxzQkFBQSxFQUFBLHNCQUFBO0FBQ0Esd0JBQUEsRUFBQSx3QkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGFBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7U0FDQSxDQUFBO0FBQ0EsZUFBQTtBQUNBLHlCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTs7Ozs7O0FBTUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQTs7Ozs7QUFLQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBO0FDeElBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsY0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFVBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ1hBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxxQkFBQTtBQUNBLG1CQUFBLEVBQUEseUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxRQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsVUFBQSxDQUFBLFdBQUEsR0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7O0FBR0EsVUFBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7OztBQUdBLGVBQUEsQ0FBQSxZQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxTQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsb0JBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLHdCQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLDhCQUFBLEVBQUEsQ0FBQTtBQUNBLDRCQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGtDQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7eUJBRUE7cUJBQ0EsQ0FBQTs7QUFFQSx3QkFBQSxHQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLHlCQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTs7QUFFQSx5QkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7OztBQUdBLHlCQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsd0JBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSx1Q0FBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7cUJBQ0EsTUFBQTtBQUNBLDZCQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtxQkFDQTtBQUNBLDBCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtpQkFDQSxNQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxXQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO2lCQUNBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBOzs7O0FBSUEsY0FBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQSxFQUFBLEVBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxFQUFBLE1BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7QUFJQSx1QkFBQSxDQUFBLGVBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxZQUFBLEtBQUEsR0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsUUFBQSxHQUFBLFlBQUEsRUFFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxtQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO1NBRUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNqTEEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEscUJBQUE7QUFDQSxtQkFBQSxFQUFBLDBCQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQTs7O0FBR0EsWUFBQSxFQUFBO0FBQ0Esd0JBQUEsRUFBQSxJQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHdCQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsT0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxxQkFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFdBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSx3QkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHVCQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsWUFBQTtBQUNBLG1CQUFBLEVBQUEsd0JBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2pDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBO0FBQ0EsbUJBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsWUFBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQzFCQSxHQUFBLENBQUEsVUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQTs7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUEsRUFFQSxDQUFBO0FBQ0EsUUFBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7U0FDQTs7QUFFQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsZ0JBQUEsSUFBQSxLQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7YUFDQSxNQUNBO0FBQ0Esb0JBQUEsR0FBQSxLQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBR0EsVUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBOztBQ2pEQSxHQUFBLENBQUEsVUFBQSxDQUFBLHNCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2hCQSxHQUFBLENBQUEsVUFBQSxDQUFBLG9CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUE7O0FBRUEsUUFBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLGNBQUEsQ0FBQSxjQUFBLENBQUEsMEJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxZQUFBLE1BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esb0JBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBO0FBQ0EsMEJBQUEsRUFBQSxDQUFBO0FBQ0Esd0JBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBOztxQkFFQTtpQkFDQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBOztBQUVBLHVCQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7Ozs7Ozs7QUFRQSxVQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxTQUFBLEdBQUEsQ0FBQSxDQUFBLFNBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLGFBQUEsRUFDQSxPQUFBOztBQUVBLFNBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EseUJBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsZUFBQSxDQUFBOzthQUdBLEVBQUEsR0FBQSxDQUFBLENBQUE7U0FFQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsUUFBQSxHQUFBLFlBQUEsRUFFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxZQUFBLFNBQUEsR0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEVBQUEsMEJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO1NBRUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQU1BLENBQUEsQ0FBQTs7QUN0R0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBR0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsTUFBQSxDQUFBLFlBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQSxLQUNBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLDRCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUtBLENBQUEsQ0FBQTtBQ25DQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLGlCQUFBLE1BQUEsR0FBQTtBQUNBLGdCQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsd0JBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLDJCQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EsaUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO2FBQ0E7QUFDQSxnQkFBQSxjQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBO0FBQ0EsY0FBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUdBLFFBQUEscUJBQUEsR0FBQSxTQUFBLHFCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsV0FBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLDZCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDNUNBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFdBQUE7QUFDQSxlQUFBLEVBQUEsaUJBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNiQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxTQUFBLEVBQUE7OztBQUdBLFlBQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxLQUFBLENBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLElBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxVQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGFBQUEsR0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsVUFBQSxDQUFBLGdCQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsV0FBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtBQUNBLHFCQUFBLEVBQUEsYUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDdkNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxRQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsR0FBQTs7QUFFQSxlQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxnQkFBQSxPQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsSUFBQSxNQUFBLENBQUEsa0JBQUEsQ0FBQTtBQUNBLGdCQUFBLFlBQUEsR0FBQSxJQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsUUFBQSxDQUFBOztBQUVBLGdCQUFBLFNBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxZQUFBLEdBQ0EsU0FBQSxDQUFBLFlBQUEsSUFDQSxTQUFBLENBQUEsa0JBQUEsSUFDQSxTQUFBLENBQUEsZUFBQSxJQUNBLFNBQUEsQ0FBQSxjQUFBLEFBQ0EsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLG9CQUFBLEVBQ0EsU0FBQSxDQUFBLG9CQUFBLEdBQUEsU0FBQSxDQUFBLDBCQUFBLElBQUEsU0FBQSxDQUFBLHVCQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxxQkFBQSxFQUNBLFNBQUEsQ0FBQSxxQkFBQSxHQUFBLFNBQUEsQ0FBQSwyQkFBQSxJQUFBLFNBQUEsQ0FBQSx3QkFBQSxDQUFBOzs7QUFHQSxxQkFBQSxDQUFBLFlBQUEsQ0FDQTtBQUNBLHVCQUFBLEVBQUE7QUFDQSwrQkFBQSxFQUFBO0FBQ0EsOENBQUEsRUFBQSxPQUFBO0FBQ0EsNkNBQUEsRUFBQSxPQUFBO0FBQ0EsOENBQUEsRUFBQSxPQUFBO0FBQ0EsNENBQUEsRUFBQSxPQUFBO3FCQUNBO0FBQ0EsOEJBQUEsRUFBQSxFQUFBO2lCQUNBO2FBQ0EsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLG9CQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7OztBQUdBLG9CQUFBLGNBQUEsR0FBQSxZQUFBLENBQUEsdUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLFVBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7O0FBR0Esb0JBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLDRCQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOzs7QUFHQSx3QkFBQSxHQUFBLElBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsUUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSx1QkFBQSxDQUFBLENBQUEsUUFBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBLENBQUE7YUFFQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsb0JBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFlBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLG9CQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7OztBQUlBLHdCQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0NBQUEsQ0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxrQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBSUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLE1BQUEsR0FBQSxJQUFBLFVBQUEsRUFBQSxDQUFBOztBQUVBLGdCQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLGFBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLDJCQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUE7YUFDQSxNQUFBO0FBQ0EsdUJBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFLQSxXQUFBO0FBQ0EsaUJBQUEsRUFBQSxtQkFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxnQkFBQSxZQUFBLEdBQUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxlQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxFQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSwyQkFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx3QkFBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLFFBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLG1DQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBO3lCQUNBLENBQUEsQ0FBQTtxQkFDQTtpQkFDQSxDQUFBLENBQUE7O0FBRUEsdUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsOEJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLDJCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUE7QUFDQSxvQkFBQSxFQUFBLFlBQUE7QUFDQSxtQkFBQSxFQUFBLFdBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDNUlBLFlBQUEsQ0FBQTs7QUNBQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBOztBQUVBLDJCQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLHdCQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxPQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7aUJBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7aUJBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsU0FBQSxTQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZ0JBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsR0FBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsZ0JBQUEsR0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxxQkFBQSxFQUFBLFlBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLGNBQUEsRUFBQTs7QUFFQSxZQUFBLGNBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLHNCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7YUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO1NBRUE7O0FBRUEsc0JBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsZ0JBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2FBQ0EsRUFBQSxTQUFBLENBQUEsQ0FBQTs7Ozs7OztTQVFBLENBQUEsQ0FBQTtLQUVBLENBQUE7O0FBRUEsV0FBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7QUFDQSx1QkFBQSxFQUFBLGVBQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtBQUNBLGVBQUEsRUFBQSxPQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNoR0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLFFBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7O0FBR0EsZUFBQSxNQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsY0FBQSxHQUFBLFNBQUEsY0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsZ0JBQUEsR0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsSUFBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsZUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLEdBQUEsUUFBQSxJQUFBLFFBQUEsR0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxlQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxrQkFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLE1BQUEsQ0FBQTs7QUFFQSxrQkFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxFQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGlCQUFBLEdBQUEsU0FBQSxpQkFBQSxDQUFBLEdBQUEsRUFBQTs7QUFHQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxPQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxhQUFBLEVBQUEsQ0FBQTs7QUFFQSxZQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0E7O0FBRUEsY0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO1NBQ0EsRUFBQSxPQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsbUJBQUEsR0FBQSxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFFBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFdBQUE7QUFDQSxvQkFBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLGNBQUE7QUFDQSx5QkFBQSxFQUFBLGlCQUFBO0FBQ0Esb0NBQUEsRUFBQSw0QkFBQTtBQUNBLDJCQUFBLEVBQUEsbUJBQUE7QUFDQSwwQkFBQSxFQUFBLGtCQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNoRkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsSUFBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLDZCQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2hCQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLFlBQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsYUFBQSxDQUFBLFlBQUEsQ0FBQSxhQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxnQkFBQSxHQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLEtBQUEsQ0FBQTtTQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGdCQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBO1NBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTtLQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFBQSxTQUNBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTs7QUFFQSxnQkFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsWUFBQSxDQUFBLFVBQUEsR0FBQSxNQUFBLENBQUE7O0FBRUEsb0JBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsb0JBQUEsQ0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7O0FBRUEsb0JBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOzs7QUFHQSxvQkFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBO0FBQ0Esb0JBQUEsYUFBQSxDQUFBO0FBQ0Esb0JBQUEsU0FBQSxDQUFBOztBQUVBLHFCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLHdCQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxTQUFBLEtBQUEsWUFBQSxFQUFBOztBQUVBLDRCQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBOztBQUVBLDRCQUFBLFVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQTs7QUFFQSw2QkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7O0FBRUEsZ0NBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFFBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSwwQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLDZDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxDQUFBO0FBQ0EseUNBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7NkJBRUE7eUJBQ0E7cUJBQ0E7aUJBQ0E7O0FBR0EscUJBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsNkJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxhQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ2hIQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseURBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxrREFBQTtBQUNBLGtCQUFBLEVBQUEsMkJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsMkJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7Ozs7Ozs7Ozs7OztBQWNBLFVBQUEsQ0FBQSxZQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxFQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLFVBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzNCQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLHlDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsR0FBQTtBQUNBLDJCQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxTQUFBLEVBQUEsS0FBQSxFQUFBLDhCQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUNBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtBQUNBLHFCQUFBLEVBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLEtBQUEsR0FBQSxDQUNBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsS0FBQSxFQUFBLGNBQUEsRUFBQSxLQUFBLEVBQUEsYUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsQ0FDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLDBCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxnQkFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLG1CQUFBLEVBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtTQUVBOztLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUM1REEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxrQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxvREFBQTtBQUNBLGtCQUFBLEVBQUEsNEJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsNEJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsR0FBQSxLQUFBLFlBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7YUFDQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHNCQUFBLEVBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxtQkFBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxhQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUN4Q0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHVDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLGVBQUEsR0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxZQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esd0JBQUEsYUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBOztBQUVBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsYUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLDRCQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxPQUFBLEVBQUE7QUFDQSxtQ0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLDBJQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7eUJBQ0E7cUJBQ0E7aUJBQ0E7YUFDQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLHFCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG9CQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBOztBQUVBLDJCQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGdDQUFBLEVBQUEsQ0FBQTtxQkFDQTtpQkFDQTs7O0FBR0Esb0JBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsb0JBQUEsQ0FBQSxPQUFBLENBQUEsMEJBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTtpQkFDQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLGlEQUFBLEdBQUEsUUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLGtCQUFBLEdBQUEsS0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsMkJBQUEsR0FBQSxLQUFBLEdBQUEsdUVBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSwwQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTthQUVBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxhQUFBLEVBQUEsVUFBQSxFQUFBO0FBQ0EsdUJBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLGdDQUFBLENBQUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBR0EsaUJBQUEsQ0FBQSxpQkFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG9CQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLHdCQUFBLFNBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLDRCQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSw0QkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLGlEQUFBLEdBQUEsUUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLGtCQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLEdBQUEsc0ZBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSwwQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTtxQkFFQSxNQUFBOzs7NEJBT0EsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLG1DQUFBLElBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxPQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTt5QkFDQTs7QUFSQSw0QkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxvQ0FBQSxDQUFBLGtCQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFLQSxxQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO3FCQUNBO2lCQUNBLE1BQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtpQkFDQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7QUFFQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLG9CQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsTUFBQSxLQUFBLENBQUEsRUFBQTtBQUNBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLCtCQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtxQkFDQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7aUJBQ0E7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxvQkFBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSwrQkFBQSxLQUFBLENBQUE7cUJBQ0E7aUJBQ0EsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsSUFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTs7QUFFQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsT0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLG9CQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0EsTUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7aUJBQ0E7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsK0JBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLFFBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBOztBQUVBLG9CQUFBLGNBQUEsR0FBQSxJQUFBLENBQUE7OztBQUdBLG9CQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLGVBQUEsR0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7O0FBR0EseUJBQUEsTUFBQSxHQUFBO0FBQ0Esd0JBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxZQUFBLEdBQUEsSUFBQSxVQUFBLENBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxnQ0FBQSxDQUFBLG9CQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsbUNBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSx3QkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSx5QkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLDRCQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSw0QkFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsNkJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxpQ0FBQSxHQUFBLFNBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSw0QkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVDQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsdUNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7cUJBQ0E7QUFDQSx3QkFBQSxjQUFBLEVBQUE7QUFDQSw4QkFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7cUJBQ0E7aUJBQ0E7O0FBRUEsc0JBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLCtCQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHNDQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsOEJBQUEsQ0FBQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSw4QkFBQSxDQUFBLGFBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7QUFFQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVDQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7cUJBQ0EsQ0FBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLCtCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtpQkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBOztBQUVBLG9CQUFBLEtBQUEsR0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSx5QkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7aUJBQ0EsRUFBQSxHQUFBLENBQUEsQ0FBQTthQUVBLENBQUE7QUFDQSxpQkFBQSxDQUFBLE9BQUEsR0FBQSxVQUFBLG1CQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxtQkFBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtpQkFDQSxNQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtpQkFDQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTthQUNBLENBQUE7U0FFQTs7S0FHQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ25nU3RvcmFnZSddKTtcclxuXHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcclxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcclxuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxyXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xyXG59KTtcclxuXHJcbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cclxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xyXG5cclxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXHJcbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxyXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXHJcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XHJcblxyXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xyXG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxyXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cclxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxyXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXHJcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cclxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxufSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxyXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xyXG5cclxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XHJcblxyXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcclxuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xyXG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xyXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcclxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXHJcbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xyXG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXHJcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXHJcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxyXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxyXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcclxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XHJcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XHJcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcclxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxyXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxyXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcclxuICAgICAgICAgICAgJyRpbmplY3RvcicsXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcclxuXHJcbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxyXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cclxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcclxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxyXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXHJcbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXHJcbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxyXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcclxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zaWdudXAgPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coY3JlZGVudGlhbHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIGNyZWRlbnRpYWxzKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oIG9uU3VjY2Vzc2Z1bExvZ2luIClcclxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgc2lnbnVwIGNyZWRlbnRpYWxzLicgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcclxuXHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XHJcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pO1xyXG5cclxufSkoKTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcclxuICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUubGFuZGluZycse1xyXG4gICAgXHR1cmw6ICcvbGFuZGluZycsXHJcbiAgICBcdHRlbXBsYXRlVXJsOiAnanMvaG9tZS9sYW5kaW5nLmh0bWwnXHJcbiAgICB9KVxyXG59KTtcclxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XHJcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xyXG5cclxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xyXG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuXHJcbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24obG9naW5JbmZvKSB7XHJcblxyXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2plY3QnLCB7XHJcbiAgICAgICAgdXJsOiAnL3Byb2plY3QvOnByb2plY3RJRCcsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9qZWN0L3Byb2plY3QuaHRtbCdcclxuICAgIH0pO1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkY29tcGlsZSwgUmVjb3JkZXJGY3QsIFByb2plY3RGY3QsIFRvbmVUcmFja0ZjdCwgVG9uZVRpbWVsaW5lRmN0LCBBdXRoU2VydmljZSkge1xyXG5cclxuXHR3aW5kb3cub25ibHVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICRzY29wZS5zdG9wKCk7XHJcbiAgICB9O1xyXG5cclxuXHR2YXIgbWF4TWVhc3VyZSA9IDA7XHJcblxyXG5cdC8vIG51bWJlciBvZiBtZWFzdXJlcyBvbiB0aGUgdGltZWxpbmVcclxuXHQkc2NvcGUubnVtTWVhc3VyZXMgPSBfLnJhbmdlKDAsIDYwKTtcclxuXHJcblx0Ly8gbGVuZ3RoIG9mIHRoZSB0aW1lbGluZVxyXG5cdCRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcclxuXHJcblx0Ly9Jbml0aWFsaXplIHJlY29yZGVyIG9uIHByb2plY3QgbG9hZFxyXG5cdFJlY29yZGVyRmN0LnJlY29yZGVySW5pdCgpLnRoZW4oZnVuY3Rpb24gKHJldEFycikge1xyXG5cdFx0JHNjb3BlLnJlY29yZGVyID0gcmV0QXJyWzBdO1xyXG5cdFx0JHNjb3BlLmFuYWx5c2VyTm9kZSA9IHJldEFyclsxXTtcclxuXHR9KS5jYXRjaChmdW5jdGlvbiAoZSl7XHJcbiAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhlKTtcclxuICAgIH0pO1xyXG5cclxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcblx0JHNjb3BlLm5hbWVDaGFuZ2luZyA9IGZhbHNlO1xyXG5cdCRzY29wZS50cmFja3MgPSBbXTtcclxuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0JHNjb3BlLnByb2plY3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9qZWN0SUQ7XHJcblx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xyXG5cclxuXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCRzY29wZS5wcm9qZWN0SWQpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcclxuXHRcdHZhciBsb2FkZWQgPSAwO1xyXG5cdFx0Y29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcclxuXHRcdCRzY29wZS5wcm9qZWN0TmFtZSA9IHByb2plY3QubmFtZTtcclxuXHJcblx0XHRpZiAocHJvamVjdC50cmFja3MubGVuZ3RoKSB7XHJcblxyXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cclxuXHRcdFx0XHRpZiAodHJhY2sudXJsKSB7XHJcblx0XHRcdFx0XHR2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdGxvYWRlZCsrO1xyXG5cdFx0XHRcdFx0XHRpZihsb2FkZWQgPT09IHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHR2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdHJhY2subG9jYXRpb24pO1xyXG5cdFx0XHRcdFx0aWYobWF4ICsgMiA+IG1heE1lYXN1cmUpIG1heE1lYXN1cmUgPSBtYXggKyAyO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dHJhY2sucmVjb3JkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGFzc3VtaW5nIHRoYXQgYSBwbGF5ZXIgZXhpc3RzXHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG5cdFx0XHRcdFx0Ly9pbml0IGVmZmVjdHMsIGNvbm5lY3QsIGFuZCBhZGQgdG8gc2NvcGVcclxuXHJcblx0XHRcdFx0XHR0cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZSh0cmFjay5lZmZlY3RzUmFjayk7XHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIuY29ubmVjdCh0cmFjay5lZmZlY3RzUmFja1swXSk7XHJcblxyXG5cdFx0XHRcdFx0aWYodHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcclxuXHRcdFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IHRydWU7XHJcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xyXG4gICAgXHRcdFx0XHR0cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdHRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLCAwLCAwLCAwXSk7XHJcbiAgICBcdFx0XHRcdHRyYWNrLnBsYXllciA9IG51bGw7XHJcbiAgICBcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdCRzY29wZS5tYXhNZWFzdXJlID0gMzI7XHJcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcclxuICAgIFx0XHRcdFx0dmFyIG9iaiA9IHt9O1xyXG4gICAgXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xyXG4gICAgXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5vblRpbWVsaW5lID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5zaWxlbmNlID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwgMCwgMCwgMF0pO1xyXG4gICAgXHRcdFx0XHRvYmoucGxheWVyID0gbnVsbDtcclxuICAgIFx0XHRcdFx0b2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xyXG4gICAgXHRcdFx0XHRvYmoubG9jYXRpb24gPSBbXTtcclxuICAgIFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XHJcbiAgXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vZHluYW1pY2FsbHkgc2V0IG1lYXN1cmVzXHJcblx0XHQvL2lmIGxlc3MgdGhhbiAxNiBzZXQgMTggYXMgbWluaW11bVxyXG5cdFx0JHNjb3BlLm51bU1lYXN1cmVzID0gW107XHJcblx0XHRpZihtYXhNZWFzdXJlIDwgMzIpIG1heE1lYXN1cmUgPSAzNDtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4TWVhc3VyZTsgaSsrKSB7XHJcblx0XHRcdCRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xyXG5cdFx0fVxyXG5cdFx0Y29uc29sZS5sb2coJ01FQVNVUkVTJywgJHNjb3BlLm51bU1lYXN1cmVzKTtcclxuXHJcblxyXG5cclxuXHRcdFRvbmVUaW1lbGluZUZjdC5jcmVhdGVUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcclxuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZSA9IG1ldHJvbm9tZTtcclxuXHRcdH0pO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHQkc2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdHZhciB0cmFjayA9IHNjb3BlLnRyYWNrc1tpbmRleF07XHJcblx0fVxyXG5cclxuXHQkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdH07XHJcblxyXG5cdCRzY29wZS5wbGF5ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JHNjb3BlLnBsYXlpbmcgPSB0cnVlO1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQucG9zaXRpb24gPSAkc2NvcGUucG9zaXRpb24udG9TdHJpbmcoKSArIFwiOjA6MFwiO1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcclxuXHR9XHJcblx0JHNjb3BlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JHNjb3BlLnBsYXlpbmcgPSBmYWxzZTtcclxuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XHJcblx0XHQkc2NvcGUucG9zaXRpb24gPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpWzBdO1xyXG5cdFx0Y29uc29sZS5sb2coJ1BPUycsICRzY29wZS5wb3NpdGlvbik7XHJcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gKCRzY29wZS5wb3NpdGlvbiAqIDIwMCArIDMwMCkudG9TdHJpbmcoKSsncHgnO1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQucGF1c2UoKTtcclxuXHR9XHJcblx0JHNjb3BlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRUb25lVGltZWxpbmVGY3Quc3RvcEFsbCgkc2NvcGUudHJhY2tzKTtcclxuXHRcdCRzY29wZS5wb3NpdGlvbiA9IDA7XHJcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gJzMwMHB4JztcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcclxuXHR9XHJcblx0JHNjb3BlLm5hbWVDaGFuZ2UgPSBmdW5jdGlvbihuZXdOYW1lKSB7XHJcblx0XHQkc2NvcGUubmFtZUNoYW5naW5nID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQkc2NvcGUudG9nZ2xlTWV0cm9ub21lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYoJHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPT09IDApIHtcclxuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAwO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbiAgJHNjb3BlLnNlbmRUb0FXUyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoJHNjb3BlLnRyYWNrcywgJHNjb3BlLnByb2plY3RJZCwgJHNjb3BlLnByb2plY3ROYW1lKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgIC8vIHdhdmUgbG9naWNcclxuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XHJcblxyXG4gICAgfSk7XHJcbiAgfTtcclxuICBcclxuICAkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICB9O1xyXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJQcm9maWxlJywge1xyXG4gICAgICAgIHVybDogJy91c2VycHJvZmlsZS86dGhlSUQnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci91c2VycHJvZmlsZS5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInLFxyXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmFydGlzdEluZm8nLCB7XHJcbiAgICAgICAgdXJsOiAnL2luZm8nLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9pbmZvLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLnByb2plY3QnLCB7XHJcbiAgICAgICAgdXJsOiAnL3Byb2plY3RzJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvcHJvamVjdHMuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSlcclxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuZm9sbG93ZXJzJywge1xyXG4gICAgICAgIHVybDogJy9mb2xsb3dlcnMnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dlcnMuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSlcclxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuZm9sbG93aW5nJywge1xyXG4gICAgICAgIHVybDogJy9mb2xsb3dpbmcnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dpbmcuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcclxuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAkc2NvcGUuc2lnbnVwID0ge307XHJcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xyXG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJcclxuYXBwLmNvbnRyb2xsZXIoJ0hvbWVDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgVG9uZVRyYWNrRmN0LCBQcm9qZWN0RmN0LCAkc3RhdGVQYXJhbXMsICRzdGF0ZSkge1xyXG5cdGNvbnNvbGUubG9nKCdpbiBIb21lIGNvbnRyb2xsZXInKTtcclxuXHR2YXIgdHJhY2tCdWNrZXQgPSBbXTtcclxuXHQkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICB9O1xyXG5cclxuICAgICRzY29wZS5wcm9qZWN0cyA9IGZ1bmN0aW9uICgpe1xyXG4gICAgXHRjb25zb2xlLmxvZygnaW4gaGVyZScpXHJcbiAgICBcdFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oKS50aGVuKGZ1bmN0aW9uKHByb2plY3RzKXtcclxuICAgIFx0XHQkc2NvcGUuYWxsUHJvamVjdHM9cHJvamVjdHM7XHJcbiAgICBcdFx0Ly8gY29uc29sZS5sb2coJ0FsbCBQcm9qZWN0cyBhcmUnLCBwcm9qZWN0cylcclxuICAgIFx0fSlcclxuICAgIH1cclxuXHQkc2NvcGUucHJvamVjdHMoKTtcclxuXHJcblx0XHQkc2NvcGUubWFrZUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHJcblx0XHRcdH1cclxuXHRcdHZhciBzdG9wID1mYWxzZTtcclxuXHJcblx0XHQkc2NvcGUuc2FtcGxlVHJhY2sgPSBmdW5jdGlvbih0cmFjayl7XHJcblxyXG5cdFx0XHRpZihzdG9wPT09dHJ1ZSl7XHJcblx0XHRcdFx0JHNjb3BlLnBsYXllci5zdG9wKClcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0VG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGZ1bmN0aW9uKHBsYXllcil7XHJcblx0XHRcdFx0JHNjb3BlLnBsYXllciA9IHBsYXllcjtcclxuXHRcdFx0XHRpZihzdG9wPT09ZmFsc2Upe1xyXG5cdFx0XHRcdFx0c3RvcD10cnVlXHJcblx0XHRcdFx0XHQkc2NvcGUucGxheWVyLnN0YXJ0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2V7XHJcblx0XHRcdFx0XHRzdG9wPWZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdH1cclxuXHJcblxyXG5cdCAgJHNjb3BlLmdldFVzZXJQcm9maWxlID0gZnVuY3Rpb24odXNlcil7XHJcblx0ICAgIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCB1c2VyKTtcclxuXHQgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHt0aGVJRDogdXNlci5faWR9KTtcclxuXHR9XHJcblxyXG4gICAgXHJcblxyXG5cclxufSk7XHJcblxyXG4iLCJhcHAuY29udHJvbGxlcignTmV3UHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBQcm9qZWN0RmN0LCAkc3RhdGUpe1xyXG5cdCRzY29wZS51c2VyO1xyXG5cclxuXHQgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCAkc2NvcGUudXNlci51c2VybmFtZSlcclxuICAgIH0pO1xyXG5cclxuXHQgJHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xyXG5cdCBcdFByb2plY3RGY3QubmV3UHJvamVjdCgkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihwcm9qZWN0SWQpe1xyXG5cdCBcdFx0Y29uc29sZS5sb2coJ1N1Y2Nlc3MgaXMnLCBwcm9qZWN0SWQpXHJcblx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHByb2plY3RJZH0pO1x0IFx0XHJcblx0XHR9KVxyXG5cclxuXHQgfVxyXG5cclxufSkiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcclxuICBcclxuICB2YXIgd2F2QXJyYXkgPSBbXTtcclxuICBcclxuICAkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IDYwOyBpKyspIHtcclxuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xyXG4gIH1cclxuXHJcbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG4gICRzY29wZS50cmFja3MgPSBbXTtcclxuICAkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cclxuICBQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCc1NTk0YzIwYWQwNzU5Y2Q0MGNlNTFlMTQnKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblxyXG4gICAgICB2YXIgbG9hZGVkID0gMDtcclxuICAgICAgY29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcclxuXHJcbiAgICAgIGlmIChwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuICAgICAgICBwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQrKztcclxuICAgICAgICAgICAgICAgIGlmKGxvYWRlZCA9PT0gcHJvamVjdC50cmFja3MubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG4gICAgICAgICAgICBUb25lVGltZWxpbmVGY3QuYWRkTG9vcFRvVGltZWxpbmUodHJhY2sucGxheWVyLCB0cmFjay5sb2NhdGlvbik7XHJcbiAgICAgICAgICAgICRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcclxuICAgICAgICAgIHZhciBvYmogPSB7fTtcclxuICAgICAgICAgIG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcclxuICAgICAgICAgIG9iai5sb2NhdGlvbiA9IFtdO1xyXG4gICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBUb25lVGltZWxpbmVGY3QuZ2V0VHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSk7XHJcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xyXG5cclxuICB9KTtcclxuXHJcbiAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihhVXNlcil7XHJcbiAgLy8gICAgICRzY29wZS50aGVVc2VyID0gYVVzZXI7XHJcbiAgLy8gICAgIC8vICRzdGF0ZVBhcmFtcy50aGVJRCA9IGFVc2VyLl9pZFxyXG4gIC8vICAgICBjb25zb2xlLmxvZyhcImlkXCIsICRzdGF0ZVBhcmFtcyk7XHJcbiAgLy8gfSk7XHJcblxyXG4gICRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoZSwgaW5kZXgpIHtcclxuXHJcbiAgXHRlID0gZS50b0VsZW1lbnQ7XHJcblxyXG4gICAgICAgIC8vIHN0YXJ0IHJlY29yZGluZ1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdGFydCByZWNvcmRpbmcnKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoIWF1ZGlvUmVjb3JkZXIpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgZS5jbGFzc0xpc3QuYWRkKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgIGF1ZGlvUmVjb3JkZXIuY2xlYXIoKTtcclxuICAgICAgICBhdWRpb1JlY29yZGVyLnJlY29yZCgpO1xyXG5cclxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGF1ZGlvUmVjb3JkZXIuc3RvcCgpO1xyXG4gICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xyXG4gICAgICAgICAgICAvLyAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcclxuXHJcbiAgICAgICAgICB9LCA1MDApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgfSwgMjAwMCk7XHJcblxyXG4gIH1cclxuXHJcbiAgJHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICB9O1xyXG5cclxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgIHZhciBhd3NUcmFja3MgPSAkc2NvcGUudHJhY2tzLmZpbHRlcihmdW5jdGlvbih0cmFjayxpbmRleCl7XHJcbiAgICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKGF3c1RyYWNrcywgJzU1OTVhN2ZhYWE5MDFhZDYzMjM0ZjkyMCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcclxuXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuXHJcblx0XHJcblxyXG5cclxufSk7XHJcblxyXG5cclxuIiwiXHJcbmFwcC5jb250cm9sbGVyKCdVc2VyQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSwgQXV0aFNlcnZpY2UsICRzdGF0ZVBhcmFtcywgdXNlckZhY3RvcnkpIHtcclxuXHJcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2dldHRpbmcnKVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgJHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuXHJcbiAgICAgICAgICB1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBpcycsIHVzZXIpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIFxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgICRzY29wZS5kaXNwbGF5U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcclxuICAgICAgICBlbHNlICRzY29wZS5zaG93U2V0dGluZ3MgPSB0cnVlO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5zaG93U2V0dGluZ3MpO1xyXG4gICAgfVxyXG5cclxuICAgICRzY29wZS5mb2xsb3cgPSBmdW5jdGlvbih1c2VyKXtcclxuICAgICAgdXNlckZhY3RvcnkuZm9sbG93KHVzZXIsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdGb2xsb3cgY29udHJvbGxlciByZXNwb25zZScsIHJlc3BvbnNlKTtcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAkc2NvcGUubG9nTWUgPSBmdW5jdGlvbigpe1xyXG4gICAgICBjb25zb2xlLmxvZygkc2NvcGUudXNlcik7XHJcbiAgICB9XHJcblxyXG4gICAgXHJcblxyXG5cclxufSk7IiwiYXBwLmZhY3RvcnkoJ0FuYWx5c2VyRmN0JywgZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciB1cGRhdGVBbmFseXNlcnMgPSBmdW5jdGlvbiAoYW5hbHlzZXJDb250ZXh0LCBhbmFseXNlck5vZGUsIGNvbnRpbnVlVXBkYXRlKSB7XHJcblxyXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xyXG5cdFx0XHR2YXIgU1BBQ0lORyA9IDM7XHJcblx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xyXG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XHJcblx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xyXG5cclxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxyXG5cclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcclxuXHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xyXG5cclxuXHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcclxuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcclxuXHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcclxuXHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxyXG5cdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xyXG5cdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XHJcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XHJcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cdH1cclxuXHJcblxyXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xyXG5cdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XHJcblx0fVxyXG5cdHJldHVybiB7XHJcblx0XHR1cGRhdGVBbmFseXNlcnM6IHVwZGF0ZUFuYWx5c2VycyxcclxuXHRcdGNhbmNlbEFuYWx5c2VyVXBkYXRlczogY2FuY2VsQW5hbHlzZXJVcGRhdGVzXHJcblx0fVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdIb21lRmN0JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXInLCB7cGFyYW1zOiB7X2lkOiB1c2VyfX0pXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Y2Nlc3MuZGF0YTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1Byb2plY3RGY3QnLCBmdW5jdGlvbigkaHR0cCl7XHJcblxyXG4gICAgdmFyIGdldFByb2plY3RJbmZvID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xyXG5cclxuICAgICAgICAvL2lmIGNvbWluZyBmcm9tIEhvbWVDb250cm9sbGVyIGFuZCBubyBJZCBpcyBwYXNzZWQsIHNldCBpdCB0byAnYWxsJ1xyXG4gICAgICAgIHZhciBwcm9qZWN0aWQ9IHByb2plY3RJZCB8fCAnYWxsJ1xyXG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvamVjdHMvJyArIHByb2plY3RpZCB8fCBwcm9qZWN0aWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGNyZWF0ZUFGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzLycsIHByb2plY3QpLnRoZW4oZnVuY3Rpb24oZm9yayl7XHJcbiAgICBcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzLycsIGZvcmsuZGF0YSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICBcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgIFx0XHR9KTtcclxuICAgIFx0fSk7XHJcbiAgICB9XHJcbiAgICB2YXIgbmV3UHJvamVjdCA9IGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgXHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9wcm9qZWN0cycse293bmVyOnVzZXIuX2lkLCBuYW1lOidVbnRpdGxlZCcsIGJwbToxMjAsIGVuZE1lYXN1cmU6IDMyfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICBcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICBcdH0pXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL3Byb2plY3RzLycrcHJvamVjdC5faWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRGVsZXRlIFByb2ogRmN0JywgcmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBnZXRQcm9qZWN0SW5mbzogZ2V0UHJvamVjdEluZm8sXHJcbiAgICAgICAgY3JlYXRlQUZvcms6IGNyZWF0ZUFGb3JrLFxyXG4gICAgICAgIG5ld1Byb2plY3Q6IG5ld1Byb2plY3QsIFxyXG4gICAgICAgIGRlbGV0ZVByb2plY3Q6IGRlbGV0ZVByb2plY3RcclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiYXBwLmZhY3RvcnkoJ1JlY29yZGVyRmN0JywgZnVuY3Rpb24gKCRodHRwLCBBdXRoU2VydmljZSwgJHEsIFRvbmVUcmFja0ZjdCwgQW5hbHlzZXJGY3QpIHtcclxuXHJcbiAgICB2YXIgcmVjb3JkZXJJbml0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICB2YXIgQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcclxuICAgICAgICAgICAgdmFyIGF1ZGlvQ29udGV4dCA9IG5ldyBDb250ZXh0KCk7XHJcbiAgICAgICAgICAgIHZhciByZWNvcmRlcjtcclxuXHJcbiAgICAgICAgICAgIHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xyXG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gKFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pDYW5jZWxBbmltYXRpb25GcmFtZTtcclxuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1velJlcXVlc3RBbmltYXRpb25GcmFtZTtcclxuXHJcbiAgICAgICAgICAgIC8vIGFzayBmb3IgcGVybWlzc2lvblxyXG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhdWRpb1wiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1hbmRhdG9yeVwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nRWNob0NhbmNlbGxhdGlvblwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nQXV0b0dhaW5Db250cm9sXCI6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dOb2lzZVN1cHByZXNzaW9uXCI6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dIaWdocGFzc0ZpbHRlclwiOiBcImZhbHNlXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9wdGlvbmFsXCI6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHN0cmVhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXRQb2ludCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW4gQXVkaW9Ob2RlIGZyb20gdGhlIHN0cmVhbS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWxBdWRpb0lucHV0ID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdWRpb0lucHV0ID0gcmVhbEF1ZGlvSW5wdXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1ZGlvSW5wdXQuY29ubmVjdChpbnB1dFBvaW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbmFseXNlciBub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhbmFseXNlck5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHlzZXJOb2RlLmZmdFNpemUgPSAyMDQ4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIGFuYWx5c2VyTm9kZSApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgcmVjb3JkZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoIGlucHV0UG9pbnQgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHplcm9HYWluID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uZ2Fpbi52YWx1ZSA9IDAuMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCB6ZXJvR2FpbiApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5jb25uZWN0KCBhdWRpb0NvbnRleHQuZGVzdGluYXRpb24gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoW3JlY29yZGVyLCBhbmFseXNlck5vZGVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVjb3JkU3RhcnQgPSBmdW5jdGlvbiAocmVjb3JkZXIpIHtcclxuICAgICAgICByZWNvcmRlci5jbGVhcigpO1xyXG4gICAgICAgIHJlY29yZGVyLnJlY29yZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciByZWNvcmRTdG9wID0gZnVuY3Rpb24gKGluZGV4LCByZWNvcmRlcikge1xyXG4gICAgICAgIHJlY29yZGVyLnN0b3AoKTtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgLy8gZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgICAgICByZWNvcmRlci5nZXRCdWZmZXJzKGZ1bmN0aW9uIChidWZmZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAvL2Rpc3BsYXkgd2F2IGltYWdlXHJcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZWRpc3BsYXlcIiArICBpbmRleCApO1xyXG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMzAwLCAxMDAsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBidWZmZXJzWzBdICk7XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0QnVmZmVyID0gYnVmZmVyc1swXTtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZSA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhlIE9OTFkgdGltZSBnb3RCdWZmZXJzIGlzIGNhbGxlZCBpcyByaWdodCBhZnRlciBhIG5ldyByZWNvcmRpbmcgaXMgY29tcGxldGVkIC0gXHJcbiAgICAgICAgICAgICAgICAvLyBzbyBoZXJlJ3Mgd2hlcmUgd2Ugc2hvdWxkIHNldCB1cCB0aGUgZG93bmxvYWQuXHJcbiAgICAgICAgICAgICAgICByZWNvcmRlci5leHBvcnRXQVYoIGZ1bmN0aW9uICggYmxvYiApIHtcclxuICAgICAgICAgICAgICAgICAgICAvL25lZWRzIGEgdW5pcXVlIG5hbWVcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmRlci5zZXR1cERvd25sb2FkKCBibG9iLCBcIm15UmVjb3JkaW5nMC53YXZcIiApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIGxvb3AgdGltZVxyXG4gICAgICAgICAgICAgICAgICAgIFRvbmVUcmFja0ZjdC5sb29wSW5pdGlhbGl6ZShibG9iLCBpbmRleCwgXCJteVJlY29yZGluZzAud2F2XCIpLnRoZW4ocmVzb2x2ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgXHJcblxyXG4gICAgXHJcbiAgICB2YXIgY29udmVydFRvQmFzZTY0ID0gZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2VhY2ggdHJhY2snLCB0cmFjayk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pIHtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKHRyYWNrLnJhd0F1ZGlvKTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG5cclxuXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzZW5kVG9BV1M6IGZ1bmN0aW9uICh0cmFja3NBcnJheSwgcHJvamVjdElkLCBwcm9qZWN0TmFtZSkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlYWRQcm9taXNlcyA9IHRyYWNrc0FycmF5Lm1hcChjb252ZXJ0VG9CYXNlNjQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICRxLmFsbChyZWFkUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKHN0b3JlRGF0YSkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRyYWNrc0FycmF5LmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3JlRGF0YVtpXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFjay5yYXdBdWRpbyA9IHN0b3JlRGF0YVtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2suZWZmZWN0c1JhY2sgPSB0cmFjay5lZmZlY3RzUmFjay5tYXAoZnVuY3Rpb24gKGVmZmVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVmZmVjdC53ZXQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2F3cy8nLCB7IHRyYWNrcyA6IHRyYWNrc0FycmF5LCBwcm9qZWN0SWQgOiBwcm9qZWN0SWQsIHByb2plY3ROYW1lIDogcHJvamVjdE5hbWUgfSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGluIHNlbmRUb0FXU0ZhY3RvcnknLCByZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhOyBcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZWNvcmRlckluaXQ6IHJlY29yZGVySW5pdCxcclxuICAgICAgICByZWNvcmRTdGFydDogcmVjb3JkU3RhcnQsXHJcbiAgICAgICAgcmVjb3JkU3RvcDogcmVjb3JkU3RvcFxyXG4gICAgfVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1RvbmVUaW1lbGluZUZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcclxuXHJcblx0dmFyIGNyZWF0ZVRyYW5zcG9ydCA9IGZ1bmN0aW9uIChsb29wRW5kKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3AgPSB0cnVlO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wU3RhcnQgPSAnMG0nO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wRW5kID0gbG9vcEVuZC50b1N0cmluZygpICsgJ20nO1xyXG5cdFx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblxyXG5cdFx0XHRjcmVhdGVNZXRyb25vbWUoKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHR2YXIgcG9zQXJyID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKTtcclxuXHRcdFx0XHRcdHZhciBsZWZ0UG9zID0gKChwYXJzZUludChwb3NBcnJbMF0pICogMjAwICkgKyAocGFyc2VJbnQocG9zQXJyWzFdKSAqIDUwKSArIDUwMCkudG9TdHJpbmcoKSArICdweCc7XHJcblx0XHRcdFx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gbGVmdFBvcztcclxuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xyXG5cdFx0XHRcdH0sICcxbScpO1xyXG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcclxuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xyXG5cdFx0XHRcdH0sICc0bicpO1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKG1ldHJvbm9tZSk7XHJcblx0XHRcdH0pO1xyXG4gICAgICAgIH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBjaGFuZ2VCcG0gPSBmdW5jdGlvbiAoYnBtKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5icG0udmFsdWUgPSBicG07XHJcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XHJcblx0fTtcclxuXHJcblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIG11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gLTEwMDtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciB1bk11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBjcmVhdGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0ICAgICAgICB2YXIgbWV0ID0gbmV3IFRvbmUuUGxheWVyKFwiL2FwaS93YXYvQ2xpY2sxLndhdlwiLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0KTtcclxuXHQgICAgICAgIH0pLnRvTWFzdGVyKCk7XHJcbiAgICAgICAgfSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGFkZExvb3BUb1RpbWVsaW5lID0gZnVuY3Rpb24gKHBsYXllciwgc3RhcnRUaW1lQXJyYXkpIHtcclxuXHJcblx0XHRpZihzdGFydFRpbWVBcnJheS5pbmRleE9mKDApID09PSAtMSkge1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHR9LCBcIjBtXCIpXHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHN0YXJ0VGltZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VGltZSkge1xyXG5cclxuXHRcdFx0dmFyIHN0YXJ0VGltZSA9IHN0YXJ0VGltZS50b1N0cmluZygpICsgJ20nO1xyXG5cclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTdGFydCcsIFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9LCBzdGFydFRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gdmFyIHN0b3BUaW1lID0gcGFyc2VJbnQoc3RhcnRUaW1lLnN1YnN0cigwLCBzdGFydFRpbWUubGVuZ3RoLTEpKSArIDEpLnRvU3RyaW5nKCkgKyBzdGFydFRpbWUuc3Vic3RyKC0xLDEpO1xyXG5cdFx0XHQvLy8vIGNvbnNvbGUubG9nKCdTVE9QJywgc3RvcCk7XHJcblx0XHRcdC8vLy8gdHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0Ly8vLyBcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdC8vLy8gfSwgc3RvcFRpbWUpO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHR9O1xyXG5cdFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBjcmVhdGVUcmFuc3BvcnQ6IGNyZWF0ZVRyYW5zcG9ydCxcclxuICAgICAgICBjaGFuZ2VCcG06IGNoYW5nZUJwbSxcclxuICAgICAgICBhZGRMb29wVG9UaW1lbGluZTogYWRkTG9vcFRvVGltZWxpbmUsXHJcbiAgICAgICAgY3JlYXRlTWV0cm9ub21lOiBjcmVhdGVNZXRyb25vbWUsXHJcbiAgICAgICAgc3RvcEFsbDogc3RvcEFsbCxcclxuICAgICAgICBtdXRlQWxsOiBtdXRlQWxsLFxyXG4gICAgICAgIHVuTXV0ZUFsbDogdW5NdXRlQWxsXHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1RvbmVUcmFja0ZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcclxuXHJcblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xyXG5cdFx0dmFyIHBsYXllciAgPSBuZXcgVG9uZS5QbGF5ZXIodXJsLCBkb25lRm4pO1xyXG5cdFx0Ly8gVE9ETzogcmVtb3ZlIHRvTWFzdGVyXHJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcclxuXHRcdC8vIHBsYXllci5zeW5jKCk7XHJcblx0XHQvLyBwbGF5ZXIubG9vcCA9IHRydWU7XHJcblx0XHRyZXR1cm4gcGxheWVyO1xyXG5cdH07XHJcblxyXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xyXG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdC8vUEFTU0VEIEEgQkxPQiBGUk9NIFJFQ09SREVSSlNGQUNUT1JZIC0gRFJPUFBFRCBPTiBNRUFTVVJFIDBcclxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuXHRcdFx0dmFyIGxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNhdmVcIitpbmRleCk7XHJcblx0XHRcdGxpbmsuaHJlZiA9IHVybDtcclxuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2JztcclxuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZyA9IGJsb2I7XHJcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdVUkwgPSB1cmw7XHJcblx0XHRcdHZhciBwbGF5ZXI7XHJcblx0XHRcdC8vIFRPRE86IHJlbW92ZSB0b01hc3RlclxyXG5cdFx0XHRwbGF5ZXIgPSBuZXcgVG9uZS5QbGF5ZXIobGluay5ocmVmLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBlZmZlY3RzSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGFycikge1xyXG5cclxuXHJcblx0XHR2YXIgY2hvcnVzID0gbmV3IFRvbmUuQ2hvcnVzKCk7XHJcblx0XHR2YXIgcGhhc2VyID0gbmV3IFRvbmUuUGhhc2VyKCk7XHJcblx0XHR2YXIgZGlzdG9ydCA9IG5ldyBUb25lLkRpc3RvcnRpb24oKTtcclxuXHRcdHZhciBwaW5ncG9uZyA9IG5ldyBUb25lLlBpbmdQb25nRGVsYXkoKTtcclxuXHJcblx0XHRpZiAoYXJyLmxlbmd0aCkge1xyXG5cdFx0XHRjaG9ydXMud2V0LnZhbHVlID0gYXJyWzBdO1xyXG5cdFx0XHRwaGFzZXIud2V0LnZhbHVlID0gYXJyWzFdO1xyXG5cdFx0XHRkaXN0b3J0LndldC52YWx1ZSA9IGFyclsyXTtcclxuXHRcdFx0cGluZ3Bvbmcud2V0LnZhbHVlID0gYXJyWzNdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRjaG9ydXMuY29ubmVjdChwaGFzZXIpO1xyXG5cdFx0cGhhc2VyLmNvbm5lY3QoZGlzdG9ydCk7XHJcblx0XHRkaXN0b3J0LmNvbm5lY3QocGluZ3BvbmcpO1xyXG5cdFx0cGluZ3BvbmcudG9NYXN0ZXIoKTtcclxuXHJcblx0XHRyZXR1cm4gW2Nob3J1cywgcGhhc2VyLCBkaXN0b3J0LCBwaW5ncG9uZ107XHJcblx0fTtcclxuXHJcblx0dmFyIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG1lYXN1cmUpIHtcclxuXHRcdHJldHVybiBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9LCBtZWFzdXJlK1wibVwiKTtcclxuXHR9O1xyXG5cclxuXHR2YXIgcmVwbGFjZVRpbWVsaW5lTG9vcCA9IGZ1bmN0aW9uKHBsYXllciwgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xyXG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdvbGQgdGltZWxpbmUgaWQnLCBvbGRUaW1lbGluZUlkKTtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShwYXJzZUludChvbGRUaW1lbGluZUlkKSk7XHJcblx0XHRcdC8vIFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmVzKCk7XHJcblx0XHRcdHJlc29sdmUoY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChwbGF5ZXIsIG5ld01lYXN1cmUpKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblx0dmFyIGRlbGV0ZVRpbWVsaW5lTG9vcCA9IGZ1bmN0aW9uKHRpbWVsaW5lSWQpIHtcclxuXHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQodGltZWxpbmVJZCkpO1xyXG5cdH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBjcmVhdGVQbGF5ZXI6IGNyZWF0ZVBsYXllcixcclxuICAgICAgICBsb29wSW5pdGlhbGl6ZTogbG9vcEluaXRpYWxpemUsXHJcbiAgICAgICAgZWZmZWN0c0luaXRpYWxpemU6IGVmZmVjdHNJbml0aWFsaXplLFxyXG4gICAgICAgIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3A6IGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AsXHJcbiAgICAgICAgcmVwbGFjZVRpbWVsaW5lTG9vcDogcmVwbGFjZVRpbWVsaW5lTG9vcCxcclxuICAgICAgICBkZWxldGVUaW1lbGluZUxvb3A6IGRlbGV0ZVRpbWVsaW5lTG9vcFxyXG4gICAgfTtcclxuXHJcbn0pO1xyXG4iLCJhcHAuZmFjdG9yeSgndXNlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XHJcblx0cmV0dXJuIHtcclxuXHRcdGdldFVzZXJPYmo6IGZ1bmN0aW9uKHVzZXJJRCl7XHJcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ2FwaS91c2VycycsIHtwYXJhbXM6IHtfaWQ6IHVzZXJJRH19KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygncmVzb29uc2UgaXMnLCByZXNwb25zZS5kYXRhKVxyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblx0XHRmb2xsb3c6IGZ1bmN0aW9uKHVzZXIsIGxvZ2dlZEluVXNlcil7XHJcblx0XHRcdHJldHVybiAkaHR0cC5wdXQoJ2FwaS91c2Vycycse3VzZXJUb0ZvbGxvdzogdXNlciwgbG9nZ2VkSW5Vc2VyOiBsb2dnZWRJblVzZXJ9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9sbG93VXNlciBGYWN0b3J5IHJlc3BvbnNlJywgcmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pXHJcblx0XHR9XHJcblx0fVxyXG5cclxufSkiLCJhcHAuZGlyZWN0aXZlKCdkcmFnZ2FibGUnLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XHJcbiAgICB2YXIgZWwgPSBlbGVtZW50WzBdO1xyXG4gICAgXHJcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xyXG4gICAgXHJcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnc3RhcnQnLCBmdW5jdGlvbihlKSB7XHJcblxyXG4gICAgICAgIGUuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnbW92ZSc7XHJcbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuc2V0RGF0YSgnVGV4dCcsIHRoaXMuaWQpO1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnZHJhZycpO1xyXG5cclxuICAgICAgICB2YXIgaWR4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwYXJzZUludChhdHRycy5wb3NpdGlvbikpO1xyXG4gICAgICAgIHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShpZHgsIDEpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH0sXHJcbiAgICAgIGZhbHNlXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW5kJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSxcclxuICAgICAgZmFsc2VcclxuICAgICk7XHJcblxyXG4gIH1cclxufSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdkcm9wcGFibGUnLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgc2NvcGU6IHtcclxuICAgICAgZHJvcDogJyYnIC8vIHBhcmVudFxyXG4gICAgfSxcclxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgIC8vIGFnYWluIHdlIG5lZWQgdGhlIG5hdGl2ZSBvYmplY3RcclxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcclxuICAgICAgXHJcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcclxuICAgICAgICAgIC8vIGFsbG93cyB1cyB0byBkcm9wXHJcbiAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2xlYXZlJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cclxuICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIHVwb24gZHJvcCwgY2hhbmdpbmcgcG9zaXRpb24gYW5kIHVwZGF0aW5nIHRyYWNrLmxvY2F0aW9uIGFycmF5IG9uIHNjb3BlIFxyXG4gICAgICAgICAgdmFyIGl0ZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlLmRhdGFUcmFuc2Zlci5nZXREYXRhKCdUZXh0JykpO1xyXG4gICAgICAgICAgdmFyIHhwb3NpdGlvbiA9IHBhcnNlSW50KHRoaXMuYXR0cmlidXRlcy54cG9zaXRpb24udmFsdWUpO1xyXG4gICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSB0aGlzLmNoaWxkTm9kZXM7XHJcbiAgICAgICAgICB2YXIgb2xkVGltZWxpbmVJZDtcclxuICAgICAgICAgIHZhciB0aGVDYW52YXM7XHJcblxyXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNoaWxkTm9kZXNbaV0uY2xhc3NOYW1lID09PSAnY2FudmFzLWJveCcpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1tpXS5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnB1c2goeHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHZhciBjYW52YXNOb2RlID0gdGhpcy5jaGlsZE5vZGVzW2ldLmNoaWxkTm9kZXM7XHJcblxyXG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc05vZGUubGVuZ3RoOyBqKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzTm9kZVtqXS5ub2RlTmFtZSA9PT0gJ0NBTlZBUycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMucG9zaXRpb24udmFsdWUgPSB4cG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkVGltZWxpbmVJZCA9IGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUNhbnZhcyA9IGNhbnZhc05vZGVbal07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSAgICAgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuXHJcbiAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQubW92ZUluVGltZWxpbmUob2xkVGltZWxpbmVJZCwgeHBvc2l0aW9uKS50aGVuKGZ1bmN0aW9uIChuZXdUaW1lbGluZUlkKSB7XHJcbiAgICAgICAgICAgICAgdGhlQ2FudmFzLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZSA9IG5ld1RpbWVsaW5lSWQ7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBjYWxsIHRoZSBkcm9wIHBhc3NlZCBkcm9wIGZ1bmN0aW9uXHJcbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXHJcbiAgICB9O1xyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdmb2xsb3dkaXJlY3RpdmUnLCBmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZm9sbG93L2ZvbGxvd0RpcmVjdGl2ZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdGb2xsb3dEaXJlY3RpdmVDb250cm9sbGVyJ1xyXG5cdH07XHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ0ZvbGxvd0RpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBBdXRoU2VydmljZSwgdXNlckZhY3Rvcnkpe1xyXG5cclxuXHJcblxyXG5cdFx0Ly8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihsb2dnZWRJblVzZXIpe1xyXG4gICAgICAgIFxyXG4gIC8vICAgICAgICBcdCRzY29wZS5sb2dnZWRJblVzZXIgPSBsb2dnZWRJblVzZXI7XHJcblxyXG4gIC8vICAgICAgICAgXHR1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuXHQgLy8gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XHJcblx0IC8vICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCB1c2VyKTtcclxuXHQgLy8gICAgXHR9KTtcclxuXHRcdC8vIH0pO1xyXG5cclxuXHRcdCRzY29wZS5nb1RvRm9sbG93ZXIgPSBmdW5jdGlvbihteUZvbGxvd2VyKXtcclxuXHQgICAgICBjb25zb2xlLmxvZyhcImNsaWNrZWRcIiwgbXlGb2xsb3dlcik7XHJcblx0ICAgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHsgdGhlSUQ6IG15Rm9sbG93ZXIuX2lkfSk7XHJcblx0ICAgIH1cclxuXHRcclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbigkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZToge30sXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHNldE5hdmJhciA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXJJZCA9IHVzZXIuX2lkO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Byb2ZpbGUnLCBzdGF0ZTogJ3VzZXJQcm9maWxlKHt0aGVJRDogdXNlcklkfSknLCBhdXRoOiB0cnVlIH1cclxuICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2V0TmF2YmFyKCk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcclxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxyXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ1NpZ24gVXAnLCBzdGF0ZTogJ3NpZ251cCcgfSxcclxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ3VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XHJcbiAgICAgICAgICAgIF07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNldFVzZXIoKTtcclxuXHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0TmF2YmFyKTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHNldE5hdmJhcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdwcm9qZWN0ZGlyZWN0aXZlJywgZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2plY3QvcHJvamVjdERpcmVjdGl2ZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcidcclxuXHR9O1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlKXtcclxuXHJcblxyXG5cclxuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcclxuXHRcdFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuXHRcdFx0JHNjb3BlLmRpc3BsYXlBUHJvamVjdCA9IGZ1bmN0aW9uKHNvbWV0aGluZyl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RISU5HJywgc29tZXRoaW5nKTtcclxuXHRcdFx0XHRpZigkc2NvcGUubG9nZ2VkSW5Vc2VyLl9pZCA9PT0gJHN0YXRlUGFyYW1zLnRoZUlEKXtcclxuXHRcdFx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHNvbWV0aGluZy5faWR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJkaXNwbGF5aW5nIGEgcHJvamVjdFwiLCAkc2NvcGUucGFyZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcblx0XHRcdFx0cHJvamVjdC5vd25lciA9IGxvZ2dlZEluVXNlci5faWQ7XHJcblx0XHRcdFx0cHJvamVjdC5mb3JrSUQgPSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0XHRkZWxldGUgcHJvamVjdC5faWQ7XHJcblx0XHRcdFx0Y29uc29sZS5sb2cocHJvamVjdCk7XHJcblx0XHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JrIHJlc3BvbnNlIGlzJywgcmVzcG9uc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUuZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdEZWxldGVQcm9qZWN0JywgcHJvamVjdClcclxuXHRcdFx0XHRQcm9qZWN0RmN0LmRlbGV0ZVByb2plY3QocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRGVsZXRlIHJlcXVlc3QgaXMnLCByZXNwb25zZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCd4aW1UcmFjaycsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEFuYWx5c2VyRmN0LCAkcSkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5odG1sJyxcclxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG5cdFx0XHRzY29wZS5lZmZlY3RXZXRuZXNzZXMgPSBbMCwwLDAsMF07XHJcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbnZhc1Jvdy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XHJcblx0XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc0NsYXNzZXMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcclxuXHRcdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W2ldKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIGlkPSd3YXZlZGlzcGxheScgY2xhc3M9J2l0ZW0nIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIDApXHJcblxyXG5cdFx0XHRzY29wZS5kcm9wSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG5cclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IGZhbHNlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0dmFyIHBvc2l0aW9uID0gMDtcclxuXHRcdFx0XHR2YXIgY2FudmFzUm93ID0gZWxlbWVudFswXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYW52YXMtYm94Jyk7XHJcblxyXG5cdFx0XHRcdGlmIChzY29wZS50cmFjay5sb2NhdGlvbi5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdC8vIGRyb3AgdGhlIGxvb3Agb24gdGhlIGZpcnN0IGF2YWlsYWJsZSBpbmRleFx0XHRcdFx0XHJcblx0XHRcdFx0XHR3aGlsZSAoc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbikgPiAtMSkge1xyXG5cdFx0XHRcdFx0XHRwb3NpdGlvbisrO1xyXG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGFkZGluZyByYXcgaW1hZ2UgdG8gZGJcclxuXHRcdFx0XHRpZiAoIXNjb3BlLnRyYWNrLmltZykge1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlLnJlcGxhY2UoL15kYXRhOmltYWdlXFwvcG5nO2Jhc2U2NCwvLCBcIlwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24ucHVzaChwb3NpdGlvbik7XHJcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBwb3NpdGlvbik7XHJcblx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1twb3NpdGlvbl0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgcG9zaXRpb24gKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgaW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK2luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzY29wZS5tb3ZlSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKSB7XHJcblx0XHRcdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygnRUxFTUVOVCcsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpO1xyXG5cdFx0XHRcdFx0VG9uZVRyYWNrRmN0LnJlcGxhY2VUaW1lbGluZUxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKS50aGVuKHJlc29sdmUpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9O1xyXG5cclxuXHJcblx0XHRcdHNjb3BlLmFwcGVhck9yRGlzYXBwZWFyID0gZnVuY3Rpb24ocG9zaXRpb24pIHtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgdHJhY2tJbmRleCA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLmluZGV4T2Yoc2NvcGUudHJhY2spO1xyXG5cdFx0XHRcdHZhciBsb29wSW5kZXggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBvc2l0aW9uKTtcclxuXHJcblx0XHRcdFx0aWYoc2NvcGUudHJhY2sub25UaW1lbGluZSkge1xyXG5cdFx0XHRcdFx0aWYobG9vcEluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgY2FudmFzUm93ID0gZWxlbWVudFswXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYW52YXMtYm94Jyk7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnB1c2gocG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zb3J0KCk7XHJcblx0XHRcdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBwb3NpdGlvbik7XHJcblx0XHRcdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XHJcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIGZyb20gbG9jYXRpb25zIGFycmF5XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShsb29wSW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHQvL3JlbW92ZSB0aW1lbGluZUlkXHJcblx0XHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5kZWxldGVUaW1lbGluZUxvb3AoIGNhbnZhcy5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWUgKTtcclxuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgY2FudmFzIGl0ZW1cclxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24gcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XHJcblx0XHRcdFx0XHRcdCAgICBlbGVtZW50ICYmIGVsZW1lbnQucGFyZW50Tm9kZSAmJiBlbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbWVudCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmVtb3ZlRWxlbWVudCggY2FudmFzICk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdOTyBEUk9QJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUucmVSZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnUkVSRUNPUkQnKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhzY29wZS50cmFjayk7XHJcblx0XHRcdFx0Ly9jaGFuZ2UgYWxsIHBhcmFtcyBiYWNrIGFzIGlmIGVtcHR5IHRyYWNrXHJcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBudWxsO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IG51bGw7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gbnVsbDtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly9kaXNwb3NlIG9mIGVmZmVjdHNSYWNrXHJcblx0XHRcdFx0c2NvcGUudHJhY2suZWZmZWN0c1JhY2suZm9yRWFjaChmdW5jdGlvbiAoZWZmZWN0KSB7XHJcblx0XHRcdFx0XHRlZmZlY3QuZGlzcG9zZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLDAsMCwwXSk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24gPSBbXTtcclxuXHRcdFx0XHQvL3JlbW92ZSBhbGwgbG9vcHMgZnJvbSBVSVxyXG5cdFx0XHRcdHZhciBsb29wc1VJID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgndHJhY2tMb29wJytpbmRleC50b1N0cmluZygpKTtcclxuXHRcdFx0XHR3aGlsZShsb29wc1VJLmxlbmd0aCAhPT0gMCkge1xyXG5cdFx0XHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGxvb3BzVUkubGVuZ3RoO2krKykge1xyXG5cdFx0XHRcdFx0XHRsb29wc1VJW2ldLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobG9vcHNVSVtpXSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR2YXIgbG9vcHNVSSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3RyYWNrTG9vcCcraW5kZXgudG9TdHJpbmcoKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUuc29sbyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHR2YXIgb3RoZXJUcmFja3MgPSBzY29wZS4kcGFyZW50LnRyYWNrcy5tYXAoZnVuY3Rpb24gKHRyYWNrKSB7XHJcblx0XHRcdFx0XHRpZih0cmFjayAhPT0gc2NvcGUudHJhY2spIHtcclxuXHRcdFx0XHRcdFx0dHJhY2suc2lsZW5jZSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0cmFjaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KS5maWx0ZXIoZnVuY3Rpb24gKHRyYWNrKSB7XHJcblx0XHRcdFx0XHRpZih0cmFjayAmJiB0cmFjay5wbGF5ZXIpIHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKG90aGVyVHJhY2tzKTtcclxuXHRcdFx0XHRUb25lVGltZWxpbmVGY3QubXV0ZUFsbChvdGhlclRyYWNrcyk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suc2lsZW5jZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzY29wZS5zaWxlbmNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGlmKCFzY29wZS50cmFjay5zaWxlbmNlKSB7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gLTEwMDtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSB0cnVlO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNjb3BlLnJlY29yZCA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG5cdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcclxuXHRcdFx0XHR2YXIgcmVjb3JkZXIgPSBzY29wZS5yZWNvcmRlcjtcclxuXHJcblx0XHRcdFx0dmFyIGNvbnRpbnVlVXBkYXRlID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxyXG5cdFx0ICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhbmFseXNlclwiK2luZGV4KTtcclxuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xyXG5cdFx0XHRcdHZhciBhbmFseXNlcklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblxyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblxyXG5cclxuXHRcdFx0XHRmdW5jdGlvbiB1cGRhdGUoKSB7XHJcblx0XHRcdFx0XHR2YXIgU1BBQ0lORyA9IDM7XHJcblx0XHRcdFx0XHR2YXIgQkFSX1dJRFRIID0gMTtcclxuXHRcdFx0XHRcdHZhciBudW1CYXJzID0gTWF0aC5yb3VuZCgzMDAgLyBTUEFDSU5HKTtcclxuXHRcdFx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xyXG5cclxuXHRcdFx0XHRcdGFuYWx5c2VyTm9kZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnl0ZURhdGEpOyBcclxuXHJcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcclxuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XHJcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XHJcblx0XHRcdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cclxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgKytpKSB7XHJcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUgPSAwO1xyXG5cdFx0XHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcclxuXHRcdFx0XHRcdFx0Ly8gZ290dGEgc3VtL2F2ZXJhZ2UgdGhlIGJsb2NrLCBvciB3ZSBtaXNzIG5hcnJvdy1iYW5kd2lkdGggc3Bpa2VzXHJcblx0XHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqPCBtdWx0aXBsaWVyOyBqKyspXHJcblx0XHRcdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xyXG5cdFx0XHRcdFx0XHRtYWduaXR1ZGUgPSBtYWduaXR1ZGUgLyBtdWx0aXBsaWVyO1xyXG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlMiA9IGZyZXFCeXRlRGF0YVtpICogbXVsdGlwbGllcl07XHJcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xyXG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFJlY3QoaSAqIFNQQUNJTkcsIDEwMCwgQkFSX1dJRFRILCAtbWFnbml0dWRlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XHJcblx0XHRcdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlcikudGhlbihmdW5jdGlvbiAocGxheWVyKSB7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZVVwZGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gcGxheWVyO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmJ1ZmZlciA9IHdpbmRvdy5sYXRlc3RCdWZmZXI7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJhd0F1ZGlvID0gd2luZG93LmxhdGVzdFJlY29yZGluZztcclxuXHRcdFx0XHRcdFx0cGxheWVyLmNvbm5lY3Qoc2NvcGUudHJhY2suZWZmZWN0c1JhY2tbMF0pO1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRcdFx0XHRcdHdpbmRvdy5jbGVhckludGVydmFsKGNsaWNrKTtcclxuXHJcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QudW5NdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0sIDQwMDApO1xyXG5cclxuXHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RhcnQoKTtcclxuXHJcblx0XHRcdFx0dmFyIGNsaWNrID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0YXJ0KCk7XHJcblx0XHRcdFx0fSwgNTAwKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdFx0c2NvcGUucHJldmlldyA9IGZ1bmN0aW9uKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhjdXJyZW50bHlQcmV2aWV3aW5nKTtcclxuXHRcdFx0XHRpZihjdXJyZW50bHlQcmV2aWV3aW5nKSB7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjb3BlLmNoYW5nZVdldG5lc3MgPSBmdW5jdGlvbihlZmZlY3QsIGFtb3VudCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGVmZmVjdCk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coYW1vdW50KTtcclxuXHJcblx0XHRcdFx0ZWZmZWN0LndldC52YWx1ZSA9IGFtb3VudCAvIDEwMDA7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0fVxyXG5cdFx0XHJcblxyXG5cdH1cclxufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9