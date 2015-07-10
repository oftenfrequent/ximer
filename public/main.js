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
app.controller('HomeController', function ($scope, AuthService, ToneTrackFct, ProjectFct, $stateParams, $state) {
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

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork,
        newProject: newProject,
        deleteProject: deleteProject,
        nameChange: nameChange
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
'use strict';
app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInByb2plY3QvcHJvamVjdC5qcyIsInVzZXIvdXNlcnByb2ZpbGUuanMiLCJsb2dpbi9sb2dpbi5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9MYW5kaW5nUGFnZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvTmV3UHJvamVjdENvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVGltZWxpbmVDb250cm9sbGVyLmpzIiwiY29tbW9uL2NvbnRyb2xsZXJzL1VzZXJDb250cm9sbGVyLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9BbmFseXNlckZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvSG9tZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUHJvamVjdEZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmVjb3JkZXJGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1NvY2tldC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRpbWVsaW5lRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Ub25lVHJhY2tGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL3VzZXJGYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZHJhZ2dhYmxlL2RyYWdnYWJsZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2ZvbGxvdy9mb2xsb3dEaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2xvYWRpbmctZ2lmL2xvYWRpbmctZ2lmLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2plY3QvcHJvamVjdERpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLElBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7QUFJQSxjQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7QUFFQSxZQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7O0FBR0EsYUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbERBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsc0JBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxNQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7QUFDQSxzQkFBQSxFQUFBLHNCQUFBO0FBQ0Esd0JBQUEsRUFBQSx3QkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGFBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7U0FDQSxDQUFBO0FBQ0EsZUFBQTtBQUNBLHlCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTs7Ozs7O0FBTUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQTs7Ozs7QUFLQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBO0FDeElBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxjQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsT0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLHVCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ1pBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBO0FBQ0Esa0JBQUEsRUFBQSxZQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxxQkFBQTtBQUNBLG1CQUFBLEVBQUEseUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxRQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLFdBQUEsRUFBQTs7O0FBR0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsY0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsbUVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxlQUFBLENBQUEsWUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsWUFBQSxHQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsU0FBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLFlBQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsUUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLGtCQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSx1QkFBQSxFQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLG9CQUFBLGNBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsdUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLHNDQUFBLEVBQUEsQ0FBQTtxQkFDQTtpQkFDQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTs7QUFFQSx3QkFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7O0FBRUEsOEJBQUEsRUFBQSxDQUFBOztBQUVBLDRCQUFBLE1BQUEsS0FBQSxjQUFBLEVBQUE7QUFDQSxrQ0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxrQ0FBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO3lCQUNBO3FCQUNBLENBQUE7O0FBRUEsd0JBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSx5QkFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEseUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOzs7QUFHQSx5QkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLHdCQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsdUNBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO3FCQUNBLE1BQUE7QUFDQSw2QkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7cUJBQ0E7QUFDQSwwQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7aUJBQ0EsTUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtpQkFDQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0E7QUFDQSxrQkFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7U0FDQTs7OztBQUlBLGNBQUEsQ0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxVQUFBLEdBQUEsRUFBQSxFQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxhQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0E7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7O0FBSUEsdUJBQUEsQ0FBQSxlQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsWUFBQSxLQUFBLEdBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLFlBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBOztBQUVBLFlBQUEsTUFBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLGNBQUEsQ0FBQSxrQkFBQSxDQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxPQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFVBQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxzQkFBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxjQUFBLENBQUEsa0JBQUEsQ0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxLQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzlOQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxxQkFBQTtBQUNBLG1CQUFBLEVBQUEsMEJBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBOzs7QUFHQSxZQUFBLEVBQUE7QUFDQSx3QkFBQSxFQUFBLElBQUE7U0FDQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsd0JBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxPQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHFCQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsV0FBQTtBQUNBLG1CQUFBLEVBQUEsdUJBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx1QkFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFlBQUE7QUFDQSxtQkFBQSxFQUFBLHdCQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSx3QkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDakNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG9CQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsb0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsR0FBQSxRQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUEsRUFFQSxDQUFBOztBQUVBLFFBQUEsSUFBQSxHQUFBLEtBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFlBQUEsSUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO1NBQ0E7O0FBRUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGdCQUFBLElBQUEsS0FBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2FBQ0EsTUFDQTtBQUNBLG9CQUFBLEdBQUEsS0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUdBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7O0FBRUEsY0FBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBO0FDbERBLEdBQUEsQ0FBQSxVQUFBLENBQUEsdUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFFBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLG9CQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsR0FBQSxNQUFBLENBQUE7O0FBR0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBO0FBQ0EsaUJBQUEsY0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLFFBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQTs7QUFFQSxnQkFBQSxVQUFBLEdBQUEsUUFBQSxDQUFBLGVBQUEsQ0FBQSxZQUFBLEdBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLGdCQUFBLE9BQUEsR0FBQSxVQUFBLEdBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFlBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLDhCQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsRUFBQSxFQUFBLENBQUEsQ0FBQTtTQUNBOztBQUVBLHNCQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUlBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsY0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNuREEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxzQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNoQkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxvQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBOztBQUVBLFFBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFHQSxjQUFBLENBQUEsY0FBQSxDQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLDBCQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7cUJBRUE7aUJBQ0EsQ0FBQTtBQUNBLHFCQUFBLENBQUEsTUFBQSxHQUFBLFlBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsaUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQTs7QUFFQSx1QkFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7S0FFQSxDQUFBLENBQUE7Ozs7Ozs7O0FBUUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLENBQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsU0FBQSxHQUFBLENBQUEsQ0FBQSxTQUFBLENBQUE7OztBQUdBLGVBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxhQUFBLEVBQ0EsT0FBQTs7QUFFQSxTQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLHlCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTs7YUFHQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO1NBRUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtLQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsWUFBQSxTQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsZ0JBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLElBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxFQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsbUJBQUEsQ0FBQSxHQUFBLENBQUEseUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtTQUVBLENBQUEsQ0FBQTtLQUNBLENBQUE7Q0FNQSxDQUFBLENBQUE7O0FDdEdBLEdBQUEsQ0FBQSxVQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUdBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsS0FDQSxNQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSw0QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUtBLENBQUEsQ0FBQTtBQzlCQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLGlCQUFBLE1BQUEsR0FBQTtBQUNBLGdCQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsd0JBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLDJCQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EsaUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO2FBQ0E7QUFDQSxnQkFBQSxjQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBO0FBQ0EsY0FBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUdBLFFBQUEscUJBQUEsR0FBQSxTQUFBLHFCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsV0FBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLDZCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDNUNBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFdBQUE7QUFDQSxlQUFBLEVBQUEsaUJBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNiQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxTQUFBLEVBQUE7OztBQUdBLFlBQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxLQUFBLENBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLElBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsZUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLFVBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsT0FBQSxFQUFBLFNBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxnQkFBQSxHQUFBLFNBQUEsRUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxVQUFBLENBQUEsZ0JBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxjQUFBO0FBQ0EsbUJBQUEsRUFBQSxXQUFBO0FBQ0Esa0JBQUEsRUFBQSxVQUFBO0FBQ0EscUJBQUEsRUFBQSxhQUFBO0FBQ0Esa0JBQUEsRUFBQSxVQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUMzQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFFBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxHQUFBOztBQUVBLGVBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLE9BQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxJQUFBLE1BQUEsQ0FBQSxrQkFBQSxDQUFBO0FBQ0EsZ0JBQUEsWUFBQSxHQUFBLElBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxnQkFBQSxRQUFBLENBQUE7O0FBRUEsZ0JBQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFlBQUEsR0FDQSxTQUFBLENBQUEsWUFBQSxJQUNBLFNBQUEsQ0FBQSxrQkFBQSxJQUNBLFNBQUEsQ0FBQSxlQUFBLElBQ0EsU0FBQSxDQUFBLGNBQUEsQUFDQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsRUFDQSxTQUFBLENBQUEsb0JBQUEsR0FBQSxTQUFBLENBQUEsMEJBQUEsSUFBQSxTQUFBLENBQUEsdUJBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLHFCQUFBLEVBQ0EsU0FBQSxDQUFBLHFCQUFBLEdBQUEsU0FBQSxDQUFBLDJCQUFBLElBQUEsU0FBQSxDQUFBLHdCQUFBLENBQUE7OztBQUdBLHFCQUFBLENBQUEsWUFBQSxDQUNBO0FBQ0EsdUJBQUEsRUFBQTtBQUNBLCtCQUFBLEVBQUE7QUFDQSw4Q0FBQSxFQUFBLE9BQUE7QUFDQSw2Q0FBQSxFQUFBLE9BQUE7QUFDQSw4Q0FBQSxFQUFBLE9BQUE7QUFDQSw0Q0FBQSxFQUFBLE9BQUE7cUJBQ0E7QUFDQSw4QkFBQSxFQUFBLEVBQUE7aUJBQ0E7YUFDQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTs7O0FBR0Esb0JBQUEsY0FBQSxHQUFBLFlBQUEsQ0FBQSx1QkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxvQkFBQSxZQUFBLEdBQUEsWUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7OztBQUdBLHdCQUFBLEdBQUEsSUFBQSxRQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxRQUFBLEdBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0Esd0JBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUEsQ0FBQTthQUVBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxvQkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsWUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsb0JBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOzs7O0FBSUEsd0JBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxnQ0FBQSxDQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLGtCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFJQSxRQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsZ0JBQUEsTUFBQSxHQUFBLElBQUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsZ0JBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQTthQUNBLE1BQUE7QUFDQSx1QkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUtBLFdBQUE7QUFDQSxpQkFBQSxFQUFBLG1CQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLGdCQUFBLFlBQUEsR0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLGVBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLDJCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHdCQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLDZCQUFBLENBQUEsUUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsbUNBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsbUNBQUEsTUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUE7eUJBQ0EsQ0FBQSxDQUFBO3FCQUNBO2lCQUNBLENBQUEsQ0FBQTs7QUFFQSx1QkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSw4QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsMkJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FFQTtBQUNBLG9CQUFBLEVBQUEsWUFBQTtBQUNBLG1CQUFBLEVBQUEsV0FBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUM3SUEsWUFBQSxDQUFBOztBQ0FBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7O0FBRUEsMkJBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0Esd0JBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtpQkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtpQkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZ0JBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZ0JBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxHQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxnQkFBQSxHQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLHFCQUFBLEVBQUEsWUFBQTtBQUNBLHVCQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxpQkFBQSxHQUFBLFNBQUEsaUJBQUEsQ0FBQSxNQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLFlBQUEsY0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0Esc0JBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTthQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7U0FFQTs7QUFFQSxzQkFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxnQkFBQSxTQUFBLEdBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTs7QUFFQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7YUFDQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOzs7Ozs7O1NBUUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQTs7QUFFQSxXQUFBO0FBQ0EsdUJBQUEsRUFBQSxlQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBO0FBQ0EseUJBQUEsRUFBQSxpQkFBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLGVBQUEsRUFBQSxPQUFBO0FBQ0EsZUFBQSxFQUFBLE9BQUE7QUFDQSxpQkFBQSxFQUFBLFNBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2hHQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsUUFBQSxZQUFBLEdBQUEsU0FBQSxZQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOzs7QUFHQSxlQUFBLE1BQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxnQkFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxJQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxlQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsR0FBQSxRQUFBLElBQUEsUUFBQSxHQUFBLEtBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLGVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLGtCQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsTUFBQSxDQUFBOztBQUVBLGtCQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsR0FBQSxFQUFBOztBQUdBLFlBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLE9BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0E7O0FBRUEsY0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO1NBQ0EsRUFBQSxPQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsbUJBQUEsR0FBQSxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFFBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFdBQUE7QUFDQSxvQkFBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLGNBQUE7QUFDQSx5QkFBQSxFQUFBLGlCQUFBO0FBQ0Esb0NBQUEsRUFBQSw0QkFBQTtBQUNBLDJCQUFBLEVBQUEsbUJBQUE7QUFDQSwwQkFBQSxFQUFBLGtCQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNoRkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTs7QUFFQSxjQUFBLEVBQUEsZ0JBQUEsSUFBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEVBQUEsWUFBQSxFQUFBLElBQUEsRUFBQSxZQUFBLEVBQUEsWUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSw2QkFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTs7QUFFQSxnQkFBQSxFQUFBLGtCQUFBLFFBQUEsRUFBQSxZQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLGNBQUEsRUFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDeEJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsWUFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxhQUFBLENBQUEsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLGdCQUFBLEdBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsS0FBQSxDQUFBO1NBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZ0JBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUE7U0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBO0tBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUFBLFNBQ0E7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLGdCQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxZQUFBLENBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxvQkFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7OztBQUdBLG9CQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUE7QUFDQSxvQkFBQSxhQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLENBQUE7O0FBRUEscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFNBQUEsS0FBQSxZQUFBLEVBQUE7O0FBRUEsNEJBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7O0FBRUEsNEJBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBOztBQUVBLDZCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTs7QUFFQSxnQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsUUFBQSxLQUFBLFFBQUEsRUFBQTtBQUNBLDBDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsNkNBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSx5Q0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs2QkFFQTt5QkFDQTtxQkFDQTtpQkFDQTs7QUFHQSxxQkFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxHQUFBLGFBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7OztBQUdBLHFCQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDaEhBLEdBQUEsQ0FBQSxTQUFBLENBQUEsaUJBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsa0RBQUE7QUFDQSxrQkFBQSxFQUFBLDJCQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLDJCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBOztBQUlBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsZ0JBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEtBQUEsdUJBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7YUFDQSxNQUFBO0FBQ0Esc0JBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLG9CQUFBLFlBQUEsQ0FBQSxLQUFBLEtBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTthQUNBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLE1BQUEsQ0FBQSxPQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUlBLENBQUEsQ0FBQTtBQzNDQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseURBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLCtDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ0xBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUEseUNBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7O0FBRUEsZ0JBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx3QkFBQSxJQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLFNBQUEsRUFBQSxLQUFBLEVBQUEsOEJBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLENBQ0EsQ0FBQTtxQkFDQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBO0FBQ0EscUJBQUEsRUFBQSxDQUFBOzs7Ozs7OztBQVFBLGlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLDBCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxnQkFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLG1CQUFBLEVBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtTQUVBOztLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUM5REEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxrQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxvREFBQTtBQUNBLGtCQUFBLEVBQUEsNEJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsNEJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBSUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUEsR0FBQSxLQUFBLFlBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7YUFDQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHNCQUFBLEVBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxFQUFBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsbUJBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxhQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUN6Q0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHVDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLGVBQUEsR0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxZQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esd0JBQUEsYUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBOztBQUVBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsYUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLDRCQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxPQUFBLEVBQUE7QUFDQSxtQ0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLDBJQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsMEJBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7eUJBQ0E7cUJBQ0E7aUJBQ0E7YUFDQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLG9CQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7O0FBRUEsMkJBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0NBQUEsRUFBQSxDQUFBO3FCQUNBO2lCQUNBOzs7QUFHQSxvQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE1BQUEsQ0FBQSxvQkFBQSxDQUFBLE9BQUEsQ0FBQSwwQkFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO2lCQUNBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLG9CQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxRQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsR0FBQSwyQkFBQSxHQUFBLEtBQUEsR0FBQSx1RUFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO2FBRUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSx1QkFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsZ0NBQUEsQ0FBQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFHQSxpQkFBQSxDQUFBLGlCQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsb0JBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0Esd0JBQUEsU0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsNEJBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLDRCQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsaURBQUEsR0FBQSxRQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsa0JBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsR0FBQSwyQkFBQSxHQUFBLFVBQUEsR0FBQSx1RUFBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLDBCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBOzs7OztxQkFLQSxNQUFBOzs7NEJBT0EsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLG1DQUFBLElBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxPQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTt5QkFDQTs7QUFSQSw0QkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxvQ0FBQSxDQUFBLGtCQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFLQSxxQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO3FCQUNBO2lCQUNBLE1BQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtpQkFDQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTs7QUFFQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLG9CQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsTUFBQSxLQUFBLENBQUEsRUFBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLCtCQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtxQkFDQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxRQUFBLENBQUEsc0JBQUEsQ0FBQSxXQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLENBQUE7aUJBQ0E7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSx3QkFBQSxLQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLDZCQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLCtCQUFBLEtBQUEsQ0FBQTtxQkFDQTtpQkFDQSxDQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxJQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxPQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0Esb0JBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtpQkFDQSxNQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtpQkFDQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxRQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQTs7QUFFQSxvQkFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBOzs7QUFHQSxvQkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxlQUFBLEdBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsWUFBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxPQUFBLENBQUEsa0JBQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EseUJBQUEsTUFBQSxHQUFBO0FBQ0Esd0JBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxZQUFBLEdBQUEsSUFBQSxVQUFBLENBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxnQ0FBQSxDQUFBLG9CQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsbUNBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSx3QkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSx5QkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLDRCQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSw0QkFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsNkJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxpQ0FBQSxHQUFBLFNBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSw0QkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVDQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsdUNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7cUJBQ0E7QUFDQSx3QkFBQSxjQUFBLEVBQUE7QUFDQSw4QkFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7cUJBQ0E7aUJBQ0E7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSxtQ0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBOztBQUVBLHdCQUFBLEtBQUEsR0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7cUJBQ0EsRUFBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsbUNBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGlDQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxpQ0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsMENBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxrQ0FBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxpQ0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBOztBQUVBLGlDQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxlQUFBLENBQUE7QUFDQSxrQ0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxhQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxpQ0FBQSxDQUFBLE9BQUEsQ0FBQSxrQkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsMkNBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTt5QkFDQSxDQUFBLENBQUE7cUJBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EsbUNBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO3FCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7aUJBQ0EsTUFBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLGVBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxNQUFBLEdBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSx3QkFBQSxLQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLG1DQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtxQkFDQSxFQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFHQSx3QkFBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLCtCQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTtBQUNBLDRCQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLDRCQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1DQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxpQ0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLDBDQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxpQ0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsZUFBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGlDQUFBLENBQUEsT0FBQSxDQUFBLGtCQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7Ozt5QkFHQSxDQUFBLENBQUE7cUJBRUEsRUFBQSxNQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7aUJBQ0E7YUFDQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLEdBQUEsVUFBQSxtQkFBQSxFQUFBOzs7Ozs7Ozs7O0FBVUEsb0JBQUEsT0FBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsd0JBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsK0JBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSw0QkFBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtxQkFDQSxNQUFBO0FBQ0EsK0JBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO3FCQUNBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSw0QkFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLG1DQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsaUNBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsZ0NBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO3lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEdBQUEsY0FBQSxDQUFBO3FCQUNBLEVBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBO2lCQUNBLE1BQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxvQkFBQSxDQUFBLENBQUE7aUJBQ0E7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBO1NBRUE7O0tBR0EsQ0FBQTtDQUNBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG52YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICduZ1N0b3JhZ2UnXSk7XHJcblxyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XHJcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cclxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcclxufSk7XHJcblxyXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXHJcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxyXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcclxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxyXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xyXG5cclxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcclxuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cclxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XHJcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXHJcbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XHJcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cclxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxyXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXHJcbiAgICAgICAgICAgIGlmICh1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cclxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcclxuXHJcbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xyXG5cclxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoJGxvY2F0aW9uKSB7XHJcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcclxuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cclxuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXHJcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxyXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcclxuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxyXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxyXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcclxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcclxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXHJcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xyXG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xyXG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXHJcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcclxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcclxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XHJcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXHJcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxyXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XHJcblxyXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cclxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXHJcbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXHJcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cclxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxyXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxyXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cclxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXHJcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcclxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcclxuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2lnbnVwID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNyZWRlbnRpYWxzKTtcclxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBjcmVkZW50aWFscylcclxuICAgICAgICAgICAgICAgIC50aGVuKCBvblN1Y2Nlc3NmdWxMb2dpbiApXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIHNpZ251cCBjcmVkZW50aWFscy4nIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xyXG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9KTtcclxuXHJcbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2dlZEluSG9tZScsIHtcclxuICAgICAgICB1cmw6ICcvaG9tZScsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnSG9tZUNvbnRyb2xsZXInXHJcbiAgICB9KVxyXG5cdC5zdGF0ZSgnaG9tZScse1xyXG5cdFx0dXJsOiAnLycsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbGFuZGluZy5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdMYW5kaW5nUGFnZUNvbnRyb2xsZXInXHJcblx0fSk7XHJcbn0pO1xyXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XHJcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XHJcblxyXG4gICAgJHNjb3BlLnNpZ251cCA9IHt9O1xyXG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuXHJcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcclxuXHJcbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuICAgICAgICBjb25zb2xlLmxvZyhzaWdudXBJbmZvKTtcclxuICAgICAgICBBdXRoU2VydmljZS5zaWdudXAoc2lnbnVwSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvamVjdCcsIHtcclxuICAgICAgICB1cmw6ICcvcHJvamVjdC86cHJvamVjdElEJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2plY3QvcHJvamVjdC5odG1sJ1xyXG4gICAgfSk7XHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ1Byb2plY3RDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkY29tcGlsZSwgUmVjb3JkZXJGY3QsIFByb2plY3RGY3QsIFRvbmVUcmFja0ZjdCwgVG9uZVRpbWVsaW5lRmN0LCBBdXRoU2VydmljZSkge1xyXG5cclxuXHQvL3dpbmRvdyBldmVudHNcclxuXHR3aW5kb3cub25ibHVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICRzY29wZS5zdG9wKCk7XHJcblx0XHQkc2NvcGUuJGRpZ2VzdCgpO1xyXG4gICAgfTtcclxuICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGxlYXZlIHRoaXMgcGFnZSBiZWZvcmUgc2F2aW5nIHlvdXIgd29yaz9cIjtcclxuXHR9O1xyXG5cdHdpbmRvdy5vbnVubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmVzKCk7XHJcblx0fVxyXG5cclxuXHR2YXIgbWF4TWVhc3VyZSA9IDA7XHJcblxyXG5cdC8vIG51bWJlciBvZiBtZWFzdXJlcyBvbiB0aGUgdGltZWxpbmVcclxuXHQkc2NvcGUubnVtTWVhc3VyZXMgPSBfLnJhbmdlKDAsIDYwKTtcclxuXHJcblx0Ly8gbGVuZ3RoIG9mIHRoZSB0aW1lbGluZVxyXG5cdCRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcclxuXHJcblx0Ly9Jbml0aWFsaXplIHJlY29yZGVyIG9uIHByb2plY3QgbG9hZFxyXG5cdFJlY29yZGVyRmN0LnJlY29yZGVySW5pdCgpLnRoZW4oZnVuY3Rpb24gKHJldEFycikge1xyXG5cdFx0JHNjb3BlLnJlY29yZGVyID0gcmV0QXJyWzBdO1xyXG5cdFx0JHNjb3BlLmFuYWx5c2VyTm9kZSA9IHJldEFyclsxXTtcclxuXHR9KS5jYXRjaChmdW5jdGlvbiAoZSl7XHJcbiAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhlKTtcclxuICAgIH0pO1xyXG5cclxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcblx0JHNjb3BlLm5hbWVDaGFuZ2luZyA9IGZhbHNlO1xyXG5cdCRzY29wZS50cmFja3MgPSBbXTtcclxuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0JHNjb3BlLnByb2plY3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9qZWN0SUQ7XHJcblx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xyXG5cdCRzY29wZS5jdXJyZW50bHlSZWNvcmRpbmcgPSBmYWxzZTtcclxuXHQkc2NvcGUucHJldmlld2luZ0lkID0gbnVsbDtcclxuXHJcblx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblx0XHR2YXIgbG9hZGVkID0gMDtcclxuXHRcdGNvbnNvbGUubG9nKCdQUk9KRUNUJywgcHJvamVjdCk7XHJcblx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBwcm9qZWN0Lm5hbWU7XHJcblxyXG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3QudHJhY2tzLmxlbmd0aCcsIHByb2plY3QudHJhY2tzLmxlbmd0aCk7XHJcblxyXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cclxuXHRcdFx0XHR2YXIgbG9hZGFibGVUcmFja3MgPSBbXTtcclxuXHJcblx0XHRcdFx0cHJvamVjdC50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHRcdGlmICh0cmFjay51cmwpIHtcclxuXHRcdFx0XHRcdFx0bG9hZGFibGVUcmFja3MrKztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0aWYgKHRyYWNrLnVybCkge1xyXG5cclxuXHRcdFx0XHRcdHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdFx0XHRcdGxvYWRlZCsrO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYobG9hZGVkID09PSBsb2FkYWJsZVRyYWNrcykge1xyXG5cdFx0XHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRkaWdlc3QoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHR2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdHJhY2subG9jYXRpb24pO1xyXG5cdFx0XHRcdFx0aWYobWF4ICsgMiA+IG1heE1lYXN1cmUpIG1heE1lYXN1cmUgPSBtYXggKyAyO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dHJhY2sucmVjb3JkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGFzc3VtaW5nIHRoYXQgYSBwbGF5ZXIgZXhpc3RzXHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG5cdFx0XHRcdFx0Ly9pbml0IGVmZmVjdHMsIGNvbm5lY3QsIGFuZCBhZGQgdG8gc2NvcGVcclxuXHJcblx0XHRcdFx0XHR0cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZSh0cmFjay5lZmZlY3RzUmFjayk7XHJcblx0XHRcdFx0XHR0cmFjay5wbGF5ZXIuY29ubmVjdCh0cmFjay5lZmZlY3RzUmFja1swXSk7XHJcblxyXG5cdFx0XHRcdFx0aWYodHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9uKTtcclxuXHRcdFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0cmFjay5lbXB0eSA9IHRydWU7XHJcblx0XHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IGZhbHNlO1xyXG4gICAgXHRcdFx0XHR0cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdHRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLCAwLCAwLCAwXSk7XHJcbiAgICBcdFx0XHRcdHRyYWNrLnBsYXllciA9IG51bGw7XHJcbiAgICBcdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdCRzY29wZS5tYXhNZWFzdXJlID0gMzI7XHJcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcclxuICAgIFx0XHRcdFx0dmFyIG9iaiA9IHt9O1xyXG4gICAgXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xyXG4gICAgXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5vblRpbWVsaW5lID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5wcmV2aWV3aW5nID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5zaWxlbmNlID0gZmFsc2U7XHJcbiAgICBcdFx0XHRcdG9iai5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZShbMCwgMCwgMCwgMF0pO1xyXG4gICAgXHRcdFx0XHRvYmoucGxheWVyID0gbnVsbDtcclxuICAgIFx0XHRcdFx0b2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xyXG4gICAgXHRcdFx0XHRvYmoubG9jYXRpb24gPSBbXTtcclxuICAgIFx0XHRcdFx0JHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XHJcbiAgXHRcdFx0fVxyXG4gIFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly9keW5hbWljYWxseSBzZXQgbWVhc3VyZXNcclxuXHRcdC8vaWYgbGVzcyB0aGFuIDE2IHNldCAxOCBhcyBtaW5pbXVtXHJcblx0XHQkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcclxuXHRcdGlmKG1heE1lYXN1cmUgPCAzMikgbWF4TWVhc3VyZSA9IDM0O1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXhNZWFzdXJlOyBpKyspIHtcclxuXHRcdFx0JHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZygnTUVBU1VSRVMnLCAkc2NvcGUubnVtTWVhc3VyZXMpO1xyXG5cclxuXHJcblxyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LmNyZWF0ZVRyYW5zcG9ydChwcm9qZWN0LmVuZE1lYXN1cmUpLnRoZW4oZnVuY3Rpb24gKG1ldHJvbm9tZSkge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lID0gbWV0cm9ub21lO1xyXG5cdFx0fSk7XHJcblx0XHRUb25lVGltZWxpbmVGY3QuY2hhbmdlQnBtKHByb2plY3QuYnBtKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdCRzY29wZS5kcm9wSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG5cdFx0dmFyIHRyYWNrID0gc2NvcGUudHJhY2tzW2luZGV4XTtcclxuXHR9XHJcblxyXG5cdCRzY29wZS5hZGRUcmFjayA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0fTtcclxuXHJcblx0JHNjb3BlLnBsYXkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHQkc2NvcGUucGxheWluZyA9IHRydWU7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG5cdH1cclxuXHQkc2NvcGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHQkc2NvcGUucGxheWluZyA9IGZhbHNlO1xyXG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRUb25lVGltZWxpbmVGY3Quc3RvcEFsbCgkc2NvcGUudHJhY2tzKTtcclxuXHRcdCRzY29wZS5wb3NpdGlvbiA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF07XHJcblx0XHRjb25zb2xlLmxvZygnUE9TJywgJHNjb3BlLnBvc2l0aW9uKTtcclxuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcclxuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAoJHNjb3BlLnBvc2l0aW9uICogMjAwICsgMzAwKS50b1N0cmluZygpKydweCc7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5wYXVzZSgpO1xyXG5cdH1cclxuXHQkc2NvcGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdCRzY29wZS5wbGF5aW5nID0gZmFsc2U7XHJcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xyXG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcclxuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAnMzAwcHgnO1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RvcCgpO1xyXG5cdFx0Ly9zdG9wIGFuZCB0cmFjayBjdXJyZW50bHkgYmVpbmcgcHJldmlld2VkXHJcblx0XHRpZigkc2NvcGUucHJldmlld2luZ0lkKSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFySW50ZXJ2YWwoJHNjb3BlLnByZXZpZXdpbmdJZCk7XHJcblx0XHRcdCRzY29wZS5wcmV2aWV3aW5nSWQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHQkc2NvcGUubmFtZUNsaWNrID0gZnVuY3Rpb24oKSB7XHJcblx0XHRjb25zb2xlLmxvZygnTkFNRSBDbGlja2VkJyk7XHJcblx0XHQkc2NvcGUubmFtZUNoYW5naW5nID0gdHJ1ZTtcclxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9qZWN0TmFtZUlucHV0JykuZm9jdXMoKTtcclxuXHR9XHJcblx0JHNjb3BlLm5hbWVDaGFuZ2UgPSBmdW5jdGlvbihuZXdOYW1lKSB7XHJcblx0XHRjb25zb2xlLmxvZygnTkVXJywgbmV3TmFtZSk7XHJcblx0XHRpZihuZXdOYW1lKSB7XHJcblx0XHRcdCRzY29wZS5uYW1lQ2hhbmdpbmcgPSBmYWxzZTtcclxuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IGZhbHNlO1xyXG5cdFx0XHRQcm9qZWN0RmN0Lm5hbWVDaGFuZ2UobmV3TmFtZSwgJHNjb3BlLnByb2plY3RJZCkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlJFU1wiLCByZXNwb25zZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JHNjb3BlLm5hbWVFcnJvciA9IFwiWW91IG11c3Qgc2V0IGEgbmFtZSFcIjtcclxuXHRcdFx0JHNjb3BlLnByb2plY3ROYW1lID0gXCJVbnRpdGxlZFwiO1xyXG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdE5hbWVJbnB1dCcpLmZvY3VzKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQkc2NvcGUudG9nZ2xlTWV0cm9ub21lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYoJHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPT09IDApIHtcclxuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAwO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbiAgJHNjb3BlLnNlbmRUb0FXUyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoJHNjb3BlLnRyYWNrcywgJHNjb3BlLnByb2plY3RJZCwgJHNjb3BlLnByb2plY3ROYW1lKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgIC8vIHdhdmUgbG9naWNcclxuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XHJcblxyXG4gICAgfSk7XHJcbiAgfTtcclxuICBcclxuICAkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICB9O1xyXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJQcm9maWxlJywge1xyXG4gICAgICAgIHVybDogJy91c2VycHJvZmlsZS86dGhlSUQnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci91c2VycHJvZmlsZS5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInLFxyXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmFydGlzdEluZm8nLCB7XHJcbiAgICAgICAgdXJsOiAnL2luZm8nLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9pbmZvLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLnByb2plY3QnLCB7XHJcbiAgICAgICAgdXJsOiAnL3Byb2plY3RzJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvcHJvamVjdHMuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSlcclxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuZm9sbG93ZXJzJywge1xyXG4gICAgICAgIHVybDogJy9mb2xsb3dlcnMnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dlcnMuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSlcclxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuZm9sbG93aW5nJywge1xyXG4gICAgICAgIHVybDogJy9mb2xsb3dpbmcnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9mb2xsb3dpbmcuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xyXG4gICAgICAgIHVybDogJy9sb2dpbicsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAkc2NvcGUubG9naW4gPSB7fTtcclxuICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2dlZEluSG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ0hvbWVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsIFRvbmVUcmFja0ZjdCwgUHJvamVjdEZjdCwgJHN0YXRlUGFyYW1zLCAkc3RhdGUpIHtcclxuXHRjb25zb2xlLmxvZygnaW4gSG9tZSBjb250cm9sbGVyJyk7XHJcblx0dmFyIHRyYWNrQnVja2V0ID0gW107XHJcblx0Y29uc29sZS5sb2coJ0hBU0RGSkFORFNKJyk7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbmF2YmFyJylbMF0uc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuXHJcblx0JHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICAkc2NvcGUucHJvamVjdHMgPSBmdW5jdGlvbiAoKXtcclxuICAgIFx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygpLnRoZW4oZnVuY3Rpb24ocHJvamVjdHMpe1xyXG4gICAgXHRcdCRzY29wZS5hbGxQcm9qZWN0cyA9IHByb2plY3RzO1xyXG4gICAgXHR9KTtcclxuICAgIH07XHJcblx0JHNjb3BlLnByb2plY3RzKCk7XHJcblxyXG5cdCRzY29wZS5tYWtlRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG5cclxuXHR9XHJcblxyXG5cdHZhciBzdG9wID0gZmFsc2U7XHJcblxyXG5cdCRzY29wZS5zYW1wbGVUcmFjayA9IGZ1bmN0aW9uKHRyYWNrKXtcclxuXHJcblx0XHRpZihzdG9wPT09dHJ1ZSl7XHJcblx0XHRcdCRzY29wZS5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBmdW5jdGlvbihwbGF5ZXIpe1xyXG5cdFx0XHQkc2NvcGUucGxheWVyID0gcGxheWVyO1xyXG5cdFx0XHRpZihzdG9wID09PSBmYWxzZSl7XHJcblx0XHRcdFx0c3RvcCA9IHRydWU7XHJcblx0XHRcdFx0JHNjb3BlLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblx0XHRcdFx0c3RvcCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cclxuXHQkc2NvcGUuZ2V0VXNlclByb2ZpbGUgPSBmdW5jdGlvbih1c2VyKXtcclxuXHQgICAgLy8gY29uc29sZS5sb2coXCJjbGlja2VkXCIsIHVzZXIpO1xyXG5cdCAgICAkc3RhdGUuZ28oJ3VzZXJQcm9maWxlJywge3RoZUlEOiB1c2VyLl9pZH0pO1xyXG5cdH1cclxuXHJcbiAgICBcclxuXHJcblxyXG59KTsiLCJhcHAuY29udHJvbGxlcignTGFuZGluZ1BhZ2VDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsIFRvbmVUcmFja0ZjdCwgJHN0YXRlKSB7XHJcbiAgICAkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICB9O1xyXG4gICAgaWYoJHNjb3BlLmlzTG9nZ2VkSW4oKSkgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcclxuICAgIC8vICQoJyNmdWxscGFnZScpLmZ1bGxwYWdlKCk7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbmF2YmFyJylbMF0uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cclxuXHJcbiAgICAkc2NvcGUuZ29Ub0Zvcm1zID0gZnVuY3Rpb24gKCkge1xyXG4gICAgXHRmdW5jdGlvbiBzY3JvbGxUb0JvdHRvbShkdXJhdGlvbikge1xyXG5cdFx0ICAgIGlmIChkdXJhdGlvbiA8PSAwKSByZXR1cm47XHJcblxyXG5cdFx0XHR2YXIgZGlmZmVyZW5jZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgLSB3aW5kb3cuc2Nyb2xsWTtcclxuXHRcdFx0dmFyIHBlclRpY2sgPSBkaWZmZXJlbmNlIC8gZHVyYXRpb24gKiAxMDtcclxuXHJcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0d2luZG93LnNjcm9sbCgwLCB3aW5kb3cuc2Nyb2xsWSArIHBlclRpY2spO1xyXG5cdFx0XHRcdHNjcm9sbFRvQm90dG9tKGR1cmF0aW9uIC0gMTApO1xyXG5cdFx0XHR9LCAxMCk7XHJcblx0XHR9XHJcblxyXG5cdFx0c2Nyb2xsVG9Cb3R0b20oMTAwMCk7XHJcbiAgICB9O1xyXG5cclxuICAgIFxyXG5cclxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbihsb2dpbkluZm8pIHtcclxuXHJcbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuXHJcbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dnZWRJbkhvbWUnKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcclxuXHJcbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuICAgICAgICBjb25zb2xlLmxvZyhzaWdudXBJbmZvKTtcclxuICAgICAgICBBdXRoU2VydmljZS5zaWdudXAoc2lnbnVwSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzdGF0ZS5nbygnbG9nZ2VkSW5Ib21lJyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhcHAuY29udHJvbGxlcignTmV3UHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBQcm9qZWN0RmN0LCAkc3RhdGUpe1xyXG5cdCRzY29wZS51c2VyO1xyXG5cclxuXHQgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCAkc2NvcGUudXNlci51c2VybmFtZSlcclxuICAgIH0pO1xyXG5cclxuXHQgJHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xyXG5cdCBcdFByb2plY3RGY3QubmV3UHJvamVjdCgkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihwcm9qZWN0SWQpe1xyXG5cdCBcdFx0Y29uc29sZS5sb2coJ1N1Y2Nlc3MgaXMnLCBwcm9qZWN0SWQpXHJcblx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHByb2plY3RJZH0pO1x0IFx0XHJcblx0XHR9KVxyXG5cclxuXHQgfVxyXG5cclxufSkiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcclxuICBcclxuICB2YXIgd2F2QXJyYXkgPSBbXTtcclxuICBcclxuICAkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IDYwOyBpKyspIHtcclxuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xyXG4gIH1cclxuXHJcbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG4gICRzY29wZS50cmFja3MgPSBbXTtcclxuICAkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cclxuICBQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCc1NTk0YzIwYWQwNzU5Y2Q0MGNlNTFlMTQnKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblxyXG4gICAgICB2YXIgbG9hZGVkID0gMDtcclxuICAgICAgY29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcclxuXHJcbiAgICAgIGlmIChwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuICAgICAgICBwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQrKztcclxuICAgICAgICAgICAgICAgIGlmKGxvYWRlZCA9PT0gcHJvamVjdC50cmFja3MubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG4gICAgICAgICAgICBUb25lVGltZWxpbmVGY3QuYWRkTG9vcFRvVGltZWxpbmUodHJhY2sucGxheWVyLCB0cmFjay5sb2NhdGlvbik7XHJcbiAgICAgICAgICAgICRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcclxuICAgICAgICAgIHZhciBvYmogPSB7fTtcclxuICAgICAgICAgIG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcclxuICAgICAgICAgIG9iai5sb2NhdGlvbiA9IFtdO1xyXG4gICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBUb25lVGltZWxpbmVGY3QuZ2V0VHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSk7XHJcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xyXG5cclxuICB9KTtcclxuXHJcbiAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihhVXNlcil7XHJcbiAgLy8gICAgICRzY29wZS50aGVVc2VyID0gYVVzZXI7XHJcbiAgLy8gICAgIC8vICRzdGF0ZVBhcmFtcy50aGVJRCA9IGFVc2VyLl9pZFxyXG4gIC8vICAgICBjb25zb2xlLmxvZyhcImlkXCIsICRzdGF0ZVBhcmFtcyk7XHJcbiAgLy8gfSk7XHJcblxyXG4gICRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoZSwgaW5kZXgpIHtcclxuXHJcbiAgXHRlID0gZS50b0VsZW1lbnQ7XHJcblxyXG4gICAgICAgIC8vIHN0YXJ0IHJlY29yZGluZ1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdGFydCByZWNvcmRpbmcnKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoIWF1ZGlvUmVjb3JkZXIpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgZS5jbGFzc0xpc3QuYWRkKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgIGF1ZGlvUmVjb3JkZXIuY2xlYXIoKTtcclxuICAgICAgICBhdWRpb1JlY29yZGVyLnJlY29yZCgpO1xyXG5cclxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGF1ZGlvUmVjb3JkZXIuc3RvcCgpO1xyXG4gICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xyXG4gICAgICAgICAgICAvLyAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcclxuXHJcbiAgICAgICAgICB9LCA1MDApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgfSwgMjAwMCk7XHJcblxyXG4gIH1cclxuXHJcbiAgJHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICB9O1xyXG5cclxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgIHZhciBhd3NUcmFja3MgPSAkc2NvcGUudHJhY2tzLmZpbHRlcihmdW5jdGlvbih0cmFjayxpbmRleCl7XHJcbiAgICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKGF3c1RyYWNrcywgJzU1OTVhN2ZhYWE5MDFhZDYzMjM0ZjkyMCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcclxuXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuXHJcblx0XHJcblxyXG5cclxufSk7XHJcblxyXG5cclxuIiwiXHJcbmFwcC5jb250cm9sbGVyKCdVc2VyQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSwgQXV0aFNlcnZpY2UsICRzdGF0ZVBhcmFtcywgdXNlckZhY3RvcnkpIHtcclxuXHJcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAkc2NvcGUubG9nZ2VkSW5Vc2VyID0gbG9nZ2VkSW5Vc2VyO1xyXG5cclxuICAgICAgICAgIHVzZXJGYWN0b3J5LmdldFVzZXJPYmooJHN0YXRlUGFyYW1zLnRoZUlEKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGlzJywgdXNlciwgJHN0YXRlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgICRzY29wZS5kaXNwbGF5U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcclxuICAgICAgICBlbHNlICRzY29wZS5zaG93U2V0dGluZ3MgPSB0cnVlO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5zaG93U2V0dGluZ3MpO1xyXG4gICAgfVxyXG5cclxuICAgICRzY29wZS5mb2xsb3cgPSBmdW5jdGlvbih1c2VyKXtcclxuICAgICAgdXNlckZhY3RvcnkuZm9sbG93KHVzZXIsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdGb2xsb3cgY29udHJvbGxlciByZXNwb25zZScsIHJlc3BvbnNlKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgXHJcblxyXG5cclxufSk7IiwiYXBwLmZhY3RvcnkoJ0FuYWx5c2VyRmN0JywgZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciB1cGRhdGVBbmFseXNlcnMgPSBmdW5jdGlvbiAoYW5hbHlzZXJDb250ZXh0LCBhbmFseXNlck5vZGUsIGNvbnRpbnVlVXBkYXRlKSB7XHJcblxyXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xyXG5cdFx0XHR2YXIgU1BBQ0lORyA9IDM7XHJcblx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xyXG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XHJcblx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xyXG5cclxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxyXG5cclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcclxuXHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xyXG5cclxuXHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcclxuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcclxuXHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcclxuXHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxyXG5cdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xyXG5cdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XHJcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XHJcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cdH1cclxuXHJcblxyXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xyXG5cdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XHJcblx0fVxyXG5cdHJldHVybiB7XHJcblx0XHR1cGRhdGVBbmFseXNlcnM6IHVwZGF0ZUFuYWx5c2VycyxcclxuXHRcdGNhbmNlbEFuYWx5c2VyVXBkYXRlczogY2FuY2VsQW5hbHlzZXJVcGRhdGVzXHJcblx0fVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdIb21lRmN0JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXInLCB7cGFyYW1zOiB7X2lkOiB1c2VyfX0pXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Y2Nlc3MuZGF0YTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1Byb2plY3RGY3QnLCBmdW5jdGlvbigkaHR0cCl7XHJcblxyXG4gICAgdmFyIGdldFByb2plY3RJbmZvID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xyXG5cclxuICAgICAgICAvL2lmIGNvbWluZyBmcm9tIEhvbWVDb250cm9sbGVyIGFuZCBubyBJZCBpcyBwYXNzZWQsIHNldCBpdCB0byAnYWxsJ1xyXG4gICAgICAgIHZhciBwcm9qZWN0aWQgPSBwcm9qZWN0SWQgfHwgJ2FsbCc7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9qZWN0cy8nICsgcHJvamVjdGlkIHx8IHByb2plY3RpZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgY3JlYXRlQUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMvJywgcHJvamVjdCkudGhlbihmdW5jdGlvbihmb3JrKXtcclxuICAgIFx0XHRcdHJldHVybiBmb3JrLmRhdGE7XHJcbiAgICBcdH0pO1xyXG4gICAgfVxyXG4gICAgdmFyIG5ld1Byb2plY3QgPSBmdW5jdGlvbih1c2VyKXtcclxuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMnLHtvd25lcjp1c2VyLl9pZCwgbmFtZTonVW50aXRsZWQnLCBicG06MTIwLCBlbmRNZWFzdXJlOiAzMn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgXHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgXHR9KTtcclxuICAgIH1cclxuICAgIHZhciBuYW1lQ2hhbmdlID0gZnVuY3Rpb24obmV3TmFtZSwgcHJvamVjdElkKSB7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS9wcm9qZWN0cy8nK3Byb2plY3RJZCwge25hbWU6IG5ld05hbWV9KS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkZWxldGVQcm9qZWN0ID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS9wcm9qZWN0cy8nK3Byb2plY3QuX2lkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0RlbGV0ZSBQcm9qIEZjdCcsIHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFByb2plY3RJbmZvOiBnZXRQcm9qZWN0SW5mbyxcclxuICAgICAgICBjcmVhdGVBRm9yazogY3JlYXRlQUZvcmssXHJcbiAgICAgICAgbmV3UHJvamVjdDogbmV3UHJvamVjdCwgXHJcbiAgICAgICAgZGVsZXRlUHJvamVjdDogZGVsZXRlUHJvamVjdCxcclxuICAgICAgICBuYW1lQ2hhbmdlOiBuYW1lQ2hhbmdlXHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsImFwcC5mYWN0b3J5KCdSZWNvcmRlckZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgQXV0aFNlcnZpY2UsICRxLCBUb25lVHJhY2tGY3QsIEFuYWx5c2VyRmN0KSB7XHJcblxyXG4gICAgdmFyIHJlY29yZGVySW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgdmFyIENvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgICAgIHZhciBhdWRpb0NvbnRleHQgPSBuZXcgQ29udGV4dCgpO1xyXG4gICAgICAgICAgICB2YXIgcmVjb3JkZXI7XHJcblxyXG4gICAgICAgICAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IChcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5jYW5jZWxBbmltYXRpb25GcmFtZSlcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jYW5jZWxBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWU7XHJcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSlcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBuYXZpZ2F0b3Iud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XHJcblxyXG4gICAgICAgICAgICAvLyBhc2sgZm9yIHBlcm1pc3Npb25cclxuICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXVkaW9cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtYW5kYXRvcnlcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0VjaG9DYW5jZWxsYXRpb25cIjogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0F1dG9HYWluQ29udHJvbFwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nTm9pc2VTdXBwcmVzc2lvblwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nSGlnaHBhc3NGaWx0ZXJcIjogXCJmYWxzZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJvcHRpb25hbFwiOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChzdHJlYW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlucHV0UG9pbnQgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIEF1ZGlvTm9kZSBmcm9tIHRoZSBzdHJlYW0uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWFsQXVkaW9JbnB1dCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXVkaW9JbnB1dCA9IHJlYWxBdWRpb0lucHV0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdWRpb0lucHV0LmNvbm5lY3QoaW5wdXRQb2ludCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW5hbHlzZXIgbm9kZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5c2VyTm9kZS5mZnRTaXplID0gMjA0ODtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCBhbmFseXNlck5vZGUgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHJlY29yZGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZGVyID0gbmV3IFJlY29yZGVyKCBpbnB1dFBvaW50ICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB6ZXJvR2FpbiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmdhaW4udmFsdWUgPSAwLjA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggemVyb0dhaW4gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uY29ubmVjdCggYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFtyZWNvcmRlciwgYW5hbHlzZXJOb2RlXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlY29yZFN0YXJ0ID0gZnVuY3Rpb24gKHJlY29yZGVyKSB7XHJcbiAgICAgICAgcmVjb3JkZXIuY2xlYXIoKTtcclxuICAgICAgICByZWNvcmRlci5yZWNvcmQoKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVjb3JkU3RvcCA9IGZ1bmN0aW9uIChpbmRleCwgcmVjb3JkZXIpIHtcclxuICAgICAgICByZWNvcmRlci5zdG9wKCk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIC8vIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcclxuICAgICAgICAgICAgcmVjb3JkZXIuZ2V0QnVmZmVycyhmdW5jdGlvbiAoYnVmZmVycykge1xyXG4gICAgICAgICAgICAgICAgLy9kaXNwbGF5IHdhdiBpbWFnZVxyXG4gICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIndhdmVkaXNwbGF5XCIgKyAgaW5kZXggKTtcclxuICAgICAgICAgICAgICAgIGRyYXdCdWZmZXIoIDMwMCwgMTAwLCBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSwgYnVmZmVyc1swXSApO1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmxhdGVzdEJ1ZmZlciA9IGJ1ZmZlcnNbMF07XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nSW1hZ2UgPSBjYW52YXMudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoZSBPTkxZIHRpbWUgZ290QnVmZmVycyBpcyBjYWxsZWQgaXMgcmlnaHQgYWZ0ZXIgYSBuZXcgcmVjb3JkaW5nIGlzIGNvbXBsZXRlZCAtIFxyXG4gICAgICAgICAgICAgICAgLy8gc28gaGVyZSdzIHdoZXJlIHdlIHNob3VsZCBzZXQgdXAgdGhlIGRvd25sb2FkLlxyXG4gICAgICAgICAgICAgICAgcmVjb3JkZXIuZXhwb3J0V0FWKCBmdW5jdGlvbiAoIGJsb2IgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9uZWVkcyBhIHVuaXF1ZSBuYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb3JkZXIuc2V0dXBEb3dubG9hZCggYmxvYiwgXCJteVJlY29yZGluZzAud2F2XCIgKTtcclxuICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSBsb29wIHRpbWVcclxuICAgICAgICAgICAgICAgICAgICBUb25lVHJhY2tGY3QubG9vcEluaXRpYWxpemUoYmxvYiwgaW5kZXgsIFwibXlSZWNvcmRpbmcwLndhdlwiKS50aGVuKHJlc29sdmUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIFxyXG5cclxuICAgIFxyXG4gICAgdmFyIGNvbnZlcnRUb0Jhc2U2NCA9IGZ1bmN0aW9uICh0cmFjaykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdlYWNoIHRyYWNrJywgdHJhY2spO1xyXG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcbiAgICAgICAgICAgIGlmKHRyYWNrLnJhd0F1ZGlvKSB7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTCh0cmFjay5yYXdBdWRpbyk7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuXHJcblxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgc2VuZFRvQVdTOiBmdW5jdGlvbiAodHJhY2tzQXJyYXksIHByb2plY3RJZCwgcHJvamVjdE5hbWUpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWFkUHJvbWlzZXMgPSB0cmFja3NBcnJheS5tYXAoY29udmVydFRvQmFzZTY0KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5hbGwocmVhZFByb21pc2VzKS50aGVuKGZ1bmN0aW9uIChzdG9yZURhdGEpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0cmFja3NBcnJheS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaywgaSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdG9yZURhdGFbaV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2sucmF3QXVkaW8gPSBzdG9yZURhdGFbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNrLmVmZmVjdHNSYWNrID0gdHJhY2suZWZmZWN0c1JhY2subWFwKGZ1bmN0aW9uIChlZmZlY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRUZGRUNUXCIsIGVmZmVjdCwgZWZmZWN0LndldC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWZmZWN0LndldC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvYXdzLycsIHsgdHJhY2tzIDogdHJhY2tzQXJyYXksIHByb2plY3RJZCA6IHByb2plY3RJZCwgcHJvamVjdE5hbWUgOiBwcm9qZWN0TmFtZSB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgaW4gc2VuZFRvQVdTRmFjdG9yeScsIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7IFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlY29yZGVySW5pdDogcmVjb3JkZXJJbml0LFxyXG4gICAgICAgIHJlY29yZFN0YXJ0OiByZWNvcmRTdGFydCxcclxuICAgICAgICByZWNvcmRTdG9wOiByZWNvcmRTdG9wXHJcbiAgICB9XHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnVG9uZVRpbWVsaW5lRmN0JywgZnVuY3Rpb24gKCRodHRwLCAkcSkge1xyXG5cclxuXHR2YXIgY3JlYXRlVHJhbnNwb3J0ID0gZnVuY3Rpb24gKGxvb3BFbmQpIHtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcCA9IHRydWU7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BTdGFydCA9ICcwbSc7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BFbmQgPSBsb29wRW5kLnRvU3RyaW5nKCkgKyAnbSc7XHJcblx0XHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcclxuXHJcblx0XHRcdGNyZWF0ZU1ldHJvbm9tZSgpLnRoZW4oZnVuY3Rpb24gKG1ldHJvbm9tZSkge1xyXG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHZhciBwb3NBcnIgPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpO1xyXG5cdFx0XHRcdFx0dmFyIGxlZnRQb3MgPSAoKHBhcnNlSW50KHBvc0FyclswXSkgKiAyMDAgKSArIChwYXJzZUludChwb3NBcnJbMV0pICogNTApICsgNTAwKS50b1N0cmluZygpICsgJ3B4JztcclxuXHRcdFx0XHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSBsZWZ0UG9zO1xyXG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XHJcblx0XHRcdFx0fSwgJzFtJyk7XHJcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coVG9uZS5UcmFuc3BvcnQucG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XHJcblx0XHRcdFx0fSwgJzRuJyk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0cm9ub21lKTtcclxuXHRcdFx0fSk7XHJcbiAgICAgICAgfSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGNoYW5nZUJwbSA9IGZ1bmN0aW9uIChicG0pIHtcclxuXHRcdFRvbmUuVHJhbnNwb3J0LmJwbS52YWx1ZSA9IGJwbTtcclxuXHRcdHJldHVybiBUb25lLlRyYW5zcG9ydDtcclxuXHR9O1xyXG5cclxuXHR2YXIgc3RvcEFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcclxuXHRcdHRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci5zdG9wKCk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgbXV0ZUFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcclxuXHRcdHRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIHVuTXV0ZUFsbCA9IGZ1bmN0aW9uICh0cmFja3MpIHtcclxuXHRcdHRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGNyZWF0ZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHQgICAgICAgIHZhciBtZXQgPSBuZXcgVG9uZS5QbGF5ZXIoXCIvYXBpL3dhdi9DbGljazEud2F2XCIsIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShtZXQpO1xyXG5cdCAgICAgICAgfSkudG9NYXN0ZXIoKTtcclxuICAgICAgICB9KTtcclxuXHR9O1xyXG5cclxuXHR2YXIgYWRkTG9vcFRvVGltZWxpbmUgPSBmdW5jdGlvbiAocGxheWVyLCBzdGFydFRpbWVBcnJheSkge1xyXG5cclxuXHRcdGlmKHN0YXJ0VGltZUFycmF5LmluZGV4T2YoMCkgPT09IC0xKSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdH0sIFwiMG1cIilcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0c3RhcnRUaW1lQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRUaW1lKSB7XHJcblxyXG5cdFx0XHR2YXIgc3RhcnRUaW1lID0gc3RhcnRUaW1lLnRvU3RyaW5nKCkgKyAnbSc7XHJcblxyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1N0YXJ0JywgVG9uZS5UcmFuc3BvcnQucG9zaXRpb24pO1xyXG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0cGxheWVyLnN0YXJ0KCk7XHJcblx0XHRcdH0sIHN0YXJ0VGltZSk7XHJcblxyXG5cdFx0XHQvLyB2YXIgc3RvcFRpbWUgPSBwYXJzZUludChzdGFydFRpbWUuc3Vic3RyKDAsIHN0YXJ0VGltZS5sZW5ndGgtMSkpICsgMSkudG9TdHJpbmcoKSArIHN0YXJ0VGltZS5zdWJzdHIoLTEsMSk7XHJcblx0XHRcdC8vLy8gY29uc29sZS5sb2coJ1NUT1AnLCBzdG9wKTtcclxuXHRcdFx0Ly8vLyB0cmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHQvLy8vIFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdFx0Ly8vLyB9LCBzdG9wVGltZSk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdH07XHJcblx0XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGNyZWF0ZVRyYW5zcG9ydDogY3JlYXRlVHJhbnNwb3J0LFxyXG4gICAgICAgIGNoYW5nZUJwbTogY2hhbmdlQnBtLFxyXG4gICAgICAgIGFkZExvb3BUb1RpbWVsaW5lOiBhZGRMb29wVG9UaW1lbGluZSxcclxuICAgICAgICBjcmVhdGVNZXRyb25vbWU6IGNyZWF0ZU1ldHJvbm9tZSxcclxuICAgICAgICBzdG9wQWxsOiBzdG9wQWxsLFxyXG4gICAgICAgIG11dGVBbGw6IG11dGVBbGwsXHJcbiAgICAgICAgdW5NdXRlQWxsOiB1bk11dGVBbGxcclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnVG9uZVRyYWNrRmN0JywgZnVuY3Rpb24gKCRodHRwLCAkcSkge1xyXG5cclxuXHR2YXIgY3JlYXRlUGxheWVyID0gZnVuY3Rpb24gKHVybCwgZG9uZUZuKSB7XHJcblx0XHR2YXIgcGxheWVyICA9IG5ldyBUb25lLlBsYXllcih1cmwsIGRvbmVGbik7XHJcblx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcclxuXHRcdHBsYXllci50b01hc3RlcigpO1xyXG5cdFx0Ly8gcGxheWVyLnN5bmMoKTtcclxuXHRcdC8vIHBsYXllci5sb29wID0gdHJ1ZTtcclxuXHRcdHJldHVybiBwbGF5ZXI7XHJcblx0fTtcclxuXHJcblx0dmFyIGxvb3BJbml0aWFsaXplID0gZnVuY3Rpb24oYmxvYiwgaW5kZXgsIGZpbGVuYW1lKSB7XHJcblx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0Ly9QQVNTRUQgQSBCTE9CIEZST00gUkVDT1JERVJKU0ZBQ1RPUlkgLSBEUk9QUEVEIE9OIE1FQVNVUkUgMFxyXG5cdFx0XHR2YXIgdXJsID0gKHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0XHR2YXIgbGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2F2ZVwiK2luZGV4KTtcclxuXHRcdFx0bGluay5ocmVmID0gdXJsO1xyXG5cdFx0XHRsaW5rLmRvd25sb2FkID0gZmlsZW5hbWUgfHwgJ291dHB1dCcraW5kZXgrJy53YXYnO1xyXG5cdFx0XHR3aW5kb3cubGF0ZXN0UmVjb3JkaW5nID0gYmxvYjtcclxuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZ1VSTCA9IHVybDtcclxuXHRcdFx0dmFyIHBsYXllcjtcclxuXHRcdFx0Ly8gVE9ETzogcmVtb3ZlIHRvTWFzdGVyXHJcblx0XHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRyZXNvbHZlKHBsYXllcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGVmZmVjdHNJbml0aWFsaXplID0gZnVuY3Rpb24oYXJyKSB7XHJcblxyXG5cclxuXHRcdHZhciBjaG9ydXMgPSBuZXcgVG9uZS5DaG9ydXMoKTtcclxuXHRcdHZhciBwaGFzZXIgPSBuZXcgVG9uZS5QaGFzZXIoKTtcclxuXHRcdHZhciBkaXN0b3J0ID0gbmV3IFRvbmUuRGlzdG9ydGlvbigpO1xyXG5cdFx0dmFyIHBpbmdwb25nID0gbmV3IFRvbmUuUGluZ1BvbmdEZWxheShcIjFtXCIpO1xyXG5cclxuXHRcdGlmIChhcnIubGVuZ3RoKSB7XHJcblx0XHRcdGNob3J1cy53ZXQudmFsdWUgPSBhcnJbMF07XHJcblx0XHRcdHBoYXNlci53ZXQudmFsdWUgPSBhcnJbMV07XHJcblx0XHRcdGRpc3RvcnQud2V0LnZhbHVlID0gYXJyWzJdO1xyXG5cdFx0XHRwaW5ncG9uZy53ZXQudmFsdWUgPSBhcnJbM107XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGNob3J1cy5jb25uZWN0KHBoYXNlcik7XHJcblx0XHRwaGFzZXIuY29ubmVjdChkaXN0b3J0KTtcclxuXHRcdGRpc3RvcnQuY29ubmVjdChwaW5ncG9uZyk7XHJcblx0XHRwaW5ncG9uZy50b01hc3RlcigpO1xyXG5cclxuXHRcdHJldHVybiBbY2hvcnVzLCBwaGFzZXIsIGRpc3RvcnQsIHBpbmdwb25nXTtcclxuXHR9O1xyXG5cclxuXHR2YXIgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCA9IGZ1bmN0aW9uKHBsYXllciwgbWVhc3VyZSkge1xyXG5cdFx0cmV0dXJuIFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0cGxheWVyLnN0YXJ0KCk7XHJcblx0XHRcdH0sIG1lYXN1cmUrXCJtXCIpO1xyXG5cdH07XHJcblxyXG5cdHZhciByZXBsYWNlVGltZWxpbmVMb29wID0gZnVuY3Rpb24ocGxheWVyLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKSB7XHJcblx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ29sZCB0aW1lbGluZSBpZCcsIG9sZFRpbWVsaW5lSWQpO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KG9sZFRpbWVsaW5lSWQpKTtcclxuXHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZXMoKTtcclxuXHRcdFx0cmVzb2x2ZShjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHBsYXllciwgbmV3TWVhc3VyZSkpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHR2YXIgZGVsZXRlVGltZWxpbmVMb29wID0gZnVuY3Rpb24odGltZWxpbmVJZCkge1xyXG5cdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShwYXJzZUludCh0aW1lbGluZUlkKSk7XHJcblx0fTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGNyZWF0ZVBsYXllcjogY3JlYXRlUGxheWVyLFxyXG4gICAgICAgIGxvb3BJbml0aWFsaXplOiBsb29wSW5pdGlhbGl6ZSxcclxuICAgICAgICBlZmZlY3RzSW5pdGlhbGl6ZTogZWZmZWN0c0luaXRpYWxpemUsXHJcbiAgICAgICAgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcDogY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCxcclxuICAgICAgICByZXBsYWNlVGltZWxpbmVMb29wOiByZXBsYWNlVGltZWxpbmVMb29wLFxyXG4gICAgICAgIGRlbGV0ZVRpbWVsaW5lTG9vcDogZGVsZXRlVGltZWxpbmVMb29wXHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsImFwcC5mYWN0b3J5KCd1c2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Z2V0VXNlck9iajogZnVuY3Rpb24odXNlcklEKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXJzJywge3BhcmFtczoge19pZDogdXNlcklEfX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNvb25zZSBpcycsIHJlc3BvbnNlLmRhdGEpXHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHJcblx0XHRmb2xsb3c6IGZ1bmN0aW9uKHVzZXIsIGxvZ2dlZEluVXNlcil7XHJcblx0XHRcdHJldHVybiAkaHR0cC5wdXQoJ2FwaS91c2Vycycse3VzZXJUb0ZvbGxvdzogdXNlciwgbG9nZ2VkSW5Vc2VyOiBsb2dnZWRJblVzZXJ9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9sbG93VXNlciBGYWN0b3J5IHJlc3BvbnNlJywgcmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHJcblx0XHR1bkZvbGxvdzogZnVuY3Rpb24oZm9sbG93ZWUsIGxvZ2dlZEluVXNlcikge1xyXG5cdFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMnLCB7dXNlclRvVW5mb2xsb3c6IGZvbGxvd2VlLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCd1bkZvbGxvdyByZXNwb25zZScsIHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdkcmFnZ2FibGUnLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XHJcbiAgICB2YXIgZWwgPSBlbGVtZW50WzBdO1xyXG4gICAgXHJcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xyXG4gICAgXHJcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnc3RhcnQnLCBmdW5jdGlvbihlKSB7XHJcblxyXG4gICAgICAgIGUuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnbW92ZSc7XHJcbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuc2V0RGF0YSgnVGV4dCcsIHRoaXMuaWQpO1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnZHJhZycpO1xyXG5cclxuICAgICAgICB2YXIgaWR4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwYXJzZUludChhdHRycy5wb3NpdGlvbikpO1xyXG4gICAgICAgIHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShpZHgsIDEpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH0sXHJcbiAgICAgIGZhbHNlXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW5kJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSxcclxuICAgICAgZmFsc2VcclxuICAgICk7XHJcblxyXG4gIH1cclxufSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdkcm9wcGFibGUnLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgc2NvcGU6IHtcclxuICAgICAgZHJvcDogJyYnIC8vIHBhcmVudFxyXG4gICAgfSxcclxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgIC8vIGFnYWluIHdlIG5lZWQgdGhlIG5hdGl2ZSBvYmplY3RcclxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcclxuICAgICAgXHJcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcclxuICAgICAgICAgIC8vIGFsbG93cyB1cyB0byBkcm9wXHJcbiAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2xlYXZlJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cclxuICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIHVwb24gZHJvcCwgY2hhbmdpbmcgcG9zaXRpb24gYW5kIHVwZGF0aW5nIHRyYWNrLmxvY2F0aW9uIGFycmF5IG9uIHNjb3BlIFxyXG4gICAgICAgICAgdmFyIGl0ZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlLmRhdGFUcmFuc2Zlci5nZXREYXRhKCdUZXh0JykpO1xyXG4gICAgICAgICAgdmFyIHhwb3NpdGlvbiA9IHBhcnNlSW50KHRoaXMuYXR0cmlidXRlcy54cG9zaXRpb24udmFsdWUpO1xyXG4gICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSB0aGlzLmNoaWxkTm9kZXM7XHJcbiAgICAgICAgICB2YXIgb2xkVGltZWxpbmVJZDtcclxuICAgICAgICAgIHZhciB0aGVDYW52YXM7XHJcblxyXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNoaWxkTm9kZXNbaV0uY2xhc3NOYW1lID09PSAnY2FudmFzLWJveCcpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1tpXS5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnB1c2goeHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHZhciBjYW52YXNOb2RlID0gdGhpcy5jaGlsZE5vZGVzW2ldLmNoaWxkTm9kZXM7XHJcblxyXG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc05vZGUubGVuZ3RoOyBqKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzTm9kZVtqXS5ub2RlTmFtZSA9PT0gJ0NBTlZBUycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMucG9zaXRpb24udmFsdWUgPSB4cG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkVGltZWxpbmVJZCA9IGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUNhbnZhcyA9IGNhbnZhc05vZGVbal07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSAgICAgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuXHJcbiAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQubW92ZUluVGltZWxpbmUob2xkVGltZWxpbmVJZCwgeHBvc2l0aW9uKS50aGVuKGZ1bmN0aW9uIChuZXdUaW1lbGluZUlkKSB7XHJcbiAgICAgICAgICAgICAgdGhlQ2FudmFzLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZSA9IG5ld1RpbWVsaW5lSWQ7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBjYWxsIHRoZSBkcm9wIHBhc3NlZCBkcm9wIGZ1bmN0aW9uXHJcbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcbiIsImFwcC5kaXJlY3RpdmUoJ2ZvbGxvd2RpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mb2xsb3cvZm9sbG93RGlyZWN0aXZlLmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0ZvbGxvd0RpcmVjdGl2ZUNvbnRyb2xsZXInXHJcblx0fTtcclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcignRm9sbG93RGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCB1c2VyRmFjdG9yeSl7XHJcblxyXG5cclxuXHJcblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcbiAgICAgICAgIFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuICAgICAgICAgIFx0dXNlckZhY3RvcnkuZ2V0VXNlck9iaigkc3RhdGVQYXJhbXMudGhlSUQpLnRoZW4oZnVuY3Rpb24odXNlcil7XHJcblx0ICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xyXG5cdCAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGlzJywgdXNlcik7XHJcblxyXG5cdCAgICAgICAgICAgIGlmKCRzdGF0ZS5jdXJyZW50Lm5hbWUgPT09IFwidXNlclByb2ZpbGUuZm9sbG93ZXJzXCIpe1xyXG5cdCAgICAgICAgICAgIFx0JHNjb3BlLmZvbGxvd3MgPSB1c2VyLmZvbGxvd2VycztcclxuXHQgICAgICAgICAgICB9IGVsc2V7XHJcblx0ICAgICAgICAgICAgXHQkc2NvcGUuZm9sbG93cyA9IHVzZXIuZm9sbG93aW5nO1xyXG5cdCAgICAgICAgICAgIFx0aWYoJHN0YXRlUGFyYW1zLnRoZUlEID09PSBsb2dnZWRJblVzZXIuX2lkKSAkc2NvcGUuc2hvd0J1dHRvbiA9IHRydWU7XHJcblx0ICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZm9sbG93T2JqIGlzXCIsICRzY29wZS5mb2xsb3dzLCAkc3RhdGVQYXJhbXMpO1xyXG5cclxuXHQgICAgXHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdCRzY29wZS5nb1RvRm9sbG93ID0gZnVuY3Rpb24oZm9sbG93KXtcclxuXHQgICAgICBjb25zb2xlLmxvZyhcImNsaWNrZWRcIiwgZm9sbG93KTtcclxuXHQgICAgICAkc3RhdGUuZ28oJ3VzZXJQcm9maWxlJywgeyB0aGVJRDogZm9sbG93Ll9pZH0pO1xyXG5cdCAgICB9XHJcblxyXG5cdCAgICAkc2NvcGUudW5Gb2xsb3cgPSBmdW5jdGlvbihmb2xsb3dlZSkge1xyXG5cdCAgICBcdGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCBmb2xsb3dlZSk7XHJcblx0ICAgIFx0dXNlckZhY3RvcnkudW5Gb2xsb3coZm9sbG93ZWUsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdCAgICBcdFx0Y29uc29sZS5sb2coXCJzdWNjZXNmdWwgdW5mb2xsb3dcIik7XHJcblx0ICAgIFx0fSk7XHJcblx0ICAgIH1cclxuXHJcblxyXG5cdFxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xyXG4gICAgfTtcclxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbG9hZGluZ0dpZicsIGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbG9hZGluZy1naWYvbG9hZGluZy5odG1sJ1xyXG5cdH07XHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgc2NvcGU6IHt9LFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZXROYXZiYXIgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodXNlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VySWQgPSB1c2VyLl9pZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdQcm9maWxlJywgc3RhdGU6ICd1c2VyUHJvZmlsZSh7dGhlSUQ6IHVzZXJJZH0pJywgYXV0aDogdHJ1ZSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2V0TmF2YmFyKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBzY29wZS5pdGVtcyA9IFtcclxuICAgICAgICAgICAgLy8gICAgIC8vIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxyXG4gICAgICAgICAgICAvLyAgICAgLy8geyBsYWJlbDogJ1NpZ24gVXAnLCBzdGF0ZTogJ3NpZ251cCcgfSxcclxuICAgICAgICAgICAgLy8gICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ3VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XHJcbiAgICAgICAgICAgIC8vIF07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNldFVzZXIoKTtcclxuXHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0TmF2YmFyKTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHNldE5hdmJhcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdwcm9qZWN0ZGlyZWN0aXZlJywgZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2plY3QvcHJvamVjdERpcmVjdGl2ZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcidcclxuXHR9O1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlKXtcclxuXHJcblxyXG5cclxuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcclxuXHRcdFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuXHRcdFx0JHNjb3BlLmRpc3BsYXlBUHJvamVjdCA9IGZ1bmN0aW9uKHNvbWV0aGluZyl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RISU5HJywgc29tZXRoaW5nKTtcclxuXHRcdFx0XHRpZigkc2NvcGUubG9nZ2VkSW5Vc2VyLl9pZCA9PT0gJHN0YXRlUGFyYW1zLnRoZUlEKXtcclxuXHRcdFx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHNvbWV0aGluZy5faWR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJkaXNwbGF5aW5nIGEgcHJvamVjdFwiLCAkc2NvcGUucGFyZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcblx0XHRcdFx0aWYoIXByb2plY3QuZm9ya09yaWdpbikgcHJvamVjdC5mb3JrT3JpZ2luID0gcHJvamVjdC5faWQ7XHJcblx0XHRcdFx0cHJvamVjdC5mb3JrSUQgPSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcclxuXHRcdFx0XHRkZWxldGUgcHJvamVjdC5faWQ7XHJcblx0XHRcdFx0Ly8gY29uc29sZS5sb2cocHJvamVjdCk7XHJcblx0XHRcdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JrIHJlc3BvbnNlIGlzJywgcmVzcG9uc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUuZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uKHByb2plY3Qpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdEZWxldGVQcm9qZWN0JywgcHJvamVjdClcclxuXHRcdFx0XHRQcm9qZWN0RmN0LmRlbGV0ZVByb2plY3QocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRGVsZXRlIHJlcXVlc3QgaXMnLCByZXNwb25zZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCd4aW1UcmFjaycsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEFuYWx5c2VyRmN0LCAkcSkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5odG1sJyxcclxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG5cdFx0XHRzY29wZS5lZmZlY3RXZXRuZXNzZXMgPSBbMCwwLDAsMF07XHJcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbnZhc1Jvdy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XHJcblx0XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc0NsYXNzZXMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcclxuXHRcdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W2ldKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIGlkPSd3YXZlZGlzcGxheScgY2xhc3M9J2l0ZW0nIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7IGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBzY29wZS50cmFjay5pbWcgKyBcIik7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIDApXHJcblxyXG5cdFx0XHRzY29wZS5kcm9wSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChpbmRleCwgcG9zaXRpb24pIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnRFJPUFBJTkcnKTtcclxuXHRcdFx0XHQvLyBzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IGZhbHNlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vIHZhciBwb3NpdGlvbiA9IDA7XHJcblx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xyXG5cclxuXHRcdFx0XHRpZiAoc2NvcGUudHJhY2subG9jYXRpb24ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHQvLyBkcm9wIHRoZSBsb29wIG9uIHRoZSBmaXJzdCBhdmFpbGFibGUgaW5kZXhcdFx0XHRcdFxyXG5cdFx0XHRcdFx0d2hpbGUgKHNjb3BlLnRyYWNrLmxvY2F0aW9uLmluZGV4T2YocG9zaXRpb24pID4gLTEpIHtcclxuXHRcdFx0XHRcdFx0cG9zaXRpb24rKztcclxuXHRcdFx0XHRcdH1cdFx0XHRcdFx0XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBhZGRpbmcgcmF3IGltYWdlIHRvIGRiXHJcblx0XHRcdFx0aWYgKCFzY29wZS50cmFjay5pbWcpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLmltZyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZS5yZXBsYWNlKC9eZGF0YTppbWFnZVxcL3BuZztiYXNlNjQsLywgXCJcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnB1c2gocG9zaXRpb24pO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcclxuXHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgcG9zaXRpb24pO1xyXG5cdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIGluZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIitpbmRleCtcIicgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxcIiArIHNjb3BlLnRyYWNrLmltZyArIFwiKTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUubW92ZUluVGltZWxpbmUgPSBmdW5jdGlvbiAob2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkge1xyXG5cdFx0XHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ0VMRU1FTlQnLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKTtcclxuXHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5yZXBsYWNlVGltZWxpbmVMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSkudGhlbihyZXNvbHZlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fTtcclxuXHJcblxyXG5cdFx0XHRzY29wZS5hcHBlYXJPckRpc2FwcGVhciA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIHRyYWNrSW5kZXggPSBzY29wZS4kcGFyZW50LnRyYWNrcy5pbmRleE9mKHNjb3BlLnRyYWNrKTtcclxuXHRcdFx0XHR2YXIgbG9vcEluZGV4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbik7XHJcblxyXG5cdFx0XHRcdGlmKHNjb3BlLnRyYWNrLm9uVGltZWxpbmUpIHtcclxuXHRcdFx0XHRcdGlmKGxvb3BJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5wdXNoKHBvc2l0aW9uKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgdGltZWxpbmVJZCA9IFRvbmVUcmFja0ZjdC5jcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wKHNjb3BlLnRyYWNrLnBsYXllciwgcG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W3Bvc2l0aW9uXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBwb3NpdGlvbj0nXCIgKyBwb3NpdGlvbiArIFwiJyB0aW1lbGluZUlkPSdcIit0aW1lbGluZUlkK1wiJyBpZD0nbWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiArIFwiJyBjbGFzcz0naXRlbSB0cmFja0xvb3BcIit0cmFja0luZGV4K1wiJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOyBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgc2NvcGUudHJhY2suaW1nICsgXCIpOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cdFx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygndHJhY2snLCBzY29wZS50cmFjayk7XHJcblx0XHRcdFx0XHRcdC8vIGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtIHRyYWNrTG9vcFwiK3RyYWNrSW5kZXgrXCInIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHRcdC8vIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XHJcblx0XHRcdFx0XHRcdC8vIGRyYXdCdWZmZXIoIDE5OCwgOTgsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBzY29wZS50cmFjay5idWZmZXIgKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XHJcblx0XHRcdFx0XHRcdC8vcmVtb3ZlIGZyb20gbG9jYXRpb25zIGFycmF5XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShsb29wSW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHQvL3JlbW92ZSB0aW1lbGluZUlkXHJcblx0XHRcdFx0XHRcdFRvbmVUcmFja0ZjdC5kZWxldGVUaW1lbGluZUxvb3AoIGNhbnZhcy5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWUgKTtcclxuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgY2FudmFzIGl0ZW1cclxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24gcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XHJcblx0XHRcdFx0XHRcdCAgICBlbGVtZW50ICYmIGVsZW1lbnQucGFyZW50Tm9kZSAmJiBlbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbWVudCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmVtb3ZlRWxlbWVudCggY2FudmFzICk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdOTyBEUk9QJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUucmVSZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnUkVSRUNPUkQnKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhzY29wZS50cmFjayk7XHJcblx0XHRcdFx0Ly9jaGFuZ2UgYWxsIHBhcmFtcyBiYWNrIGFzIGlmIGVtcHR5IHRyYWNrXHJcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBudWxsO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5yYXdBdWRpbyA9IG51bGw7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gbnVsbDtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly9kaXNwb3NlIG9mIGVmZmVjdHNSYWNrXHJcblx0XHRcdFx0c2NvcGUudHJhY2suZWZmZWN0c1JhY2suZm9yRWFjaChmdW5jdGlvbiAoZWZmZWN0KSB7XHJcblx0XHRcdFx0XHRlZmZlY3QuZGlzcG9zZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKFswLDAsMCwwXSk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24gPSBbXTtcclxuXHRcdFx0XHQvL3JlbW92ZSBhbGwgbG9vcHMgZnJvbSBVSVxyXG5cdFx0XHRcdHZhciBsb29wc1VJID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgndHJhY2tMb29wJytpbmRleC50b1N0cmluZygpKTtcclxuXHRcdFx0XHR3aGlsZShsb29wc1VJLmxlbmd0aCAhPT0gMCkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0xPT1BTIEFSUicsIGxvb3BzVUkpO1xyXG5cdFx0XHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGxvb3BzVUkubGVuZ3RoO2krKykge1xyXG5cdFx0XHRcdFx0XHRsb29wc1VJW2ldLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobG9vcHNVSVtpXSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR2YXIgbG9vcHNVSSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3RyYWNrTG9vcCcraW5kZXgudG9TdHJpbmcoKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjb3BlLnNvbG8gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0dmFyIG90aGVyVHJhY2tzID0gc2NvcGUuJHBhcmVudC50cmFja3MubWFwKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRcdFx0aWYodHJhY2sgIT09IHNjb3BlLnRyYWNrKSB7XHJcblx0XHRcdFx0XHRcdHRyYWNrLnNpbGVuY2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJhY2s7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSkuZmlsdGVyKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRcdFx0aWYodHJhY2sgJiYgdHJhY2sucGxheWVyKSByZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhvdGhlclRyYWNrcyk7XHJcblx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0Lm11dGVBbGwob3RoZXJUcmFja3MpO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnNpbGVuY2UgPSBmYWxzZTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NvcGUuc2lsZW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRpZighc2NvcGUudHJhY2suc2lsZW5jZSkge1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IC0xMDA7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gdHJ1ZTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5zaWxlbmNlID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0XHR2YXIgcmVjb3JkZXIgPSBzY29wZS5yZWNvcmRlcjtcclxuXHJcblx0XHRcdFx0dmFyIGNvbnRpbnVlVXBkYXRlID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxyXG5cdFx0ICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhbmFseXNlclwiK2luZGV4KTtcclxuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xyXG5cdFx0XHRcdHZhciBhbmFseXNlcklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblxyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0c2NvcGUuJHBhcmVudC5jdXJyZW50bHlSZWNvcmRpbmcgPSB0cnVlO1xyXG5cclxuXHJcblx0XHRcdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xyXG5cdFx0XHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xyXG5cdFx0XHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XHJcblx0XHRcdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XHJcblx0XHRcdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcclxuXHJcblx0XHRcdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXHJcblxyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XHJcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gJyNGNkQ1NjUnO1xyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cdFx0XHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xyXG5cclxuXHRcdFx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXHJcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcclxuXHRcdFx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XHJcblx0XHRcdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xyXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxyXG5cdFx0XHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcclxuXHRcdFx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcclxuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xyXG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcclxuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYoVG9uZS5UcmFuc3BvcnQuc3RhdGUgPT09IFwic3RvcHBlZFwiKSB7XHJcblx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QubXV0ZUFsbChzY29wZS4kcGFyZW50LnRyYWNrcyk7XHJcblx0XHRcdFx0XHRzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdGFydCgpO1xyXG5cclxuXHRcdFx0XHRcdHZhciBjbGljayA9IHdpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RhcnQoKTtcclxuXHRcdFx0XHRcdH0sIDUwMCk7XHJcblxyXG5cdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0b3AoaW5kZXgsIHJlY29yZGVyKS50aGVuKGZ1bmN0aW9uIChwbGF5ZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlVXBkYXRlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gcGxheWVyO1xyXG5cdFx0XHRcdFx0XHRcdC8vIHNjb3BlLnRyYWNrLnBsYXllci5sb29wID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5idWZmZXIgPSB3aW5kb3cubGF0ZXN0QnVmZmVyO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJhd0F1ZGlvID0gd2luZG93LmxhdGVzdFJlY29yZGluZztcclxuXHRcdFx0XHRcdFx0XHRwbGF5ZXIuY29ubmVjdChzY29wZS50cmFjay5lZmZlY3RzUmFja1swXSk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdHdpbmRvdy5jbGVhckludGVydmFsKGNsaWNrKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LmN1cnJlbnRseVJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdFRvbmVUaW1lbGluZUZjdC51bk11dGVBbGwoc2NvcGUuJHBhcmVudC50cmFja3MpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0sIDQwMDApO1xyXG5cclxuXHRcdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlciwgaW5kZXgpO1xyXG5cdFx0XHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdXSElMRSBQTEFZSU5HJyk7XHJcblx0XHRcdFx0XHR2YXIgbmV4dEJhciA9IHBhcnNlSW50KFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF0pICsgMTtcclxuXHRcdFx0XHRcdHZhciBlbmRCYXIgPSBuZXh0QmFyICsgMTtcclxuXHJcblx0XHRcdFx0XHR2YXIgcmVjSWQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0XHR9LCBuZXh0QmFyLnRvU3RyaW5nKCkgKyBcIm1cIik7XHJcblxyXG5cclxuXHRcdFx0XHRcdHZhciByZWNFbmRJZCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ1RJQ0tCQUNLIEVSUk9SPycpO1xyXG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KHJlY0lkKSk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQocmVjRW5kSWQpKTtcclxuXHRcdFx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RvcChpbmRleCwgcmVjb3JkZXIpLnRoZW4oZnVuY3Rpb24gKHBsYXllcikge1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0Y29udGludWVVcGRhdGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBwbGF5ZXI7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2NvcGUudHJhY2sucGxheWVyLmxvb3AgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmJ1ZmZlciA9IHdpbmRvdy5sYXRlc3RCdWZmZXI7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xyXG5cdFx0XHRcdFx0XHRcdHBsYXllci5jb25uZWN0KHNjb3BlLnRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LmN1cnJlbnRseVJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRwYXJlbnQuc3RvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0XHQvLyBzY29wZS4kcGFyZW50Lm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdH0sIGVuZEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRzY29wZS5wcmV2aWV3ID0gZnVuY3Rpb24oY3VycmVudGx5UHJldmlld2luZykge1xyXG5cdFx0XHRcdC8vIGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xyXG5cdFx0XHRcdC8vIFx0aWYoY3VycmVudGx5UHJldmlld2luZykge1xyXG5cdFx0XHRcdC8vIFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdC8vIFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gXHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHQvLyBcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IHRydWU7XHJcblx0XHRcdFx0Ly8gXHR9XHJcblx0XHRcdFx0Ly8gfSBlbHNlIHtcclxuXHRcdFx0XHR2YXIgbmV4dEJhcjtcclxuXHRcdFx0XHRpZighc2NvcGUuJHBhcmVudC5wcmV2aWV3aW5nSWQpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdGlmKFRvbmUuVHJhbnNwb3J0LnN0YXRlID09PSBcInN0b3BwZWRcIikge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRuZXh0QmFyID0gcGFyc2VJbnQoVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXSkgKyAxO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ05FWFQnLCBuZXh0QmFyKTtcclxuXHRcdFx0XHRcdHZhciBwbGF5TGF1bmNoID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgcHJldmlld0ludGV2YWwgPSBUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ1NIT1VMRCBQTEFZJyk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0b3AoKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBsYXlMYXVuY2gpO1xyXG5cdFx0XHRcdFx0XHR9LCBcIjFtXCIpO1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kcGFyZW50LnByZXZpZXdpbmdJZCA9IHByZXZpZXdJbnRldmFsO1xyXG5cdFx0XHRcdFx0fSwgbmV4dEJhci50b1N0cmluZygpICsgXCJtXCIpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnQUxSRUFEWSBQUkVWSUVXSU5HJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZWZmZWN0KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhhbW91bnQpO1xyXG5cclxuXHRcdFx0XHRlZmZlY3Qud2V0LnZhbHVlID0gYW1vdW50IC8gMTAwMDtcclxuXHRcdFx0fTtcclxuXHJcblx0XHR9XHJcblx0XHRcclxuXHJcblx0fVxyXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=