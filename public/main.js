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
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });

    $stateProvider.state('home.landing', {
        url: '/landing',
        templateUrl: 'js/home/landing.html'
    });
});

app.controller('HomeController', function ($scope, AuthService) {

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

    ProjectFct.getProjectInfo($scope.projectId).then(function (project) {
        var loaded = 0;
        console.log('PROJECT', project);
        $scope.projectName = project.name;

        if (project.tracks.length) {
            project.tracks.forEach(function (track) {
                var doneLoading = function doneLoading() {
                    loaded++;
                    if (loaded === project.tracks.length) {
                        $scope.loading = false;
                        // Tone.Transport.start();
                    }
                };
                var max = Math.max.apply(null, track.locations);
                if (max + 2 > maxMeasure) maxMeasure = max + 2;

                track.empty = false;
                track.recording = false;
                track.player = ToneTrackFct.createPlayer(track.url, doneLoading);
                //init effects, connect, and add to scope
                track.effectsRack = ToneTrackFct.effectsInitialize();
                track.player.connect(track.effectsRack[0]);

                if (track.locations.length) {
                    ToneTimelineFct.addLoopToTimeline(track.player, track.locations);
                    track.onTimeline = true;
                } else {
                    track.onTimeline = false;
                }

                $scope.tracks.push(track);
            });
        } else {
            $scope.maxMeasure = 17;
            for (var i = 0; i < 6; i++) {
                var obj = {};
                obj.empty = true;
                obj.recording = false;
                obj.onTimeline = false;
                obj.name = 'Track ' + (i + 1);
                obj.location = [];
                $scope.tracks.push(obj);
            }
        }

        //dynamically set measures
        //if less than 16 set 18 as minimum
        $scope.numMeasures = [];
        if (maxMeasure < 16) maxMeasure = 18;
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

        console.log(track);
    };

    $scope.addTrack = function () {};

    $scope.play = function () {
        Tone.Transport.position = $scope.position.toString() + ':0:0';
        Tone.Transport.start();
    };
    $scope.pause = function () {
        $scope.metronome.stop();
        ToneTimelineFct.stopAll($scope.tracks);
        $scope.position = Tone.Transport.position.split(':')[0];
        console.log('POS', $scope.position);
        var playHead = document.getElementById('playbackHead');
        playHead.style.left = ($scope.position * 200 + 300).toString() + 'px';
        Tone.Transport.pause();
    };
    $scope.stop = function () {
        $scope.metronome.stop();
        ToneTimelineFct.stopAll($scope.tracks);
        $scope.position = 0;
        var playHead = document.getElementById('playbackHead');
        playHead.style.left = '300px';
        Tone.Transport.stop();
    };
    $scope.nameChange = function (newName) {
        console.log('SHOW INPUT', newName);
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

        RecorderFct.sendToAWS($scope.tracks).then(function (response) {
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
            $state.go('home');
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
        controller: 'UserInfoController'
    }).state('userProfile.project', {
        url: '/projects',
        templateUrl: 'js/user/projects.html',
        controller: 'UserProjectController'
    });
});

app.controller('UserController', function ($scope, $state, AuthService, userFactory, $stateParams) {
    AuthService.getLoggedInUser().then(function (aUser) {
        $scope.theUser = aUser;
    });

    $scope.displaySettings = function () {
        if ($scope.showSettings) $scope.showSettings = false;else $scope.showSettings = true;
        console.log($scope.showSettings);
    }

    // $scope.displayForks = function(){
    //     userFactory.getForks($scope.theUser._id).then(function(data){
    //         $scope.forks = data;
    //         console.log($scope.forks);
    //     });
    // }

    ;
});
app.controller('UserInfoController', function ($scope, $state, AuthService, userFactory, $stateParams) {});

app.controller('UserProjectController', function ($scope, $stateParams, AuthService, userFactory) {

    $scope.projects;

    //turn this into a promise so you get logged in user and then the projects of that user
    AuthService.getLoggedInUser().then(function (aUser) {
        $scope.theUser = aUser;
        userFactory.getAllProjects($scope.theUser._id).then(function (data) {
            $scope.projects = data;
            if ($scope.showProjects) $scope.showProjects = false;else $scope.showProjects = true;
            console.log($scope.projects);
        });
    });
});

app.controller('NewProjectController', function ($scope, AuthService, ProjectFct, $state) {
    $scope.user;

    AuthService.getLoggedInUser().then(function (user) {
        $scope.user = user;
        console.log('user is', $scope.theUser.username);
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
                ToneTimelineFct.addLoopToTimeline(track.player, track.locations);
                $scope.tracks.push(track);
            });
        } else {
            for (var i = 0; i < 6; i++) {
                var obj = {};
                obj.name = 'Track ' + (i + 1);
                obj.locations = [];
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

app.factory('AnalyserFct', function () {

    var updateAnalysers = function updateAnalysers(analyserContext, analyserNode, continueUpdate) {

        function update() {
            console.log('UPDATE');
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
app.factory('ProjectFct', function ($http) {

    var getProjectInfo = function getProjectInfo(projectId) {
        return $http.get('/api/projects/' + projectId).then(function (response) {
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
        return $http.post('/api/projects', { owner: user._id }).then(function (response) {

            return response.data;
            // return $http.put('/api/projects/userproject',{owner: user._id, project:response.data}).then(function(user){
            // 	console.log(user.data)
            // })
        });
    };

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork,
        newProject: newProject
    };
});

'use strict';
app.factory('RandomGreetings', function () {

    var getRandomFromArray = function getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = ['Hello, world!', 'At long last, I live!', 'Hello, simple human.', 'What a beautiful day!', 'I\'m like any other project, except that I am yours. :)', 'This empty string is for Lindsay Levine.', 'こんにちは、ユーザー様。', 'Welcome. To. WEBSITE.', ':D'];

    return {
        greetings: greetings,
        getRandomGreeting: function getRandomGreeting() {
            return getRandomFromArray(greetings);
        }
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
                console.log(canvas);
                drawBuffer(300, 100, canvas.getContext('2d'), buffers[0]);
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
        return new $q(function (resolve, reject) {
            var reader = new FileReader();

            if (track.rawAudio) {
                reader.readAsDataURL(track.rawAudio);
                reader.onloadend = function (e) {
                    resolve(reader.result);
                };
            }
        });
    };

    return {
        sendToAWS: function sendToAWS(tracksArray, projectId) {

            var readPromises = tracksArray.map(convertToBase64);

            return $q.all(readPromises).then(function (storeData) {

                console.log('storeData', storeData);

                tracksArray.forEach(function (track, i) {
                    track.rawAudio = storeData[i];
                });

                return $http.post('/api/aws/', { tracks: tracksArray, projectId: projectId }).then(function (response) {
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
                    var leftPos = (parseInt(posArr[0]) * 200 + parseInt(posArr[1]) * 50 + 300).toString() + 'px';
                    playHead.style.left = leftPos;
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
            track.player.stop();
        });
    };
    var createMetronome = function createMetronome() {
        return new $q(function (resolve, reject) {
            var met = new Tone.Player('/api/wav/Click1.wav', function () {
                console.log('LOADED');
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
        stopAll: stopAll
    };
});

'use strict';
app.factory('ToneTrackFct', function ($http, $q) {

    var createPlayer = function createPlayer(url, doneFn) {
        var player = new Tone.Player(url, doneFn);
        //TODO - remove toMaster
        player.toMaster();
        // player.sync();
        player.loop = true;
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
            }).toMaster();
        });
    };

    var effectsInitialize = function effectsInitialize() {
        var chorus = new Tone.Chorus();
        var phaser = new Tone.Phaser();
        var distort = new Tone.Distortion();
        var pingpong = new Tone.PingPongDelay();
        chorus.wet.value = 0;
        phaser.wet.value = 0;
        distort.wet.value = 0;
        pingpong.wet.value = 0;
        chorus.connect(phaser);
        phaser.connect(distort);
        distort.connect(pingpong);
        pingpong.toMaster();

        return [chorus, phaser, distort, pingpong];
    };

    return {
        createPlayer: createPlayer,
        loopInitialize: loopInitialize,
        effectsInitialize: effectsInitialize
    };
});

app.factory('userFactory', function ($http) {
    return {
        getAllProjects: function getAllProjects(userID) {
            return $http.get('api/users', {
                params: { _id: userID }
            }).then(function (response) {
                return response.data;
            });
        },
        getForks: function getForks(userID) {
            return $http.get('api/projects', {
                params: { user: userID }
            }).then(function (response) {
                return response.data;
            });
        },

        getUserSettings: function getUserSettings() {
            return $http.get('api/users', {
                params: { _id: userID }
            }).then(function (response) {
                return response.data;
            });
        }
    };
});
app.directive('draggable', function () {
    return function (scope, element) {
        // this gives us the native JS object
        var el = element[0];
<<<<<<< HEAD
=======

        el.draggable = true;

        el.addEventListener('dragstart', function (e) {

            console.log('dragstart', e);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('Text', this.id);
            this.classList.add('drag');

            return false;
        }, false);

        el.addEventListener('dragend', function (e) {
            console.log('dragend');
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
                console.log('dragenter');
                this.classList.add('over');
                return false;
            }, false);

            el.addEventListener('dragleave', function (e) {
                console.log('dragleave');
                this.classList.remove('over');
                return false;
            }, false);

            el.addEventListener('drop', function (e) {

                console.log('drop', e.toElement);
                // Stops some browsers from redirecting.
                if (e.stopPropagation) e.stopPropagation();

                this.classList.remove('over');
                // e.toElement.classList.add('taken');

                var item = document.getElementById(e.dataTransfer.getData('Text'));
                this.appendChild(item);

                // call the drop passed drop function
                scope.$apply('drop()');

                return false;
            }, false);
        }
    };
});
>>>>>>> 4c268f3441715de142d85dd6d54fde54e1568b45

        el.draggable = true;

        el.addEventListener('dragstart', function (e) {
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('Text', this.id);
            this.classList.add('drag');

            // var obj= {
            //  start: 8,
            //  end:10
            // }

            // var j= JSON.stringify(obj);
            // e.dataTransfer.setData('yo', j);
            // console.log("TRANSFER DATA IS",JSON.parse(e.dataTransfer.getData('yo')));

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

                var item = document.getElementById(e.dataTransfer.getData('Text'));
                this.appendChild(item);

                // call the drop passed drop function
                scope.$apply('drop()');

                return false;
            }, false);
        }
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
                    scope.userID = user._id;
                    scope.items = [{ label: 'Home', state: 'project' }, { label: 'Members Only', state: 'userProfile({theID: userID})', auth: true }];
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

app.controller('projectdirectiveController', function ($scope, $stateParams, $state, ProjectFct) {

    $scope.displayAProject = function (something) {
        console.log('THING', something);
        $state.go('project', { projectID: something._id });
        // console.log("displaying a project", projectID);
    };

    $scope.makeFork = function (project) {
        console.log($stateParams.theID);
        project.owner = $stateParams.theID;
        project.forkID = project._id;
        project.isForked = true;
        delete project._id;
        console.log(project);
        ProjectFct.createAFork(project);
        // $state.go('project')
    };
});
'use strict';
app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function link(scope) {
            scope.greeting = RandomGreetings.getRandomGreeting();
        }
    };
});
app.directive('ximTrack', function ($rootScope, $stateParams, $compile, RecorderFct, ProjectFct, ToneTrackFct, ToneTimelineFct, AnalyserFct) {
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
                            angular.element(canvasRow[i]).append($compile('<canvas width=\'198\' height=\'98\' id=\'wavedisplay\' class=\'item\' style=\'position: absolute;\' draggable></canvas>')(scope));
                        }
                    }
                }
            }, 0);
            scope.dropInTimeline = function (index) {
                console.log(index);
                console.log('TRACK', scope.track);
            };

<<<<<<< HEAD
            scope.record = function (index) {
                var recorder = scope.recorder;
=======
            scope.record = function (e, index, recorder) {
                debugger;
                scope.tracks[index].recording = true;
                scope.tracks[index].empty = true;
                RecorderFct.recordStart(recorder, index);
>>>>>>> 4c268f3441715de142d85dd6d54fde54e1568b45
                var continueUpdate = true;

                //analyser stuff
                var canvas = document.getElementById('analyser' + index);
                var analyserContext = canvas.getContext('2d');
                var analyserNode = scope.analyserNode;
                var analyserId = window.requestAnimationFrame(update);

                scope.track.recording = true;
                scope.track.empty = true;
                RecorderFct.recordStart(recorder);
                scope.track.empty = true;

                function update() {
                    console.log('UPDATE');
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

                setTimeout(function () {
                    // console.log('SCOPE', scope);
                    console.log('SCOPE', scope.track.player);

                    RecorderFct.recordStop(index, recorder).then(function (player) {
                        scope.track.recording = false;
                        scope.track.empty = false;
                        continueUpdate = false;
                        window.cancelAnimationFrame(analyserId);
                        scope.track.player = player;
                        console.log('player', player);
                        // scope.$digest();
                        // scope.track.player.start();
                    });
                }, 2000);

                // //CALLS RECORD IN RECORD FCT with THIS RUNNING
                // //ADDS Recording scope var to TRUE
                // console.log('e', e, e.toElement);
                // e = e.toElement;
                //    // start recording
                //    console.log('start recording');

                //    if (!audioRecorder)
                //        return;

                //    e.classList.add("recording");
                //    audioRecorder.clear();
                //    audioRecorder.record();

                //    window.setTimeout(function() {
                // audioRecorder.stop();
                // e.classList.remove("recording");
                // audioRecorder.getBuffers( gotBuffers );

                // window.setTimeout(function () {
                // 	scope.tracks[index].rawAudio = window.latestRecording;
                // 	scope.tracks[index].rawImage = window.latestRecordingImage;
                // 	console.log('trackss', scope.tracks);
                // 	// wavArray.push(window.latestRecording);
                // 	// console.log('wavArray', wavArray);
                // }, 500);

                //    }, 2000);
            };
<<<<<<< HEAD
            scope.preview = function () {
                console.log(scope.track.player);
                scope.track.player.start();
            };

            scope.changeWetness = function (effect, amount) {
                console.log(effect);
                console.log(amount);

                effect.wet.value = amount / 1000;
            };
        }

=======
        }
>>>>>>> 4c268f3441715de142d85dd6d54fde54e1568b45
    };
});

// $scope.onFileSelect = function(image) {
//     if (angular.isArray(image)) {
//         image = image[0];
//     }

//     // This is how I handle file types in client side
//     if (image.type !== 'image/png' && image.type !== 'image/jpeg') {
//         alert('Only PNG and JPEG are accepted.');
//         return;
//     }

//     $scope.uploadInProgress = true;
//     $scope.uploadProgress = 0;

//     $scope.upload = $upload.upload({
//         url: '/upload/image',
//         method: 'POST',
//         file: image
//     }).progress(function(event) {
//         $scope.uploadProgress = Math.floor(event.loaded / event.total);
//         $scope.$apply();
//     }).success(function(data, status, headers, config) {
//         $scope.uploadInProgress = false;
//         // If you need uploaded file immediately
//         $scope.uploadedImage = JSON.parse(data);     
//     }).error(function(err) {
//         $scope.uploadInProgress = false;
//         console.log('Error uploading file: ' + err.message || err);
//     });
// };
<<<<<<< HEAD
// angular.element(canvasRow[i]).append($compile("<canvas width='198' height='98' id='wavedisplay' class='item' style='position: absolute;' draggable></canvas>")(scope));

// var track = scope.track;

// console.log("locations", track.locations);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwibG9naW4vbG9naW4uanMiLCJob21lL2hvbWUuanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9OZXdQcm9qZWN0Q29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9UaW1lbGluZUNvbnRyb2xsZXIuanMiLCJjb21tb24vZmFjdG9yaWVzL0FuYWx5c2VyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Qcm9qZWN0RmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9SYW5kb21HcmVldGluZ3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLElBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7QUFJQSxjQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7QUFFQSxZQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7O0FBR0EsYUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbERBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsc0JBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxNQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7QUFDQSxzQkFBQSxFQUFBLHNCQUFBO0FBQ0Esd0JBQUEsRUFBQSx3QkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGFBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7U0FDQSxDQUFBO0FBQ0EsZUFBQTtBQUNBLHlCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTs7Ozs7O0FBTUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQTs7Ozs7QUFLQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBO0FDeElBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxjQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsVUFBQTtBQUNBLG1CQUFBLEVBQUEsc0JBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBR0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7Q0FLQSxDQUFBLENBQUE7O0FDdkJBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEscUJBQUE7QUFDQSxtQkFBQSxFQUFBLHlCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLDBCQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7cUJBRUE7aUJBQ0EsQ0FBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxFQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsbUNBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO2lCQUNBLE1BQUE7QUFDQSx5QkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7aUJBQ0E7O0FBRUEsc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLGlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBOzs7O0FBSUEsY0FBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQSxFQUFBLEVBQUEsVUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxFQUFBLE1BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7QUFJQSx1QkFBQSxDQUFBLGVBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxZQUFBLEtBQUEsR0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxNQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEtBQUEsQ0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsbUJBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO1NBRUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ3pKQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBO0FBQ0EsbUJBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsWUFBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLHFCQUFBO0FBQ0EsbUJBQUEsRUFBQSwwQkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7OztBQUdBLFlBQUEsRUFBQTtBQUNBLHdCQUFBLEVBQUEsSUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx3QkFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEscUJBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxXQUFBO0FBQ0EsbUJBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsdUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsS0FDQSxNQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0tBQ0E7Ozs7Ozs7OztBQUFBLEtBQUE7Q0FTQSxDQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsVUFBQSxDQUFBLG9CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLEVBZ0NBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLHVCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxNQUFBLENBQUEsWUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBLEtBQ0EsTUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Q0FLQSxDQUFBLENBQUE7QUNoR0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxzQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNoQkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxvQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBOztBQUVBLFFBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFHQSxjQUFBLENBQUEsY0FBQSxDQUFBLDBCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLDBCQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7cUJBRUE7aUJBQ0EsQ0FBQTtBQUNBLHFCQUFBLENBQUEsTUFBQSxHQUFBLFlBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsaUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxTQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQTs7QUFFQSx1QkFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7S0FFQSxDQUFBLENBQUE7Ozs7Ozs7O0FBUUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLENBQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsU0FBQSxHQUFBLENBQUEsQ0FBQSxTQUFBLENBQUE7OztBQUdBLGVBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxhQUFBLEVBQ0EsT0FBQTs7QUFFQSxTQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLHlCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTs7YUFHQSxFQUFBLEdBQUEsQ0FBQSxD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QUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFdBQUE7QUFDQSx1QkFBQSxFQUFBLGVBQUE7QUFDQSw2QkFBQSxFQUFBLHFCQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzdDQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsZ0JBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxRQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsZUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBOzs7O1NBSUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxjQUFBO0FBQ0EsbUJBQUEsRUFB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QUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUEsQ0FBQTthQUVBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxvQkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxvQkFBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7Ozs7QUFJQSx3QkFBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlB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QSxHQUFBLEdBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7aUJBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsU0FBQSxTQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxHQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxnQkFBQSxHQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLHFCQUFBLEVBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGlCQUFBLEdBQUEsU0FBQSxpQkFBQSxDQUFBLE1BQUEsRUFBQSxjQUFBLEVBQUE7O0FBRUEsWUFBQSxjQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxzQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO2FBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtTQUVBOztBQUVBLHNCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsR0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLGdCQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTthQUNBLEVBQUEsU0FBQSxDQUFBLENBQUE7Ozs7Ozs7U0FRQSxDQUFBLENBQUE7S0FFQSxDQUFBO0FBQ0EsV0FBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7QUFDQSx1QkFBQSxFQUFBLGVBQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDOUVBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxRQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxlQUFBLE1BQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxnQkFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxJQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxlQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsR0FBQSxRQUFBLElBQUEsUUFBQSxHQUFBLEtBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLGVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLGtCQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsTUFBQSxDQUFBOztBQUVBLGtCQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLEdBQUE7QUFDQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxPQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxhQUFBLEVBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLG9CQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsY0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3BEQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLHdCQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBO0FBQ0Esc0JBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBO0FBQ0EsZ0JBQUEsRUFBQSxrQkFBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLHNCQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBO2FBQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTs7QUFFQSx1QkFBQSxFQUFBLDJCQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUE7QUFDQSxzQkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDMUJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTs7QUFFQSxZQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBLFlBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFlBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7QUFXQSxtQkFBQSxLQUFBLENBQUE7U0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxnQkFBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQTtTQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7S0FFQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQUEsU0FDQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUE7O0FBRUEsZ0JBQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLEdBQUEsTUFBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBOztBQUVBLG9CQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxDQUFB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QUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO1NBRUE7O0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzVEQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseURBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxrQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxvREFBQTtBQUNBLGtCQUFBLEVBQUEsNEJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsNEJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTs7S0FFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBOztLQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUMxQkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQSxlQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseURBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLFFBQUEsR0FBQSxlQUFBLENBQUEsaUJBQUEsRUFBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDWEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsdUNBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsZUFBQSxHQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFlBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBOztBQUVBLHdCQUFBLGFBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQTs7QUFFQSx5QkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLGFBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSw0QkFBQSxhQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsT0FBQSxFQUFBO0FBQ0EsbUNBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSx5SEFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQTt5QkFDQTtxQkFDQTtpQkFDQTthQUNBLEVBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxpQkFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTthQU1BLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxRQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBLG9CQUFBLGNBQUEsR0FBQSxJQUFBLENBQUE7OztBQUdBLG9CQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLGVBQUEsR0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EseUJBQUEsTUFBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGdDQUFBLENBQUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxtQ0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLG1DQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLG1DQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsR0FBQSxPQUFBLENBQUE7OztBQUdBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsNEJBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLDRCQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSw2QkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFDQSxTQUFBLElBQUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGlDQUFBLEdBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLDRCQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsdUNBQUEsQ0FBQSxTQUFBLEdBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtxQkFDQTtBQUNBLHdCQUFBLGNBQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtxQkFDQTtpQkFDQTs7QUFHQSwwQkFBQSxDQUFBLFlBQUE7O0FBRUEsMkJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsK0JBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0Esc0NBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSw4QkFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOzs7cUJBR0EsQ0FBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzthQWlDQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBO1NBRUE7O0tBR0EsQ0FBQTtDQUNBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnbmdTdG9yYWdlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zaWdudXAgPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNyZWRlbnRpYWxzKTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4oIG9uU3VjY2Vzc2Z1bExvZ2luIClcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBzaWdudXAgY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24obG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZS5sYW5kaW5nJyx7XG4gICAgXHR1cmw6ICcvbGFuZGluZycsXG4gICAgXHR0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbGFuZGluZy5odG1sJ1xuICAgIH0pXG59KTtcblxuXG5hcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlKSB7XG5cdFxuXHQkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgIH07XG5cbiAgICBcblxuXG59KTtcblxuXG4iLCIndXNlIHN0cmljdCc7XG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9qZWN0Jywge1xuICAgICAgICB1cmw6ICcvcHJvamVjdC86cHJvamVjdElEJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9qZWN0L3Byb2plY3QuaHRtbCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignUHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEF1dGhTZXJ2aWNlKSB7XG5cbiAgdmFyIG1heE1lYXN1cmUgPSAwO1xuXG4gIC8vIG51bWJlciBvZiBtZWFzdXJlcyBvbiB0aGUgdGltZWxpbmVcbiAgJHNjb3BlLm51bU1lYXN1cmVzID0gXy5yYW5nZSgwLCA2MCk7XG5cbiAgLy8gbGVuZ3RoIG9mIHRoZSB0aW1lbGluZVxuICAkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XG5cblx0Ly9Jbml0aWFsaXplIHJlY29yZGVyIG9uIHByb2plY3QgbG9hZFxuXHRSZWNvcmRlckZjdC5yZWNvcmRlckluaXQoKS50aGVuKGZ1bmN0aW9uIChyZXRBcnIpIHtcblx0XHQkc2NvcGUucmVjb3JkZXIgPSByZXRBcnJbMF07XG5cdFx0JHNjb3BlLmFuYWx5c2VyTm9kZSA9IHJldEFyclsxXTtcblx0fSkuY2F0Y2goZnVuY3Rpb24gKGUpe1xuICAgICAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBhdWRpbycpO1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTtcblxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XG5cdCRzY29wZS5uYW1lQ2hhbmdpbmcgPSBmYWxzZTtcblx0JHNjb3BlLnRyYWNrcyA9IFtdO1xuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XG5cdCRzY29wZS5wcm9qZWN0SWQgPSAkc3RhdGVQYXJhbXMucHJvamVjdElEO1xuXHQkc2NvcGUucG9zaXRpb24gPSAwO1xuXG5cdFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJHNjb3BlLnByb2plY3RJZCkudGhlbihmdW5jdGlvbiAocHJvamVjdCkge1xuXHRcdHZhciBsb2FkZWQgPSAwO1xuXHRcdGNvbnNvbGUubG9nKCdQUk9KRUNUJywgcHJvamVjdCk7XG5cdFx0JHNjb3BlLnByb2plY3ROYW1lID0gcHJvamVjdC5uYW1lO1xuXG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xuXHRcdFx0cHJvamVjdC50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcblx0XHRcdFx0dmFyIGRvbmVMb2FkaW5nID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGxvYWRlZCsrO1xuXHRcdFx0XHRcdGlmKGxvYWRlZCA9PT0gcHJvamVjdC50cmFja3MubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHRcdHZhciBtYXggPSBNYXRoLm1heC5hcHBseShudWxsLCB0cmFjay5sb2NhdGlvbnMpO1xuXHRcdFx0XHRpZihtYXggKyAyID4gbWF4TWVhc3VyZSkgbWF4TWVhc3VyZSA9IG1heCArIDI7XG5cdFx0XHRcdFxuXHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xuXHRcdFx0XHR0cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcblx0XHRcdFx0dHJhY2sucGxheWVyID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGRvbmVMb2FkaW5nKTtcblx0XHRcdFx0Ly9pbml0IGVmZmVjdHMsIGNvbm5lY3QsIGFuZCBhZGQgdG8gc2NvcGVcblx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoKTtcblx0XHRcdFx0dHJhY2sucGxheWVyLmNvbm5lY3QodHJhY2suZWZmZWN0c1JhY2tbMF0pO1xuXG5cdFx0XHRcdGlmKHRyYWNrLmxvY2F0aW9ucy5sZW5ndGgpIHtcblx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QuYWRkTG9vcFRvVGltZWxpbmUodHJhY2sucGxheWVyLCB0cmFjay5sb2NhdGlvbnMpO1xuXHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHNjb3BlLm1heE1lYXN1cmUgPSAxNztcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcblx0XHRcdFx0dmFyIG9iaiA9IHt9O1xuXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xuXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XG5cdFx0XHRcdG9iai5vblRpbWVsaW5lID0gZmFsc2U7XG5cdFx0XHRcdG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcblx0XHRcdFx0b2JqLmxvY2F0aW9uID0gW107XG5cdFx0XHRcdCRzY29wZS50cmFja3MucHVzaChvYmopO1xuICBcdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9keW5hbWljYWxseSBzZXQgbWVhc3VyZXNcblx0XHQvL2lmIGxlc3MgdGhhbiAxNiBzZXQgMTggYXMgbWluaW11bVxuXHRcdCRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xuXHRcdGlmKG1heE1lYXN1cmUgPCAxNikgbWF4TWVhc3VyZSA9IDE4O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4TWVhc3VyZTsgaSsrKSB7XG5cdFx0XHQkc2NvcGUubnVtTWVhc3VyZXMucHVzaChpKTtcblx0XHR9XG5cdFx0Y29uc29sZS5sb2coJ01FQVNVUkVTJywgJHNjb3BlLm51bU1lYXN1cmVzKTtcblxuXG5cblx0XHRUb25lVGltZWxpbmVGY3QuY3JlYXRlVHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lID0gbWV0cm9ub21lO1xuXHRcdH0pO1xuXHRcdFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xuXG5cdH0pO1xuXG5cdCRzY29wZS5kcm9wSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdHZhciB0cmFjayA9IHNjb3BlLnRyYWNrc1tpbmRleF07XG5cblx0XHRjb25zb2xlLmxvZyh0cmFjayk7XG5cdH1cblxuXHQkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cblx0fTtcblxuXHQkc2NvcGUucGxheSA9IGZ1bmN0aW9uICgpIHtcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcblx0fVxuXHQkc2NvcGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXTtcblx0XHRjb25zb2xlLmxvZygnUE9TJywgJHNjb3BlLnBvc2l0aW9uKTtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICgkc2NvcGUucG9zaXRpb24gKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4Jztcblx0XHRUb25lLlRyYW5zcG9ydC5wYXVzZSgpO1xuXHR9XG5cdCRzY29wZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xuXHRcdCRzY29wZS5wb3NpdGlvbiA9IDA7XG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAnMzAwcHgnO1xuXHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcblx0fVxuXHQkc2NvcGUubmFtZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld05hbWUpIHtcblx0XHRjb25zb2xlLmxvZygnU0hPVyBJTlBVVCcsIG5ld05hbWUpO1xuXHRcdCRzY29wZS5uYW1lQ2hhbmdpbmcgPSBmYWxzZTtcblx0fVxuXG5cdCRzY29wZS50b2dnbGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYoJHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPT09IDApIHtcblx0XHRcdCRzY29wZS5tZXRyb25vbWUudm9sdW1lLnZhbHVlID0gLTEwMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAwO1xuXHRcdH1cblx0fVxuXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoJHNjb3BlLnRyYWNrcykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XG5cbiAgICB9KTtcbiAgfTtcbiAgJHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VyUHJvZmlsZScsIHtcbiAgICAgICAgdXJsOiAnL3VzZXJwcm9maWxlLzp0aGVJRCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci91c2VycHJvZmlsZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJyxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuYXJ0aXN0SW5mbycsIHtcbiAgICAgICAgdXJsOiAnL2luZm8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvaW5mby5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJJbmZvQ29udHJvbGxlcidcbiAgICB9KVxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUucHJvamVjdCcsIHtcbiAgICAgICAgdXJsOiAnL3Byb2plY3RzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2plY3RzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlclByb2plY3RDb250cm9sbGVyJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgdXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24oYVVzZXIpe1xuICAgICAgICAkc2NvcGUudGhlVXNlciA9IGFVc2VyO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmRpc3BsYXlTZXR0aW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcbiAgICAgICAgZWxzZSAkc2NvcGUuc2hvd1NldHRpbmdzID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnNob3dTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLy8gJHNjb3BlLmRpc3BsYXlGb3JrcyA9IGZ1bmN0aW9uKCl7XG4gICAgLy8gICAgIHVzZXJGYWN0b3J5LmdldEZvcmtzKCRzY29wZS50aGVVc2VyLl9pZCkudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAvLyAgICAgICAgICRzY29wZS5mb3JrcyA9IGRhdGE7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUuZm9ya3MpO1xuICAgIC8vICAgICB9KTtcbiAgICAvLyB9XG5cbn0pO1xuYXBwLmNvbnRyb2xsZXIoJ1VzZXJJbmZvQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSwgQXV0aFNlcnZpY2UsIHVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcblxuICAgICAgICAvLyAkc2NvcGUub25GaWxlU2VsZWN0ID0gZnVuY3Rpb24oaW1hZ2UpIHtcbiAgICAgICAgLy8gICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoaW1hZ2UpKSB7XG4gICAgICAgIC8vICAgICAgICAgaW1hZ2UgPSBpbWFnZVswXTtcbiAgICAgICAgLy8gICAgIH1cblxuICAgICAgICAvLyAgICAgLy8gVGhpcyBpcyBob3cgSSBoYW5kbGUgZmlsZSB0eXBlcyBpbiBjbGllbnQgc2lkZVxuICAgICAgICAvLyAgICAgaWYgKGltYWdlLnR5cGUgIT09ICdpbWFnZS9wbmcnICYmIGltYWdlLnR5cGUgIT09ICdpbWFnZS9qcGVnJykge1xuICAgICAgICAvLyAgICAgICAgIGFsZXJ0KCdPbmx5IFBORyBhbmQgSlBFRyBhcmUgYWNjZXB0ZWQuJyk7XG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyAgICAgfVxuXG4gICAgICAgIC8vICAgICAkc2NvcGUudXBsb2FkSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgIC8vICAgICAkc2NvcGUudXBsb2FkUHJvZ3Jlc3MgPSAwO1xuXG4gICAgICAgIC8vICAgICAkc2NvcGUudXBsb2FkID0gJHVwbG9hZC51cGxvYWQoe1xuICAgICAgICAvLyAgICAgICAgIHVybDogJy91cGxvYWQvaW1hZ2UnLFxuICAgICAgICAvLyAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAvLyAgICAgICAgIGZpbGU6IGltYWdlXG4gICAgICAgIC8vICAgICB9KS5wcm9ncmVzcyhmdW5jdGlvbihldmVudCkge1xuICAgICAgICAvLyAgICAgICAgICRzY29wZS51cGxvYWRQcm9ncmVzcyA9IE1hdGguZmxvb3IoZXZlbnQubG9hZGVkIC8gZXZlbnQudG90YWwpO1xuICAgICAgICAvLyAgICAgICAgICRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgLy8gICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgLy8gICAgICAgICAkc2NvcGUudXBsb2FkSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICAvLyAgICAgICAgIC8vIElmIHlvdSBuZWVkIHVwbG9hZGVkIGZpbGUgaW1tZWRpYXRlbHkgXG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLnVwbG9hZGVkSW1hZ2UgPSBKU09OLnBhcnNlKGRhdGEpOyAgICAgIFxuICAgICAgICAvLyAgICAgfSkuZXJyb3IoZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLnVwbG9hZEluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgdXBsb2FkaW5nIGZpbGU6ICcgKyBlcnIubWVzc2FnZSB8fCBlcnIpO1xuICAgICAgICAvLyAgICAgfSk7XG4gICAgICAgIC8vIH07XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsIHVzZXJGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUucHJvamVjdHM7XG5cbiAgICAvL3R1cm4gdGhpcyBpbnRvIGEgcHJvbWlzZSBzbyB5b3UgZ2V0IGxvZ2dlZCBpbiB1c2VyIGFuZCB0aGVuIHRoZSBwcm9qZWN0cyBvZiB0aGF0IHVzZXJcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcbiAgICAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcbiAgICAgICAgdXNlckZhY3RvcnkuZ2V0QWxsUHJvamVjdHMoJHNjb3BlLnRoZVVzZXIuX2lkKS50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgJHNjb3BlLnByb2plY3RzID0gZGF0YTtcbiAgICAgICAgICAgIGlmKCRzY29wZS5zaG93UHJvamVjdHMpICRzY29wZS5zaG93UHJvamVjdHMgPSBmYWxzZTtcbiAgICAgICAgICAgIGVsc2UgJHNjb3BlLnNob3dQcm9qZWN0cyA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHJvamVjdHMpO1xuICAgIH0pO1xuICAgIH0pO1xuICAgICAgICBcbiAgXG4gICAgXG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdOZXdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFByb2plY3RGY3QsICRzdGF0ZSl7XG5cdCRzY29wZS51c2VyO1xuXG5cdCBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGlzJywgJHNjb3BlLnRoZVVzZXIudXNlcm5hbWUpXG4gICAgfSk7XG5cblx0ICRzY29wZS5uZXdQcm9qZWN0QnV0ID0gZnVuY3Rpb24oKXtcblx0IFx0UHJvamVjdEZjdC5uZXdQcm9qZWN0KCRzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHByb2plY3RJZCl7XG5cdCBcdFx0Y29uc29sZS5sb2coJ1N1Y2Nlc3MgaXMnLCBwcm9qZWN0SWQpXG5cdFx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBwcm9qZWN0SWR9KTtcdCBcdFxuXHRcdH0pXG5cblx0IH1cblxufSkiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcbiAgXG4gIHZhciB3YXZBcnJheSA9IFtdO1xuICBcbiAgJHNjb3BlLm51bU1lYXN1cmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgNjA7IGkrKykge1xuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xuICB9XG5cbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xuICAkc2NvcGUudHJhY2tzID0gW107XG4gICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcblxuXG4gIFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJzU1OTRjMjBhZDA3NTljZDQwY2U1MWUxNCcpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICBjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xuXG4gICAgICBpZiAocHJvamVjdC50cmFja3MubGVuZ3RoKSB7XG4gICAgICAgIHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICAgICAgaWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJhY2sucGxheWVyID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGRvbmVMb2FkaW5nKTtcbiAgICAgICAgICAgIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9ucyk7XG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjsgaSsrKSB7XG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgIG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcbiAgICAgICAgICBvYmoubG9jYXRpb25zID0gW107XG4gICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgVG9uZVRpbWVsaW5lRmN0LmdldFRyYW5zcG9ydChwcm9qZWN0LmVuZE1lYXN1cmUpO1xuICAgICAgVG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XG5cbiAgfSk7XG5cbiAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihhVXNlcil7XG4gIC8vICAgICAkc2NvcGUudGhlVXNlciA9IGFVc2VyO1xuICAvLyAgICAgLy8gJHN0YXRlUGFyYW1zLnRoZUlEID0gYVVzZXIuX2lkXG4gIC8vICAgICBjb25zb2xlLmxvZyhcImlkXCIsICRzdGF0ZVBhcmFtcyk7XG4gIC8vIH0pO1xuXG4gICRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoZSwgaW5kZXgpIHtcblxuICBcdGUgPSBlLnRvRWxlbWVudDtcblxuICAgICAgICAvLyBzdGFydCByZWNvcmRpbmdcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0IHJlY29yZGluZycpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFhdWRpb1JlY29yZGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGUuY2xhc3NMaXN0LmFkZChcInJlY29yZGluZ1wiKTtcbiAgICAgICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xuICAgICAgICBhdWRpb1JlY29yZGVyLnJlY29yZCgpO1xuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1ZGlvUmVjb3JkZXIuc3RvcCgpO1xuICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcbiAgICAgICAgICBcbiAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XG4gICAgICAgICAgICAvLyAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcblxuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgXG4gICAgICAgIH0sIDIwMDApO1xuXG4gIH1cblxuICAkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cbiAgfTtcblxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgdmFyIGF3c1RyYWNrcyA9ICRzY29wZS50cmFja3MuZmlsdGVyKGZ1bmN0aW9uKHRyYWNrLGluZGV4KXtcbiAgICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pe1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIFJlY29yZGVyRmN0LnNlbmRUb0FXUyhhd3NUcmFja3MsICc1NTk1YTdmYWFhOTAxYWQ2MzIzNGY5MjAnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAvLyB3YXZlIGxvZ2ljXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcblxuICAgIH0pO1xuICB9O1xuXG5cblx0XG5cblxufSk7XG5cblxuIiwiYXBwLmZhY3RvcnkoJ0FuYWx5c2VyRmN0JywgZnVuY3Rpb24oKSB7XG5cblx0dmFyIHVwZGF0ZUFuYWx5c2VycyA9IGZ1bmN0aW9uIChhbmFseXNlckNvbnRleHQsIGFuYWx5c2VyTm9kZSwgY29udGludWVVcGRhdGUpIHtcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdVUERBVEUnKVxuXHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xuXHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XG5cdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcblxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxuXG5cdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XG5cdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XG5cdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XG5cblx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcblx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XG5cdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxuXHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcblx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xuXHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XG5cdFx0XHR9XG5cdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XG5cdH1cblxuXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xuXHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggYW5hbHlzZXJJZCApO1xuXHR9XG5cdHJldHVybiB7XG5cdFx0dXBkYXRlQW5hbHlzZXJzOiB1cGRhdGVBbmFseXNlcnMsXG5cdFx0Y2FuY2VsQW5hbHlzZXJVcGRhdGVzOiBjYW5jZWxBbmFseXNlclVwZGF0ZXNcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1Byb2plY3RGY3QnLCBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0UHJvamVjdEluZm8gPSBmdW5jdGlvbiAocHJvamVjdElkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvamVjdHMvJyArIHByb2plY3RJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBjcmVhdGVBRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMvJywgcHJvamVjdCkudGhlbihmdW5jdGlvbihmb3JrKXtcbiAgICBcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzLycsIGZvcmsuZGF0YSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgXHRcdH0pO1xuICAgIFx0fSk7XG4gICAgfVxuICAgIHZhciBuZXdQcm9qZWN0ID0gZnVuY3Rpb24odXNlcil7XG4gICAgXHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9wcm9qZWN0cycse293bmVyOnVzZXIuX2lkfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cbiAgICBcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgXHRcdC8vIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvcHJvamVjdHMvdXNlcnByb2plY3QnLHtvd25lcjogdXNlci5faWQsIHByb2plY3Q6cmVzcG9uc2UuZGF0YX0pLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgXHRcdC8vIFx0Y29uc29sZS5sb2codXNlci5kYXRhKVxuICAgIFx0XHQvLyB9KVxuICAgIFx0fSlcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRQcm9qZWN0SW5mbzogZ2V0UHJvamVjdEluZm8sXG4gICAgICAgIGNyZWF0ZUFGb3JrOiBjcmVhdGVBRm9yayxcbiAgICAgICAgbmV3UHJvamVjdDogbmV3UHJvamVjdFxuICAgIH07XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4gICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbiAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbiAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbiAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4gICAgICAgICc6RCdcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXG4gICAgICAgIGdldFJhbmRvbUdyZWV0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRnJvbUFycmF5KGdyZWV0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdSZWNvcmRlckZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgQXV0aFNlcnZpY2UsICRxLCBUb25lVHJhY2tGY3QsIEFuYWx5c2VyRmN0KSB7XG5cbiAgICB2YXIgcmVjb3JkZXJJbml0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICAgICAgICAgIHZhciBhdWRpb0NvbnRleHQgPSBuZXcgQ29udGV4dCgpO1xuICAgICAgICAgICAgdmFyIHJlY29yZGVyO1xuXG4gICAgICAgICAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSAoXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IG5hdmlnYXRvci5tb3pDYW5jZWxBbmltYXRpb25GcmFtZTtcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSlcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgICAgICAgICAvLyBhc2sgZm9yIHBlcm1pc3Npb25cbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXVkaW9cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWFuZGF0b3J5XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nRWNob0NhbmNlbGxhdGlvblwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0F1dG9HYWluQ29udHJvbFwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ05vaXNlU3VwcHJlc3Npb25cIjogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dIaWdocGFzc0ZpbHRlclwiOiBcImZhbHNlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3B0aW9uYWxcIjogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dFBvaW50ID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIEF1ZGlvTm9kZSBmcm9tIHRoZSBzdHJlYW0uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbEF1ZGlvSW5wdXQgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdWRpb0lucHV0ID0gcmVhbEF1ZGlvSW5wdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdWRpb0lucHV0LmNvbm5lY3QoaW5wdXRQb2ludCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbmFseXNlciBub2RlXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXNlck5vZGUuZmZ0U2l6ZSA9IDIwNDg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIGFuYWx5c2VyTm9kZSApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSByZWNvcmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoIGlucHV0UG9pbnQgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB6ZXJvR2FpbiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5nYWluLnZhbHVlID0gMC4wO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCB6ZXJvR2FpbiApO1xuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uY29ubmVjdCggYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoW3JlY29yZGVyLCBhbmFseXNlck5vZGVdKTtcblxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0Vycm9yIGdldHRpbmcgYXVkaW8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIHJlY29yZFN0YXJ0ID0gZnVuY3Rpb24gKHJlY29yZGVyKSB7XG4gICAgICAgIHJlY29yZGVyLmNsZWFyKCk7XG4gICAgICAgIHJlY29yZGVyLnJlY29yZCgpO1xuICAgIH1cblxuICAgIHZhciByZWNvcmRTdG9wID0gZnVuY3Rpb24gKGluZGV4LCByZWNvcmRlcikge1xuICAgICAgICByZWNvcmRlci5zdG9wKCk7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgLy8gZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xuICAgICAgICAgICAgcmVjb3JkZXIuZ2V0QnVmZmVycyhmdW5jdGlvbiAoYnVmZmVycykge1xuICAgICAgICAgICAgICAgIC8vZGlzcGxheSB3YXYgaW1hZ2VcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZWRpc3BsYXlcIiArICBpbmRleCApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNhbnZhcyk7XG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMzAwLCAxMDAsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBidWZmZXJzWzBdICk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTtcblxuICAgICAgICAgICAgICAgIC8vIHRoZSBPTkxZIHRpbWUgZ290QnVmZmVycyBpcyBjYWxsZWQgaXMgcmlnaHQgYWZ0ZXIgYSBuZXcgcmVjb3JkaW5nIGlzIGNvbXBsZXRlZCAtIFxuICAgICAgICAgICAgICAgIC8vIHNvIGhlcmUncyB3aGVyZSB3ZSBzaG91bGQgc2V0IHVwIHRoZSBkb3dubG9hZC5cbiAgICAgICAgICAgICAgICByZWNvcmRlci5leHBvcnRXQVYoIGZ1bmN0aW9uICggYmxvYiApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9uZWVkcyBhIHVuaXF1ZSBuYW1lXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlY29yZGVyLnNldHVwRG93bmxvYWQoIGJsb2IsIFwibXlSZWNvcmRpbmcwLndhdlwiICk7XG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIGxvb3AgdGltZVxuICAgICAgICAgICAgICAgICAgICBUb25lVHJhY2tGY3QubG9vcEluaXRpYWxpemUoYmxvYiwgaW5kZXgsIFwibXlSZWNvcmRpbmcwLndhdlwiKS50aGVuKHJlc29sdmUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgXG5cbiAgICBcbiAgICB2YXIgY29udmVydFRvQmFzZTY0ID0gZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICAgIGlmKHRyYWNrLnJhd0F1ZGlvKSB7XG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwodHJhY2sucmF3QXVkaW8pO1xuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG5cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VuZFRvQVdTOiBmdW5jdGlvbiAodHJhY2tzQXJyYXksIHByb2plY3RJZCkge1xuXG4gICAgICAgICAgICB2YXIgcmVhZFByb21pc2VzID0gdHJhY2tzQXJyYXkubWFwKGNvbnZlcnRUb0Jhc2U2NCk7XG5cbiAgICAgICAgICAgIHJldHVybiAkcS5hbGwocmVhZFByb21pc2VzKS50aGVuKGZ1bmN0aW9uIChzdG9yZURhdGEpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RvcmVEYXRhJywgc3RvcmVEYXRhKTtcblxuICAgICAgICAgICAgICAgIHRyYWNrc0FycmF5LmZvckVhY2goZnVuY3Rpb24gKHRyYWNrLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYWNrLnJhd0F1ZGlvID0gc3RvcmVEYXRhW2ldO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvYXdzLycsIHsgdHJhY2tzIDogdHJhY2tzQXJyYXksIHByb2plY3RJZCA6IHByb2plY3RJZCB9KVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBpbiBzZW5kVG9BV1NGYWN0b3J5JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7IFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgcmVjb3JkZXJJbml0OiByZWNvcmRlckluaXQsXG4gICAgICAgIHJlY29yZFN0YXJ0OiByZWNvcmRTdGFydCxcbiAgICAgICAgcmVjb3JkU3RvcDogcmVjb3JkU3RvcFxuICAgIH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdUb25lVGltZWxpbmVGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XG5cblx0dmFyIGNyZWF0ZVRyYW5zcG9ydCA9IGZ1bmN0aW9uIChsb29wRW5kKSB7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcCA9IHRydWU7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wU3RhcnQgPSAnMG0nO1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQubG9vcEVuZCA9IGxvb3BFbmQudG9TdHJpbmcoKSArICdtJztcblx0XHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcblxuXHRcdFx0Y3JlYXRlTWV0cm9ub21lKCkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XG5cdFx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR2YXIgcG9zQXJyID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKTtcblx0XHRcdFx0XHR2YXIgbGVmdFBvcyA9ICgocGFyc2VJbnQocG9zQXJyWzBdKSAqIDIwMCApICsgKHBhcnNlSW50KHBvc0FyclsxXSkgKiA1MCkgKyAzMDApLnRvU3RyaW5nKCkgKyAncHgnO1xuXHRcdFx0XHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSBsZWZ0UG9zO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcblx0XHRcdFx0XHRtZXRyb25vbWUuc3RhcnQoKTtcblx0XHRcdFx0fSwgJzRuJyk7XG5cdFx0XHRcdHJldHVybiByZXNvbHZlKG1ldHJvbm9tZSk7XG5cdFx0XHR9KTtcbiAgICAgICAgfSk7XG5cdH07XG5cblx0dmFyIGNoYW5nZUJwbSA9IGZ1bmN0aW9uIChicG0pIHtcblx0XHRUb25lLlRyYW5zcG9ydC5icG0udmFsdWUgPSBicG07XG5cdFx0cmV0dXJuIFRvbmUuVHJhbnNwb3J0O1xuXHR9O1xuXG5cdHZhciBzdG9wQWxsID0gZnVuY3Rpb24gKHRyYWNrcykge1xuXHRcdHRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuXHRcdFx0dHJhY2sucGxheWVyLnN0b3AoKTtcblx0XHR9KTtcblx0fTtcblx0dmFyIGNyZWF0ZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgdmFyIG1ldCA9IG5ldyBUb25lLlBsYXllcihcIi9hcGkvd2F2L0NsaWNrMS53YXZcIiwgZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIFx0Y29uc29sZS5sb2coJ0xPQURFRCcpO1xuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShtZXQpO1xuXHQgICAgICAgIH0pLnRvTWFzdGVyKCk7XG4gICAgICAgIH0pO1xuXHR9O1xuXG5cdHZhciBhZGRMb29wVG9UaW1lbGluZSA9IGZ1bmN0aW9uIChwbGF5ZXIsIHN0YXJ0VGltZUFycmF5KSB7XG5cblx0XHRpZihzdGFydFRpbWVBcnJheS5pbmRleE9mKDApID09PSAtMSkge1xuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdFx0XHR9LCBcIjBtXCIpXG5cblx0XHR9XG5cblx0XHRzdGFydFRpbWVBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChzdGFydFRpbWUpIHtcblxuXHRcdFx0dmFyIHN0YXJ0VGltZSA9IHN0YXJ0VGltZS50b1N0cmluZygpICsgJ20nO1xuXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTdGFydCcsIFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcblx0XHRcdFx0cGxheWVyLnN0b3AoKTtcblx0XHRcdFx0cGxheWVyLnN0YXJ0KCk7XG5cdFx0XHR9LCBzdGFydFRpbWUpO1xuXG5cdFx0XHQvLyB2YXIgc3RvcFRpbWUgPSBwYXJzZUludChzdGFydFRpbWUuc3Vic3RyKDAsIHN0YXJ0VGltZS5sZW5ndGgtMSkpICsgMSkudG9TdHJpbmcoKSArIHN0YXJ0VGltZS5zdWJzdHIoLTEsMSk7XG5cdFx0XHQvLy8vIGNvbnNvbGUubG9nKCdTVE9QJywgc3RvcCk7XG5cdFx0XHQvLy8vIHRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLy8vIFx0cGxheWVyLnN0b3AoKTtcblx0XHRcdC8vLy8gfSwgc3RvcFRpbWUpO1xuXG5cdFx0fSk7XG5cblx0fTtcbiAgICByZXR1cm4ge1xuICAgICAgICBjcmVhdGVUcmFuc3BvcnQ6IGNyZWF0ZVRyYW5zcG9ydCxcbiAgICAgICAgY2hhbmdlQnBtOiBjaGFuZ2VCcG0sXG4gICAgICAgIGFkZExvb3BUb1RpbWVsaW5lOiBhZGRMb29wVG9UaW1lbGluZSxcbiAgICAgICAgY3JlYXRlTWV0cm9ub21lOiBjcmVhdGVNZXRyb25vbWUsXG4gICAgICAgIHN0b3BBbGw6IHN0b3BBbGxcbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdUb25lVHJhY2tGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XG5cblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xuXHRcdHZhciBwbGF5ZXIgID0gbmV3IFRvbmUuUGxheWVyKHVybCwgZG9uZUZuKTtcblx0XHQvL1RPRE8gLSByZW1vdmUgdG9NYXN0ZXJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcblx0XHQvLyBwbGF5ZXIuc3luYygpO1xuXHRcdHBsYXllci5sb29wID0gdHJ1ZTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0Ly9QQVNTRUQgQSBCTE9CIEZST00gUkVDT1JERVJKU0ZBQ1RPUlkgLSBEUk9QUEVEIE9OIE1FQVNVUkUgMFxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdHZhciBsaW5rID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYXZlXCIraW5kZXgpO1xuXHRcdFx0bGluay5ocmVmID0gdXJsO1xuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2Jztcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmcgPSBibG9iO1xuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZ1VSTCA9IHVybDtcblx0XHRcdHZhciBwbGF5ZXI7XG5cdFx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xuXHRcdFx0fSkudG9NYXN0ZXIoKTtcblx0XHR9KTtcblx0fTtcblxuXHR2YXIgZWZmZWN0c0luaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgY2hvcnVzID0gbmV3IFRvbmUuQ2hvcnVzKCk7XG5cdFx0dmFyIHBoYXNlciA9IG5ldyBUb25lLlBoYXNlcigpO1xuXHRcdHZhciBkaXN0b3J0ID0gbmV3IFRvbmUuRGlzdG9ydGlvbigpO1xuXHRcdHZhciBwaW5ncG9uZyA9IG5ldyBUb25lLlBpbmdQb25nRGVsYXkoKTtcblx0XHRjaG9ydXMud2V0LnZhbHVlID0gMDtcblx0XHRwaGFzZXIud2V0LnZhbHVlID0gMDtcblx0XHRkaXN0b3J0LndldC52YWx1ZSA9IDA7XG5cdFx0cGluZ3Bvbmcud2V0LnZhbHVlID0gMDtcblx0XHRjaG9ydXMuY29ubmVjdChwaGFzZXIpO1xuXHRcdHBoYXNlci5jb25uZWN0KGRpc3RvcnQpO1xuXHRcdGRpc3RvcnQuY29ubmVjdChwaW5ncG9uZyk7XG5cdFx0cGluZ3BvbmcudG9NYXN0ZXIoKTtcblxuXHRcdHJldHVybiBbY2hvcnVzLCBwaGFzZXIsIGRpc3RvcnQsIHBpbmdwb25nXTtcblx0fVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlUGxheWVyOiBjcmVhdGVQbGF5ZXIsXG4gICAgICAgIGxvb3BJbml0aWFsaXplOiBsb29wSW5pdGlhbGl6ZSxcbiAgICAgICAgZWZmZWN0c0luaXRpYWxpemU6IGVmZmVjdHNJbml0aWFsaXplXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgndXNlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XG5cdHJldHVybiB7XG5cdFx0Z2V0QWxsUHJvamVjdHM6IGZ1bmN0aW9uKHVzZXJJRCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCdhcGkvdXNlcnMnLCB7XG5cdFx0XHRcdHBhcmFtczoge19pZDogdXNlcklEfVxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdFx0fSk7XG5cdFx0fSxcdFxuXHRcdGdldEZvcmtzOiBmdW5jdGlvbih1c2VySUQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3Byb2plY3RzJywge1xuXHRcdFx0XHRwYXJhbXM6IHt1c2VyOiB1c2VySUR9XG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Z2V0VXNlclNldHRpbmdzOiBmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXJzJywge1xuXHRcdFx0XHRwYXJhbXM6IHtfaWQ6IHVzZXJJRH1cblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG59KSIsImFwcC5kaXJlY3RpdmUoJ2RyYWdnYWJsZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XG4gICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICBcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xuICAgIFxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9ICdjb3B5TW92ZSc7XG4gICAgICAgIGUuZGF0YVRyYW5zZmVyLnNldERhdGEoJ1RleHQnLCB0aGlzLmlkKTtcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdkcmFnJyk7XG5cbiAgICAgICAgLy8gdmFyIG9iaj0ge1xuICAgICAgICAvLyAgc3RhcnQ6IDgsXG4gICAgICAgIC8vICBlbmQ6MTBcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIHZhciBqPSBKU09OLnN0cmluZ2lmeShvYmopO1xuICAgICAgICAvLyBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKCd5bycsIGopO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlRSQU5TRkVSIERBVEEgSVNcIixKU09OLnBhcnNlKGUuZGF0YVRyYW5zZmVyLmdldERhdGEoJ3lvJykpKTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuICAgICAgZmFsc2VcbiAgICApO1xuICAgIFxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbmQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuICAgICAgZmFsc2VcbiAgICApO1xuXG4gIH1cbn0pO1xuXG5hcHAuZGlyZWN0aXZlKCdkcm9wcGFibGUnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZToge1xuICAgICAgZHJvcDogJyYnIC8vIHBhcmVudFxuICAgIH0sXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgIC8vIGFnYWluIHdlIG5lZWQgdGhlIG5hdGl2ZSBvYmplY3RcbiAgICAgIHZhciBlbCA9IGVsZW1lbnRbMF07XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnbW92ZSc7XG4gICAgICAgICAgLy8gYWxsb3dzIHVzIHRvIGRyb3BcbiAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ292ZXInKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgICAgXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnbGVhdmUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBmYWxzZVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAvLyBTdG9wcyBzb21lIGJyb3dzZXJzIGZyb20gcmVkaXJlY3RpbmcuXG4gICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIFxuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnb3ZlcicpO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhciBpdGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZS5kYXRhVHJhbnNmZXIuZ2V0RGF0YSgnVGV4dCcpKTtcbiAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNhbGwgdGhlIGRyb3AgcGFzc2VkIGRyb3AgZnVuY3Rpb25cbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgfVxuICB9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHZhciBzZXROYXZiYXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXJJRCA9IHVzZXIuX2lkO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAndXNlclByb2ZpbGUoe3RoZUlEOiB1c2VySUR9KScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0TmF2YmFyKCk7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdTaWduIFVwJywgc3RhdGU6ICdzaWdudXAnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAndXNlclByb2ZpbGUnLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0TmF2YmFyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcywgc2V0TmF2YmFyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgncHJvamVjdGRpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ3Byb2plY3RkaXJlY3RpdmVDb250cm9sbGVyJ1xuXHR9O1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3Qpe1xuXG5cdCRzY29wZS5kaXNwbGF5QVByb2plY3QgPSBmdW5jdGlvbihzb21ldGhpbmcpe1xuXHRcdGNvbnNvbGUubG9nKCdUSElORycsIHNvbWV0aGluZyk7XG5cdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogc29tZXRoaW5nLl9pZH0pO1xuXHRcdC8vIGNvbnNvbGUubG9nKFwiZGlzcGxheWluZyBhIHByb2plY3RcIiwgcHJvamVjdElEKTtcblx0fVxuXG5cdCRzY29wZS5tYWtlRm9yayA9IGZ1bmN0aW9uKHByb2plY3Qpe1xuXHRcdGNvbnNvbGUubG9nKCRzdGF0ZVBhcmFtcy50aGVJRCk7XG5cdFx0cHJvamVjdC5vd25lciA9ICRzdGF0ZVBhcmFtcy50aGVJRDtcblx0XHRwcm9qZWN0LmZvcmtJRCA9IHByb2plY3QuX2lkO1xuXHRcdHByb2plY3QuaXNGb3JrZWQgPSB0cnVlO1xuXHRcdGRlbGV0ZSBwcm9qZWN0Ll9pZDtcblx0XHRjb25zb2xlLmxvZyhwcm9qZWN0KTtcblx0XHRQcm9qZWN0RmN0LmNyZWF0ZUFGb3JrKHByb2plY3QpO1xuXHRcdC8vICRzdGF0ZS5nbygncHJvamVjdCcpXG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCJhcHAuZGlyZWN0aXZlKCd4aW1UcmFjaycsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGVQYXJhbXMsICRjb21waWxlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QsIEFuYWx5c2VyRmN0KSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmh0bWwnLFxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXHRcdFx0c2NvcGUuZWZmZWN0V2V0bmVzc2VzID0gWzAsMCwwLDBdO1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbnZhc1Jvdy5sZW5ndGg7IGkrKykge1xuXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XG5cdFxuXHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzQ2xhc3Nlcy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcblx0XHRcdFx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1tpXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBpZD0nd2F2ZWRpc3BsYXknIGNsYXNzPSdpdGVtJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSwgMClcblx0XHRcdHNjb3BlLmRyb3BJblRpbWVsaW5lID0gZnVuY3Rpb24gKGluZGV4KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGluZGV4KTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RSQUNLJywgc2NvcGUudHJhY2spXG5cdFx0XHRcdC8vIGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbaV0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgaWQ9J3dhdmVkaXNwbGF5JyBjbGFzcz0naXRlbScgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcblxuXHRcdFx0XHQvLyB2YXIgdHJhY2sgPSBzY29wZS50cmFjaztcblxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImxvY2F0aW9uc1wiLCB0cmFjay5sb2NhdGlvbnMpO1xuXHRcdFx0fVxuXG5cdFx0XHRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcblx0XHRcdFx0dmFyIHJlY29yZGVyID0gc2NvcGUucmVjb3JkZXI7XG5cdFx0XHRcdHZhciBjb250aW51ZVVwZGF0ZSA9IHRydWU7XG5cblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxuXHRcdCAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYW5hbHlzZXJcIitpbmRleCk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xuXHRcdFx0XHR2YXIgYW5hbHlzZXJJZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gdHJ1ZTtcblx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RhcnQocmVjb3JkZXIpO1xuXHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IHRydWU7XG5cblxuXHRcdFx0XHRmdW5jdGlvbiB1cGRhdGUoKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1VQREFURScpXG5cdFx0XHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xuXHRcdFx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xuXHRcdFx0XHRcdHZhciBudW1CYXJzID0gTWF0aC5yb3VuZCgzMDAgLyBTUEFDSU5HKTtcblx0XHRcdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcblxuXHRcdFx0XHRcdGFuYWx5c2VyTm9kZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnl0ZURhdGEpOyBcblxuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgMzAwLCAxMDApO1xuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xuXHRcdFx0XHRcdHZhciBtdWx0aXBsaWVyID0gYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50IC8gbnVtQmFycztcblxuXHRcdFx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUgPSAwO1xuXHRcdFx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XG5cdFx0XHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcblx0XHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqPCBtdWx0aXBsaWVyOyBqKyspXG5cdFx0XHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcblx0XHRcdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlMiA9IGZyZXFCeXRlRGF0YVtpICogbXVsdGlwbGllcl07XG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xuXHRcdFx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygnU0NPUEUnLCBzY29wZSk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1NDT1BFJywgc2NvcGUudHJhY2sucGxheWVyKTtcblxuXHRcdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0b3AoaW5kZXgsIHJlY29yZGVyKS50aGVuKGZ1bmN0aW9uIChwbGF5ZXIpIHtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNvbnRpbnVlVXBkYXRlID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllciA9IHBsYXllcjtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdwbGF5ZXInLCBwbGF5ZXIpO1xuXHRcdFx0XHRcdFx0Ly8gc2NvcGUuJGRpZ2VzdCgpO1xuXHRcdFx0XHRcdFx0Ly8gc2NvcGUudHJhY2sucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sIDIwMDApO1xuXG5cblxuXHRcdFx0XHQvLyAvL0NBTExTIFJFQ09SRCBJTiBSRUNPUkQgRkNUIHdpdGggVEhJUyBSVU5OSU5HXG5cdFx0XHRcdC8vIC8vQUREUyBSZWNvcmRpbmcgc2NvcGUgdmFyIHRvIFRSVUVcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ2UnLCBlLCBlLnRvRWxlbWVudCk7XG5cdFx0XHRcdC8vIGUgPSBlLnRvRWxlbWVudDtcblx0XHRcdCAvLyAgICAvLyBzdGFydCByZWNvcmRpbmdcblx0XHRcdCAvLyAgICBjb25zb2xlLmxvZygnc3RhcnQgcmVjb3JkaW5nJyk7XG5cdFx0XHQgICAgXG5cdFx0XHQgLy8gICAgaWYgKCFhdWRpb1JlY29yZGVyKVxuXHRcdFx0IC8vICAgICAgICByZXR1cm47XG5cblx0XHRcdCAvLyAgICBlLmNsYXNzTGlzdC5hZGQoXCJyZWNvcmRpbmdcIik7XG5cdFx0XHQgLy8gICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xuXHRcdFx0IC8vICAgIGF1ZGlvUmVjb3JkZXIucmVjb3JkKCk7XG5cblx0XHRcdCAvLyAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gYXVkaW9SZWNvcmRlci5zdG9wKCk7XG5cdFx0XHRcdC8vIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcblx0XHRcdFx0Ly8gYXVkaW9SZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XG5cblx0XHRcdFx0Ly8gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHQvLyBcdHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xuXHRcdFx0XHQvLyBcdHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3SW1hZ2UgPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nSW1hZ2U7XG5cdFx0XHRcdC8vIFx0Y29uc29sZS5sb2coJ3RyYWNrc3MnLCBzY29wZS50cmFja3MpO1xuXHRcdFx0XHQvLyBcdC8vIHdhdkFycmF5LnB1c2god2luZG93LmxhdGVzdFJlY29yZGluZyk7XG5cdFx0XHRcdC8vIFx0Ly8gY29uc29sZS5sb2coJ3dhdkFycmF5Jywgd2F2QXJyYXkpO1xuXHRcdFx0XHQvLyB9LCA1MDApO1xuXHRcdFx0ICAgICAgXG5cdFx0XHQgLy8gICAgfSwgMjAwMCk7XG5cblx0XHRcdH1cblx0XHRcdHNjb3BlLnByZXZpZXcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coc2NvcGUudHJhY2sucGxheWVyKTtcblx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHR9O1xuXG5cdFx0XHRzY29wZS5jaGFuZ2VXZXRuZXNzID0gZnVuY3Rpb24oZWZmZWN0LCBhbW91bnQpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coZWZmZWN0KTtcblx0XHRcdFx0Y29uc29sZS5sb2coYW1vdW50KTtcblxuXHRcdFx0XHRlZmZlY3Qud2V0LnZhbHVlID0gYW1vdW50IC8gMTAwMDtcblx0XHRcdH07XG5cblx0XHR9XG5cdFx0XG5cblx0fVxufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
=======
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9OZXdQcm9qZWN0Q29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9UaW1lbGluZUNvbnRyb2xsZXIuanMiLCJjb21tb24vZmFjdG9yaWVzL0FuYWx5c2VyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Qcm9qZWN0RmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9SYW5kb21HcmVldGluZ3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLElBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7QUFJQSxjQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7QUFFQSxZQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7O0FBR0EsYUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbERBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsc0JBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxNQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7QUFDQSxzQkFBQSxFQUFBLHNCQUFBO0FBQ0Esd0JBQUEsRUFBQSx3QkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGFBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7U0FDQSxDQUFBO0FBQ0EsZUFBQTtBQUNBLHlCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTs7Ozs7O0FBTUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQTs7Ozs7QUFLQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBO0FDeElBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsY0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFVBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUdBLEdBQUEsQ0FBQSxVQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBOztBQ3ZCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxxQkFBQTtBQUNBLGtCQUFBLEVBQUEsV0FBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEscUJBQUE7QUFDQSxtQkFBQSxFQUFBLHlCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQSxZQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLDBCQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7cUJBRUE7aUJBQ0EsQ0FBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsV0FBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxFQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsbUNBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLEdBQUEsSUFBQSxDQUFBO2lCQUNBLE1BQUE7QUFDQSx5QkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7aUJBQ0E7O0FBRUEsc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsVUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBOzs7QUFHQSxjQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQTs7QUFJQSx1QkFBQSxDQUFBLGVBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxZQUFBLEtBQUEsR0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsWUFBQTtBQUNBLGNBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsUUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxNQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEtBQUEsQ0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7O0FBRUEsbUJBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO1NBRUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ2xKQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBO0FBQ0EsbUJBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsWUFBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLHFCQUFBO0FBQ0EsbUJBQUEsRUFBQSwwQkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7OztBQUdBLFlBQUEsRUFBQTtBQUNBLHdCQUFBLEVBQUEsSUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx3QkFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEscUJBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxXQUFBO0FBQ0EsbUJBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsdUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsS0FDQSxNQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0tBQ0E7Ozs7Ozs7OztBQUFBLEtBQUE7Q0FTQSxDQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsVUFBQSxDQUFBLG9CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLEVBZ0NBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLHVCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxNQUFBLENBQUEsWUFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBLEtBQ0EsTUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Q0FLQSxDQUFBLENBQUE7O0FDaEdBLEdBQUEsQ0FBQSxVQUFBLENBQUEsc0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsYUFBQSxHQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDaEJBLEdBQUEsQ0FBQSxVQUFBLENBQUEsb0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQTs7QUFFQSxRQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsY0FBQSxDQUFBLGNBQUEsQ0FBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLFlBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLFlBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7QUFDQSwwQkFBQSxFQUFBLENBQUE7QUFDQSx3QkFBQSxNQUFBLEtBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSw4QkFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7O3FCQUVBO2lCQUNBLENBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0EsaUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7O0FBRUEsdUJBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOzs7Ozs7OztBQVFBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLFNBQUEsR0FBQSxDQUFBLENBQUEsU0FBQSxDQUFBOzs7QUFHQSxlQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsYUFBQSxFQUNBLE9BQUE7O0FBRUEsU0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxlQUFBLENBQUE7O2FBR0EsRUFBQSxHQUFBLENBQUEsQ0FBQTtTQUVBLEVBQUEsSUFBQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBOztBQUVBLFlBQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsRUFBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBTUEsQ0FBQSxDQUFBOztBQ3ZHQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLGlCQUFBLE1BQUEsR0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsT0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxZQUFBLEdBQUEsSUFBQSxVQUFBLENBQUEsWUFBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSx3QkFBQSxDQUFBLG9CQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsMkJBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxnQkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLGlCQUFBLEdBQUEsT0FBQSxDQUFBOzs7QUFHQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsRUFBQTtBQUNBLG9CQUFBLFNBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQ0EsU0FBQSxJQUFBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSx5QkFBQSxHQUFBLFNBQUEsR0FBQSxVQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsY0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7YUFDQTtBQUNBLGdCQUFBLGNBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7QUFDQSxjQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBR0EsUUFBQSxxQkFBQSxHQUFBLFNBQUEscUJBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7QUFDQSxXQUFBO0FBQ0EsdUJBQUEsRUFBQSxlQUFBO0FBQ0EsNkJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUM3Q0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEdBQUEsU0FBQSxjQUFBLENBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGdCQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTs7OztTQUlBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsV0FBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDaENBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsZUFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxHQUFBLENBQ0EsZUFBQSxFQUNBLHVCQUFBLEVBQ0Esc0JBQUEsRUFDQSx1QkFBQSxFQUNBLHlEQUFBLEVBQ0EsMENBQUEsRUFDQSxjQUFBLEVBQ0EsdUJBQUEsRUFDQSxJQUFBLENBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBO0FBQ0EseUJBQUEsRUFBQSw2QkFBQTtBQUNBLG1CQUFBLGtCQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDMUJBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxRQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxZQUFBLE9BQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxJQUFBLE1BQUEsQ0FBQSxrQkFBQSxDQUFBO0FBQ0EsWUFBQSxZQUFBLEdBQUEsSUFBQSxPQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxDQUFBOzs7Ozs7QUFNQSxZQUFBLFNBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxZQUFBLEdBQ0EsU0FBQSxDQUFBLFlBQUEsSUFDQSxTQUFBLENBQUEsa0JBQUEsSUFDQSxTQUFBLENBQUEsZUFBQSxJQUNBLFNBQUEsQ0FBQSxjQUFBLEFBQ0EsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsRUFDQSxTQUFBLENBQUEsb0JBQUEsR0FBQSxTQUFBLENBQUEsMEJBQUEsSUFBQSxTQUFBLENBQUEsdUJBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEscUJBQUEsRUFDQSxTQUFBLENBQUEscUJBQUEsR0FBQSxTQUFBLENBQUEsMkJBQUEsSUFBQSxTQUFBLENBQUEsd0JBQUEsQ0FBQTs7O0FBR0EsaUJBQUEsQ0FBQSxZQUFBLENBQ0E7QUFDQSxtQkFBQSxFQUFBO0FBQ0EsMkJBQUEsRUFBQTtBQUNBLDBDQUFBLEVBQUEsT0FBQTtBQUNBLHlDQUFBLEVBQUEsT0FBQTtBQUNBLDBDQUFBLEVBQUEsT0FBQTtBQUNBLHdDQUFBLEVBQUEsT0FBQTtpQkFDQTtBQUNBLDBCQUFBLEVBQUEsRUFBQTthQUNBO1NBQ0EsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7OztBQUdBLGdCQUFBLGNBQUEsR0FBQSxZQUFBLENBQUEsdUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLFVBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7O0FBR0EsZ0JBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLENBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOzs7QUFHQSxvQkFBQSxHQUFBLElBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsUUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxFQUFBLENBQUEsUUFBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBO1NBRUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQTs7QUFHQSxnQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQSxFQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBOztBQUVBLGVBQUEsUUFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFJQSxpQkFBQSxVQUFBLENBQUEsT0FBQSxFQUFBOztBQUVBLGdCQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxvQkFBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7Ozs7QUFJQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLDRCQUFBLENBQUEsY0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsa0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLDJCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7O0FBSUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxnQkFBQSxNQUFBLEdBQUEsSUFBQSxVQUFBLEVBQUEsQ0FBQTs7QUFFQSxnQkFBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxhQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSwyQkFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUtBLFdBQUE7QUFDQSxpQkFBQSxFQUFBLG1CQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUE7O0FBRUEsZ0JBQUEsWUFBQSxHQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsdUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOztBQUVBLDJCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsUUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7O0FBRUEsdUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLDhCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSwyQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUVBO0FBQ0Esb0JBQUEsRUFBQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSxXQUFBO0FBQ0Esa0JBQUEsRUFBQSxVQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzNJQSxZQUFBLENBQUE7O0FDQUEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxRQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxnQkFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTs7QUFFQSwyQkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSx3QkFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDRCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtpQkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLENBQUEsU0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLEdBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEscUJBQUEsRUFBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLGNBQUEsRUFBQTs7QUFFQSxZQUFBLGNBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLHNCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7YUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO1NBRUE7O0FBRUEsc0JBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsZ0JBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2FBQ0EsRUFBQSxTQUFBLENBQUEsQ0FBQTs7Ozs7OztTQVFBLENBQUEsQ0FBQTtLQUVBLENBQUE7O0FBRUEsV0FBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7QUFDQSx1QkFBQSxFQUFBLGVBQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDL0VBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsTUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsWUFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxJQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxlQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLE1BQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLFFBQUEsR0FBQSxRQUFBLElBQUEsUUFBQSxHQUFBLEtBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxrQkFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLFlBQUEsTUFBQSxDQUFBOztBQUVBLFlBQUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxjQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsYUFBQSxDQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLEdBQUE7QUFDQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxPQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxhQUFBLEVBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxhQUFBLEdBQUEsU0FBQSxhQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLG9CQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsY0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7QUFDQSxxQkFBQSxFQUFBLGFBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3pEQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLHdCQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBO0FBQ0Esc0JBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBO0FBQ0EsZ0JBQUEsRUFBQSxrQkFBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLHNCQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBO2FBQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTs7QUFFQSx1QkFBQSxFQUFBLDJCQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUE7QUFDQSxzQkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDMUJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTs7QUFFQSxZQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxZQUFBLENBQUEsYUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsS0FBQSxDQUFBO1NBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZ0JBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQTtTQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7S0FFQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQUEsU0FDQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUE7O0FBRUEsZ0JBQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLEdBQUEsTUFBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsU0FB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LGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO1NBRUE7O0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzVEQSxHQUFBLENBQUEsU0FBQSxDQUFBLGtCQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG9EQUFBO0FBQ0Esa0JBQUEsRUFBQSw0QkFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSw0QkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBOztLQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLFFBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxlQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxXQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7O0tBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzFCQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxVQUFBLGVBQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5REFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsUUFBQSxHQUFBLGVBQUEsQ0FBQSxpQkFBQSxFQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNYQSxHQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx1Q0FBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLHNCQUFBLENBQUEsWUFBQTtBQUNBLG9CQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxxQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7O0FBRUEsd0JBQUEsYUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBOztBQUVBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsYUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLDRCQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxPQUFBLEVBQUE7QUFDQSxtQ0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLHlIQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO3lCQUNBO3FCQUNBO2lCQUNBO2FBQ0EsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esb0JBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7O0FBRUEsdUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLHlCQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLG9CQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLGVBQUEsR0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxvQkFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEseUJBQUEsTUFBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHdCQUFBLFlBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBOztBQUVBLGdDQUFBLENBQUEsb0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTs7QUFFQSxtQ0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLG1DQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLG1DQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsR0FBQSxPQUFBLENBQUE7OztBQUdBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsNEJBQUEsU0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLDRCQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSw2QkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFDQSxTQUFBLElBQUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLGlDQUFBLEdBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQTtBQUNBLDRCQUFBLFVBQUEsR0FBQSxZQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsdUNBQUEsQ0FBQSxTQUFBLEdBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxjQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtxQkFDQTtBQUNBLHdCQUFBLGNBQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEscUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtxQkFDQTtpQkFDQTs7QUFHQSwwQkFBQSxDQUFBLFlBQUE7O0FBRUEsMkJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsK0JBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLDZCQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0Esc0NBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSw4QkFBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTs7cUJBRUEsQ0FBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzthQWlDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ25nU3RvcmFnZSddKTtcclxuXHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcclxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcclxuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxyXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xyXG59KTtcclxuXHJcbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cclxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xyXG5cclxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXHJcbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxyXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXHJcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XHJcblxyXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xyXG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxyXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cclxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxyXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXHJcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cclxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxufSk7IiwiKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxyXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xyXG5cclxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XHJcblxyXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcclxuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xyXG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xyXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcclxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXHJcbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xyXG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXHJcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXHJcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxyXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxyXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcclxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XHJcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XHJcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcclxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxyXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxyXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcclxuICAgICAgICAgICAgJyRpbmplY3RvcicsXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcclxuXHJcbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxyXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cclxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcclxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxyXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXHJcbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXHJcbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxyXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcclxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zaWdudXAgPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coY3JlZGVudGlhbHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIGNyZWRlbnRpYWxzKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oIG9uU3VjY2Vzc2Z1bExvZ2luIClcclxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgc2lnbnVwIGNyZWRlbnRpYWxzLicgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcclxuXHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XHJcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pO1xyXG5cclxufSkoKTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcclxuICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUubGFuZGluZycse1xyXG4gICAgXHR1cmw6ICcvbGFuZGluZycsXHJcbiAgICBcdHRlbXBsYXRlVXJsOiAnanMvaG9tZS9sYW5kaW5nLmh0bWwnXHJcbiAgICB9KVxyXG59KTtcclxuXHJcblxyXG5hcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlKSB7XHJcblx0XHJcblx0JHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBcclxuXHJcblxyXG59KTtcclxuXHJcblxyXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcclxuICAgICAgICB1cmw6ICcvbG9naW4nLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcclxuICAgIH0pO1xyXG5cclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XHJcblxyXG4gICAgJHNjb3BlLmxvZ2luID0ge307XHJcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbihsb2dpbkluZm8pIHtcclxuXHJcbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuXHJcbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvamVjdCcsIHtcclxuICAgICAgICB1cmw6ICcvcHJvamVjdC86cHJvamVjdElEJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2plY3QvcHJvamVjdC5odG1sJ1xyXG4gICAgfSk7XHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ1Byb2plY3RDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkY29tcGlsZSwgUmVjb3JkZXJGY3QsIFByb2plY3RGY3QsIFRvbmVUcmFja0ZjdCwgVG9uZVRpbWVsaW5lRmN0LCBBdXRoU2VydmljZSkge1xyXG5cclxuICB2YXIgbWF4TWVhc3VyZSA9IDA7XHJcblxyXG4gIC8vIG51bWJlciBvZiBtZWFzdXJlcyBvbiB0aGUgdGltZWxpbmVcclxuICAkc2NvcGUubnVtTWVhc3VyZXMgPSBfLnJhbmdlKDAsIDYwKTtcclxuXHJcbiAgLy8gbGVuZ3RoIG9mIHRoZSB0aW1lbGluZVxyXG4gICRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcclxuXHJcblx0Ly9Jbml0aWFsaXplIHJlY29yZGVyIG9uIHByb2plY3QgbG9hZFxyXG5cdFJlY29yZGVyRmN0LnJlY29yZGVySW5pdChmdW5jdGlvbiAocmVjb3JkZXIsIGFuYWx5c2VyTm9kZSkge1xyXG5cdFx0JHNjb3BlLnJlY29yZGVyID0gcmVjb3JkZXI7XHJcblx0XHQkc2NvcGUuYW5hbHlzZXJOb2RlID0gYW5hbHlzZXJOb2RlO1xyXG5cdH0pO1xyXG5cclxuXHQkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcblx0JHNjb3BlLm5hbWVDaGFuZ2luZyA9IGZhbHNlO1xyXG5cdCRzY29wZS50cmFja3MgPSBbXTtcclxuXHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0JHNjb3BlLnByb2plY3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9qZWN0SUQ7XHJcblx0JHNjb3BlLnBvc2l0aW9uID0gMDtcclxuXHJcblx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblx0XHR2YXIgbG9hZGVkID0gMDtcclxuXHRcdGNvbnNvbGUubG9nKCdQUk9KRUNUJywgcHJvamVjdCk7XHJcblx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBwcm9qZWN0Lm5hbWU7XHJcblxyXG5cdFx0aWYgKHByb2plY3QudHJhY2tzLmxlbmd0aCkge1xyXG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG5cdFx0XHRcdHZhciBkb25lTG9hZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdGxvYWRlZCsrO1xyXG5cdFx0XHRcdFx0aWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHZhciBtYXggPSBNYXRoLm1heC5hcHBseShudWxsLCB0cmFjay5sb2NhdGlvbnMpO1xyXG5cdFx0XHRcdGlmKG1heCArIDIgPiBtYXhNZWFzdXJlKSBtYXhNZWFzdXJlID0gbWF4ICsgMjtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHRyYWNrLnBsYXllciA9IFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBkb25lTG9hZGluZyk7XHJcblx0XHRcdFx0Ly9pbml0IGVmZmVjdHMsIGNvbm5lY3QsIGFuZCBhZGQgdG8gc2NvcGVcclxuXHRcdFx0XHR0cmFjay5lZmZlY3RzUmFjayA9IFRvbmVUcmFja0ZjdC5lZmZlY3RzSW5pdGlhbGl6ZSgpO1xyXG5cdFx0XHRcdHRyYWNrLnBsYXllci5jb25uZWN0KHRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcclxuXHJcblx0XHRcdFx0aWYodHJhY2subG9jYXRpb25zLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0LmFkZExvb3BUb1RpbWVsaW5lKHRyYWNrLnBsYXllciwgdHJhY2subG9jYXRpb25zKTtcclxuXHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSB0cnVlO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcclxuICAgIFx0XHRcdFx0dmFyIG9iaiA9IHt9O1xyXG4gICAgXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xyXG4gICAgXHRcdFx0XHRvYmoucmVjb3JkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRvYmoub25UaW1lbGluZSA9IGZhbHNlO1xyXG4gICAgXHRcdFx0XHRvYmoubmFtZSA9ICdUcmFjayAnICsgKGkrMSk7XHJcbiAgICBcdFx0XHRcdG9iai5sb2NhdGlvbiA9IFtdO1xyXG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcclxuICBcdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly9keW5hbWljYWxseSBzZXQgbWVhc3VyZXNcclxuXHRcdCRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXhNZWFzdXJlOyBpKyspIHtcclxuXHRcdFx0JHNjb3BlLm51bU1lYXN1cmVzLnB1c2goaSk7XHJcblx0XHR9XHJcblxyXG5cclxuXHJcblx0XHRUb25lVGltZWxpbmVGY3QuY3JlYXRlVHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XHJcblx0XHRcdCRzY29wZS5tZXRyb25vbWUgPSBtZXRyb25vbWU7XHJcblx0XHR9KTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xyXG5cclxuXHR9KTtcclxuXHJcblx0JHNjb3BlLmRyb3BJblRpbWVsaW5lID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHR2YXIgdHJhY2sgPSBzY29wZS50cmFja3NbaW5kZXhdO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKHRyYWNrKTtcclxuXHR9XHJcblxyXG5cdCRzY29wZS5hZGRUcmFjayA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0fTtcclxuXHJcblx0JHNjb3BlLnBsYXkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG5cdH1cclxuXHQkc2NvcGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5zdG9wQWxsKCRzY29wZS50cmFja3MpO1xyXG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKVswXTtcclxuXHRcdGNvbnNvbGUubG9nKCdQT1MnLCAkc2NvcGUucG9zaXRpb24pO1xyXG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICgkc2NvcGUucG9zaXRpb24gKiAyMDAgKyAzMDApLnRvU3RyaW5nKCkrJ3B4JztcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnBhdXNlKCk7XHJcblx0fVxyXG5cdCRzY29wZS5zdG9wID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRUb25lVGltZWxpbmVGY3Quc3RvcEFsbCgkc2NvcGUudHJhY2tzKTtcclxuXHRcdCRzY29wZS5wb3NpdGlvbiA9IDA7XHJcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gJzMwMHB4JztcclxuXHRcdFRvbmUuVHJhbnNwb3J0LnN0b3AoKTtcclxuXHR9XHJcblx0JHNjb3BlLm5hbWVDaGFuZ2UgPSBmdW5jdGlvbihuZXdOYW1lKSB7XHJcblx0XHRjb25zb2xlLmxvZygnU0hPVyBJTlBVVCcsIG5ld05hbWUpO1xyXG5cdFx0JHNjb3BlLm5hbWVDaGFuZ2luZyA9IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0JHNjb3BlLnRvZ2dsZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmKCRzY29wZS5tZXRyb25vbWUudm9sdW1lLnZhbHVlID09PSAwKSB7XHJcblx0XHRcdCRzY29wZS5tZXRyb25vbWUudm9sdW1lLnZhbHVlID0gLTEwMDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdCRzY29wZS5tZXRyb25vbWUudm9sdW1lLnZhbHVlID0gMDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKCRzY29wZS50cmFja3MpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcclxuXHJcbiAgICB9KTtcclxuICB9O1xyXG4gICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcclxuICAgIH07XHJcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcclxuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAkc2NvcGUuc2lnbnVwID0ge307XHJcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHNpZ251cEluZm8pO1xyXG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJQcm9maWxlJywge1xyXG4gICAgICAgIHVybDogJy91c2VycHJvZmlsZS86dGhlSUQnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci91c2VycHJvZmlsZS5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInLFxyXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmFydGlzdEluZm8nLCB7XHJcbiAgICAgICAgdXJsOiAnL2luZm8nLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9pbmZvLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VySW5mb0NvbnRyb2xsZXInXHJcbiAgICB9KVxyXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5wcm9qZWN0Jywge1xyXG4gICAgICAgIHVybDogJy9wcm9qZWN0cycsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2plY3RzLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyUHJvamVjdENvbnRyb2xsZXInXHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgdXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xyXG4gICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihhVXNlcil7XHJcbiAgICAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcclxuICAgIH0pO1xyXG5cclxuICAgICRzY29wZS5kaXNwbGF5U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcclxuICAgICAgICBlbHNlICRzY29wZS5zaG93U2V0dGluZ3MgPSB0cnVlO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5zaG93U2V0dGluZ3MpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vICRzY29wZS5kaXNwbGF5Rm9ya3MgPSBmdW5jdGlvbigpe1xyXG4gICAgLy8gICAgIHVzZXJGYWN0b3J5LmdldEZvcmtzKCRzY29wZS50aGVVc2VyLl9pZCkudGhlbihmdW5jdGlvbihkYXRhKXtcclxuICAgIC8vICAgICAgICAgJHNjb3BlLmZvcmtzID0gZGF0YTtcclxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmZvcmtzKTtcclxuICAgIC8vICAgICB9KTtcclxuICAgIC8vIH1cclxuXHJcbn0pO1xyXG5hcHAuY29udHJvbGxlcignVXNlckluZm9Db250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgdXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xyXG5cclxuICAgICAgICAvLyAkc2NvcGUub25GaWxlU2VsZWN0ID0gZnVuY3Rpb24oaW1hZ2UpIHtcclxuICAgICAgICAvLyAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShpbWFnZSkpIHtcclxuICAgICAgICAvLyAgICAgICAgIGltYWdlID0gaW1hZ2VbMF07XHJcbiAgICAgICAgLy8gICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgIC8vIFRoaXMgaXMgaG93IEkgaGFuZGxlIGZpbGUgdHlwZXMgaW4gY2xpZW50IHNpZGVcclxuICAgICAgICAvLyAgICAgaWYgKGltYWdlLnR5cGUgIT09ICdpbWFnZS9wbmcnICYmIGltYWdlLnR5cGUgIT09ICdpbWFnZS9qcGVnJykge1xyXG4gICAgICAgIC8vICAgICAgICAgYWxlcnQoJ09ubHkgUE5HIGFuZCBKUEVHIGFyZSBhY2NlcHRlZC4nKTtcclxuICAgICAgICAvLyAgICAgICAgIHJldHVybjtcclxuICAgICAgICAvLyAgICAgfVxyXG5cclxuICAgICAgICAvLyAgICAgJHNjb3BlLnVwbG9hZEluUHJvZ3Jlc3MgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICAkc2NvcGUudXBsb2FkUHJvZ3Jlc3MgPSAwO1xyXG5cclxuICAgICAgICAvLyAgICAgJHNjb3BlLnVwbG9hZCA9ICR1cGxvYWQudXBsb2FkKHtcclxuICAgICAgICAvLyAgICAgICAgIHVybDogJy91cGxvYWQvaW1hZ2UnLFxyXG4gICAgICAgIC8vICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgLy8gICAgICAgICBmaWxlOiBpbWFnZVxyXG4gICAgICAgIC8vICAgICB9KS5wcm9ncmVzcyhmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLnVwbG9hZFByb2dyZXNzID0gTWF0aC5mbG9vcihldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCk7XHJcbiAgICAgICAgLy8gICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XHJcbiAgICAgICAgLy8gICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcclxuICAgICAgICAvLyAgICAgICAgICRzY29wZS51cGxvYWRJblByb2dyZXNzID0gZmFsc2U7XHJcbiAgICAgICAgLy8gICAgICAgICAvLyBJZiB5b3UgbmVlZCB1cGxvYWRlZCBmaWxlIGltbWVkaWF0ZWx5IFxyXG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLnVwbG9hZGVkSW1hZ2UgPSBKU09OLnBhcnNlKGRhdGEpOyAgICAgIFxyXG4gICAgICAgIC8vICAgICB9KS5lcnJvcihmdW5jdGlvbihlcnIpIHtcclxuICAgICAgICAvLyAgICAgICAgICRzY29wZS51cGxvYWRJblByb2dyZXNzID0gZmFsc2U7XHJcbiAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgdXBsb2FkaW5nIGZpbGU6ICcgKyBlcnIubWVzc2FnZSB8fCBlcnIpO1xyXG4gICAgICAgIC8vICAgICB9KTtcclxuICAgICAgICAvLyB9O1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdVc2VyUHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGVQYXJhbXMsIEF1dGhTZXJ2aWNlLCB1c2VyRmFjdG9yeSkge1xyXG5cclxuICAgICRzY29wZS5wcm9qZWN0cztcclxuXHJcbiAgICAvL3R1cm4gdGhpcyBpbnRvIGEgcHJvbWlzZSBzbyB5b3UgZ2V0IGxvZ2dlZCBpbiB1c2VyIGFuZCB0aGVuIHRoZSBwcm9qZWN0cyBvZiB0aGF0IHVzZXJcclxuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24oYVVzZXIpe1xyXG4gICAgICAgICRzY29wZS50aGVVc2VyID0gYVVzZXI7XHJcbiAgICAgICAgdXNlckZhY3RvcnkuZ2V0QWxsUHJvamVjdHMoJHNjb3BlLnRoZVVzZXIuX2lkKS50aGVuKGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgICAgICAgICAkc2NvcGUucHJvamVjdHMgPSBkYXRhO1xyXG4gICAgICAgICAgICBpZigkc2NvcGUuc2hvd1Byb2plY3RzKSAkc2NvcGUuc2hvd1Byb2plY3RzID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGVsc2UgJHNjb3BlLnNob3dQcm9qZWN0cyA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5wcm9qZWN0cyk7XHJcbiAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgICAgIFxyXG4gIFxyXG4gICAgXHJcblxyXG59KTsiLCJhcHAuY29udHJvbGxlcignTmV3UHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBQcm9qZWN0RmN0LCAkc3RhdGUpe1xyXG5cdCRzY29wZS51c2VyO1xyXG5cclxuXHQgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCAkc2NvcGUudGhlVXNlci51c2VybmFtZSlcclxuICAgIH0pO1xyXG5cclxuXHQgJHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xyXG5cdCBcdFByb2plY3RGY3QubmV3UHJvamVjdCgkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihwcm9qZWN0SWQpe1xyXG5cdCBcdFx0Y29uc29sZS5sb2coJ1N1Y2Nlc3MgaXMnLCBwcm9qZWN0SWQpXHJcblx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHByb2plY3RJZH0pO1x0IFx0XHJcblx0XHR9KVxyXG5cclxuXHQgfVxyXG5cclxufSkiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcclxuICBcclxuICB2YXIgd2F2QXJyYXkgPSBbXTtcclxuICBcclxuICAkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IDYwOyBpKyspIHtcclxuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xyXG4gIH1cclxuXHJcbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG4gICRzY29wZS50cmFja3MgPSBbXTtcclxuICAkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cclxuICBQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCc1NTk0YzIwYWQwNzU5Y2Q0MGNlNTFlMTQnKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblxyXG4gICAgICB2YXIgbG9hZGVkID0gMDtcclxuICAgICAgY29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcclxuXHJcbiAgICAgIGlmIChwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuICAgICAgICBwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQrKztcclxuICAgICAgICAgICAgICAgIGlmKGxvYWRlZCA9PT0gcHJvamVjdC50cmFja3MubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG4gICAgICAgICAgICBUb25lVGltZWxpbmVGY3QuYWRkTG9vcFRvVGltZWxpbmUodHJhY2sucGxheWVyLCB0cmFjay5sb2NhdGlvbnMpO1xyXG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjsgaSsrKSB7XHJcbiAgICAgICAgICB2YXIgb2JqID0ge307XHJcbiAgICAgICAgICBvYmoubmFtZSA9ICdUcmFjayAnICsgKGkrMSk7XHJcbiAgICAgICAgICBvYmoubG9jYXRpb25zID0gW107XHJcbiAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5nZXRUcmFuc3BvcnQocHJvamVjdC5lbmRNZWFzdXJlKTtcclxuICAgICAgVG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XHJcblxyXG4gIH0pO1xyXG5cclxuICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcclxuICAvLyAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcclxuICAvLyAgICAgLy8gJHN0YXRlUGFyYW1zLnRoZUlEID0gYVVzZXIuX2lkXHJcbiAgLy8gICAgIGNvbnNvbGUubG9nKFwiaWRcIiwgJHN0YXRlUGFyYW1zKTtcclxuICAvLyB9KTtcclxuXHJcbiAgJHNjb3BlLnJlY29yZCA9IGZ1bmN0aW9uIChlLCBpbmRleCkge1xyXG5cclxuICBcdGUgPSBlLnRvRWxlbWVudDtcclxuXHJcbiAgICAgICAgLy8gc3RhcnQgcmVjb3JkaW5nXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0IHJlY29yZGluZycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghYXVkaW9SZWNvcmRlcilcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICBlLmNsYXNzTGlzdC5hZGQoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xyXG4gICAgICAgIGF1ZGlvUmVjb3JkZXIucmVjb3JkKCk7XHJcblxyXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5zdG9wKCk7XHJcbiAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XHJcbiAgICAgICAgICAgIC8vICRzY29wZS50cmFja3NbaW5kZXhdLnJhd0ltYWdlID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlO1xyXG5cclxuICAgICAgICAgIH0sIDUwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICB9LCAyMDAwKTtcclxuXHJcbiAgfVxyXG5cclxuICAkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIH07XHJcblxyXG4gICRzY29wZS5zZW5kVG9BV1MgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgdmFyIGF3c1RyYWNrcyA9ICRzY29wZS50cmFja3MuZmlsdGVyKGZ1bmN0aW9uKHRyYWNrLGluZGV4KXtcclxuICAgICAgICAgICAgICBpZih0cmFjay5yYXdBdWRpbyl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICBSZWNvcmRlckZjdC5zZW5kVG9BV1MoYXdzVHJhY2tzLCAnNTU5NWE3ZmFhYTkwMWFkNjMyMzRmOTIwJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAvLyB3YXZlIGxvZ2ljXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gc2VuZFRvQVdTJywgcmVzcG9uc2UpO1xyXG5cclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuXHRcclxuXHJcblxyXG59KTtcclxuXHJcblxyXG4iLCJhcHAuZmFjdG9yeSgnQW5hbHlzZXJGY3QnLCBmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIHVwZGF0ZUFuYWx5c2VycyA9IGZ1bmN0aW9uIChhbmFseXNlckNvbnRleHQsIGFuYWx5c2VyTm9kZSwgY29udGludWVVcGRhdGUpIHtcclxuXHJcblx0XHRmdW5jdGlvbiB1cGRhdGUoKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdVUERBVEUnKVxyXG5cdFx0XHR2YXIgU1BBQ0lORyA9IDM7XHJcblx0XHRcdHZhciBCQVJfV0lEVEggPSAxO1xyXG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XHJcblx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xyXG5cclxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxyXG5cclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XHJcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcclxuXHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xyXG5cclxuXHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyArK2kpIHtcclxuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcclxuXHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcclxuXHRcdFx0XHQvLyBnb3R0YSBzdW0vYXZlcmFnZSB0aGUgYmxvY2ssIG9yIHdlIG1pc3MgbmFycm93LWJhbmR3aWR0aCBzcGlrZXNcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxyXG5cdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xyXG5cdFx0XHRcdG1hZ25pdHVkZSA9IG1hZ25pdHVkZSAvIG11bHRpcGxpZXI7XHJcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xyXG5cdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsUmVjdChpICogU1BBQ0lORywgMTAwLCBCQVJfV0lEVEgsIC1tYWduaXR1ZGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XHJcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cdH1cclxuXHJcblxyXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xyXG5cdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XHJcblx0fVxyXG5cdHJldHVybiB7XHJcblx0XHR1cGRhdGVBbmFseXNlcnM6IHVwZGF0ZUFuYWx5c2VycyxcclxuXHRcdGNhbmNlbEFuYWx5c2VyVXBkYXRlczogY2FuY2VsQW5hbHlzZXJVcGRhdGVzXHJcblx0fVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdQcm9qZWN0RmN0JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cclxuICAgIHZhciBnZXRQcm9qZWN0SW5mbyA9IGZ1bmN0aW9uIChwcm9qZWN0SWQpIHtcclxuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2plY3RzLycgKyBwcm9qZWN0SWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGNyZWF0ZUFGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzLycsIHByb2plY3QpLnRoZW4oZnVuY3Rpb24oZm9yayl7XHJcbiAgICBcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzLycsIGZvcmsuZGF0YSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICBcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgIFx0XHR9KTtcclxuICAgIFx0fSk7XHJcbiAgICB9XHJcbiAgICB2YXIgbmV3UHJvamVjdCA9IGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgXHRyZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9wcm9qZWN0cycse293bmVyOnVzZXIuX2lkfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblxyXG4gICAgXHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgXHRcdC8vIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvcHJvamVjdHMvdXNlcnByb2plY3QnLHtvd25lcjogdXNlci5faWQsIHByb2plY3Q6cmVzcG9uc2UuZGF0YX0pLnRoZW4oZnVuY3Rpb24odXNlcil7XHJcbiAgICBcdFx0Ly8gXHRjb25zb2xlLmxvZyh1c2VyLmRhdGEpXHJcbiAgICBcdFx0Ly8gfSlcclxuICAgIFx0fSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFByb2plY3RJbmZvOiBnZXRQcm9qZWN0SW5mbyxcclxuICAgICAgICBjcmVhdGVBRm9yazogY3JlYXRlQUZvcmssXHJcbiAgICAgICAgbmV3UHJvamVjdDogbmV3UHJvamVjdFxyXG4gICAgfTtcclxuXHJcbn0pO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcbmFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgdmFyIGdldFJhbmRvbUZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcclxuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcclxuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXHJcbiAgICAgICAgJ0F0IGxvbmcgbGFzdCwgSSBsaXZlIScsXHJcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcclxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcclxuICAgICAgICAnSVxcJ20gbGlrZSBhbnkgb3RoZXIgcHJvamVjdCwgZXhjZXB0IHRoYXQgSSBhbSB5b3Vycy4gOiknLFxyXG4gICAgICAgICdUaGlzIGVtcHR5IHN0cmluZyBpcyBmb3IgTGluZHNheSBMZXZpbmUuJyxcclxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcclxuICAgICAgICAnV2VsY29tZS4gVG8uIFdFQlNJVEUuJyxcclxuICAgICAgICAnOkQnXHJcbiAgICBdO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXHJcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiYXBwLmZhY3RvcnkoJ1JlY29yZGVyRmN0JywgZnVuY3Rpb24gKCRodHRwLCBBdXRoU2VydmljZSwgJHEsIFRvbmVUcmFja0ZjdCwgQW5hbHlzZXJGY3QpIHtcclxuXHJcbiAgICB2YXIgcmVjb3JkZXJJbml0ID0gZnVuY3Rpb24gKGNiKSB7XHJcbiAgICAgICAgdmFyIENvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgdmFyIGF1ZGlvQ29udGV4dCA9IG5ldyBDb250ZXh0KCk7XHJcbiAgICAgICAgdmFyIHJlY29yZGVyO1xyXG5cclxuICAgICAgICAvLyAvL2F0dGFjaCBjb250ZXh0IGFuZCBhbmFseXplclxyXG4gICAgICAgIC8vIHZhciBnb3RTdHJlYW0gPSBmdW5jdGlvbiAoc3RyZWFtKSB7XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gKFxyXG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XHJcbiAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcclxuICAgICAgICAgICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxyXG4gICAgICAgICAgICBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWFcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmICghbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxyXG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBuYXZpZ2F0b3Iud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lO1xyXG4gICAgICAgIGlmICghbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSlcclxuICAgICAgICAgICAgbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1velJlcXVlc3RBbmltYXRpb25GcmFtZTtcclxuXHJcbiAgICAgICAgLy8gYXNrIGZvciBwZXJtaXNzaW9uXHJcbiAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBcImF1ZGlvXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtYW5kYXRvcnlcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nRWNob0NhbmNlbGxhdGlvblwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dBdXRvR2FpbkNvbnRyb2xcIjogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nTm9pc2VTdXBwcmVzc2lvblwiOiBcImZhbHNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dIaWdocGFzc0ZpbHRlclwiOiBcImZhbHNlXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJvcHRpb25hbFwiOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoc3RyZWFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlucHV0UG9pbnQgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW4gQXVkaW9Ob2RlIGZyb20gdGhlIHN0cmVhbS5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbEF1ZGlvSW5wdXQgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXVkaW9JbnB1dCA9IHJlYWxBdWRpb0lucHV0O1xyXG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvSW5wdXQuY29ubmVjdChpbnB1dFBvaW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuYWx5c2VyIG5vZGVcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYW5hbHlzZXJOb2RlLmZmdFNpemUgPSAyMDQ4O1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggYW5hbHlzZXJOb2RlICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIHJlY29yZGVyXHJcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoIGlucHV0UG9pbnQgKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgemVyb0dhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmdhaW4udmFsdWUgPSAwLjA7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCB6ZXJvR2FpbiApO1xyXG4gICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmNvbm5lY3QoIGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbiApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2IocmVjb3JkZXIsIGFuYWx5c2VyTm9kZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBhdWRpbycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlY29yZFN0YXJ0ID0gZnVuY3Rpb24gKHJlY29yZGVyKSB7XHJcblxyXG5cclxuICAgICAgICByZWNvcmRlci5jbGVhcigpO1xyXG4gICAgICAgIHJlY29yZGVyLnJlY29yZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciByZWNvcmRTdG9wID0gZnVuY3Rpb24gKGluZGV4LCByZWNvcmRlciwgY2IpIHtcclxuICAgICAgICByZWNvcmRlci5zdG9wKCk7XHJcbiAgICAgICAgLy8gZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgIHJldHVybiByZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XHJcblxyXG5cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZ290QnVmZmVycyggYnVmZmVycyApIHtcclxuICAgICAgICAgICAgLy9kaXNwbGF5IHdhdiBpbWFnZVxyXG4gICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwid2F2ZWRpc3BsYXlcIiArICBpbmRleCApO1xyXG4gICAgICAgICAgICBkcmF3QnVmZmVyKCAzMDAsIDEwMCwgY2FudmFzLmdldENvbnRleHQoJzJkJyksIGJ1ZmZlcnNbMF0gKTtcclxuICAgICAgICAgICAgd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoZSBPTkxZIHRpbWUgZ290QnVmZmVycyBpcyBjYWxsZWQgaXMgcmlnaHQgYWZ0ZXIgYSBuZXcgcmVjb3JkaW5nIGlzIGNvbXBsZXRlZCAtIFxyXG4gICAgICAgICAgICAvLyBzbyBoZXJlJ3Mgd2hlcmUgd2Ugc2hvdWxkIHNldCB1cCB0aGUgZG93bmxvYWQuXHJcbiAgICAgICAgICAgIHJlY29yZGVyLmV4cG9ydFdBViggZnVuY3Rpb24gKCBibG9iICkge1xyXG4gICAgICAgICAgICAgICAgLy9uZWVkcyBhIHVuaXF1ZSBuYW1lXHJcbiAgICAgICAgICAgICAgICAvLyBSZWNvcmRlci5zZXR1cERvd25sb2FkKCBibG9iLCBcIm15UmVjb3JkaW5nMC53YXZcIiApO1xyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgbG9vcCB0aW1lXHJcbiAgICAgICAgICAgICAgICBUb25lVHJhY2tGY3QubG9vcEluaXRpYWxpemUoYmxvYiwgaW5kZXgsIFwibXlSZWNvcmRpbmcwLndhdlwiLCBmdW5jdGlvbiAocGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNiKHBsYXllcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgXHJcbiAgICB2YXIgY29udmVydFRvQmFzZTY0ID0gZnVuY3Rpb24gKHRyYWNrKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pIHtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKHRyYWNrLnJhd0F1ZGlvKTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcblxyXG5cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHNlbmRUb0FXUzogZnVuY3Rpb24gKHRyYWNrc0FycmF5LCBwcm9qZWN0SWQpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWFkUHJvbWlzZXMgPSB0cmFja3NBcnJheS5tYXAoY29udmVydFRvQmFzZTY0KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5hbGwocmVhZFByb21pc2VzKS50aGVuKGZ1bmN0aW9uIChzdG9yZURhdGEpIHtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0b3JlRGF0YScsIHN0b3JlRGF0YSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdHJhY2tzQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2ssIGkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFjay5yYXdBdWRpbyA9IHN0b3JlRGF0YVtpXTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2F3cy8nLCB7IHRyYWNrcyA6IHRyYWNrc0FycmF5LCBwcm9qZWN0SWQgOiBwcm9qZWN0SWQgfSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGluIHNlbmRUb0FXU0ZhY3RvcnknLCByZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhOyBcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZWNvcmRlckluaXQ6IHJlY29yZGVySW5pdCxcclxuICAgICAgICByZWNvcmRTdGFydDogcmVjb3JkU3RhcnQsXHJcbiAgICAgICAgcmVjb3JkU3RvcDogcmVjb3JkU3RvcFxyXG4gICAgfVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1RvbmVUaW1lbGluZUZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcclxuXHJcblx0dmFyIGNyZWF0ZVRyYW5zcG9ydCA9IGZ1bmN0aW9uIChsb29wRW5kKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3AgPSB0cnVlO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wU3RhcnQgPSAnMG0nO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wRW5kID0gbG9vcEVuZC50b1N0cmluZygpICsgJ20nO1xyXG5cdFx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblxyXG5cdFx0XHRjcmVhdGVNZXRyb25vbWUoKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHR2YXIgcG9zQXJyID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKTtcclxuXHRcdFx0XHRcdHZhciBsZWZ0UG9zID0gKChwYXJzZUludChwb3NBcnJbMF0pICogMjAwICkgKyAocGFyc2VJbnQocG9zQXJyWzFdKSAqIDUwKSArIDMwMCkudG9TdHJpbmcoKSArICdweCc7XHJcblx0XHRcdFx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gbGVmdFBvcztcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcclxuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xyXG5cdFx0XHRcdH0sICc0bicpO1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKG1ldHJvbm9tZSk7XHJcblx0XHRcdH0pO1xyXG4gICAgICAgIH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBjaGFuZ2VCcG0gPSBmdW5jdGlvbiAoYnBtKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5icG0udmFsdWUgPSBicG07XHJcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XHJcblx0fTtcclxuXHJcblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0dHJhY2sucGxheWVyLnN0b3AoKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblx0dmFyIGNyZWF0ZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHQgICAgICAgIHZhciBtZXQgPSBuZXcgVG9uZS5QbGF5ZXIoXCIvYXBpL3dhdi9DbGljazEud2F2XCIsIGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgIFx0Y29uc29sZS5sb2coJ0xPQURFRCcpO1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKG1ldCk7XHJcblx0ICAgICAgICB9KS50b01hc3RlcigpO1xyXG4gICAgICAgIH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBhZGRMb29wVG9UaW1lbGluZSA9IGZ1bmN0aW9uIChwbGF5ZXIsIHN0YXJ0VGltZUFycmF5KSB7XHJcblxyXG5cdFx0aWYoc3RhcnRUaW1lQXJyYXkuaW5kZXhPZigwKSA9PT0gLTEpIHtcclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdFx0fSwgXCIwbVwiKVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRzdGFydFRpbWVBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChzdGFydFRpbWUpIHtcclxuXHJcblx0XHRcdHZhciBzdGFydFRpbWUgPSBzdGFydFRpbWUudG9TdHJpbmcoKSArICdtJztcclxuXHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU3RhcnQnLCBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbik7XHJcblx0XHRcdFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0fSwgc3RhcnRUaW1lKTtcclxuXHJcblx0XHRcdC8vIHZhciBzdG9wVGltZSA9IHBhcnNlSW50KHN0YXJ0VGltZS5zdWJzdHIoMCwgc3RhcnRUaW1lLmxlbmd0aC0xKSkgKyAxKS50b1N0cmluZygpICsgc3RhcnRUaW1lLnN1YnN0cigtMSwxKTtcclxuXHRcdFx0Ly8vLyBjb25zb2xlLmxvZygnU1RPUCcsIHN0b3ApO1xyXG5cdFx0XHQvLy8vIHRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdC8vLy8gXHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHQvLy8vIH0sIHN0b3BUaW1lKTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0fTtcclxuXHRcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgY3JlYXRlVHJhbnNwb3J0OiBjcmVhdGVUcmFuc3BvcnQsXHJcbiAgICAgICAgY2hhbmdlQnBtOiBjaGFuZ2VCcG0sXHJcbiAgICAgICAgYWRkTG9vcFRvVGltZWxpbmU6IGFkZExvb3BUb1RpbWVsaW5lLFxyXG4gICAgICAgIGNyZWF0ZU1ldHJvbm9tZTogY3JlYXRlTWV0cm9ub21lLFxyXG4gICAgICAgIHN0b3BBbGw6IHN0b3BBbGxcclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnVG9uZVRyYWNrRmN0JywgZnVuY3Rpb24gKCRodHRwKSB7XHJcblxyXG5cdHZhciBjcmVhdGVQbGF5ZXIgPSBmdW5jdGlvbiAodXJsLCBkb25lRm4pIHtcclxuXHRcdHZhciBwbGF5ZXIgID0gbmV3IFRvbmUuUGxheWVyKHVybCwgZG9uZUZuKTtcclxuXHRcdC8vVE9ETyAtIHJlbW92ZSB0b01hc3RlclxyXG5cdFx0cGxheWVyLnRvTWFzdGVyKCk7XHJcblx0XHQvLyBwbGF5ZXIuc3luYygpO1xyXG5cdFx0cGxheWVyLmxvb3AgPSB0cnVlO1xyXG5cdFx0cmV0dXJuIHBsYXllcjtcclxuXHR9O1xyXG5cclxuXHR2YXIgbG9vcEluaXRpYWxpemUgPSBmdW5jdGlvbihibG9iLCBpbmRleCwgZmlsZW5hbWUsIGNiKSB7XHJcblx0XHQvL1BBU1NFRCBBIEJMT0IgRlJPTSBSRUNPUkRFUkpTRkFDVE9SWSAtIERST1BQRUQgT04gTUVBU1VSRSAwXHJcblx0XHR2YXIgdXJsID0gKHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0dmFyIGxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNhdmVcIitpbmRleCk7XHJcblx0XHRsaW5rLmhyZWYgPSB1cmw7XHJcblx0XHRsaW5rLmRvd25sb2FkID0gZmlsZW5hbWUgfHwgJ291dHB1dCcraW5kZXgrJy53YXYnO1xyXG5cdFx0d2luZG93LmxhdGVzdFJlY29yZGluZyA9IGJsb2I7XHJcblx0XHR3aW5kb3cubGF0ZXN0UmVjb3JkaW5nVVJMID0gdXJsO1xyXG5cdFx0dmFyIHBsYXllcjtcclxuXHJcblx0XHR2YXIgZG9uZUxvYWRpbmdDYiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gY2IocGxheWVyKTtcclxuXHRcdH07XHJcblx0XHQvL1RPRE8gLSByZW1vdmUgdG9NYXN0ZXJcclxuXHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGRvbmVMb2FkaW5nQ2IpLnRvTWFzdGVyKCk7XHJcblx0fTtcclxuXHJcblx0dmFyIGVmZmVjdHNJbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgY2hvcnVzID0gbmV3IFRvbmUuQ2hvcnVzKCk7XHJcblx0XHR2YXIgcGhhc2VyID0gbmV3IFRvbmUuUGhhc2VyKCk7XHJcblx0XHR2YXIgZGlzdG9ydCA9IG5ldyBUb25lLkRpc3RvcnRpb24oKTtcclxuXHRcdHZhciBwaW5ncG9uZyA9IG5ldyBUb25lLlBpbmdQb25nRGVsYXkoKTtcclxuXHRcdGNob3J1cy53ZXQudmFsdWUgPSAwO1xyXG5cdFx0cGhhc2VyLndldC52YWx1ZSA9IDA7XHJcblx0XHRkaXN0b3J0LndldC52YWx1ZSA9IDA7XHJcblx0XHRwaW5ncG9uZy53ZXQudmFsdWUgPSAwO1xyXG5cdFx0Y2hvcnVzLmNvbm5lY3QocGhhc2VyKTtcclxuXHRcdHBoYXNlci5jb25uZWN0KGRpc3RvcnQpO1xyXG5cdFx0ZGlzdG9ydC5jb25uZWN0KHBpbmdwb25nKTtcclxuXHRcdHBpbmdwb25nLnRvTWFzdGVyKCk7XHJcblxyXG5cdFx0cmV0dXJuIFtjaG9ydXMsIHBoYXNlciwgZGlzdG9ydCwgcGluZ3BvbmddO1xyXG5cdH1cclxuXHJcblx0dmFyIGNoYW5nZVdldG5lc3MgPSBmdW5jdGlvbihlZmZlY3QsIGFtb3VudCkge1xyXG5cdFx0ZWZmZWN0LndldC52YWx1ZSA9IGFtb3VudDtcclxuXHR9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBjcmVhdGVQbGF5ZXI6IGNyZWF0ZVBsYXllcixcclxuICAgICAgICBsb29wSW5pdGlhbGl6ZTogbG9vcEluaXRpYWxpemUsXHJcbiAgICAgICAgZWZmZWN0c0luaXRpYWxpemU6IGVmZmVjdHNJbml0aWFsaXplLFxyXG4gICAgICAgIGNoYW5nZVdldG5lc3M6IGNoYW5nZVdldG5lc3NcclxuICAgIH07XHJcblxyXG59KTtcclxuIiwiYXBwLmZhY3RvcnkoJ3VzZXJGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xyXG5cdHJldHVybiB7XHJcblx0XHRnZXRBbGxQcm9qZWN0czogZnVuY3Rpb24odXNlcklEKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXJzJywge1xyXG5cdFx0XHRcdHBhcmFtczoge19pZDogdXNlcklEfVxyXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFx0XHJcblx0XHRnZXRGb3JrczogZnVuY3Rpb24odXNlcklEKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3Byb2plY3RzJywge1xyXG5cdFx0XHRcdHBhcmFtczoge3VzZXI6IHVzZXJJRH1cclxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ2FwaS91c2VycycsIHtcclxuXHRcdFx0XHRwYXJhbXM6IHtfaWQ6IHVzZXJJRH1cclxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn0pIiwiYXBwLmRpcmVjdGl2ZSgnZHJhZ2dhYmxlJywgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XHJcbiAgICB2YXIgZWwgPSBlbGVtZW50WzBdO1xyXG4gICAgXHJcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xyXG4gICAgXHJcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnc3RhcnQnLCBmdW5jdGlvbihlKSB7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKCdkcmFnc3RhcnQnLCBlKTtcclxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xyXG4gICAgICAgIGUuZGF0YVRyYW5zZmVyLnNldERhdGEoJ1RleHQnLCB0aGlzLmlkKTtcclxuICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ2RyYWcnKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9LFxyXG4gICAgICBmYWxzZVxyXG4gICAgKTtcclxuICAgIFxyXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VuZCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnZHJhZ2VuZCcpO1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSxcclxuICAgICAgZmFsc2VcclxuICAgICk7XHJcblxyXG4gIH1cclxufSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdkcm9wcGFibGUnLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgc2NvcGU6IHtcclxuICAgICAgZHJvcDogJyYnIC8vIHBhcmVudFxyXG4gICAgfSxcclxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgIC8vIGFnYWluIHdlIG5lZWQgdGhlIG5hdGl2ZSBvYmplY3RcclxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcclxuICAgICAgXHJcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcclxuICAgICAgICAgIC8vIGFsbG93cyB1cyB0byBkcm9wXHJcbiAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ2RyYWdlbnRlcicpO1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2xlYXZlJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ2RyYWdsZWF2ZScpO1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIGZ1bmN0aW9uKGUpIHtcclxuXHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnZHJvcCcsIGUudG9FbGVtZW50KTtcclxuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cclxuICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICAvLyBlLnRvRWxlbWVudC5jbGFzc0xpc3QuYWRkKCd0YWtlbicpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgaXRlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGUuZGF0YVRyYW5zZmVyLmdldERhdGEoJ1RleHQnKSk7XHJcbiAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBjYWxsIHRoZSBkcm9wIHBhc3NlZCBkcm9wIGZ1bmN0aW9uXHJcbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXHJcbiAgICB9O1xyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB7fSxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0TmF2YmFyID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlcklEID0gdXNlci5faWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICd1c2VyUHJvZmlsZSh7dGhlSUQ6IHVzZXJJRH0pJywgYXV0aDogdHJ1ZSB9XHJcbiAgICAgICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNldE5hdmJhcigpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXHJcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAncHJvamVjdCcgfSxcclxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdTaWduIFVwJywgc3RhdGU6ICdzaWdudXAnIH0sXHJcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICd1c2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxyXG4gICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzZXRVc2VyKCk7XHJcblxyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldE5hdmJhcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCBzZXROYXZiYXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYXBwLmRpcmVjdGl2ZSgncHJvamVjdGRpcmVjdGl2ZScsIGZ1bmN0aW9uKCkge1xyXG5cdHJldHVybiB7XHJcblx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInXHJcblx0fTtcclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcigncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHN0YXRlLCBQcm9qZWN0RmN0KXtcclxuXHJcblx0JHNjb3BlLmRpc3BsYXlBUHJvamVjdCA9IGZ1bmN0aW9uKHNvbWV0aGluZyl7XHJcblx0XHRjb25zb2xlLmxvZygnVEhJTkcnLCBzb21ldGhpbmcpO1xyXG5cdFx0JHN0YXRlLmdvKCdwcm9qZWN0Jywge3Byb2plY3RJRDogc29tZXRoaW5nLl9pZH0pO1xyXG5cdFx0Ly8gY29uc29sZS5sb2coXCJkaXNwbGF5aW5nIGEgcHJvamVjdFwiLCBwcm9qZWN0SUQpO1xyXG5cdH1cclxuXHJcblx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XHJcblx0XHRjb25zb2xlLmxvZygkc3RhdGVQYXJhbXMudGhlSUQpO1xyXG5cdFx0cHJvamVjdC5vd25lciA9ICRzdGF0ZVBhcmFtcy50aGVJRDtcclxuXHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XHJcblx0XHRwcm9qZWN0LmlzRm9ya2VkID0gdHJ1ZTtcclxuXHRcdGRlbGV0ZSBwcm9qZWN0Ll9pZDtcclxuXHRcdGNvbnNvbGUubG9nKHByb2plY3QpO1xyXG5cdFx0UHJvamVjdEZjdC5jcmVhdGVBRm9yayhwcm9qZWN0KTtcclxuXHRcdC8vICRzdGF0ZS5nbygncHJvamVjdCcpXHJcblx0fVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3hpbVRyYWNrJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQW5hbHlzZXJGY3QpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdHJhY2svdHJhY2suaHRtbCcsXHJcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuXHJcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcclxuXHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjYW52YXNSb3cubGVuZ3RoOyBpKyspIHtcclxuXHJcblx0XHRcdFx0XHR2YXIgY2FudmFzQ2xhc3NlcyA9IGNhbnZhc1Jvd1tpXS5wYXJlbnROb2RlLmNsYXNzTGlzdDtcclxuXHRcclxuXHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzQ2xhc3Nlcy5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0XHRpZiAoY2FudmFzQ2xhc3Nlc1tqXSA9PT0gJ3Rha2VuJykge1xyXG5cdFx0XHRcdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbaV0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgaWQ9J3dhdmVkaXNwbGF5JyBjbGFzcz0naXRlbScgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsnIGRyYWdnYWJsZT48L2NhbnZhcz5cIikoc2NvcGUpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSwgMClcclxuXHRcdFx0c2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0XHR2YXIgdHJhY2sgPSBzY29wZS50cmFja3NbaW5kZXhdO1xyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcImxvY2F0aW9uc1wiLCB0cmFjay5sb2NhdGlvbnMpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoZSwgaW5kZXgsIHJlY29yZGVyKSB7XHJcblx0XHRcdFx0ZGVidWdnZXI7XHJcblx0XHRcdFx0c2NvcGUudHJhY2tzW2luZGV4XS5yZWNvcmRpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrc1tpbmRleF0uZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyLCBpbmRleCk7XHJcblx0XHRcdFx0dmFyIGNvbnRpbnVlVXBkYXRlID0gdHJ1ZTtcclxuXHJcblxyXG5cdFx0ICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhbmFseXNlclwiK2luZGV4KTtcclxuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xyXG5cdFx0XHRcdHZhciBhbmFseXNlcklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblxyXG5cdFx0XHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdVUERBVEUnKVxyXG5cdFx0XHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xyXG5cdFx0XHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XHJcblx0XHRcdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XHJcblx0XHRcdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcclxuXHJcblx0XHRcdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXHJcblxyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAzMDAsIDEwMCk7XHJcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gJyNGNkQ1NjUnO1xyXG5cdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cdFx0XHRcdFx0dmFyIG11bHRpcGxpZXIgPSBhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQgLyBudW1CYXJzO1xyXG5cclxuXHRcdFx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXHJcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcclxuXHRcdFx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XHJcblx0XHRcdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xyXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxyXG5cdFx0XHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcclxuXHRcdFx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcclxuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xyXG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcclxuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdTQ09QRScsIHNjb3BlKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdTQ09QRScsIHNjb3BlLnRyYWNrc1tpbmRleF0ucGxheWVyKTtcclxuXHJcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlciwgZnVuY3Rpb24gKHBsYXllcikge1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFja3NbaW5kZXhdLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFja3NbaW5kZXhdLmVtcHR5ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlVXBkYXRlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggYW5hbHlzZXJJZCApO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFja3NbaW5kZXhdLnBsYXllciA9IHBsYXllcjtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3BsYXllcicsIHBsYXllcik7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRkaWdlc3QoKTtcclxuXHRcdFx0XHRcdFx0Ly8gc2NvcGUudHJhY2tzW2luZGV4XS5wbGF5ZXIuc3RhcnQoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0sIDIwMDApO1xyXG5cclxuXHJcblxyXG5cdFx0XHRcdC8vIC8vQ0FMTFMgUkVDT1JEIElOIFJFQ09SRCBGQ1Qgd2l0aCBUSElTIFJVTk5JTkdcclxuXHRcdFx0XHQvLyAvL0FERFMgUmVjb3JkaW5nIHNjb3BlIHZhciB0byBUUlVFXHJcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ2UnLCBlLCBlLnRvRWxlbWVudCk7XHJcblx0XHRcdFx0Ly8gZSA9IGUudG9FbGVtZW50O1xyXG5cdFx0XHQgLy8gICAgLy8gc3RhcnQgcmVjb3JkaW5nXHJcblx0XHRcdCAvLyAgICBjb25zb2xlLmxvZygnc3RhcnQgcmVjb3JkaW5nJyk7XHJcblx0XHRcdCAgICBcclxuXHRcdFx0IC8vICAgIGlmICghYXVkaW9SZWNvcmRlcilcclxuXHRcdFx0IC8vICAgICAgICByZXR1cm47XHJcblxyXG5cdFx0XHQgLy8gICAgZS5jbGFzc0xpc3QuYWRkKFwicmVjb3JkaW5nXCIpO1xyXG5cdFx0XHQgLy8gICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xyXG5cdFx0XHQgLy8gICAgYXVkaW9SZWNvcmRlci5yZWNvcmQoKTtcclxuXHJcblx0XHRcdCAvLyAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHQvLyBhdWRpb1JlY29yZGVyLnN0b3AoKTtcclxuXHRcdFx0XHQvLyBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XHJcblx0XHRcdFx0Ly8gYXVkaW9SZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XHJcblxyXG5cdFx0XHRcdC8vIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHQvLyBcdHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xyXG5cdFx0XHRcdC8vIFx0c2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcclxuXHRcdFx0XHQvLyBcdGNvbnNvbGUubG9nKCd0cmFja3NzJywgc2NvcGUudHJhY2tzKTtcclxuXHRcdFx0XHQvLyBcdC8vIHdhdkFycmF5LnB1c2god2luZG93LmxhdGVzdFJlY29yZGluZyk7XHJcblx0XHRcdFx0Ly8gXHQvLyBjb25zb2xlLmxvZygnd2F2QXJyYXknLCB3YXZBcnJheSk7XHJcblx0XHRcdFx0Ly8gfSwgNTAwKTtcclxuXHRcdFx0ICAgICAgXHJcblx0XHRcdCAvLyAgICB9LCAyMDAwKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
>>>>>>> 4c268f3441715de142d85dd6d54fde54e1568b45
