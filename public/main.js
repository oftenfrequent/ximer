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
                // TODO: this is assuming that a player exists
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
            $scope.maxMeasure = 32;
            for (var i = 0; i < 8; i++) {
                var obj = {};
                obj.empty = true;
                obj.recording = false;
                obj.onTimeline = false;
                obj.previewing = false;
                obj.effectsRack = ToneTrackFct.effectsInitialize();
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

        console.log(track);
    };

    $scope.addTrack = function () {};

    $scope.play = function () {
        Tone.Transport.position = $scope.position.toString() + ':0:0';
        Tone.Transport.start();
    };
    $scope.pause = function () {
        console.log('METRONMONE', $scope.tracks);
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
    };
});
app.controller('UserInfoController', function ($scope, $state, AuthService, userFactory, $stateParams) {
    AuthService.getLoggedInUser().then(function (aUser) {
        $scope.theUser = aUser;
    });
    console.log($scope.$parent);
    // $scope.onFileSelect = function(image) {
    //     if (angular.isArray(image)) {
    //         image = image[0];
    //         console.log(image);
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
});

app.controller('UserProjectController', function ($scope, $stateParams, AuthService, userFactory) {

    // $scope.projects;

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
            console.log('All Projects are', projects);
        });
    };
    $scope.projects();

    $scope.makeFork = function (project) {

        console.log('The project is', project);
        // AuthService.getLoggedInUser(function(user){

        // 	ProjectFct.createAFork(project).then(function(response){
        // 	console.log('Response is', response);
        // });
        // })
        // $state.go('project')
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

    $scope['for'];
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

    var createTimelineInstanceOfLoop = function createTimelineInstanceOfLoop(player, measure) {
        return Tone.Transport.setTimeline(function () {
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
                var xposition = this.attributes.xposition.value;
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
                            angular.element(canvasRow[i]).append($compile('<canvas width=\'198\' height=\'98\' id=\'wavedisplay\' class=\'item\' style=\'position: absolute;\' draggable></canvas>')(scope));
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
                // console.log('pushing', position);
                scope.track.location.push(position);
                scope.track.location.sort();
                var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
                angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + index + '-' + position + '\' class=\'item\' style=\'position: absolute;\' ng-dblclick=\'dupelicate()\' draggable></canvas>')(scope));
                // console.log('track', scope.track);

                var canvas = document.getElementById('mdisplay' + index + '-' + position);
                drawBuffer(198, 98, canvas.getContext('2d'), scope.track.buffer);
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
                // console.log('IND, POS', trackIndex, position);
                // console.log(scope.track.location.indexOf(position));
                if (scope.track.onTimeline) {
                    if (loopIndex === -1) {
                        console.log('APPEAR');
                        var canvasRow = element[0].getElementsByClassName('canvas-box');
                        scope.track.location.push(position);
                        scope.track.location.sort();

                        var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
                        console.log('TIMELINE_ID', timelineId);
                        angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + trackIndex + '-' + position + '\' class=\'item\' style=\'position: absolute;\' ng-dblclick=\'dupelicate()\' draggable></canvas>')(scope));
                        // console.log('track', scope.track);
                        var canvas = document.getElementById('mdisplay' + trackIndex + '-' + position);
                        drawBuffer(198, 98, canvas.getContext('2d'), scope.track.buffer);
                    } else {
                        //remove canvas item

                        var removeElement = function removeElement(element) {
                            element && element.parentNode && element.parentNode.removeChild(element);
                        };

                        var canvas = document.getElementById('mdisplay' + trackIndex + '-' + position);
                        console.log('DISAPPEAR');
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

            scope.record = function (index) {
                // console.log('TRACKS', scope.$parent.tracks);
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

                //RECORDING STARTS AT MEASURE 1
                var micStartID = Tone.Transport.setTimeline(function () {
                    RecorderFct.recordStart(recorder, index);
                }, '1m');

                //RECORDING ENDS AT MEASURE 2
                var micEndID = Tone.Transport.setTimeline(function () {
                    RecorderFct.recordStop(index, recorder).then(function (player) {
                        scope.track.recording = false;
                        scope.track.empty = false;
                        continueUpdate = false;
                        window.cancelAnimationFrame(analyserId);
                        scope.track.player = player;
                        scope.track.player.loop = true;
                        scope.track.buffer = window.latestBuffer;
                        player.connect(scope.track.effectsRack[0]);
                        console.log('player', player);
                        console.log('IN STOPPPPPPP');
                        Tone.Transport.clearTimeline(micStartID);
                        Tone.Transport.clearTimeline(micEndID);
                        scope.$parent.stop();
                        ToneTimelineFct.unMuteAll(scope.$parent.tracks);
                    });
                }, '2m');

                Tone.Transport.start();

                // setTimeout(function () {
                // 	// console.log('SCOPE', scope);
                // 	console.log('SCOPE', scope.track.player);

                // 		// scope.$digest();
                // 		// scope.track.player.start();
                // 	});
                // }, 2000);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9OZXdQcm9qZWN0Q29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9UaW1lbGluZUNvbnRyb2xsZXIuanMiLCJjb21tb24vZmFjdG9yaWVzL0FuYWx5c2VyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Qcm9qZWN0RmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9SYW5kb21HcmVldGluZ3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2RyYWdnYWJsZS9kcmFnZ2FibGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLElBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7QUFJQSxjQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7QUFFQSxZQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7O0FBR0EsYUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDbERBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsc0JBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxNQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7QUFDQSxzQkFBQSxFQUFBLHNCQUFBO0FBQ0Esd0JBQUEsRUFBQSx3QkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGFBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7U0FDQSxDQUFBO0FBQ0EsZUFBQTtBQUNBLHlCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOzs7O0FBSUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTs7Ozs7O0FBTUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQTs7Ozs7QUFLQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDZCQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBO0FDeElBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsY0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFVBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUdBLEdBQUEsQ0FBQSxVQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBOztBQ3ZCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxxQkFBQTtBQUNBLGtCQUFBLEVBQUEsV0FBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEscUJBQUE7QUFDQSxtQkFBQSxFQUFBLHlCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLDBCQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7cUJBRUE7aUJBQ0EsQ0FBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsTUFBQSxHQUFBLFlBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxxQkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsRUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxLQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1DQUFBLENBQUEsaUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtpQkFDQSxNQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO2lCQUNBOztBQUVBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsRUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7Ozs7QUFJQSxjQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsVUFBQSxHQUFBLEVBQUEsRUFBQSxVQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsYUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtTQUNBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUlBLHVCQUFBLENBQUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7S0FFQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFlBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsY0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxtQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQy9KQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBO0FBQ0EsbUJBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsWUFBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLHFCQUFBO0FBQ0EsbUJBQUEsRUFBQSwwQkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7OztBQUdBLFlBQUEsRUFBQTtBQUNBLHdCQUFBLEVBQUEsSUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSx3QkFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEscUJBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxXQUFBO0FBQ0EsbUJBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsdUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsS0FDQSxNQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUdBLENBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxVQUFBLENBQUEsb0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FnQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsdUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQTs7Ozs7QUFLQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGdCQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsS0FDQSxNQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtDQUtBLENBQUEsQ0FBQTs7QUM3RkEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLG9CQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFdBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTs7Ozs7Ozs7S0FRQSxDQUFBO0FBQ0EsUUFBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7U0FDQTs7QUFFQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsZ0JBQUEsSUFBQSxLQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7YUFDQSxNQUNBO0FBQ0Esb0JBQUEsR0FBQSxLQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxPQUFBLENBQUE7Q0FJQSxDQUFBLENBQUE7O0FDcERBLEdBQUEsQ0FBQSxVQUFBLENBQUEsc0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsYUFBQSxHQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDaEJBLEdBQUEsQ0FBQSxVQUFBLENBQUEsb0JBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQTs7QUFFQSxRQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxJQUFBLENBQUE7O0FBR0EsY0FBQSxDQUFBLGNBQUEsQ0FBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBOztBQUVBLFlBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLFlBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLEdBQUE7QUFDQSwwQkFBQSxFQUFBLENBQUE7QUFDQSx3QkFBQSxNQUFBLEtBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSw4QkFBQSxDQUFBLE9BQUEsR0FBQSxLQUFBLENBQUE7O3FCQUVBO2lCQUNBLENBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLGlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0EsaUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7O0FBRUEsdUJBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOzs7Ozs7OztBQVFBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLFNBQUEsR0FBQSxDQUFBLENBQUEsU0FBQSxDQUFBOzs7QUFHQSxlQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsYUFBQSxFQUNBLE9BQUE7O0FBRUEsU0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsVUFBQSxDQUFBLFlBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFDQSx5QkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQSxlQUFBLENBQUE7O2FBR0EsRUFBQSxHQUFBLENBQUEsQ0FBQTtTQUVBLEVBQUEsSUFBQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQSxFQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBOztBQUVBLFlBQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsRUFBQSwwQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBOztBQUVBLG1CQUFBLENB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LG1CQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxnQkFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFFBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsV0FBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDL0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsZUFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FB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QUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsb0JBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7O0FBRUEsb0JBQUEsTUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsYUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFlBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLG9CQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQTs7OztBQUlBLHdCQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0NBQUEsQ0FBQSxjQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxrQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBSUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxnQkFBQSxNQUFBLEdBQUEsSUFBQSxVQUFBLEVBQUEsQ0FBQTs7QUFFQSxnQkFBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxhQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSwyQkFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUtBLFdBQUE7QUFDQSxpQkFBQSxFQUFBLG1CQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUE7O0FBRUEsZ0JBQUEsWUFBQSxHQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsdUJBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOztBQUVBLDJCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsUUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7O0FBRUEsdUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLDhCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSwyQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUVBO0FBQ0Esb0JBQUEsRUFBQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSxXQUFBO0FBQ0Esa0JBQUEsRUFBQSxVQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ3RJQSxZQUFBLENBQUE7O0FDQUEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxRQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxnQkFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTs7QUFFQSwyQkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSx3QkFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDRCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsU0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLEdBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEscUJBQUEsRUFBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsaUJBQUEsR0FBQSxTQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLGNBQUEsRUFBQTs7QUFFQSxZQUFBLGNBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLHNCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7YUFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBO1NBRUE7O0FBRUEsc0JBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsZ0JBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsR0FBQSxHQUFBLENBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2FBQ0EsRUFBQSxTQUFBLENBQUEsQ0FBQTs7Ozs7OztTQVFBLENBQUEsQ0FBQTtLQUVBLENBQUE7O0FBRUEsV0FBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7QUFDQSx1QkFBQSxFQUFBLGVBQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtBQUNBLGVBQUEsRUFBQSxPQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNqR0EsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLFFBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7O0FBR0EsZUFBQSxNQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsY0FBQSxHQUFBLFNBQUEsY0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsZUFBQSxJQUFBLEVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsZ0JBQUEsR0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsSUFBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsZUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxjQUFBLENBQUEsTUFBQSxHQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLEdBQUEsUUFBQSxJQUFBLFFBQUEsR0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxlQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxrQkFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLE1BQUEsQ0FBQTs7QUFFQSxrQkFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxFQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGlCQUFBLEdBQUEsU0FBQSxpQkFBQSxHQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLE1BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsT0FBQSxHQUFBLElBQUEsSUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsYUFBQSxFQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7U0FDQSxFQUFBLE9BQUEsR0FBQSxHQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxtQkFBQSxHQUFBLFNBQUEsbUJBQUEsQ0FBQSxNQUFBLEVBQUEsYUFBQSxFQUFBLFVBQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsRUFBQSxhQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsYUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxrQkFBQSxHQUFBLFNBQUEsa0JBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxRQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLG9CQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsY0FBQTtBQUNBLHlCQUFBLEVBQUEsaUJBQUE7QUFDQSxvQ0FBQSxFQUFBLDRCQUFBO0FBQ0EsMkJBQUEsRUFBQSxtQkFBQTtBQUNBLDBCQUFBLEVBQUEsa0JBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3pFQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLHdCQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxFQUFBO0FBQ0Esc0JBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBO0FBQ0EsZ0JBQUEsRUFBQSxrQkFBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLHNCQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBO2FBQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTs7QUFFQSx1QkFBQSxFQUFBLDJCQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUE7QUFDQSxzQkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDMUJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsWUFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxhQUFBLENBQUEsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLGdCQUFBLEdBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsS0FBQSxDQUFBO1NBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZ0JBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUE7U0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBO0tBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUFBLFNBQ0E7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLGdCQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxZQUFBLENBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxvQkFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7OztBQUdBLG9CQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUE7QUFDQSxvQkFBQSxhQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLENBQUE7O0FBRUEscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFNBQUEsS0FBQSxZQUFBLEVBQUE7O0FBRUEsNEJBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7O0FBRUEsNEJBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBOztBQUVBLDZCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTs7QUFFQSxnQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsUUFBQSxLQUFBLFFBQUEsRUFBQTtBQUNBLDBDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsNkNBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSx5Q0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs2QkFFQTt5QkFDQTtxQkFDQTtpQkFDQTs7QUFHQSxxQkFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxHQUFBLGFBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7OztBQUdBLHFCQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDaEhBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5REFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNOQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLHlDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsR0FBQSxTQUFBLFNBQUEsR0FBQTtBQUNBLDJCQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxTQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxjQUFBLEVBQUEsS0FBQSxFQUFBLDhCQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUNBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtBQUNBLHFCQUFBLEVBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLEtBQUEsR0FBQSxDQUNBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsS0FBQSxFQUFBLGNBQUEsRUFBQSxLQUFBLEVBQUEsYUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsQ0FDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLDBCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxnQkFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLG1CQUFBLEVBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtTQUVBOztLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUM1REEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxrQkFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxvREFBQTtBQUNBLGtCQUFBLEVBQUEsNEJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsNEJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTs7S0FFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBOztLQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUMxQkEsWUFBQSxDQUFBO0FBQ0EsR0FBQSxDQUFBLFNBQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQSxlQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseURBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLFFBQUEsR0FBQSxlQUFBLENBQUEsaUJBQUEsRUFBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDWEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHVDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLGVBQUEsR0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxZQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsU0FBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTs7QUFFQSx3QkFBQSxhQUFBLEdBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxTQUFBLENBQUE7O0FBRUEseUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxhQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsNEJBQUEsYUFBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLE9BQUEsRUFBQTtBQUNBLG1DQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEseUhBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUE7eUJBQ0E7cUJBQ0E7aUJBQ0E7YUFDQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLHFCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG9CQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxFQUFBOztBQUVBLDJCQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGdDQUFBLEVBQUEsQ0FBQTtxQkFDQTtpQkFDQTs7O0FBR0Esb0JBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsR0FBQSxNQUFBLENBQUEsb0JBQUEsQ0FBQSxPQUFBLENBQUEsMEJBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTtpQkFDQTs7QUFFQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLFFBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLEtBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLGtHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBOzs7QUFHQSxvQkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxNQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsYUFBQSxFQUFBLFVBQUEsRUFBQTtBQUNBLHVCQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxnQ0FBQSxDQUFBLG1CQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUdBLGlCQUFBLENBQUEsaUJBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLFVBQUEsR0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTs7O0FBR0Esb0JBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSx3QkFBQSxTQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSwrQkFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLDRCQUFBLFNBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsc0JBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7O0FBRUEsNEJBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLFFBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLGtHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLDRCQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtxQkFDQSxNQUFBOzs7NEJBUUEsYUFBQSxHQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLG1DQUFBLElBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxPQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTt5QkFDQTs7QUFUQSw0QkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLDZCQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLG9DQUFBLENBQUEsa0JBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtBQUtBLHFDQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7cUJBQ0E7aUJBQ0EsTUFBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxD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LCtCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtpQkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBOzs7QUFHQSxvQkFBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLCtCQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHNDQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsOEJBQUEsQ0FBQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSw4QkFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7QUFDQSw0QkFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSw0QkFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVDQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7cUJBQ0EsQ0FBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzthQTBDQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLEdBQUEsVUFBQSxtQkFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsbUJBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7aUJBQ0EsTUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0E7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBO1NBRUE7O0tBR0EsQ0FBQTtDQUNBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnbmdTdG9yYWdlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zaWdudXAgPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNyZWRlbnRpYWxzKTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4oIG9uU3VjY2Vzc2Z1bExvZ2luIClcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBzaWdudXAgY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZS5sYW5kaW5nJyx7XG4gICAgXHR1cmw6ICcvbGFuZGluZycsXG4gICAgXHR0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbGFuZGluZy5odG1sJ1xuICAgIH0pXG59KTtcblxuXG5hcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlKSB7XG5cdFxuXHQkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgIH07XG5cbiAgICBcblxuXG59KTtcblxuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbihsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9qZWN0Jywge1xuICAgICAgICB1cmw6ICcvcHJvamVjdC86cHJvamVjdElEJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9qZWN0L3Byb2plY3QuaHRtbCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignUHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQXV0aFNlcnZpY2UpIHtcblxuICB2YXIgbWF4TWVhc3VyZSA9IDA7XG5cbiAgLy8gbnVtYmVyIG9mIG1lYXN1cmVzIG9uIHRoZSB0aW1lbGluZVxuICAkc2NvcGUubnVtTWVhc3VyZXMgPSBfLnJhbmdlKDAsIDYwKTtcblxuICAvLyBsZW5ndGggb2YgdGhlIHRpbWVsaW5lXG4gICRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcblxuXHQvL0luaXRpYWxpemUgcmVjb3JkZXIgb24gcHJvamVjdCBsb2FkXG5cdFJlY29yZGVyRmN0LnJlY29yZGVySW5pdCgpLnRoZW4oZnVuY3Rpb24gKHJldEFycikge1xuXHRcdCRzY29wZS5yZWNvcmRlciA9IHJldEFyclswXTtcblx0XHQkc2NvcGUuYW5hbHlzZXJOb2RlID0gcmV0QXJyWzFdO1xuXHR9KS5jYXRjaChmdW5jdGlvbiAoZSl7XG4gICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pO1xuXG5cdCRzY29wZS5tZWFzdXJlTGVuZ3RoID0gMTtcblx0JHNjb3BlLm5hbWVDaGFuZ2luZyA9IGZhbHNlO1xuXHQkc2NvcGUudHJhY2tzID0gW107XG5cdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcblx0JHNjb3BlLnByb2plY3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9qZWN0SUQ7XG5cdCRzY29wZS5wb3NpdGlvbiA9IDA7XG5cblx0UHJvamVjdEZjdC5nZXRQcm9qZWN0SW5mbygkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XG5cdFx0dmFyIGxvYWRlZCA9IDA7XG5cdFx0Y29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcblx0XHQkc2NvcGUucHJvamVjdE5hbWUgPSBwcm9qZWN0Lm5hbWU7XG5cblx0XHRpZiAocHJvamVjdC50cmFja3MubGVuZ3RoKSB7XG5cdFx0XHRwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuXHRcdFx0XHR2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0bG9hZGVkKys7XG5cdFx0XHRcdFx0aWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQvLyBUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdFx0dmFyIG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIHRyYWNrLmxvY2F0aW9ucyk7XG5cdFx0XHRcdGlmKG1heCArIDIgPiBtYXhNZWFzdXJlKSBtYXhNZWFzdXJlID0gbWF4ICsgMjtcblx0XHRcdFx0XG5cdFx0XHRcdHRyYWNrLmVtcHR5ID0gZmFsc2U7XG5cdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xuXHRcdFx0XHQvLyBUT0RPOiB0aGlzIGlzIGFzc3VtaW5nIHRoYXQgYSBwbGF5ZXIgZXhpc3RzXG5cdFx0XHRcdHRyYWNrLnBsYXllciA9IFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBkb25lTG9hZGluZyk7XG5cdFx0XHRcdC8vaW5pdCBlZmZlY3RzLCBjb25uZWN0LCBhbmQgYWRkIHRvIHNjb3BlXG5cdFx0XHRcdHRyYWNrLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKCk7XG5cdFx0XHRcdHRyYWNrLnBsYXllci5jb25uZWN0KHRyYWNrLmVmZmVjdHNSYWNrWzBdKTtcblxuXHRcdFx0XHRpZih0cmFjay5sb2NhdGlvbnMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0LmFkZExvb3BUb1RpbWVsaW5lKHRyYWNrLnBsYXllciwgdHJhY2subG9jYXRpb25zKTtcblx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0cmFjay5vblRpbWVsaW5lID0gZmFsc2U7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCRzY29wZS5tYXhNZWFzdXJlID0gMzI7XG4gIFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgXHRcdFx0XHR2YXIgb2JqID0ge307XG4gICAgXHRcdFx0XHRvYmouZW1wdHkgPSB0cnVlO1xuICAgIFx0XHRcdFx0b2JqLnJlY29yZGluZyA9IGZhbHNlO1xuICAgIFx0XHRcdFx0b2JqLm9uVGltZWxpbmUgPSBmYWxzZTtcbiAgICBcdFx0XHRcdG9iai5wcmV2aWV3aW5nID0gZmFsc2U7XG4gICAgXHRcdFx0XHRvYmouZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoKTtcbiAgICBcdFx0XHRcdG9iai5wbGF5ZXIgPSBudWxsO1xuICAgIFx0XHRcdFx0b2JqLm5hbWUgPSAnVHJhY2sgJyArIChpKzEpO1xuICAgIFx0XHRcdFx0b2JqLmxvY2F0aW9uID0gW107XG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcbiAgXHRcdFx0fVxuXHRcdCAgfVxuXG5cdFx0Ly9keW5hbWljYWxseSBzZXQgbWVhc3VyZXNcblx0XHQvL2lmIGxlc3MgdGhhbiAxNiBzZXQgMTggYXMgbWluaW11bVxuXHRcdCRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xuXHRcdGlmKG1heE1lYXN1cmUgPCAzMikgbWF4TWVhc3VyZSA9IDM0O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4TWVhc3VyZTsgaSsrKSB7XG5cdFx0XHQkc2NvcGUubnVtTWVhc3VyZXMucHVzaChpKTtcblx0XHR9XG5cdFx0Y29uc29sZS5sb2coJ01FQVNVUkVTJywgJHNjb3BlLm51bU1lYXN1cmVzKTtcblxuXG5cblx0XHRUb25lVGltZWxpbmVGY3QuY3JlYXRlVHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lID0gbWV0cm9ub21lO1xuXHRcdH0pO1xuXHRcdFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xuXG5cdH0pO1xuXG5cdCRzY29wZS5kcm9wSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdHZhciB0cmFjayA9IHNjb3BlLnRyYWNrc1tpbmRleF07XG5cblx0XHRjb25zb2xlLmxvZyh0cmFjayk7XG5cdH1cblxuXHQkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cblx0fTtcblxuXHQkc2NvcGUucGxheSA9IGZ1bmN0aW9uICgpIHtcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcblx0fVxuXHQkc2NvcGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0Y29uc29sZS5sb2coJ01FVFJPTk1PTkUnLCAkc2NvcGUudHJhY2tzKTtcblx0XHQkc2NvcGUubWV0cm9ub21lLnN0b3AoKTtcblx0XHRUb25lVGltZWxpbmVGY3Quc3RvcEFsbCgkc2NvcGUudHJhY2tzKTtcblx0XHQkc2NvcGUucG9zaXRpb24gPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpWzBdO1xuXHRcdGNvbnNvbGUubG9nKCdQT1MnLCAkc2NvcGUucG9zaXRpb24pO1xuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcblx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gKCRzY29wZS5wb3NpdGlvbiAqIDIwMCArIDMwMCkudG9TdHJpbmcoKSsncHgnO1xuXHRcdFRvbmUuVHJhbnNwb3J0LnBhdXNlKCk7XG5cdH1cblx0JHNjb3BlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XG5cdFx0JHNjb3BlLnBvc2l0aW9uID0gMDtcblx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICczMDBweCc7XG5cdFx0VG9uZS5UcmFuc3BvcnQuc3RvcCgpO1xuXHR9XG5cdCRzY29wZS5uYW1lQ2hhbmdlID0gZnVuY3Rpb24obmV3TmFtZSkge1xuXHRcdGNvbnNvbGUubG9nKCdTSE9XIElOUFVUJywgbmV3TmFtZSk7XG5cdFx0JHNjb3BlLm5hbWVDaGFuZ2luZyA9IGZhbHNlO1xuXHR9XG5cblx0JHNjb3BlLnRvZ2dsZU1ldHJvbm9tZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZigkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9PT0gMCkge1xuXHRcdFx0JHNjb3BlLm1ldHJvbm9tZS52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XG5cdFx0fVxuXHR9XG5cbiAgJHNjb3BlLnNlbmRUb0FXUyA9IGZ1bmN0aW9uICgpIHtcblxuICAgIFJlY29yZGVyRmN0LnNlbmRUb0FXUygkc2NvcGUudHJhY2tzKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAvLyB3YXZlIGxvZ2ljXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcblxuICAgIH0pO1xuICB9O1xuICBcbiAgJHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgY29uc29sZS5sb2coc2lnbnVwSW5mbyk7XG4gICAgICAgIEF1dGhTZXJ2aWNlLnNpZ251cChzaWdudXBJbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VyUHJvZmlsZScsIHtcbiAgICAgICAgdXJsOiAnL3VzZXJwcm9maWxlLzp0aGVJRCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci91c2VycHJvZmlsZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJyxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUuYXJ0aXN0SW5mbycsIHtcbiAgICAgICAgdXJsOiAnL2luZm8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvaW5mby5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJJbmZvQ29udHJvbGxlcidcbiAgICB9KVxuICAgIC5zdGF0ZSgndXNlclByb2ZpbGUucHJvamVjdCcsIHtcbiAgICAgICAgdXJsOiAnL3Byb2plY3RzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2plY3RzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlclByb2plY3RDb250cm9sbGVyJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgdXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24oYVVzZXIpe1xuICAgICAgICAkc2NvcGUudGhlVXNlciA9IGFVc2VyO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmRpc3BsYXlTZXR0aW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcbiAgICAgICAgZWxzZSAkc2NvcGUuc2hvd1NldHRpbmdzID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnNob3dTZXR0aW5ncyk7XG4gICAgfVxuXG5cbn0pO1xuYXBwLmNvbnRyb2xsZXIoJ1VzZXJJbmZvQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSwgQXV0aFNlcnZpY2UsIHVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcbiAgICAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygkc2NvcGUuJHBhcmVudCk7XG4gICAgICAgIC8vICRzY29wZS5vbkZpbGVTZWxlY3QgPSBmdW5jdGlvbihpbWFnZSkge1xuICAgICAgICAvLyAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShpbWFnZSkpIHtcbiAgICAgICAgLy8gICAgICAgICBpbWFnZSA9IGltYWdlWzBdO1xuICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKGltYWdlKTtcbiAgICAgICAgLy8gICAgIH1cblxuICAgICAgICAvLyAgICAgLy8gVGhpcyBpcyBob3cgSSBoYW5kbGUgZmlsZSB0eXBlcyBpbiBjbGllbnQgc2lkZVxuICAgICAgICAvLyAgICAgaWYgKGltYWdlLnR5cGUgIT09ICdpbWFnZS9wbmcnICYmIGltYWdlLnR5cGUgIT09ICdpbWFnZS9qcGVnJykge1xuICAgICAgICAvLyAgICAgICAgIGFsZXJ0KCdPbmx5IFBORyBhbmQgSlBFRyBhcmUgYWNjZXB0ZWQuJyk7XG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyAgICAgfVxuXG4gICAgICAgIC8vICAgICAkc2NvcGUudXBsb2FkSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgIC8vICAgICAkc2NvcGUudXBsb2FkUHJvZ3Jlc3MgPSAwO1xuXG4gICAgICAgIC8vICAgICAkc2NvcGUudXBsb2FkID0gJHVwbG9hZC51cGxvYWQoe1xuICAgICAgICAvLyAgICAgICAgIHVybDogJy91cGxvYWQvaW1hZ2UnLFxuICAgICAgICAvLyAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAvLyAgICAgICAgIGZpbGU6IGltYWdlXG4gICAgICAgIC8vICAgICB9KS5wcm9ncmVzcyhmdW5jdGlvbihldmVudCkge1xuICAgICAgICAvLyAgICAgICAgICRzY29wZS51cGxvYWRQcm9ncmVzcyA9IE1hdGguZmxvb3IoZXZlbnQubG9hZGVkIC8gZXZlbnQudG90YWwpO1xuICAgICAgICAvLyAgICAgICAgICRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgLy8gICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgLy8gICAgICAgICAkc2NvcGUudXBsb2FkSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICAvLyAgICAgICAgIC8vIElmIHlvdSBuZWVkIHVwbG9hZGVkIGZpbGUgaW1tZWRpYXRlbHkgXG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLnVwbG9hZGVkSW1hZ2UgPSBKU09OLnBhcnNlKGRhdGEpOyAgICAgIFxuICAgICAgICAvLyAgICAgfSkuZXJyb3IoZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLnVwbG9hZEluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgdXBsb2FkaW5nIGZpbGU6ICcgKyBlcnIubWVzc2FnZSB8fCBlcnIpO1xuICAgICAgICAvLyAgICAgfSk7XG4gICAgICAgIC8vIH07XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1VzZXJQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsIHVzZXJGYWN0b3J5KSB7XG5cbiAgICAvLyAkc2NvcGUucHJvamVjdHM7XG5cbiAgICAvL3R1cm4gdGhpcyBpbnRvIGEgcHJvbWlzZSBzbyB5b3UgZ2V0IGxvZ2dlZCBpbiB1c2VyIGFuZCB0aGVuIHRoZSBwcm9qZWN0cyBvZiB0aGF0IHVzZXJcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGFVc2VyKXtcbiAgICAgICAgJHNjb3BlLnRoZVVzZXIgPSBhVXNlcjtcbiAgICAgICAgdXNlckZhY3RvcnkuZ2V0QWxsUHJvamVjdHMoJHNjb3BlLnRoZVVzZXIuX2lkKS50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgJHNjb3BlLnByb2plY3RzID0gZGF0YTtcbiAgICAgICAgICAgIGlmKCRzY29wZS5zaG93UHJvamVjdHMpICRzY29wZS5zaG93UHJvamVjdHMgPSBmYWxzZTtcbiAgICAgICAgICAgIGVsc2UgJHNjb3BlLnNob3dQcm9qZWN0cyA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUucHJvamVjdHMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICAgICAgXG4gIFxuICAgIFxuXG59KTsiLCJcbmFwcC5jb250cm9sbGVyKCdIb21lQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFRvbmVUcmFja0ZjdCwgUHJvamVjdEZjdCwgJHN0YXRlUGFyYW1zLCAkc3RhdGUpIHtcblx0Y29uc29sZS5sb2coJ2luIEhvbWUgY29udHJvbGxlcicpO1xuXHR2YXIgdHJhY2tCdWNrZXQgPSBbXTtcblx0JHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnByb2plY3RzID0gZnVuY3Rpb24gKCl7XG4gICAgXHRjb25zb2xlLmxvZygnaW4gaGVyZScpXG4gICAgXHRQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCkudGhlbihmdW5jdGlvbihwcm9qZWN0cyl7XG4gICAgXHRcdCRzY29wZS5hbGxQcm9qZWN0cz1wcm9qZWN0cztcbiAgICBcdFx0Y29uc29sZS5sb2coJ0FsbCBQcm9qZWN0cyBhcmUnLCBwcm9qZWN0cylcbiAgICBcdH0pXG4gICAgfVxuJHNjb3BlLnByb2plY3RzKCk7XG5cblx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cblx0XHRjb25zb2xlLmxvZygnVGhlIHByb2plY3QgaXMnLCBwcm9qZWN0KTtcblx0XHQvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoZnVuY3Rpb24odXNlcil7XG5cblx0XHQvLyBcdFByb2plY3RGY3QuY3JlYXRlQUZvcmsocHJvamVjdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZygnUmVzcG9uc2UgaXMnLCByZXNwb25zZSk7XG5cdFx0Ly8gfSk7XG5cdFx0Ly8gfSlcblx0XHQvLyAkc3RhdGUuZ28oJ3Byb2plY3QnKVxuXHR9XG5cdHZhciBzdG9wID1mYWxzZTtcblxuXHQkc2NvcGUuc2FtcGxlVHJhY2sgPSBmdW5jdGlvbih0cmFjayl7XG5cblx0XHRpZihzdG9wPT09dHJ1ZSl7XG5cdFx0XHQkc2NvcGUucGxheWVyLnN0b3AoKVxuXHRcdH1cblxuXHRcdFRvbmVUcmFja0ZjdC5jcmVhdGVQbGF5ZXIodHJhY2sudXJsLCBmdW5jdGlvbihwbGF5ZXIpe1xuXHRcdFx0JHNjb3BlLnBsYXllciA9IHBsYXllcjtcblx0XHRcdGlmKHN0b3A9PT1mYWxzZSl7XG5cdFx0XHRcdHN0b3A9dHJ1ZVxuXHRcdFx0XHQkc2NvcGUucGxheWVyLnN0YXJ0KCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRzdG9wPWZhbHNlO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHQkc2NvcGUuZm9yXG4gICAgXG5cblxufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdOZXdQcm9qZWN0Q29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgQXV0aFNlcnZpY2UsIFByb2plY3RGY3QsICRzdGF0ZSl7XG5cdCRzY29wZS51c2VyO1xuXG5cdCBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGlzJywgJHNjb3BlLnRoZVVzZXIudXNlcm5hbWUpXG4gICAgfSk7XG5cblx0ICRzY29wZS5uZXdQcm9qZWN0QnV0ID0gZnVuY3Rpb24oKXtcblx0IFx0UHJvamVjdEZjdC5uZXdQcm9qZWN0KCRzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHByb2plY3RJZCl7XG5cdCBcdFx0Y29uc29sZS5sb2coJ1N1Y2Nlc3MgaXMnLCBwcm9qZWN0SWQpXG5cdFx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBwcm9qZWN0SWR9KTtcdCBcdFxuXHRcdH0pXG5cblx0IH1cblxufSkiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcbiAgXG4gIHZhciB3YXZBcnJheSA9IFtdO1xuICBcbiAgJHNjb3BlLm51bU1lYXN1cmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgNjA7IGkrKykge1xuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xuICB9XG5cbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xuICAkc2NvcGUudHJhY2tzID0gW107XG4gICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcblxuXG4gIFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJzU1OTRjMjBhZDA3NTljZDQwY2U1MWUxNCcpLnRoZW4oZnVuY3Rpb24gKHByb2plY3QpIHtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICBjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xuXG4gICAgICBpZiAocHJvamVjdC50cmFja3MubGVuZ3RoKSB7XG4gICAgICAgIHByb2plY3QudHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICAgICAgaWYobG9hZGVkID09PSBwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9uZS5UcmFuc3BvcnQuc3RhcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJhY2sucGxheWVyID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGRvbmVMb2FkaW5nKTtcbiAgICAgICAgICAgIFRvbmVUaW1lbGluZUZjdC5hZGRMb29wVG9UaW1lbGluZSh0cmFjay5wbGF5ZXIsIHRyYWNrLmxvY2F0aW9ucyk7XG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzLnB1c2godHJhY2spO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjsgaSsrKSB7XG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgIG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcbiAgICAgICAgICBvYmoubG9jYXRpb25zID0gW107XG4gICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgVG9uZVRpbWVsaW5lRmN0LmdldFRyYW5zcG9ydChwcm9qZWN0LmVuZE1lYXN1cmUpO1xuICAgICAgVG9uZVRpbWVsaW5lRmN0LmNoYW5nZUJwbShwcm9qZWN0LmJwbSk7XG5cbiAgfSk7XG5cbiAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihhVXNlcil7XG4gIC8vICAgICAkc2NvcGUudGhlVXNlciA9IGFVc2VyO1xuICAvLyAgICAgLy8gJHN0YXRlUGFyYW1zLnRoZUlEID0gYVVzZXIuX2lkXG4gIC8vICAgICBjb25zb2xlLmxvZyhcImlkXCIsICRzdGF0ZVBhcmFtcyk7XG4gIC8vIH0pO1xuXG4gICRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoZSwgaW5kZXgpIHtcblxuICBcdGUgPSBlLnRvRWxlbWVudDtcblxuICAgICAgICAvLyBzdGFydCByZWNvcmRpbmdcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0IHJlY29yZGluZycpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFhdWRpb1JlY29yZGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGUuY2xhc3NMaXN0LmFkZChcInJlY29yZGluZ1wiKTtcbiAgICAgICAgYXVkaW9SZWNvcmRlci5jbGVhcigpO1xuICAgICAgICBhdWRpb1JlY29yZGVyLnJlY29yZCgpO1xuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1ZGlvUmVjb3JkZXIuc3RvcCgpO1xuICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcbiAgICAgICAgICBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcbiAgICAgICAgICBcbiAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XG4gICAgICAgICAgICAvLyAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcblxuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgXG4gICAgICAgIH0sIDIwMDApO1xuXG4gIH1cblxuICAkc2NvcGUuYWRkVHJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cbiAgfTtcblxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgdmFyIGF3c1RyYWNrcyA9ICRzY29wZS50cmFja3MuZmlsdGVyKGZ1bmN0aW9uKHRyYWNrLGluZGV4KXtcbiAgICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pe1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIFJlY29yZGVyRmN0LnNlbmRUb0FXUyhhd3NUcmFja3MsICc1NTk1YTdmYWFhOTAxYWQ2MzIzNGY5MjAnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAvLyB3YXZlIGxvZ2ljXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcblxuICAgIH0pO1xuICB9O1xuXG5cblx0XG5cblxufSk7XG5cblxuIiwiYXBwLmZhY3RvcnkoJ0FuYWx5c2VyRmN0JywgZnVuY3Rpb24oKSB7XG5cblx0dmFyIHVwZGF0ZUFuYWx5c2VycyA9IGZ1bmN0aW9uIChhbmFseXNlckNvbnRleHQsIGFuYWx5c2VyTm9kZSwgY29udGludWVVcGRhdGUpIHtcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdVUERBVEUnKVxuXHRcdFx0dmFyIFNQQUNJTkcgPSAzO1xuXHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XG5cdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XG5cdFx0XHR2YXIgZnJlcUJ5dGVEYXRhID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXJOb2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcblxuXHRcdFx0YW5hbHlzZXJOb2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFCeXRlRGF0YSk7IFxuXG5cdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcblx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XG5cdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XG5cdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XG5cblx0XHRcdC8vIERyYXcgcmVjdGFuZ2xlIGZvciBlYWNoIGZyZXF1ZW5jeSBiaW4uXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xuXHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcblx0XHRcdFx0dmFyIG9mZnNldCA9IE1hdGguZmxvb3IoIGkgKiBtdWx0aXBsaWVyICk7XG5cdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxuXHRcdFx0XHQgICAgbWFnbml0dWRlICs9IGZyZXFCeXRlRGF0YVtvZmZzZXQgKyBqXTtcblx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcblx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xuXHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gXCJoc2woIFwiICsgTWF0aC5yb3VuZCgoaSozNjApL251bUJhcnMpICsgXCIsIDEwMCUsIDUwJSlcIjtcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XG5cdFx0XHR9XG5cdFx0XHRpZihjb250aW51ZVVwZGF0ZSkge1xuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XG5cdH1cblxuXG5cdHZhciBjYW5jZWxBbmFseXNlclVwZGF0ZXMgPSBmdW5jdGlvbiAoYW5hbHlzZXJJZCkge1xuXHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSggYW5hbHlzZXJJZCApO1xuXHR9XG5cdHJldHVybiB7XG5cdFx0dXBkYXRlQW5hbHlzZXJzOiB1cGRhdGVBbmFseXNlcnMsXG5cdFx0Y2FuY2VsQW5hbHlzZXJVcGRhdGVzOiBjYW5jZWxBbmFseXNlclVwZGF0ZXNcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1Byb2plY3RGY3QnLCBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0UHJvamVjdEluZm8gPSBmdW5jdGlvbiAocHJvamVjdElkKSB7XG5cbiAgICAgICAgLy9pZiBjb21pbmcgZnJvbSBIb21lQ29udHJvbGxlciBhbmQgbm8gSWQgaXMgcGFzc2VkLCBzZXQgaXQgdG8gJ2FsbCdcbiAgICAgICAgdmFyIHByb2plY3RpZD0gcHJvamVjdElkIHx8ICdhbGwnXG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvamVjdHMvJyArIHByb2plY3RpZCB8fCBwcm9qZWN0aWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgY3JlYXRlQUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzLycsIHByb2plY3QpLnRoZW4oZnVuY3Rpb24oZm9yayl7XG4gICAgXHRcdHJldHVybiAkaHR0cC5wdXQoJ2FwaS91c2Vycy8nLCBmb3JrLmRhdGEpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgIFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgIFx0XHR9KTtcbiAgICBcdH0pO1xuICAgIH1cbiAgICB2YXIgbmV3UHJvamVjdCA9IGZ1bmN0aW9uKHVzZXIpe1xuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMnLHtvd25lcjp1c2VyLl9pZCwgbmFtZTonVW50aXRsZWQnLCBicG06MTIwLCBlbmRNZWFzdXJlOiAzMn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgIFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICBcdH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0UHJvamVjdEluZm86IGdldFByb2plY3RJbmZvLFxuICAgICAgICBjcmVhdGVBRm9yazogY3JlYXRlQUZvcmssXG4gICAgICAgIG5ld1Byb2plY3Q6IG5ld1Byb2plY3RcbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJ0hlbGxvLCB3b3JsZCEnLFxuICAgICAgICAnQXQgbG9uZyBsYXN0LCBJIGxpdmUhJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IScsXG4gICAgICAgICdJXFwnbSBsaWtlIGFueSBvdGhlciBwcm9qZWN0LCBleGNlcHQgdGhhdCBJIGFtIHlvdXJzLiA6KScsXG4gICAgICAgICdUaGlzIGVtcHR5IHN0cmluZyBpcyBmb3IgTGluZHNheSBMZXZpbmUuJyxcbiAgICAgICAgJ+OBk+OCk+OBq+OBoeOBr+OAgeODpuODvOOCtuODvOanmOOAgicsXG4gICAgICAgICdXZWxjb21lLiBUby4gV0VCU0lURS4nLFxuICAgICAgICAnOkQnXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmVjb3JkZXJGY3QnLCBmdW5jdGlvbiAoJGh0dHAsIEF1dGhTZXJ2aWNlLCAkcSwgVG9uZVRyYWNrRmN0LCBBbmFseXNlckZjdCkge1xuXG4gICAgdmFyIHJlY29yZGVySW5pdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIENvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgICAgICAgICB2YXIgYXVkaW9Db250ZXh0ID0gbmV3IENvbnRleHQoKTtcbiAgICAgICAgICAgIHZhciByZWNvcmRlcjtcblxuICAgICAgICAgICAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gKFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLmNhbmNlbEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jYW5jZWxBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWU7XG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IG5hdmlnYXRvci53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1velJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuICAgICAgICAgICAgLy8gYXNrIGZvciBwZXJtaXNzaW9uXG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImF1ZGlvXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1hbmRhdG9yeVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0VjaG9DYW5jZWxsYXRpb25cIjogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dBdXRvR2FpbkNvbnRyb2xcIjogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dOb2lzZVN1cHByZXNzaW9uXCI6IFwiZmFsc2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnb29nSGlnaHBhc3NGaWx0ZXJcIjogXCJmYWxzZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9wdGlvbmFsXCI6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXRQb2ludCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbiBBdWRpb05vZGUgZnJvbSB0aGUgc3RyZWFtLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWxBdWRpb0lucHV0ID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXVkaW9JbnB1dCA9IHJlYWxBdWRpb0lucHV0O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXVkaW9JbnB1dC5jb25uZWN0KGlucHV0UG9pbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYW5hbHlzZXIgbm9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHlzZXJOb2RlLmZmdFNpemUgPSAyMDQ4O1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRQb2ludC5jb25uZWN0KCBhbmFseXNlck5vZGUgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgcmVjb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZGVyID0gbmV3IFJlY29yZGVyKCBpbnB1dFBvaW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgemVyb0dhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgemVyb0dhaW4uZ2Fpbi52YWx1ZSA9IDAuMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggemVyb0dhaW4gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmNvbm5lY3QoIGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbiApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFtyZWNvcmRlciwgYW5hbHlzZXJOb2RlXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciByZWNvcmRTdGFydCA9IGZ1bmN0aW9uIChyZWNvcmRlcikge1xuICAgICAgICByZWNvcmRlci5jbGVhcigpO1xuICAgICAgICByZWNvcmRlci5yZWNvcmQoKTtcbiAgICB9XG5cbiAgICB2YXIgcmVjb3JkU3RvcCA9IGZ1bmN0aW9uIChpbmRleCwgcmVjb3JkZXIpIHtcbiAgICAgICAgcmVjb3JkZXIuc3RvcCgpO1xuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIC8vIGUuY2xhc3NMaXN0LnJlbW92ZShcInJlY29yZGluZ1wiKTtcbiAgICAgICAgICAgIHJlY29yZGVyLmdldEJ1ZmZlcnMoZnVuY3Rpb24gKGJ1ZmZlcnMpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3BsYXkgd2F2IGltYWdlXG4gICAgICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIndhdmVkaXNwbGF5XCIgKyAgaW5kZXggKTtcbiAgICAgICAgICAgICAgICBkcmF3QnVmZmVyKCAzMDAsIDEwMCwgY2FudmFzLmdldENvbnRleHQoJzJkJyksIGJ1ZmZlcnNbMF0gKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0QnVmZmVyID0gYnVmZmVyc1swXTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nSW1hZ2UgPSBjYW52YXMudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGhlIE9OTFkgdGltZSBnb3RCdWZmZXJzIGlzIGNhbGxlZCBpcyByaWdodCBhZnRlciBhIG5ldyByZWNvcmRpbmcgaXMgY29tcGxldGVkIC0gXG4gICAgICAgICAgICAgICAgLy8gc28gaGVyZSdzIHdoZXJlIHdlIHNob3VsZCBzZXQgdXAgdGhlIGRvd25sb2FkLlxuICAgICAgICAgICAgICAgIHJlY29yZGVyLmV4cG9ydFdBViggZnVuY3Rpb24gKCBibG9iICkge1xuICAgICAgICAgICAgICAgICAgICAvL25lZWRzIGEgdW5pcXVlIG5hbWVcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb3JkZXIuc2V0dXBEb3dubG9hZCggYmxvYiwgXCJteVJlY29yZGluZzAud2F2XCIgKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgbG9vcCB0aW1lXG4gICAgICAgICAgICAgICAgICAgIFRvbmVUcmFja0ZjdC5sb29wSW5pdGlhbGl6ZShibG9iLCBpbmRleCwgXCJteVJlY29yZGluZzAud2F2XCIpLnRoZW4ocmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBcblxuICAgIFxuICAgIHZhciBjb252ZXJ0VG9CYXNlNjQgPSBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pIHtcbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTCh0cmFjay5yYXdBdWRpbyk7XG4gICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cblxuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZW5kVG9BV1M6IGZ1bmN0aW9uICh0cmFja3NBcnJheSwgcHJvamVjdElkKSB7XG5cbiAgICAgICAgICAgIHZhciByZWFkUHJvbWlzZXMgPSB0cmFja3NBcnJheS5tYXAoY29udmVydFRvQmFzZTY0KTtcblxuICAgICAgICAgICAgcmV0dXJuICRxLmFsbChyZWFkUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKHN0b3JlRGF0YSkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdG9yZURhdGEnLCBzdG9yZURhdGEpO1xuXG4gICAgICAgICAgICAgICAgdHJhY2tzQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2ssIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhY2sucmF3QXVkaW8gPSBzdG9yZURhdGFbaV07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9hd3MvJywgeyB0cmFja3MgOiB0cmFja3NBcnJheSwgcHJvamVjdElkIDogcHJvamVjdElkIH0pXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGluIHNlbmRUb0FXU0ZhY3RvcnknLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICByZWNvcmRlckluaXQ6IHJlY29yZGVySW5pdCxcbiAgICAgICAgcmVjb3JkU3RhcnQ6IHJlY29yZFN0YXJ0LFxuICAgICAgICByZWNvcmRTdG9wOiByZWNvcmRTdG9wXG4gICAgfVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmZhY3RvcnkoJ1RvbmVUaW1lbGluZUZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcblxuXHR2YXIgY3JlYXRlVHJhbnNwb3J0ID0gZnVuY3Rpb24gKGxvb3BFbmQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wID0gdHJ1ZTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3BTdGFydCA9ICcwbSc7XG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wRW5kID0gbG9vcEVuZC50b1N0cmluZygpICsgJ20nO1xuXHRcdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xuXG5cdFx0XHRjcmVhdGVNZXRyb25vbWUoKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcblx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBwb3NBcnIgPSBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbi5zcGxpdCgnOicpO1xuXHRcdFx0XHRcdHZhciBsZWZ0UG9zID0gKChwYXJzZUludChwb3NBcnJbMF0pICogMjAwICkgKyAocGFyc2VJbnQocG9zQXJyWzFdKSAqIDUwKSArIDUwMCkudG9TdHJpbmcoKSArICdweCc7XG5cdFx0XHRcdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9IGxlZnRQb3M7XG5cdFx0XHRcdFx0bWV0cm9ub21lLnN0YXJ0KCk7XG5cdFx0XHRcdH0sICcxbScpO1xuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coVG9uZS5UcmFuc3BvcnQucG9zaXRpb24pO1xuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xuXHRcdFx0XHR9LCAnNG4nKTtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0cm9ub21lKTtcblx0XHRcdH0pO1xuICAgICAgICB9KTtcblx0fTtcblxuXHR2YXIgY2hhbmdlQnBtID0gZnVuY3Rpb24gKGJwbSkge1xuXHRcdFRvbmUuVHJhbnNwb3J0LmJwbS52YWx1ZSA9IGJwbTtcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XG5cdH07XG5cblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci5zdG9wKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIG11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAtMTAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciB1bk11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XG5cdFx0dHJhY2tzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG5cdFx0XHRpZih0cmFjay5wbGF5ZXIpIHRyYWNrLnBsYXllci52b2x1bWUudmFsdWUgPSAwO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciBjcmVhdGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgIHZhciBtZXQgPSBuZXcgVG9uZS5QbGF5ZXIoXCIvYXBpL3dhdi9DbGljazEud2F2XCIsIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBcdGNvbnNvbGUubG9nKCdMT0FERUQnKTtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0KTtcblx0ICAgICAgICB9KS50b01hc3RlcigpO1xuICAgICAgICB9KTtcblx0fTtcblxuXHR2YXIgYWRkTG9vcFRvVGltZWxpbmUgPSBmdW5jdGlvbiAocGxheWVyLCBzdGFydFRpbWVBcnJheSkge1xuXG5cdFx0aWYoc3RhcnRUaW1lQXJyYXkuaW5kZXhPZigwKSA9PT0gLTEpIHtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xuXHRcdFx0fSwgXCIwbVwiKVxuXG5cdFx0fVxuXG5cdFx0c3RhcnRUaW1lQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc3RhcnRUaW1lKSB7XG5cblx0XHRcdHZhciBzdGFydFRpbWUgPSBzdGFydFRpbWUudG9TdHJpbmcoKSArICdtJztcblxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnU3RhcnQnLCBUb25lLlRyYW5zcG9ydC5wb3NpdGlvbik7XG5cdFx0XHRcdHBsYXllci5zdG9wKCk7XG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xuXHRcdFx0fSwgc3RhcnRUaW1lKTtcblxuXHRcdFx0Ly8gdmFyIHN0b3BUaW1lID0gcGFyc2VJbnQoc3RhcnRUaW1lLnN1YnN0cigwLCBzdGFydFRpbWUubGVuZ3RoLTEpKSArIDEpLnRvU3RyaW5nKCkgKyBzdGFydFRpbWUuc3Vic3RyKC0xLDEpO1xuXHRcdFx0Ly8vLyBjb25zb2xlLmxvZygnU1RPUCcsIHN0b3ApO1xuXHRcdFx0Ly8vLyB0cmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8vLyBcdHBsYXllci5zdG9wKCk7XG5cdFx0XHQvLy8vIH0sIHN0b3BUaW1lKTtcblxuXHRcdH0pO1xuXG5cdH07XG5cdFxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZVRyYW5zcG9ydDogY3JlYXRlVHJhbnNwb3J0LFxuICAgICAgICBjaGFuZ2VCcG06IGNoYW5nZUJwbSxcbiAgICAgICAgYWRkTG9vcFRvVGltZWxpbmU6IGFkZExvb3BUb1RpbWVsaW5lLFxuICAgICAgICBjcmVhdGVNZXRyb25vbWU6IGNyZWF0ZU1ldHJvbm9tZSxcbiAgICAgICAgc3RvcEFsbDogc3RvcEFsbCxcbiAgICAgICAgbXV0ZUFsbDogbXV0ZUFsbCxcbiAgICAgICAgdW5NdXRlQWxsOiB1bk11dGVBbGxcbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdUb25lVHJhY2tGY3QnLCBmdW5jdGlvbiAoJGh0dHAsICRxKSB7XG5cblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xuXHRcdHZhciBwbGF5ZXIgID0gbmV3IFRvbmUuUGxheWVyKHVybCwgZG9uZUZuKTtcblx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcblx0XHQvLyBwbGF5ZXIuc3luYygpO1xuXHRcdC8vIHBsYXllci5sb29wID0gdHJ1ZTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0Ly9QQVNTRUQgQSBCTE9CIEZST00gUkVDT1JERVJKU0ZBQ1RPUlkgLSBEUk9QUEVEIE9OIE1FQVNVUkUgMFxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdHZhciBsaW5rID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYXZlXCIraW5kZXgpO1xuXHRcdFx0bGluay5ocmVmID0gdXJsO1xuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2Jztcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmcgPSBibG9iO1xuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZ1VSTCA9IHVybDtcblx0XHRcdHZhciBwbGF5ZXI7XG5cdFx0XHQvLyBUT0RPOiByZW1vdmUgdG9NYXN0ZXJcblx0XHRcdHBsYXllciA9IG5ldyBUb25lLlBsYXllcihsaW5rLmhyZWYsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIGVmZmVjdHNJbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGNob3J1cyA9IG5ldyBUb25lLkNob3J1cygpO1xuXHRcdHZhciBwaGFzZXIgPSBuZXcgVG9uZS5QaGFzZXIoKTtcblx0XHR2YXIgZGlzdG9ydCA9IG5ldyBUb25lLkRpc3RvcnRpb24oKTtcblx0XHR2YXIgcGluZ3BvbmcgPSBuZXcgVG9uZS5QaW5nUG9uZ0RlbGF5KCk7XG5cdFx0Y2hvcnVzLndldC52YWx1ZSA9IDA7XG5cdFx0cGhhc2VyLndldC52YWx1ZSA9IDA7XG5cdFx0ZGlzdG9ydC53ZXQudmFsdWUgPSAwO1xuXHRcdHBpbmdwb25nLndldC52YWx1ZSA9IDA7XG5cdFx0Y2hvcnVzLmNvbm5lY3QocGhhc2VyKTtcblx0XHRwaGFzZXIuY29ubmVjdChkaXN0b3J0KTtcblx0XHRkaXN0b3J0LmNvbm5lY3QocGluZ3BvbmcpO1xuXHRcdHBpbmdwb25nLnRvTWFzdGVyKCk7XG5cblx0XHRyZXR1cm4gW2Nob3J1cywgcGhhc2VyLCBkaXN0b3J0LCBwaW5ncG9uZ107XG5cdH07XG5cblx0dmFyIGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG1lYXN1cmUpIHtcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xuXHRcdFx0fSwgbWVhc3VyZStcIm1cIik7XG5cdH07XG5cblx0dmFyIHJlcGxhY2VUaW1lbGluZUxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpIHtcblx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbGQgdGltZWxpbmUgaWQnLCBvbGRUaW1lbGluZUlkKTtcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQob2xkVGltZWxpbmVJZCkpO1xuXHRcdFx0Ly8gVG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZXMoKTtcblx0XHRcdHJlc29sdmUoY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChwbGF5ZXIsIG5ld01lYXN1cmUpKTtcblx0XHR9KTtcblx0fTtcblx0dmFyIGRlbGV0ZVRpbWVsaW5lTG9vcCA9IGZ1bmN0aW9uKHRpbWVsaW5lSWQpIHtcblx0XHRUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lKHBhcnNlSW50KHRpbWVsaW5lSWQpKTtcblx0fTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZVBsYXllcjogY3JlYXRlUGxheWVyLFxuICAgICAgICBsb29wSW5pdGlhbGl6ZTogbG9vcEluaXRpYWxpemUsXG4gICAgICAgIGVmZmVjdHNJbml0aWFsaXplOiBlZmZlY3RzSW5pdGlhbGl6ZSxcbiAgICAgICAgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcDogY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCxcbiAgICAgICAgcmVwbGFjZVRpbWVsaW5lTG9vcDogcmVwbGFjZVRpbWVsaW5lTG9vcCxcbiAgICAgICAgZGVsZXRlVGltZWxpbmVMb29wOiBkZWxldGVUaW1lbGluZUxvb3BcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCd1c2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRnZXRBbGxQcm9qZWN0czogZnVuY3Rpb24odXNlcklEKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJ2FwaS91c2VycycsIHtcblx0XHRcdFx0cGFyYW1zOiB7X2lkOiB1c2VySUR9XG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9KTtcblx0XHR9LFx0XG5cdFx0Z2V0Rm9ya3M6IGZ1bmN0aW9uKHVzZXJJRCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCdhcGkvcHJvamVjdHMnLCB7XG5cdFx0XHRcdHBhcmFtczoge3VzZXI6IHVzZXJJRH1cblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXRVc2VyU2V0dGluZ3M6IGZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCdhcGkvdXNlcnMnLCB7XG5cdFx0XHRcdHBhcmFtczoge19pZDogdXNlcklEfVxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cbn0pIiwiYXBwLmRpcmVjdGl2ZSgnZHJhZ2dhYmxlJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XG4gICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICBcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xuICAgIFxuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgICBlLmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xuICAgICAgICBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKCdUZXh0JywgdGhpcy5pZCk7XG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnZHJhZycpO1xuXG4gICAgICAgIHZhciBpZHggPSBzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBhcnNlSW50KGF0dHJzLnBvc2l0aW9uKSk7XG4gICAgICAgIHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG4gICAgXG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VuZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBmYWxzZVxuICAgICk7XG5cbiAgfVxufSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Ryb3BwYWJsZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBkcm9wOiAnJicgLy8gcGFyZW50XG4gICAgfSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgLy8gYWdhaW4gd2UgbmVlZCB0aGUgbmF0aXZlIG9iamVjdFxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcbiAgICAgICAgICAvLyBhbGxvd3MgdXMgdG8gZHJvcFxuICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBmYWxzZVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnb3ZlcicpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2VcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdsZWF2ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgICAgXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cbiAgICAgICAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdXBvbiBkcm9wLCBjaGFuZ2luZyBwb3NpdGlvbiBhbmQgdXBkYXRpbmcgdHJhY2subG9jYXRpb24gYXJyYXkgb24gc2NvcGUgXG4gICAgICAgICAgdmFyIGl0ZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlLmRhdGFUcmFuc2Zlci5nZXREYXRhKCdUZXh0JykpO1xuICAgICAgICAgIHZhciB4cG9zaXRpb24gPSB0aGlzLmF0dHJpYnV0ZXMueHBvc2l0aW9uLnZhbHVlO1xuICAgICAgICAgIHZhciBjaGlsZE5vZGVzID0gdGhpcy5jaGlsZE5vZGVzO1xuICAgICAgICAgIHZhciBvbGRUaW1lbGluZUlkO1xuICAgICAgICAgIHZhciB0aGVDYW52YXM7XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKGNoaWxkTm9kZXNbaV0uY2xhc3NOYW1lID09PSAnY2FudmFzLWJveCcpIHtcblxuICAgICAgICAgICAgICAgICAgdGhpcy5jaGlsZE5vZGVzW2ldLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnB1c2goeHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHBhcmVudC50cmFjay5sb2NhdGlvbi5zb3J0KCk7XG5cbiAgICAgICAgICAgICAgICAgIHZhciBjYW52YXNOb2RlID0gdGhpcy5jaGlsZE5vZGVzW2ldLmNoaWxkTm9kZXM7XG5cbiAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzTm9kZS5sZW5ndGg7IGorKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhc05vZGVbal0ubm9kZU5hbWUgPT09ICdDQU5WQVMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy5wb3NpdGlvbi52YWx1ZSA9IHhwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkVGltZWxpbmVJZCA9IGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVDYW52YXMgPSBjYW52YXNOb2RlW2pdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9ICAgICBcbiAgICAgICAgICB9XG4gICAgICAgICAgXG5cbiAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQubW92ZUluVGltZWxpbmUob2xkVGltZWxpbmVJZCwgeHBvc2l0aW9uKS50aGVuKGZ1bmN0aW9uIChuZXdUaW1lbGluZUlkKSB7XG4gICAgICAgICAgICAgIHRoZUNhbnZhcy5hdHRyaWJ1dGVzLnRpbWVsaW5laWQudmFsdWUgPSBuZXdUaW1lbGluZUlkO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gY2FsbCB0aGUgZHJvcCBwYXNzZWQgZHJvcCBmdW5jdGlvblxuICAgICAgICAgIHNjb3BlLiRhcHBseSgnZHJvcCgpJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBmYWxzZVxuICAgICAgKTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHZhciBzZXROYXZiYXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXJJRCA9IHVzZXIuX2lkO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAndXNlclByb2ZpbGUoe3RoZUlEOiB1c2VySUR9KScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0TmF2YmFyKCk7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdTaWduIFVwJywgc3RhdGU6ICdzaWdudXAnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAndXNlclByb2ZpbGUnLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0TmF2YmFyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcywgc2V0TmF2YmFyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdwcm9qZWN0ZGlyZWN0aXZlJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2plY3QvcHJvamVjdERpcmVjdGl2ZS5odG1sJyxcblx0XHRjb250cm9sbGVyOiAncHJvamVjdGRpcmVjdGl2ZUNvbnRyb2xsZXInXG5cdH07XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ3Byb2plY3RkaXJlY3RpdmVDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRzdGF0ZSwgUHJvamVjdEZjdCl7XG5cblx0JHNjb3BlLmRpc3BsYXlBUHJvamVjdCA9IGZ1bmN0aW9uKHNvbWV0aGluZyl7XG5cdFx0Y29uc29sZS5sb2coJ1RISU5HJywgc29tZXRoaW5nKTtcblx0XHQkc3RhdGUuZ28oJ3Byb2plY3QnLCB7cHJvamVjdElEOiBzb21ldGhpbmcuX2lkfSk7XG5cdFx0Ly8gY29uc29sZS5sb2coXCJkaXNwbGF5aW5nIGEgcHJvamVjdFwiLCBwcm9qZWN0SUQpO1xuXHR9XG5cblx0JHNjb3BlLm1ha2VGb3JrID0gZnVuY3Rpb24ocHJvamVjdCl7XG5cdFx0Y29uc29sZS5sb2coJHN0YXRlUGFyYW1zLnRoZUlEKTtcblx0XHRwcm9qZWN0Lm93bmVyID0gJHN0YXRlUGFyYW1zLnRoZUlEO1xuXHRcdHByb2plY3QuZm9ya0lEID0gcHJvamVjdC5faWQ7XG5cdFx0cHJvamVjdC5pc0ZvcmtlZCA9IHRydWU7XG5cdFx0ZGVsZXRlIHByb2plY3QuX2lkO1xuXHRcdGNvbnNvbGUubG9nKHByb2plY3QpO1xuXHRcdFByb2plY3RGY3QuY3JlYXRlQUZvcmsocHJvamVjdCk7XG5cdFx0Ly8gJHN0YXRlLmdvKCdwcm9qZWN0Jylcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3hpbVRyYWNrJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQW5hbHlzZXJGY3QsICRxKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmh0bWwnLFxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXHRcdFx0c2NvcGUuZWZmZWN0V2V0bmVzc2VzID0gWzAsMCwwLDBdO1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZhciBjYW52YXNSb3cgPSBlbGVtZW50WzBdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NhbnZhcy1ib3gnKTtcblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbnZhc1Jvdy5sZW5ndGg7IGkrKykge1xuXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XG5cdFxuXHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgY2FudmFzQ2xhc3Nlcy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcblx0XHRcdFx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1tpXSkuYXBwZW5kKCRjb21waWxlKFwiPGNhbnZhcyB3aWR0aD0nMTk4JyBoZWlnaHQ9Jzk4JyBpZD0nd2F2ZWRpc3BsYXknIGNsYXNzPSdpdGVtJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSwgMClcblxuXHRcdFx0c2NvcGUuZHJvcEluVGltZWxpbmUgPSBmdW5jdGlvbiAoaW5kZXgpIHtcblxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xuXHRcdFx0XHRzY29wZS50cmFjay5vblRpbWVsaW5lID0gdHJ1ZTtcblx0XHRcdFx0dmFyIHBvc2l0aW9uID0gMDtcblx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xuXG5cdFx0XHRcdGlmIChzY29wZS50cmFjay5sb2NhdGlvbi5sZW5ndGgpIHtcblx0XHRcdFx0XHQvLyBkcm9wIHRoZSBsb29wIG9uIHRoZSBmaXJzdCBhdmFpbGFibGUgaW5kZXhcdFx0XHRcdFxuXHRcdFx0XHRcdHdoaWxlIChzY29wZS50cmFjay5sb2NhdGlvbi5pbmRleE9mKHBvc2l0aW9uKSA+IC0xKSB7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbisrO1xuXHRcdFx0XHRcdH1cdFx0XHRcdFx0XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBhZGRpbmcgcmF3IGltYWdlIHRvIGRiXG5cdFx0XHRcdGlmICghc2NvcGUudHJhY2suaW1nKSB7XG5cdFx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlLnJlcGxhY2UoL15kYXRhOmltYWdlXFwvcG5nO2Jhc2U2NCwvLCBcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygncHVzaGluZycsIHBvc2l0aW9uKTtcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24ucHVzaChwb3NpdGlvbik7XG5cdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcblx0XHRcdFx0dmFyIHRpbWVsaW5lSWQgPSBUb25lVHJhY2tGY3QuY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIHBvc2l0aW9uKTtcblx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1twb3NpdGlvbl0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgcG9zaXRpb24gKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgaW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOycgbmctZGJsY2xpY2s9J2R1cGVsaWNhdGUoKScgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygndHJhY2snLCBzY29wZS50cmFjayk7XG5cblx0XHRcdFx0dmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIm1kaXNwbGF5XCIgKyAgaW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICk7XG4gICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMTk4LCA5OCwgY2FudmFzLmdldENvbnRleHQoJzJkJyksIHNjb3BlLnRyYWNrLmJ1ZmZlciApO1xuXHRcdFx0fVxuXG5cdFx0XHRzY29wZS5tb3ZlSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdFTEVNRU5UJywgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSk7XG5cdFx0XHRcdFx0VG9uZVRyYWNrRmN0LnJlcGxhY2VUaW1lbGluZUxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBvbGRUaW1lbGluZUlkLCBuZXdNZWFzdXJlKS50aGVuKHJlc29sdmUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cblxuXHRcdFx0c2NvcGUuYXBwZWFyT3JEaXNhcHBlYXIgPSBmdW5jdGlvbihwb3NpdGlvbikge1xuXHRcdFx0XHR2YXIgdHJhY2tJbmRleCA9IHNjb3BlLiRwYXJlbnQudHJhY2tzLmluZGV4T2Yoc2NvcGUudHJhY2spO1xuXHRcdFx0XHR2YXIgbG9vcEluZGV4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbik7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdJTkQsIFBPUycsIHRyYWNrSW5kZXgsIHBvc2l0aW9uKTtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbikpO1xuXHRcdFx0XHRpZihzY29wZS50cmFjay5vblRpbWVsaW5lKSB7XG5cdFx0XHRcdFx0aWYobG9vcEluZGV4ID09PSAtMSkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0FQUEVBUicpO1xuXHRcdFx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24ucHVzaChwb3NpdGlvbik7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5sb2NhdGlvbi5zb3J0KCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBwb3NpdGlvbik7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnVElNRUxJTkVfSUQnLCB0aW1lbGluZUlkKTtcblx0XHRcdFx0XHRcdGFuZ3VsYXIuZWxlbWVudChjYW52YXNSb3dbcG9zaXRpb25dKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIHBvc2l0aW9uPSdcIiArIHBvc2l0aW9uICsgXCInIHRpbWVsaW5lSWQ9J1wiK3RpbWVsaW5lSWQrXCInIGlkPSdtZGlzcGxheVwiICsgIHRyYWNrSW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOycgbmctZGJsY2xpY2s9J2R1cGVsaWNhdGUoKScgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xuXHRcdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ3RyYWNrJywgc2NvcGUudHJhY2spO1xuXHRcdFx0XHRcdFx0dmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcIm1kaXNwbGF5XCIgKyAgdHJhY2tJbmRleCArIFwiLVwiICsgcG9zaXRpb24gKTtcblx0XHQgICAgICAgICAgICAgICAgZHJhd0J1ZmZlciggMTk4LCA5OCwgY2FudmFzLmdldENvbnRleHQoJzJkJyksIHNjb3BlLnRyYWNrLmJ1ZmZlciApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwibWRpc3BsYXlcIiArICB0cmFja0luZGV4ICsgXCItXCIgKyBwb3NpdGlvbiApO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0RJU0FQUEVBUicpO1xuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgZnJvbSBsb2NhdGlvbnMgYXJyYXlcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShsb29wSW5kZXgsIDEpO1xuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgdGltZWxpbmVJZFxuXHRcdFx0XHRcdFx0VG9uZVRyYWNrRmN0LmRlbGV0ZVRpbWVsaW5lTG9vcCggY2FudmFzLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZSApO1xuXHRcdFx0XHRcdFx0Ly9yZW1vdmUgY2FudmFzIGl0ZW1cblx0XHRcdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQoZWxlbWVudCkge1xuXHRcdFx0XHRcdFx0ICAgIGVsZW1lbnQgJiYgZWxlbWVudC5wYXJlbnROb2RlICYmIGVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtZW50KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlbW92ZUVsZW1lbnQoIGNhbnZhcyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnTk8gRFJPUCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ1RSQUNLUycsIHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcblx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0Lm11dGVBbGwoc2NvcGUuJHBhcmVudC50cmFja3MpO1xuXHRcdFx0XHR2YXIgcmVjb3JkZXIgPSBzY29wZS5yZWNvcmRlcjtcblxuXHRcdFx0XHR2YXIgY29udGludWVVcGRhdGUgPSB0cnVlO1xuXG5cdFx0XHRcdC8vYW5hbHlzZXIgc3R1ZmZcblx0XHQgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFuYWx5c2VyXCIraW5kZXgpO1xuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9IHNjb3BlLmFuYWx5c2VyTm9kZTtcblx0XHRcdFx0dmFyIGFuYWx5c2VySWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcblxuXHRcdFx0XHRzY29wZS50cmFjay5yZWNvcmRpbmcgPSB0cnVlO1xuXHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IHRydWU7XG5cdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyKTtcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xuXG5cblx0XHRcdFx0ZnVuY3Rpb24gdXBkYXRlKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdVUERBVEUnKVxuXHRcdFx0XHRcdHZhciBTUEFDSU5HID0gMztcblx0XHRcdFx0XHR2YXIgQkFSX1dJRFRIID0gMTtcblx0XHRcdFx0XHR2YXIgbnVtQmFycyA9IE1hdGgucm91bmQoMzAwIC8gU1BBQ0lORyk7XG5cdFx0XHRcdFx0dmFyIGZyZXFCeXRlRGF0YSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XG5cblx0XHRcdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXG5cblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFN0eWxlID0gJyNGNkQ1NjUnO1xuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcblx0XHRcdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XG5cblx0XHRcdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmb3IgZWFjaCBmcmVxdWVuY3kgYmluLlxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgKytpKSB7XG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlID0gMDtcblx0XHRcdFx0XHRcdHZhciBvZmZzZXQgPSBNYXRoLmZsb29yKCBpICogbXVsdGlwbGllciApO1xuXHRcdFx0XHRcdFx0Ly8gZ290dGEgc3VtL2F2ZXJhZ2UgdGhlIGJsb2NrLCBvciB3ZSBtaXNzIG5hcnJvdy1iYW5kd2lkdGggc3Bpa2VzXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgajwgbXVsdGlwbGllcjsgaisrKVxuXHRcdFx0XHRcdFx0ICAgIG1hZ25pdHVkZSArPSBmcmVxQnl0ZURhdGFbb2Zmc2V0ICsgal07XG5cdFx0XHRcdFx0XHRtYWduaXR1ZGUgPSBtYWduaXR1ZGUgLyBtdWx0aXBsaWVyO1xuXHRcdFx0XHRcdFx0dmFyIG1hZ25pdHVkZTIgPSBmcmVxQnl0ZURhdGFbaSAqIG11bHRpcGxpZXJdO1xuXHRcdFx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9IFwiaHNsKCBcIiArIE1hdGgucm91bmQoKGkqMzYwKS9udW1CYXJzKSArIFwiLCAxMDAlLCA1MCUpXCI7XG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFJlY3QoaSAqIFNQQUNJTkcsIDEwMCwgQkFSX1dJRFRILCAtbWFnbml0dWRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYoY29udGludWVVcGRhdGUpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cblx0XHRcdFx0Ly9SRUNPUkRJTkcgU1RBUlRTIEFUIE1FQVNVUkUgMVxuXHRcdFx0XHR2YXIgbWljU3RhcnRJRCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdGFydChyZWNvcmRlciwgaW5kZXgpO1xuXHRcdFx0XHR9LCBcIjFtXCIpO1xuXG5cdFx0XHRcdC8vUkVDT1JESU5HIEVORFMgQVQgTUVBU1VSRSAyXG5cdFx0XHRcdHZhciBtaWNFbmRJRCA9IFRvbmUuVHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlcikudGhlbihmdW5jdGlvbiAocGxheWVyKSB7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5yZWNvcmRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmVtcHR5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjb250aW51ZVVwZGF0ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKCBhbmFseXNlcklkICk7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIgPSBwbGF5ZXI7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IHRydWU7XG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5idWZmZXIgPSB3aW5kb3cubGF0ZXN0QnVmZmVyO1xuXHRcdFx0XHRcdFx0cGxheWVyLmNvbm5lY3Qoc2NvcGUudHJhY2suZWZmZWN0c1JhY2tbMF0pO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3BsYXllcicsIHBsYXllcik7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnSU4gU1RPUFBQUFBQUCcpO1xuXHRcdFx0XHRcdFx0VG9uZS5UcmFuc3BvcnQuY2xlYXJUaW1lbGluZShtaWNTdGFydElEKTtcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUobWljRW5kSUQpO1xuXHRcdFx0XHRcdFx0c2NvcGUuJHBhcmVudC5zdG9wKCk7XG5cdFx0XHRcdFx0XHRUb25lVGltZWxpbmVGY3QudW5NdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSwgXCIybVwiKTtcblxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xuXG5cdFx0XHRcdC8vIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHQvLyBcdC8vIGNvbnNvbGUubG9nKCdTQ09QRScsIHNjb3BlKTtcblx0XHRcdFx0Ly8gXHRjb25zb2xlLmxvZygnU0NPUEUnLCBzY29wZS50cmFjay5wbGF5ZXIpO1xuXG5cdFx0XHRcdC8vIFx0XHQvLyBzY29wZS4kZGlnZXN0KCk7XG5cdFx0XHRcdC8vIFx0XHQvLyBzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcblx0XHRcdFx0Ly8gXHR9KTtcblx0XHRcdFx0Ly8gfSwgMjAwMCk7XG5cblxuXG5cdFx0XHRcdC8vIC8vQ0FMTFMgUkVDT1JEIElOIFJFQ09SRCBGQ1Qgd2l0aCBUSElTIFJVTk5JTkdcblx0XHRcdFx0Ly8gLy9BRERTIFJlY29yZGluZyBzY29wZSB2YXIgdG8gVFJVRVxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygnZScsIGUsIGUudG9FbGVtZW50KTtcblx0XHRcdFx0Ly8gZSA9IGUudG9FbGVtZW50O1xuXHRcdFx0IC8vICAgIC8vIHN0YXJ0IHJlY29yZGluZ1xuXHRcdFx0IC8vICAgIGNvbnNvbGUubG9nKCdzdGFydCByZWNvcmRpbmcnKTtcblx0XHRcdCAgICBcblx0XHRcdCAvLyAgICBpZiAoIWF1ZGlvUmVjb3JkZXIpXG5cdFx0XHQgLy8gICAgICAgIHJldHVybjtcblxuXHRcdFx0IC8vICAgIGUuY2xhc3NMaXN0LmFkZChcInJlY29yZGluZ1wiKTtcblx0XHRcdCAvLyAgICBhdWRpb1JlY29yZGVyLmNsZWFyKCk7XG5cdFx0XHQgLy8gICAgYXVkaW9SZWNvcmRlci5yZWNvcmQoKTtcblxuXHRcdFx0IC8vICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyBhdWRpb1JlY29yZGVyLnN0b3AoKTtcblx0XHRcdFx0Ly8gZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xuXHRcdFx0XHQvLyBhdWRpb1JlY29yZGVyLmdldEJ1ZmZlcnMoIGdvdEJ1ZmZlcnMgKTtcblxuXHRcdFx0XHQvLyB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8vIFx0c2NvcGUudHJhY2tzW2luZGV4XS5yYXdBdWRpbyA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmc7XG5cdFx0XHRcdC8vIFx0c2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcblx0XHRcdFx0Ly8gXHRjb25zb2xlLmxvZygndHJhY2tzcycsIHNjb3BlLnRyYWNrcyk7XG5cdFx0XHRcdC8vIFx0Ly8gd2F2QXJyYXkucHVzaCh3aW5kb3cubGF0ZXN0UmVjb3JkaW5nKTtcblx0XHRcdFx0Ly8gXHQvLyBjb25zb2xlLmxvZygnd2F2QXJyYXknLCB3YXZBcnJheSk7XG5cdFx0XHRcdC8vIH0sIDUwMCk7XG5cdFx0XHQgICAgICBcblx0XHRcdCAvLyAgICB9LCAyMDAwKTtcblxuXHRcdFx0fVxuXHRcdFx0c2NvcGUucHJldmlldyA9IGZ1bmN0aW9uKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coY3VycmVudGx5UHJldmlld2luZyk7XG5cdFx0XHRcdGlmKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RvcCgpO1xuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnByZXZpZXdpbmcgPSBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIuc3RhcnQoKTtcblx0XHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVmZmVjdCk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGFtb3VudCk7XG5cblx0XHRcdFx0ZWZmZWN0LndldC52YWx1ZSA9IGFtb3VudCAvIDEwMDA7XG5cdFx0XHR9O1xuXG5cdFx0fVxuXHRcdFxuXG5cdH1cbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==