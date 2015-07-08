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
                var max = Math.max.apply(null, track.location);
                if (max + 2 > maxMeasure) maxMeasure = max + 2;

                track.empty = false;
                track.recording = false;
                // TODO: this is assuming that a player exists
                track.player = ToneTrackFct.createPlayer(track.url, doneLoading);
                //init effects, connect, and add to scope
                track.effectsRack = ToneTrackFct.effectsInitialize();
                track.player.connect(track.effectsRack[0]);

                if (track.location.length) {
                    ToneTimelineFct.addLoopToTimeline(track.player, track.location);
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

        RecorderFct.sendToAWS($scope.tracks, $scope.projectId).then(function (response) {
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
            // console.log("displaying a project", projectID);
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
    });

    // $state.go('project')
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
                console.log('pushing', position);
                scope.track.location.push(position);
                scope.track.location.sort();
                var timelineId = ToneTrackFct.createTimelineInstanceOfLoop(scope.track.player, position);
                angular.element(canvasRow[position]).append($compile('<canvas width=\'198\' height=\'98\' position=\'' + position + '\' timelineId=\'' + timelineId + '\' id=\'mdisplay' + index + '-' + position + '\' class=\'item\' style=\'position: absolute;\' draggable></canvas>')(scope));

                var canvas = document.getElementById('mdisplay' + index + '-' + position);
                drawBuffer(198, 98, canvas.getContext('2d'), scope.track.buffer);
                console.log('track', scope.track);
            };

            scope.moveInTimeline = function (oldTimelineId, newMeasure) {
                return new $q(function (resolve, reject) {
                    // console.log('ELEMENT', oldTimelineId, newMeasure);
                    ToneTrackFct.replaceTimelineLoop(scope.track.player, oldTimelineId, newMeasure).then(resolve);
                });
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
                        scope.track.rawAudio = window.latestRecording;
                        player.connect(scope.track.effectsRack[0]);
                        console.log('player', player);
                        ToneTimelineFct.unMuteAll(scope.$parent.tracks);
                        Tone.Transport.clearTimeline(micStartID);
                        Tone.Transport.clearTimeline(micEndID);
                        Tone.Transport.stop();
                    });
                }, '2m');

                Tone.Transport.start();
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

    return {
        getProjectInfo: getProjectInfo,
        createAFork: createAFork,
        newProject: newProject
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
        sendToAWS: function sendToAWS(tracksArray, projectId) {

            var readPromises = tracksArray.map(convertToBase64);

            console.log('readPromises', readPromises);

            return $q.all(readPromises).then(function (storeData) {

                console.log('storeData', storeData);

                tracksArray.forEach(function (track, i) {
                    if (storeData[i]) {
                        track.rawAudio = storeData[i];
                    }
                });

                console.log('tracksArray', tracksArray);

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

    return {
        createPlayer: createPlayer,
        loopInitialize: loopInitialize,
        effectsInitialize: effectsInitialize,
        createTimelineInstanceOfLoop: createTimelineInstanceOfLoop,
        replaceTimelineLoop: replaceTimelineLoop
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJwcm9qZWN0L3Byb2plY3QuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlci91c2VycHJvZmlsZS5qcyIsImNvbW1vbi9jb250cm9sbGVycy9Ib21lQ29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9OZXdQcm9qZWN0Q29udHJvbGxlci5qcyIsImNvbW1vbi9jb250cm9sbGVycy9UaW1lbGluZUNvbnRyb2xsZXIuanMiLCJjb21tb24vY29udHJvbGxlcnMvVXNlckNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9kcmFnZ2FibGUvZHJhZ2dhYmxlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9qZWN0L3Byb2plY3REaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiLCJjb21tb24vZGlyZWN0aXZlcy90cmFjay90cmFjay5qcyIsImNvbW1vbi9mYWN0b3JpZXMvQW5hbHlzZXJGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL0hvbWVGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1Byb2plY3RGY3QuanMiLCJjb21tb24vZmFjdG9yaWVzL1JlY29yZGVyRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RvbmVUaW1lbGluZUZjdC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvVG9uZVRyYWNrRmN0LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyRmFjdG9yeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUE7O0FBRUEscUJBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7OztBQUdBLEdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsUUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUE7S0FDQSxDQUFBOzs7O0FBSUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7O0FBRUEsWUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7OztBQUdBLGFBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLGdCQUFBLElBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7YUFDQSxNQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2xEQSxDQUFBLFlBQUE7O0FBRUEsZ0JBQUEsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSx3QkFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHNCQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsTUFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOzs7OztBQUtBLE9BQUEsQ0FBQSxRQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxvQkFBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxxQkFBQSxFQUFBLHFCQUFBO0FBQ0Esc0JBQUEsRUFBQSxzQkFBQTtBQUNBLHdCQUFBLEVBQUEsd0JBQUE7QUFDQSxxQkFBQSxFQUFBLHFCQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsWUFBQSxVQUFBLEdBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO1NBQ0EsQ0FBQTtBQUNBLGVBQUE7QUFDQSx5QkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLDBCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLENBQUEsQ0FDQSxXQUFBLEVBQ0EsVUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTtTQUNBLENBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7OztBQUlBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7Ozs7OztBQU1BLGdCQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0E7Ozs7O0FBS0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUVBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxJQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0E7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw2QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFlBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsZ0JBQUEsRUFBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEVBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7S0FFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLEVBQUEsQ0FBQTtBQ3hJQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLGNBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxVQUFBO0FBQ0EsbUJBQUEsRUFBQSxzQkFBQTtLQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNYQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxxQkFBQTtBQUNBLGtCQUFBLEVBQUEsV0FBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDM0JBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEscUJBQUE7QUFDQSxtQkFBQSxFQUFBLHlCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsV0FBQSxHQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsYUFBQSxHQUFBLENBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFlBQUEsR0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxhQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsV0FBQSxHQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsR0FBQTtBQUNBLDBCQUFBLEVBQUEsQ0FBQTtBQUNBLHdCQUFBLE1BQUEsS0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxHQUFBLEtBQUEsQ0FBQTs7cUJBRUE7aUJBQ0EsQ0FBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxVQUFBLEVBQUEsVUFBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEscUJBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsTUFBQSxHQUFBLFlBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxxQkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsRUFBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxvQkFBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLG1DQUFBLENBQUEsaUJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQTtpQkFDQSxNQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBO2lCQUNBOztBQUVBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLE1BQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxpQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFdBQUEsR0FBQSxZQUFBLENBQUEsaUJBQUEsRUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsUUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7Ozs7QUFJQSxjQUFBLENBQUEsV0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsVUFBQSxHQUFBLEVBQUEsRUFBQSxVQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsYUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtTQUNBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUlBLHVCQUFBLENBQUEsZUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7S0FFQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFlBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBLEVBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLEdBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EsY0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxZQUFBLEdBQUEsS0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsS0FBQSxDQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxtQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7O0FBRUEsbUJBQUEsQ0FBQSxHQUFBLENBQUEseUJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtTQUVBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDL0pBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBO0FBQ0Esa0JBQUEsRUFBQSxZQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMzQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEscUJBQUE7QUFDQSxtQkFBQSxFQUFBLDBCQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQTs7O0FBR0EsWUFBQSxFQUFBO0FBQ0Esd0JBQUEsRUFBQSxJQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHdCQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsT0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxxQkFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFdBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsdUJBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSx3QkFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUE7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLHVCQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsWUFBQTtBQUNBLG1CQUFBLEVBQUEsd0JBQUE7QUFDQSxrQkFBQSxFQUFBLGdCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2hDQSxHQUFBLENBQUEsVUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQTs7U0FFQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUEsRUFFQSxDQUFBO0FBQ0EsUUFBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7U0FDQTs7QUFFQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsZ0JBQUEsSUFBQSxLQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7YUFDQSxNQUNBO0FBQ0Esb0JBQUEsR0FBQSxLQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBR0EsVUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBOztBQ2pEQSxHQUFBLENBQUEsVUFBQSxDQUFBLHNCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxDQUFBOztBQUVBLGVBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2hCQSxHQUFBLENBQUEsVUFBQSxDQUFBLG9CQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxlQUFBLEVBQUE7O0FBRUEsUUFBQSxRQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxXQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLGNBQUEsQ0FBQSxjQUFBLENBQUEsMEJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxZQUFBLE1BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esb0JBQUEsV0FBQSxHQUFBLFNBQUEsV0FBQSxHQUFBO0FBQ0EsMEJBQUEsRUFBQSxDQUFBO0FBQ0Esd0JBQUEsTUFBQSxLQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxPQUFBLEdBQUEsS0FBQSxDQUFBOztxQkFFQTtpQkFDQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxDQUFBLFlBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EsK0JBQUEsQ0FBQSxpQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsTUFBQTtBQUNBLGlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFFBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBOztBQUVBLHVCQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7Ozs7Ozs7QUFRQSxVQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxTQUFBLEdBQUEsQ0FBQSxDQUFBLFNBQUEsQ0FBQTs7O0FBR0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLGFBQUEsRUFDQSxPQUFBOztBQUVBLFNBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBO0FBQ0EseUJBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLGFBQUEsQ0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxVQUFBLENBQUEsWUFBQTtBQUNBLHNCQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsZUFBQSxDQUFBOzthQUdBLEVBQUEsR0FBQSxDQUFBLENBQUE7U0FFQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsUUFBQSxHQUFBLFlBQUEsRUFFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsWUFBQTs7QUFFQSxZQUFBLFNBQUEsR0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEVBQUEsMEJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSx5QkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO1NBRUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQU1BLENBQUEsQ0FBQTs7QUN0R0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLFVBQUEsQ0FBQSxZQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBR0EsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsTUFBQSxDQUFBLFlBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxHQUFBLEtBQUEsQ0FBQSxLQUNBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLDRCQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBS0EsQ0FBQSxDQUFBO0FDL0JBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsWUFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxnQkFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxhQUFBLENBQUEsWUFBQSxDQUFBLGFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLGdCQUFBLEdBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsS0FBQSxDQUFBO1NBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxVQUFBLENBQUEsZ0JBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUE7U0FDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBO0tBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUFBLFNBQ0E7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLGdCQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxZQUFBLENBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLENBQUEsY0FBQSxFQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7O0FBRUEsY0FBQSxDQUFBLGdCQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esb0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBO2FBQ0EsRUFDQSxLQUFBLENBQ0EsQ0FBQTs7QUFFQSxjQUFBLENBQUEsZ0JBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUE7YUFDQSxFQUNBLEtBQUEsQ0FDQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSxvQkFBQSxDQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTs7QUFFQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7OztBQUdBLG9CQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsQ0FBQSxZQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUE7QUFDQSxvQkFBQSxhQUFBLENBQUE7QUFDQSxvQkFBQSxTQUFBLENBQUE7O0FBRUEscUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxVQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLFNBQUEsS0FBQSxZQUFBLEVBQUE7O0FBRUEsNEJBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsV0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7O0FBRUEsNEJBQUEsVUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBOztBQUVBLDZCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTs7QUFFQSxnQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsUUFBQSxLQUFBLFFBQUEsRUFBQTtBQUNBLDBDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsNkNBQUEsR0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSx5Q0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTs2QkFFQTt5QkFDQTtxQkFDQTtpQkFDQTs7QUFHQSxxQkFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxDQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsS0FBQSxHQUFBLGFBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7OztBQUdBLHFCQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLEtBQUEsQ0FBQTthQUNBLEVBQ0EsS0FBQSxDQUNBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDaEhBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5REFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNOQSxHQUFBLENBQUEsU0FBQSxDQUFBLGtCQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG9EQUFBO0FBQ0Esa0JBQUEsRUFBQSw0QkFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSw0QkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFJQSxlQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsTUFBQSxDQUFBLFlBQUEsQ0FBQSxHQUFBLEtBQUEsWUFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTthQUNBOztBQUFBLFNBRUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxLQUFBLEdBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxtQkFBQSxPQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7O0NBR0EsQ0FBQSxDQUFBO0FDbENBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUEseUNBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7O0FBRUEsZ0JBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBO0FBQ0EseUJBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLFNBQUEsRUFBQSxLQUFBLEVBQUEsOEJBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLENBQ0EsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBO0FBQ0EscUJBQUEsRUFBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxTQUFBLEVBQUE7O0FBRUEsY0FBQSxLQUFBLEVBQUEsY0FBQSxFQUFBLEtBQUEsRUFBQSxhQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSx1QkFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSwyQkFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsMEJBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxnQkFBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUE7QUFDQSwyQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGdCQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLHFCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsbUJBQUEsRUFBQSxDQUFBOztBQUVBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO1NBRUE7O0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQzVEQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxVQUFBLGVBQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5REFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsUUFBQSxHQUFBLGVBQUEsQ0FBQSxpQkFBQSxFQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNYQSxHQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsdUNBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsZUFBQSxHQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFlBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLHNCQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLFNBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUE7O0FBRUEsd0JBQUEsYUFBQSxHQUFBLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsU0FBQSxDQUFBOztBQUVBLHlCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsYUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLDRCQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxPQUFBLEVBQUE7QUFDQSxtQ0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLHlIQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBO3lCQUNBO3FCQUNBO2lCQUNBO2FBQ0EsRUFBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxvQkFBQSxRQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsU0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxzQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsRUFBQTs7QUFFQSwyQkFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxnQ0FBQSxFQUFBLENBQUE7cUJBQ0E7aUJBQ0E7OztBQUdBLG9CQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEdBQUEsTUFBQSxDQUFBLG9CQUFBLENBQUEsT0FBQSxDQUFBLDBCQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7aUJBQ0E7QUFDQSx1QkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EscUJBQUEsQ0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxpREFBQSxHQUFBLFFBQUEsR0FBQSxrQkFBQSxHQUFBLFVBQUEsR0FBQSxrQkFBQSxHQUFBLEtBQUEsR0FBQSxHQUFBLEdBQUEsUUFBQSxHQUFBLHFFQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsYUFBQSxFQUFBLFVBQUEsRUFBQTtBQUNBLHVCQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxnQ0FBQSxDQUFBLG1CQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLCtCQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxRQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQTs7QUFFQSxvQkFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBOzs7QUFHQSxvQkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxlQUFBLEdBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLFlBQUEsR0FBQSxLQUFBLENBQUEsWUFBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxXQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUdBLHlCQUFBLE1BQUEsR0FBQTtBQUNBLHdCQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsZ0NBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLG1DQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsbUNBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsbUNBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EseUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSw0QkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsNEJBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLDZCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsaUNBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0EsNEJBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLHVDQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO3FCQUNBO0FBQ0Esd0JBQUEsY0FBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO3FCQUNBO2lCQUNBOzs7QUFHQSxvQkFBQSxVQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLCtCQUFBLENBQUEsV0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtpQkFDQSxFQUFBLElBQUEsQ0FBQSxDQUFBOzs7QUFJQSxvQkFBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLCtCQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLHNDQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsOEJBQUEsQ0FBQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLDZCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsNkJBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLEdBQUEsTUFBQSxDQUFBLGVBQUEsQ0FBQTtBQUNBLDhCQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7cUJBQ0EsQ0FBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsb0JBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7YUFFQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLEdBQUEsVUFBQSxtQkFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsbUJBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxLQUFBLENBQUE7aUJBQ0EsTUFBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLHlCQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0E7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLE1BQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBO1NBRUE7O0tBR0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzdKQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLGlCQUFBLE1BQUEsR0FBQTtBQUNBLGdCQUFBLE9BQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsT0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsWUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLFlBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7O0FBRUEsd0JBQUEsQ0FBQSxvQkFBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLDJCQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsMkJBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxpQkFBQSxHQUFBLE9BQUEsQ0FBQTs7O0FBR0EsaUJBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxTQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBOztBQUVBLHFCQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBLEdBQUEsVUFBQSxFQUFBLENBQUEsRUFBQSxFQUNBLFNBQUEsSUFBQSxZQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EseUJBQUEsR0FBQSxTQUFBLEdBQUEsVUFBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSwrQkFBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLCtCQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsR0FBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO2FBQ0E7QUFDQSxnQkFBQSxjQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBO0FBQ0EsY0FBQSxDQUFBLHFCQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUdBLFFBQUEscUJBQUEsR0FBQSxTQUFBLHFCQUFBLENBQUEsVUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLG9CQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsV0FBQTtBQUNBLHVCQUFBLEVBQUEsZUFBQTtBQUNBLDZCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDNUNBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFdBQUE7QUFDQSxlQUFBLEVBQUEsaUJBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNiQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxTQUFBLEVBQUE7OztBQUdBLFlBQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxLQUFBLENBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsR0FBQSxTQUFBLElBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxXQUFBLEdBQUEsU0FBQSxXQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxVQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxjQUFBO0FBQ0EsbUJBQUEsRUFBQSxXQUFBO0FBQ0Esa0JBQUEsRUFBQSxVQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUMvQkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFFBQUEsWUFBQSxHQUFBLFNBQUEsWUFBQSxHQUFBOztBQUVBLGVBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLE9BQUEsR0FBQSxNQUFBLENBQUEsWUFBQSxJQUFBLE1BQUEsQ0FBQSxrQkFBQSxDQUFBO0FBQ0EsZ0JBQUEsWUFBQSxHQUFBLElBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxnQkFBQSxRQUFBLENBQUE7O0FBRUEsZ0JBQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxxQkFBQSxDQUFBLFlBQUEsR0FDQSxTQUFBLENBQUEsWUFBQSxJQUNBLFNBQUEsQ0FBQSxrQkFBQSxJQUNBLFNBQUEsQ0FBQSxlQUFBLElBQ0EsU0FBQSxDQUFBLGNBQUEsQUFDQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsRUFDQSxTQUFBLENBQUEsb0JBQUEsR0FBQSxTQUFBLENBQUEsMEJBQUEsSUFBQSxTQUFBLENBQUEsdUJBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLHFCQUFBLEVBQ0EsU0FBQSxDQUFBLHFCQUFBLEdBQUEsU0FBQSxDQUFBLDJCQUFBLElBQUEsU0FBQSxDQUFBLHdCQUFBLENBQUE7OztBQUdBLHFCQUFBLENBQUEsWUFBQSxDQUNBO0FBQ0EsdUJBQUEsRUFBQTtBQUNBLCtCQUFBLEVBQUE7QUFDQSw4Q0FBQSxFQUFBLE9BQUE7QUFDQSw2Q0FBQSxFQUFBLE9BQUE7QUFDQSw4Q0FBQSxFQUFBLE9BQUE7QUFDQSw0Q0FBQSxFQUFBLE9BQUE7cUJBQ0E7QUFDQSw4QkFBQSxFQUFBLEVBQUE7aUJBQ0E7YUFDQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLFlBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTs7O0FBR0Esb0JBQUEsY0FBQSxHQUFBLFlBQUEsQ0FBQSx1QkFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsVUFBQSxHQUFBLGNBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOzs7QUFHQSxvQkFBQSxZQUFBLEdBQUEsWUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7OztBQUdBLHdCQUFBLEdBQUEsSUFBQSxRQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxRQUFBLEdBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0Esd0JBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0Esd0JBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLENBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUEsQ0FBQTthQUVBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFdBQUEsR0FBQSxTQUFBLFdBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLENBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxvQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTs7QUFFQSxvQkFBQSxNQUFBLEdBQUEsUUFBQSxDQUFBLGNBQUEsQ0FBQSxhQUFBLEdBQUEsS0FBQSxDQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsWUFBQSxHQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsb0JBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBOzs7O0FBSUEsd0JBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxnQ0FBQSxDQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLGtCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFJQSxRQUFBLGVBQUEsR0FBQSxTQUFBLGVBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsZ0JBQUEsTUFBQSxHQUFBLElBQUEsVUFBQSxFQUFBLENBQUE7O0FBRUEsZ0JBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQTthQUNBLE1BQUE7QUFDQSx1QkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUtBLFdBQUE7QUFDQSxpQkFBQSxFQUFBLG1CQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUE7O0FBRUEsZ0JBQUEsWUFBQSxHQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsZUFBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLHVCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTs7QUFFQSwyQkFBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx3QkFBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLFFBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7cUJBQ0E7aUJBQ0EsQ0FBQSxDQUFBOztBQUVBLHVCQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSx1QkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsOEJBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLDJCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUE7QUFDQSxvQkFBQSxFQUFBLFlBQUE7QUFDQSxtQkFBQSxFQUFBLFdBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDL0lBLFlBQUEsQ0FBQTs7QUNBQSxZQUFBLENBQUE7QUFDQSxHQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLFFBQUEsZUFBQSxHQUFBLFNBQUEsZUFBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLFFBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBOztBQUVBLDJCQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQTtBQUNBLHdCQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSx3QkFBQSxPQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsNEJBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSw2QkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO2lCQUNBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxPQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxHQUFBLFNBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxTQUFBLEdBQUEsU0FBQSxTQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxlQUFBLEdBQUEsU0FBQSxlQUFBLEdBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGdCQUFBLEdBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEscUJBQUEsRUFBQSxZQUFBO0FBQ0EsdUJBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBLFFBQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGlCQUFBLEdBQUEsU0FBQSxpQkFBQSxDQUFBLE1BQUEsRUFBQSxjQUFBLEVBQUE7O0FBRUEsWUFBQSxjQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxzQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO2FBQ0EsRUFBQSxJQUFBLENBQUEsQ0FBQTtTQUVBOztBQUVBLHNCQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsR0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBOztBQUVBLGdCQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLElBQUEsRUFBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTthQUNBLEVBQUEsU0FBQSxDQUFBLENBQUE7Ozs7Ozs7U0FRQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFdBQUE7QUFDQSx1QkFBQSxFQUFBLGVBQUE7QUFDQSxpQkFBQSxFQUFBLFNBQUE7QUFDQSx5QkFBQSxFQUFBLGlCQUFBO0FBQ0EsdUJBQUEsRUFBQSxlQUFBO0FBQ0EsZUFBQSxFQUFBLE9BQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDN0ZBLFlBQUEsQ0FBQTtBQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxRQUFBLFlBQUEsR0FBQSxTQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLEdBQUEsRUFBQSxNQUFBLENBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7OztBQUdBLGVBQUEsTUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLGNBQUEsR0FBQSxTQUFBLGNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxFQUFBLENBQUEsVUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLGdCQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLElBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLGVBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsY0FBQSxDQUFBLE1BQUEsR0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsUUFBQSxHQUFBLFFBQUEsSUFBQSxRQUFBLEdBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsa0JBQUEsR0FBQSxHQUFBLENBQUE7QUFDQSxnQkFBQSxNQUFBLENBQUE7O0FBRUEsa0JBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsRUFBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxpQkFBQSxHQUFBLFNBQUEsaUJBQUEsR0FBQTtBQUNBLFlBQUEsTUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxNQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLE9BQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLElBQUEsSUFBQSxDQUFBLGFBQUEsRUFBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsUUFBQSxFQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsRUFBQSxDQUFBO1NBQ0EsRUFBQSxPQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsbUJBQUEsR0FBQSxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxlQUFBLElBQUEsRUFBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLEVBQUEsYUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0Esb0JBQUEsRUFBQSxZQUFBO0FBQ0Esc0JBQUEsRUFBQSxjQUFBO0FBQ0EseUJBQUEsRUFBQSxpQkFBQTtBQUNBLG9DQUFBLEVBQUEsNEJBQUE7QUFDQSwyQkFBQSxFQUFBLG1CQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNyRUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLEVBQUEsRUFBQSxZQUFBLEVBQUEsSUFBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxDQUFBLDZCQUFBLEVBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG52YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICduZ1N0b3JhZ2UnXSk7XHJcblxyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XHJcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cclxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcclxufSk7XHJcblxyXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXHJcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxyXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcclxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxyXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xyXG5cclxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcclxuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cclxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XHJcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXHJcbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XHJcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cclxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxyXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXHJcbiAgICAgICAgICAgIGlmICh1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cclxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcclxuXHJcbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xyXG5cclxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoJGxvY2F0aW9uKSB7XHJcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcclxuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cclxuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXHJcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxyXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcclxuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxyXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxyXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcclxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcclxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXHJcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xyXG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xyXG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXHJcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcclxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcclxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XHJcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXHJcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxyXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XHJcblxyXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cclxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXHJcbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXHJcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cclxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxyXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxyXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cclxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXHJcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcclxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcclxuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2lnbnVwID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNyZWRlbnRpYWxzKTtcclxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBjcmVkZW50aWFscylcclxuICAgICAgICAgICAgICAgIC50aGVuKCBvblN1Y2Nlc3NmdWxMb2dpbiApXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIHNpZ251cCBjcmVkZW50aWFscy4nIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xyXG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9KTtcclxuXHJcbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XHJcbiAgICAgICAgdXJsOiAnLycsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcclxuICAgIH0pO1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lLmxhbmRpbmcnLHtcclxuICAgIFx0dXJsOiAnL2xhbmRpbmcnLFxyXG4gICAgXHR0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbGFuZGluZy5odG1sJ1xyXG4gICAgfSlcclxufSk7XHJcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xyXG4gICAgICAgIHVybDogJy9sb2dpbicsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcclxuXHJcbiAgICAkc2NvcGUubG9naW4gPSB7fTtcclxuICAgICRzY29wZS5lcnJvciA9IG51bGw7XHJcblxyXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uKGxvZ2luSW5mbykge1xyXG5cclxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9qZWN0Jywge1xyXG4gICAgICAgIHVybDogJy9wcm9qZWN0Lzpwcm9qZWN0SUQnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcHJvamVjdC9wcm9qZWN0Lmh0bWwnXHJcbiAgICB9KTtcclxufSk7XHJcblxyXG5hcHAuY29udHJvbGxlcignUHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQXV0aFNlcnZpY2UpIHtcclxuXHJcbiAgdmFyIG1heE1lYXN1cmUgPSAwO1xyXG5cclxuICAvLyBudW1iZXIgb2YgbWVhc3VyZXMgb24gdGhlIHRpbWVsaW5lXHJcbiAgJHNjb3BlLm51bU1lYXN1cmVzID0gXy5yYW5nZSgwLCA2MCk7XHJcblxyXG4gIC8vIGxlbmd0aCBvZiB0aGUgdGltZWxpbmVcclxuICAkc2NvcGUubWVhc3VyZUxlbmd0aCA9IDE7XHJcblxyXG5cdC8vSW5pdGlhbGl6ZSByZWNvcmRlciBvbiBwcm9qZWN0IGxvYWRcclxuXHRSZWNvcmRlckZjdC5yZWNvcmRlckluaXQoKS50aGVuKGZ1bmN0aW9uIChyZXRBcnIpIHtcclxuXHRcdCRzY29wZS5yZWNvcmRlciA9IHJldEFyclswXTtcclxuXHRcdCRzY29wZS5hbmFseXNlck5vZGUgPSByZXRBcnJbMV07XHJcblx0fSkuY2F0Y2goZnVuY3Rpb24gKGUpe1xyXG4gICAgICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGF1ZGlvJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coZSk7XHJcbiAgICB9KTtcclxuXHJcblx0JHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG5cdCRzY29wZS5uYW1lQ2hhbmdpbmcgPSBmYWxzZTtcclxuXHQkc2NvcGUudHJhY2tzID0gW107XHJcblx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cdCRzY29wZS5wcm9qZWN0SWQgPSAkc3RhdGVQYXJhbXMucHJvamVjdElEO1xyXG5cdCRzY29wZS5wb3NpdGlvbiA9IDA7XHJcblxyXG5cdFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oJHNjb3BlLnByb2plY3RJZCkudGhlbihmdW5jdGlvbiAocHJvamVjdCkge1xyXG5cdFx0dmFyIGxvYWRlZCA9IDA7XHJcblx0XHRjb25zb2xlLmxvZygnUFJPSkVDVCcsIHByb2plY3QpO1xyXG5cdFx0JHNjb3BlLnByb2plY3ROYW1lID0gcHJvamVjdC5uYW1lO1xyXG5cclxuXHRcdGlmIChwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuXHRcdFx0cHJvamVjdC50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0XHR2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRsb2FkZWQrKztcclxuXHRcdFx0XHRcdGlmKGxvYWRlZCA9PT0gcHJvamVjdC50cmFja3MubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdC8vIFRvbmUuVHJhbnNwb3J0LnN0YXJ0KCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdHJhY2subG9jYXRpb24pO1xyXG5cdFx0XHRcdGlmKG1heCArIDIgPiBtYXhNZWFzdXJlKSBtYXhNZWFzdXJlID0gbWF4ICsgMjtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR0cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdHRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vIFRPRE86IHRoaXMgaXMgYXNzdW1pbmcgdGhhdCBhIHBsYXllciBleGlzdHNcclxuXHRcdFx0XHR0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG5cdFx0XHRcdC8vaW5pdCBlZmZlY3RzLCBjb25uZWN0LCBhbmQgYWRkIHRvIHNjb3BlXHJcblx0XHRcdFx0dHJhY2suZWZmZWN0c1JhY2sgPSBUb25lVHJhY2tGY3QuZWZmZWN0c0luaXRpYWxpemUoKTtcclxuXHRcdFx0XHR0cmFjay5wbGF5ZXIuY29ubmVjdCh0cmFjay5lZmZlY3RzUmFja1swXSk7XHJcblxyXG5cdFx0XHRcdGlmKHRyYWNrLmxvY2F0aW9uLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0LmFkZExvb3BUb1RpbWVsaW5lKHRyYWNrLnBsYXllciwgdHJhY2subG9jYXRpb24pO1xyXG5cdFx0XHRcdFx0dHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRyYWNrLm9uVGltZWxpbmUgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdCRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JHNjb3BlLm1heE1lYXN1cmUgPSAzMjtcclxuICBcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDg7IGkrKykge1xyXG4gICAgXHRcdFx0XHR2YXIgb2JqID0ge307XHJcbiAgICBcdFx0XHRcdG9iai5lbXB0eSA9IHRydWU7XHJcbiAgICBcdFx0XHRcdG9iai5yZWNvcmRpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0b2JqLm9uVGltZWxpbmUgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0b2JqLnByZXZpZXdpbmcgPSBmYWxzZTtcclxuICAgIFx0XHRcdFx0b2JqLmVmZmVjdHNSYWNrID0gVG9uZVRyYWNrRmN0LmVmZmVjdHNJbml0aWFsaXplKCk7XHJcbiAgICBcdFx0XHRcdG9iai5wbGF5ZXIgPSBudWxsO1xyXG4gICAgXHRcdFx0XHRvYmoubmFtZSA9ICdUcmFjayAnICsgKGkrMSk7XHJcbiAgICBcdFx0XHRcdG9iai5sb2NhdGlvbiA9IFtdO1xyXG4gICAgXHRcdFx0XHQkc2NvcGUudHJhY2tzLnB1c2gob2JqKTtcclxuICBcdFx0XHR9XHJcblx0XHQgIH1cclxuXHJcblx0XHQvL2R5bmFtaWNhbGx5IHNldCBtZWFzdXJlc1xyXG5cdFx0Ly9pZiBsZXNzIHRoYW4gMTYgc2V0IDE4IGFzIG1pbmltdW1cclxuXHRcdCRzY29wZS5udW1NZWFzdXJlcyA9IFtdO1xyXG5cdFx0aWYobWF4TWVhc3VyZSA8IDMyKSBtYXhNZWFzdXJlID0gMzQ7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1heE1lYXN1cmU7IGkrKykge1xyXG5cdFx0XHQkc2NvcGUubnVtTWVhc3VyZXMucHVzaChpKTtcclxuXHRcdH1cclxuXHRcdGNvbnNvbGUubG9nKCdNRUFTVVJFUycsICRzY29wZS5udW1NZWFzdXJlcyk7XHJcblxyXG5cclxuXHJcblx0XHRUb25lVGltZWxpbmVGY3QuY3JlYXRlVHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSkudGhlbihmdW5jdGlvbiAobWV0cm9ub21lKSB7XHJcblx0XHRcdCRzY29wZS5tZXRyb25vbWUgPSBtZXRyb25vbWU7XHJcblx0XHR9KTtcclxuXHRcdFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xyXG5cclxuXHR9KTtcclxuXHJcblx0JHNjb3BlLmRyb3BJblRpbWVsaW5lID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHR2YXIgdHJhY2sgPSBzY29wZS50cmFja3NbaW5kZXhdO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKHRyYWNrKTtcclxuXHR9XHJcblxyXG5cdCRzY29wZS5hZGRUcmFjayA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0fTtcclxuXHJcblx0JHNjb3BlLnBsYXkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5wb3NpdGlvbiA9ICRzY29wZS5wb3NpdGlvbi50b1N0cmluZygpICsgXCI6MDowXCI7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG5cdH1cclxuXHQkc2NvcGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25zb2xlLmxvZygnTUVUUk9OTU9ORScsICRzY29wZS50cmFja3MpO1xyXG5cdFx0JHNjb3BlLm1ldHJvbm9tZS5zdG9wKCk7XHJcblx0XHRUb25lVGltZWxpbmVGY3Quc3RvcEFsbCgkc2NvcGUudHJhY2tzKTtcclxuXHRcdCRzY29wZS5wb3NpdGlvbiA9IFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uLnNwbGl0KCc6JylbMF07XHJcblx0XHRjb25zb2xlLmxvZygnUE9TJywgJHNjb3BlLnBvc2l0aW9uKTtcclxuXHRcdHZhciBwbGF5SGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5YmFja0hlYWQnKTtcclxuXHRcdHBsYXlIZWFkLnN0eWxlLmxlZnQgPSAoJHNjb3BlLnBvc2l0aW9uICogMjAwICsgMzAwKS50b1N0cmluZygpKydweCc7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5wYXVzZSgpO1xyXG5cdH1cclxuXHQkc2NvcGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdCRzY29wZS5tZXRyb25vbWUuc3RvcCgpO1xyXG5cdFx0VG9uZVRpbWVsaW5lRmN0LnN0b3BBbGwoJHNjb3BlLnRyYWNrcyk7XHJcblx0XHQkc2NvcGUucG9zaXRpb24gPSAwO1xyXG5cdFx0dmFyIHBsYXlIZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXliYWNrSGVhZCcpO1xyXG5cdFx0cGxheUhlYWQuc3R5bGUubGVmdCA9ICczMDBweCc7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XHJcblx0fVxyXG5cdCRzY29wZS5uYW1lQ2hhbmdlID0gZnVuY3Rpb24obmV3TmFtZSkge1xyXG5cdFx0Y29uc29sZS5sb2coJ1NIT1cgSU5QVVQnLCBuZXdOYW1lKTtcclxuXHRcdCRzY29wZS5uYW1lQ2hhbmdpbmcgPSBmYWxzZTtcclxuXHR9XHJcblxyXG5cdCRzY29wZS50b2dnbGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZigkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9PT0gMCkge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IC0xMDA7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQkc2NvcGUubWV0cm9ub21lLnZvbHVtZS52YWx1ZSA9IDA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIFJlY29yZGVyRmN0LnNlbmRUb0FXUygkc2NvcGUudHJhY2tzLCAkc2NvcGUucHJvamVjdElkKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgIC8vIHdhdmUgbG9naWNcclxuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgZnJvbSBzZW5kVG9BV1MnLCByZXNwb25zZSk7XHJcblxyXG4gICAgfSk7XHJcbiAgfTtcclxuICBcclxuICAkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICB9O1xyXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XHJcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XHJcblxyXG4gICAgJHNjb3BlLnNpZ251cCA9IHt9O1xyXG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuXHJcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcclxuXHJcbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcclxuICAgICAgICBjb25zb2xlLmxvZyhzaWdudXBJbmZvKTtcclxuICAgICAgICBBdXRoU2VydmljZS5zaWdudXAoc2lnbnVwSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VyUHJvZmlsZScsIHtcclxuICAgICAgICB1cmw6ICcvdXNlcnByb2ZpbGUvOnRoZUlEJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvdXNlcnByb2ZpbGUuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJDb250cm9sbGVyJyxcclxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5hcnRpc3RJbmZvJywge1xyXG4gICAgICAgIHVybDogJy9pbmZvJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvaW5mby5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckNvbnRyb2xsZXInXHJcbiAgICB9KVxyXG4gICAgLnN0YXRlKCd1c2VyUHJvZmlsZS5wcm9qZWN0Jywge1xyXG4gICAgICAgIHVybDogJy9wcm9qZWN0cycsXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2plY3RzLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2VycycsIHtcclxuICAgICAgICB1cmw6ICcvZm9sbG93ZXJzJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93ZXJzLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pXHJcbiAgICAuc3RhdGUoJ3VzZXJQcm9maWxlLmZvbGxvd2luZycsIHtcclxuICAgICAgICB1cmw6ICcvZm9sbG93aW5nJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZm9sbG93aW5nLmh0bWwnLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyQ29udHJvbGxlcidcclxuICAgIH0pO1xyXG5cclxufSk7XHJcblxyXG4iLCJcclxuYXBwLmNvbnRyb2xsZXIoJ0hvbWVDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoU2VydmljZSwgVG9uZVRyYWNrRmN0LCBQcm9qZWN0RmN0LCAkc3RhdGVQYXJhbXMsICRzdGF0ZSkge1xyXG5cdGNvbnNvbGUubG9nKCdpbiBIb21lIGNvbnRyb2xsZXInKTtcclxuXHR2YXIgdHJhY2tCdWNrZXQgPSBbXTtcclxuXHQkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICB9O1xyXG5cclxuICAgICRzY29wZS5wcm9qZWN0cyA9IGZ1bmN0aW9uICgpe1xyXG4gICAgXHRjb25zb2xlLmxvZygnaW4gaGVyZScpXHJcbiAgICBcdFByb2plY3RGY3QuZ2V0UHJvamVjdEluZm8oKS50aGVuKGZ1bmN0aW9uKHByb2plY3RzKXtcclxuICAgIFx0XHQkc2NvcGUuYWxsUHJvamVjdHM9cHJvamVjdHM7XHJcbiAgICBcdFx0Ly8gY29uc29sZS5sb2coJ0FsbCBQcm9qZWN0cyBhcmUnLCBwcm9qZWN0cylcclxuICAgIFx0fSlcclxuICAgIH1cclxuXHQkc2NvcGUucHJvamVjdHMoKTtcclxuXHJcblx0XHQkc2NvcGUubWFrZUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHJcblx0XHRcdH1cclxuXHRcdHZhciBzdG9wID1mYWxzZTtcclxuXHJcblx0XHQkc2NvcGUuc2FtcGxlVHJhY2sgPSBmdW5jdGlvbih0cmFjayl7XHJcblxyXG5cdFx0XHRpZihzdG9wPT09dHJ1ZSl7XHJcblx0XHRcdFx0JHNjb3BlLnBsYXllci5zdG9wKClcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0VG9uZVRyYWNrRmN0LmNyZWF0ZVBsYXllcih0cmFjay51cmwsIGZ1bmN0aW9uKHBsYXllcil7XHJcblx0XHRcdFx0JHNjb3BlLnBsYXllciA9IHBsYXllcjtcclxuXHRcdFx0XHRpZihzdG9wPT09ZmFsc2Upe1xyXG5cdFx0XHRcdFx0c3RvcD10cnVlXHJcblx0XHRcdFx0XHQkc2NvcGUucGxheWVyLnN0YXJ0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2V7XHJcblx0XHRcdFx0XHRzdG9wPWZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdH1cclxuXHJcblxyXG5cdCAgJHNjb3BlLmdldFVzZXJQcm9maWxlID0gZnVuY3Rpb24odXNlcil7XHJcblx0ICAgIGNvbnNvbGUubG9nKFwiY2xpY2tlZFwiLCB1c2VyKTtcclxuXHQgICAgJHN0YXRlLmdvKCd1c2VyUHJvZmlsZScsIHt0aGVJRDogdXNlci5faWR9KTtcclxuXHR9XHJcblxyXG4gICAgXHJcblxyXG5cclxufSk7XHJcblxyXG4iLCJhcHAuY29udHJvbGxlcignTmV3UHJvamVjdENvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhTZXJ2aWNlLCBQcm9qZWN0RmN0LCAkc3RhdGUpe1xyXG5cdCRzY29wZS51c2VyO1xyXG5cclxuXHQgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuXHQgXHQkc2NvcGUudXNlciA9IHVzZXI7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgaXMnLCAkc2NvcGUudXNlci51c2VybmFtZSlcclxuICAgIH0pO1xyXG5cclxuXHQgJHNjb3BlLm5ld1Byb2plY3RCdXQgPSBmdW5jdGlvbigpe1xyXG5cdCBcdFByb2plY3RGY3QubmV3UHJvamVjdCgkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihwcm9qZWN0SWQpe1xyXG5cdCBcdFx0Y29uc29sZS5sb2coJ1N1Y2Nlc3MgaXMnLCBwcm9qZWN0SWQpXHJcblx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHByb2plY3RJZH0pO1x0IFx0XHJcblx0XHR9KVxyXG5cclxuXHQgfVxyXG5cclxufSkiLCJhcHAuY29udHJvbGxlcignVGltZWxpbmVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkbG9jYWxTdG9yYWdlLCBSZWNvcmRlckZjdCwgUHJvamVjdEZjdCwgVG9uZVRyYWNrRmN0LCBUb25lVGltZWxpbmVGY3QpIHtcclxuICBcclxuICB2YXIgd2F2QXJyYXkgPSBbXTtcclxuICBcclxuICAkc2NvcGUubnVtTWVhc3VyZXMgPSBbXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IDYwOyBpKyspIHtcclxuICAgICRzY29wZS5udW1NZWFzdXJlcy5wdXNoKGkpO1xyXG4gIH1cclxuXHJcbiAgJHNjb3BlLm1lYXN1cmVMZW5ndGggPSAxO1xyXG4gICRzY29wZS50cmFja3MgPSBbXTtcclxuICAkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cclxuICBQcm9qZWN0RmN0LmdldFByb2plY3RJbmZvKCc1NTk0YzIwYWQwNzU5Y2Q0MGNlNTFlMTQnKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XHJcblxyXG4gICAgICB2YXIgbG9hZGVkID0gMDtcclxuICAgICAgY29uc29sZS5sb2coJ1BST0pFQ1QnLCBwcm9qZWN0KTtcclxuXHJcbiAgICAgIGlmIChwcm9qZWN0LnRyYWNrcy5sZW5ndGgpIHtcclxuICAgICAgICBwcm9qZWN0LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xyXG4gICAgICAgICAgICB2YXIgZG9uZUxvYWRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQrKztcclxuICAgICAgICAgICAgICAgIGlmKGxvYWRlZCA9PT0gcHJvamVjdC50cmFja3MubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0cmFjay5wbGF5ZXIgPSBUb25lVHJhY2tGY3QuY3JlYXRlUGxheWVyKHRyYWNrLnVybCwgZG9uZUxvYWRpbmcpO1xyXG4gICAgICAgICAgICBUb25lVGltZWxpbmVGY3QuYWRkTG9vcFRvVGltZWxpbmUodHJhY2sucGxheWVyLCB0cmFjay5sb2NhdGlvbik7XHJcbiAgICAgICAgICAgICRzY29wZS50cmFja3MucHVzaCh0cmFjayk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcclxuICAgICAgICAgIHZhciBvYmogPSB7fTtcclxuICAgICAgICAgIG9iai5uYW1lID0gJ1RyYWNrICcgKyAoaSsxKTtcclxuICAgICAgICAgIG9iai5sb2NhdGlvbiA9IFtdO1xyXG4gICAgICAgICAgJHNjb3BlLnRyYWNrcy5wdXNoKG9iaik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBUb25lVGltZWxpbmVGY3QuZ2V0VHJhbnNwb3J0KHByb2plY3QuZW5kTWVhc3VyZSk7XHJcbiAgICAgIFRvbmVUaW1lbGluZUZjdC5jaGFuZ2VCcG0ocHJvamVjdC5icG0pO1xyXG5cclxuICB9KTtcclxuXHJcbiAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbihhVXNlcil7XHJcbiAgLy8gICAgICRzY29wZS50aGVVc2VyID0gYVVzZXI7XHJcbiAgLy8gICAgIC8vICRzdGF0ZVBhcmFtcy50aGVJRCA9IGFVc2VyLl9pZFxyXG4gIC8vICAgICBjb25zb2xlLmxvZyhcImlkXCIsICRzdGF0ZVBhcmFtcyk7XHJcbiAgLy8gfSk7XHJcblxyXG4gICRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoZSwgaW5kZXgpIHtcclxuXHJcbiAgXHRlID0gZS50b0VsZW1lbnQ7XHJcblxyXG4gICAgICAgIC8vIHN0YXJ0IHJlY29yZGluZ1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdGFydCByZWNvcmRpbmcnKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoIWF1ZGlvUmVjb3JkZXIpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgZS5jbGFzc0xpc3QuYWRkKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgIGF1ZGlvUmVjb3JkZXIuY2xlYXIoKTtcclxuICAgICAgICBhdWRpb1JlY29yZGVyLnJlY29yZCgpO1xyXG5cclxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGF1ZGlvUmVjb3JkZXIuc3RvcCgpO1xyXG4gICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKFwicmVjb3JkaW5nXCIpO1xyXG4gICAgICAgICAgYXVkaW9SZWNvcmRlci5nZXRCdWZmZXJzKCBnb3RCdWZmZXJzICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnRyYWNrc1tpbmRleF0ucmF3QXVkaW8gPSB3aW5kb3cubGF0ZXN0UmVjb3JkaW5nO1xyXG4gICAgICAgICAgICAvLyAkc2NvcGUudHJhY2tzW2luZGV4XS5yYXdJbWFnZSA9IHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdJbWFnZTtcclxuXHJcbiAgICAgICAgICB9LCA1MDApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgfSwgMjAwMCk7XHJcblxyXG4gIH1cclxuXHJcbiAgJHNjb3BlLmFkZFRyYWNrID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICB9O1xyXG5cclxuICAkc2NvcGUuc2VuZFRvQVdTID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgIHZhciBhd3NUcmFja3MgPSAkc2NvcGUudHJhY2tzLmZpbHRlcihmdW5jdGlvbih0cmFjayxpbmRleCl7XHJcbiAgICAgICAgICAgICAgaWYodHJhY2sucmF3QXVkaW8pe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgUmVjb3JkZXJGY3Quc2VuZFRvQVdTKGF3c1RyYWNrcywgJzU1OTVhN2ZhYWE5MDFhZDYzMjM0ZjkyMCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gd2F2ZSBsb2dpY1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmcm9tIHNlbmRUb0FXUycsIHJlc3BvbnNlKTtcclxuXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuXHJcblx0XHJcblxyXG5cclxufSk7XHJcblxyXG5cclxuIiwiXHJcbmFwcC5jb250cm9sbGVyKCdVc2VyQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSwgQXV0aFNlcnZpY2UsICRzdGF0ZVBhcmFtcywgdXNlckZhY3RvcnkpIHtcclxuXHJcbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKGxvZ2dlZEluVXNlcil7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2dldHRpbmcnKVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgJHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuXHJcbiAgICAgICAgICB1c2VyRmFjdG9yeS5nZXRVc2VyT2JqKCRzdGF0ZVBhcmFtcy50aGVJRCkudGhlbihmdW5jdGlvbih1c2VyKXtcclxuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBpcycsIHVzZXIpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIFxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgICRzY29wZS5kaXNwbGF5U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIGlmKCRzY29wZS5zaG93U2V0dGluZ3MpICRzY29wZS5zaG93U2V0dGluZ3MgPSBmYWxzZTtcclxuICAgICAgICBlbHNlICRzY29wZS5zaG93U2V0dGluZ3MgPSB0cnVlO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5zaG93U2V0dGluZ3MpO1xyXG4gICAgfVxyXG5cclxuICAgICRzY29wZS5mb2xsb3cgPSBmdW5jdGlvbih1c2VyKXtcclxuICAgICAgdXNlckZhY3RvcnkuZm9sbG93KHVzZXIsICRzY29wZS5sb2dnZWRJblVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdGb2xsb3cgY29udHJvbGxlciByZXNwb25zZScsIHJlc3BvbnNlKTtcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBcclxuXHJcblxyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdkcmFnZ2FibGUnLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAvLyB0aGlzIGdpdmVzIHVzIHRoZSBuYXRpdmUgSlMgb2JqZWN0XHJcbiAgICB2YXIgZWwgPSBlbGVtZW50WzBdO1xyXG4gICAgXHJcbiAgICBlbC5kcmFnZ2FibGUgPSB0cnVlO1xyXG4gICAgXHJcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnc3RhcnQnLCBmdW5jdGlvbihlKSB7XHJcblxyXG4gICAgICAgIGUuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnbW92ZSc7XHJcbiAgICAgICAgZS5kYXRhVHJhbnNmZXIuc2V0RGF0YSgnVGV4dCcsIHRoaXMuaWQpO1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnZHJhZycpO1xyXG5cclxuICAgICAgICB2YXIgaWR4ID0gc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwYXJzZUludChhdHRycy5wb3NpdGlvbikpO1xyXG4gICAgICAgIHNjb3BlLnRyYWNrLmxvY2F0aW9uLnNwbGljZShpZHgsIDEpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH0sXHJcbiAgICAgIGZhbHNlXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW5kJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSxcclxuICAgICAgZmFsc2VcclxuICAgICk7XHJcblxyXG4gIH1cclxufSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdkcm9wcGFibGUnLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgc2NvcGU6IHtcclxuICAgICAgZHJvcDogJyYnIC8vIHBhcmVudFxyXG4gICAgfSxcclxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgIC8vIGFnYWluIHdlIG5lZWQgdGhlIG5hdGl2ZSBvYmplY3RcclxuICAgICAgdmFyIGVsID0gZWxlbWVudFswXTtcclxuICAgICAgXHJcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdtb3ZlJztcclxuICAgICAgICAgIC8vIGFsbG93cyB1cyB0byBkcm9wXHJcbiAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2xlYXZlJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgIC8vIFN0b3BzIHNvbWUgYnJvd3NlcnMgZnJvbSByZWRpcmVjdGluZy5cclxuICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdvdmVyJyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIHVwb24gZHJvcCwgY2hhbmdpbmcgcG9zaXRpb24gYW5kIHVwZGF0aW5nIHRyYWNrLmxvY2F0aW9uIGFycmF5IG9uIHNjb3BlIFxyXG4gICAgICAgICAgdmFyIGl0ZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlLmRhdGFUcmFuc2Zlci5nZXREYXRhKCdUZXh0JykpO1xyXG4gICAgICAgICAgdmFyIHhwb3NpdGlvbiA9IHBhcnNlSW50KHRoaXMuYXR0cmlidXRlcy54cG9zaXRpb24udmFsdWUpO1xyXG4gICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSB0aGlzLmNoaWxkTm9kZXM7XHJcbiAgICAgICAgICB2YXIgb2xkVGltZWxpbmVJZDtcclxuICAgICAgICAgIHZhciB0aGVDYW52YXM7XHJcblxyXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNoaWxkTm9kZXNbaV0uY2xhc3NOYW1lID09PSAnY2FudmFzLWJveCcpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1tpXS5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnB1c2goeHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUuJHBhcmVudC4kcGFyZW50LnRyYWNrLmxvY2F0aW9uLnNvcnQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHZhciBjYW52YXNOb2RlID0gdGhpcy5jaGlsZE5vZGVzW2ldLmNoaWxkTm9kZXM7XHJcblxyXG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc05vZGUubGVuZ3RoOyBqKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzTm9kZVtqXS5ub2RlTmFtZSA9PT0gJ0NBTlZBUycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXNOb2RlW2pdLmF0dHJpYnV0ZXMucG9zaXRpb24udmFsdWUgPSB4cG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkVGltZWxpbmVJZCA9IGNhbnZhc05vZGVbal0uYXR0cmlidXRlcy50aW1lbGluZWlkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUNhbnZhcyA9IGNhbnZhc05vZGVbal07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSAgICAgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuXHJcbiAgICAgICAgICBzY29wZS4kcGFyZW50LiRwYXJlbnQubW92ZUluVGltZWxpbmUob2xkVGltZWxpbmVJZCwgeHBvc2l0aW9uKS50aGVuKGZ1bmN0aW9uIChuZXdUaW1lbGluZUlkKSB7XHJcbiAgICAgICAgICAgICAgdGhlQ2FudmFzLmF0dHJpYnV0ZXMudGltZWxpbmVpZC52YWx1ZSA9IG5ld1RpbWVsaW5lSWQ7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBjYWxsIHRoZSBkcm9wIHBhc3NlZCBkcm9wIGZ1bmN0aW9uXHJcbiAgICAgICAgICBzY29wZS4kYXBwbHkoJ2Ryb3AoKScpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYWxzZVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXHJcbiAgICB9O1xyXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdwcm9qZWN0ZGlyZWN0aXZlJywgZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2plY3QvcHJvamVjdERpcmVjdGl2ZS5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcidcclxuXHR9O1xyXG59KTtcclxuXHJcbmFwcC5jb250cm9sbGVyKCdwcm9qZWN0ZGlyZWN0aXZlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkc3RhdGUsIFByb2plY3RGY3QsIEF1dGhTZXJ2aWNlKXtcclxuXHJcblxyXG5cclxuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24obG9nZ2VkSW5Vc2VyKXtcclxuXHRcdFx0JHNjb3BlLmxvZ2dlZEluVXNlciA9IGxvZ2dlZEluVXNlcjtcclxuXHRcdFx0JHNjb3BlLmRpc3BsYXlBUHJvamVjdCA9IGZ1bmN0aW9uKHNvbWV0aGluZyl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RISU5HJywgc29tZXRoaW5nKTtcclxuXHRcdFx0XHRpZigkc2NvcGUubG9nZ2VkSW5Vc2VyLl9pZCA9PT0gJHN0YXRlUGFyYW1zLnRoZUlEKXtcclxuXHRcdFx0XHRcdCRzdGF0ZS5nbygncHJvamVjdCcsIHtwcm9qZWN0SUQ6IHNvbWV0aGluZy5faWR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJkaXNwbGF5aW5nIGEgcHJvamVjdFwiLCBwcm9qZWN0SUQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUubWFrZUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuXHRcdFx0XHRwcm9qZWN0Lm93bmVyID0gbG9nZ2VkSW5Vc2VyLl9pZDtcclxuXHRcdFx0XHRwcm9qZWN0LmZvcmtJRCA9IHByb2plY3QuX2lkO1xyXG5cdFx0XHRcdGRlbGV0ZSBwcm9qZWN0Ll9pZDtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhwcm9qZWN0KTtcclxuXHRcdFx0XHRQcm9qZWN0RmN0LmNyZWF0ZUFGb3JrKHByb2plY3QpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmsgcmVzcG9uc2UgaXMnLCByZXNwb25zZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFxyXG5cdFx0Ly8gJHN0YXRlLmdvKCdwcm9qZWN0JylcclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbigkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZToge30sXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHNldE5hdmJhciA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXJJZCA9IHVzZXIuX2lkO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Byb2ZpbGUnLCBzdGF0ZTogJ3VzZXJQcm9maWxlKHt0aGVJRDogdXNlcklkfSknLCBhdXRoOiB0cnVlIH1cclxuICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2V0TmF2YmFyKCk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcclxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdwcm9qZWN0JyB9LFxyXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ1NpZ24gVXAnLCBzdGF0ZTogJ3NpZ251cCcgfSxcclxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ3VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XHJcbiAgICAgICAgICAgIF07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNldFVzZXIoKTtcclxuXHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0TmF2YmFyKTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHNldE5hdmJhcik7XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbmFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3hpbVRyYWNrJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzdGF0ZVBhcmFtcywgJGNvbXBpbGUsIFJlY29yZGVyRmN0LCBQcm9qZWN0RmN0LCBUb25lVHJhY2tGY3QsIFRvbmVUaW1lbGluZUZjdCwgQW5hbHlzZXJGY3QsICRxKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3RyYWNrL3RyYWNrLmh0bWwnLFxyXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcblx0XHRcdHNjb3BlLmVmZmVjdFdldG5lc3NlcyA9IFswLDAsMCwwXTtcclxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0dmFyIGNhbnZhc1JvdyA9IGVsZW1lbnRbMF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FudmFzLWJveCcpO1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY2FudmFzUm93Lmxlbmd0aDsgaSsrKSB7XHJcblxyXG5cdFx0XHRcdFx0dmFyIGNhbnZhc0NsYXNzZXMgPSBjYW52YXNSb3dbaV0ucGFyZW50Tm9kZS5jbGFzc0xpc3Q7XHJcblx0XHJcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNhbnZhc0NsYXNzZXMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNhbnZhc0NsYXNzZXNbal0gPT09ICd0YWtlbicpIHtcclxuXHRcdFx0XHRcdFx0XHRhbmd1bGFyLmVsZW1lbnQoY2FudmFzUm93W2ldKS5hcHBlbmQoJGNvbXBpbGUoXCI8Y2FudmFzIHdpZHRoPScxOTgnIGhlaWdodD0nOTgnIGlkPSd3YXZlZGlzcGxheScgY2xhc3M9J2l0ZW0nIHN0eWxlPSdwb3NpdGlvbjogYWJzb2x1dGU7JyBkcmFnZ2FibGU+PC9jYW52YXM+XCIpKHNjb3BlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIDApXHJcblxyXG5cdFx0XHRzY29wZS5kcm9wSW5UaW1lbGluZSA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG5cclxuXHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IGZhbHNlO1xyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0c2NvcGUudHJhY2sub25UaW1lbGluZSA9IHRydWU7XHJcblx0XHRcdFx0dmFyIHBvc2l0aW9uID0gMDtcclxuXHRcdFx0XHR2YXIgY2FudmFzUm93ID0gZWxlbWVudFswXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYW52YXMtYm94Jyk7XHJcblxyXG5cdFx0XHRcdGlmIChzY29wZS50cmFjay5sb2NhdGlvbi5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdC8vIGRyb3AgdGhlIGxvb3Agb24gdGhlIGZpcnN0IGF2YWlsYWJsZSBpbmRleFx0XHRcdFx0XHJcblx0XHRcdFx0XHR3aGlsZSAoc2NvcGUudHJhY2subG9jYXRpb24uaW5kZXhPZihwb3NpdGlvbikgPiAtMSkge1xyXG5cdFx0XHRcdFx0XHRwb3NpdGlvbisrO1xyXG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGFkZGluZyByYXcgaW1hZ2UgdG8gZGJcclxuXHRcdFx0XHRpZiAoIXNjb3BlLnRyYWNrLmltZykge1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2suaW1nID0gd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlLnJlcGxhY2UoL15kYXRhOmltYWdlXFwvcG5nO2Jhc2U2NCwvLCBcIlwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ3B1c2hpbmcnLCBwb3NpdGlvbik7XHJcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24ucHVzaChwb3NpdGlvbik7XHJcblx0XHRcdFx0c2NvcGUudHJhY2subG9jYXRpb24uc29ydCgpO1xyXG5cdFx0XHRcdHZhciB0aW1lbGluZUlkID0gVG9uZVRyYWNrRmN0LmNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3Aoc2NvcGUudHJhY2sucGxheWVyLCBwb3NpdGlvbik7XHJcblx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGNhbnZhc1Jvd1twb3NpdGlvbl0pLmFwcGVuZCgkY29tcGlsZShcIjxjYW52YXMgd2lkdGg9JzE5OCcgaGVpZ2h0PSc5OCcgcG9zaXRpb249J1wiICsgcG9zaXRpb24gKyBcIicgdGltZWxpbmVJZD0nXCIrdGltZWxpbmVJZCtcIicgaWQ9J21kaXNwbGF5XCIgKyAgaW5kZXggKyBcIi1cIiArIHBvc2l0aW9uICsgXCInIGNsYXNzPSdpdGVtJyBzdHlsZT0ncG9zaXRpb246IGFic29sdXRlOycgZHJhZ2dhYmxlPjwvY2FudmFzPlwiKShzY29wZSkpO1xyXG5cclxuXHRcdFx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwibWRpc3BsYXlcIiArICBpbmRleCArIFwiLVwiICsgcG9zaXRpb24gKTtcclxuICAgICAgICAgICAgICAgIGRyYXdCdWZmZXIoIDE5OCwgOTgsIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLCBzY29wZS50cmFjay5idWZmZXIgKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygndHJhY2snLCBzY29wZS50cmFjayk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNjb3BlLm1vdmVJblRpbWVsaW5lID0gZnVuY3Rpb24gKG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpIHtcclxuXHRcdFx0XHRyZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdFTEVNRU5UJywgb2xkVGltZWxpbmVJZCwgbmV3TWVhc3VyZSk7XHJcblx0XHRcdFx0XHRUb25lVHJhY2tGY3QucmVwbGFjZVRpbWVsaW5lTG9vcChzY29wZS50cmFjay5wbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpLnRoZW4ocmVzb2x2ZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzY29wZS5yZWNvcmQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygnVFJBQ0tTJywgc2NvcGUuJHBhcmVudC50cmFja3MpO1xyXG5cdFx0XHRcdFRvbmVUaW1lbGluZUZjdC5tdXRlQWxsKHNjb3BlLiRwYXJlbnQudHJhY2tzKTtcclxuXHRcdFx0XHR2YXIgcmVjb3JkZXIgPSBzY29wZS5yZWNvcmRlcjtcclxuXHJcblx0XHRcdFx0dmFyIGNvbnRpbnVlVXBkYXRlID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0Ly9hbmFseXNlciBzdHVmZlxyXG5cdFx0ICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhbmFseXNlclwiK2luZGV4KTtcclxuXHRcdCAgICAgICAgdmFyIGFuYWx5c2VyQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0ICAgICAgICB2YXIgYW5hbHlzZXJOb2RlID0gc2NvcGUuYW5hbHlzZXJOb2RlO1xyXG5cdFx0XHRcdHZhciBhbmFseXNlcklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblxyXG5cdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IHRydWU7XHJcblx0XHRcdFx0c2NvcGUudHJhY2suZW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdFJlY29yZGVyRmN0LnJlY29yZFN0YXJ0KHJlY29yZGVyKTtcclxuXHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IHRydWU7XHJcblxyXG5cclxuXHRcdFx0XHRmdW5jdGlvbiB1cGRhdGUoKSB7XHJcblx0XHRcdFx0XHR2YXIgU1BBQ0lORyA9IDM7XHJcblx0XHRcdFx0XHR2YXIgQkFSX1dJRFRIID0gMTtcclxuXHRcdFx0XHRcdHZhciBudW1CYXJzID0gTWF0aC5yb3VuZCgzMDAgLyBTUEFDSU5HKTtcclxuXHRcdFx0XHRcdHZhciBmcmVxQnl0ZURhdGEgPSBuZXcgVWludDhBcnJheShhbmFseXNlck5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xyXG5cclxuXHRcdFx0XHRcdGFuYWx5c2VyTm9kZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnl0ZURhdGEpOyBcclxuXHJcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcclxuXHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSAnI0Y2RDU2NSc7XHJcblx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XHJcblx0XHRcdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRHJhdyByZWN0YW5nbGUgZm9yIGVhY2ggZnJlcXVlbmN5IGJpbi5cclxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgKytpKSB7XHJcblx0XHRcdFx0XHRcdHZhciBtYWduaXR1ZGUgPSAwO1xyXG5cdFx0XHRcdFx0XHR2YXIgb2Zmc2V0ID0gTWF0aC5mbG9vciggaSAqIG11bHRpcGxpZXIgKTtcclxuXHRcdFx0XHRcdFx0Ly8gZ290dGEgc3VtL2F2ZXJhZ2UgdGhlIGJsb2NrLCBvciB3ZSBtaXNzIG5hcnJvdy1iYW5kd2lkdGggc3Bpa2VzXHJcblx0XHRcdFx0XHRcdGZvciAodmFyIGogPSAwOyBqPCBtdWx0aXBsaWVyOyBqKyspXHJcblx0XHRcdFx0XHRcdCAgICBtYWduaXR1ZGUgKz0gZnJlcUJ5dGVEYXRhW29mZnNldCArIGpdO1xyXG5cdFx0XHRcdFx0XHRtYWduaXR1ZGUgPSBtYWduaXR1ZGUgLyBtdWx0aXBsaWVyO1xyXG5cdFx0XHRcdFx0XHR2YXIgbWFnbml0dWRlMiA9IGZyZXFCeXRlRGF0YVtpICogbXVsdGlwbGllcl07XHJcblx0XHRcdFx0XHRcdGFuYWx5c2VyQ29udGV4dC5maWxsU3R5bGUgPSBcImhzbCggXCIgKyBNYXRoLnJvdW5kKChpKjM2MCkvbnVtQmFycykgKyBcIiwgMTAwJSwgNTAlKVwiO1xyXG5cdFx0XHRcdFx0XHRhbmFseXNlckNvbnRleHQuZmlsbFJlY3QoaSAqIFNQQUNJTkcsIDEwMCwgQkFSX1dJRFRILCAtbWFnbml0dWRlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmKGNvbnRpbnVlVXBkYXRlKSB7XHJcblx0XHRcdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHVwZGF0ZSApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly9SRUNPUkRJTkcgU1RBUlRTIEFUIE1FQVNVUkUgMVxyXG5cdFx0XHRcdHZhciBtaWNTdGFydElEID0gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0UmVjb3JkZXJGY3QucmVjb3JkU3RhcnQocmVjb3JkZXIsIGluZGV4KTtcclxuXHRcdFx0XHR9LCBcIjFtXCIpO1xyXG5cclxuXHJcblx0XHRcdFx0Ly9SRUNPUkRJTkcgRU5EUyBBVCBNRUFTVVJFIDJcclxuXHRcdFx0XHR2YXIgbWljRW5kSUQgPSBUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRSZWNvcmRlckZjdC5yZWNvcmRTdG9wKGluZGV4LCByZWNvcmRlcikudGhlbihmdW5jdGlvbiAocGxheWVyKSB7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJlY29yZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5lbXB0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZVVwZGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHRcdFx0XHRcdFx0c2NvcGUudHJhY2sucGxheWVyID0gcGxheWVyO1xyXG5cdFx0XHRcdFx0XHRzY29wZS50cmFjay5wbGF5ZXIubG9vcCA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLmJ1ZmZlciA9IHdpbmRvdy5sYXRlc3RCdWZmZXI7XHJcblx0XHRcdFx0XHRcdHNjb3BlLnRyYWNrLnJhd0F1ZGlvID0gd2luZG93LmxhdGVzdFJlY29yZGluZztcclxuXHRcdFx0XHRcdFx0cGxheWVyLmNvbm5lY3Qoc2NvcGUudHJhY2suZWZmZWN0c1JhY2tbMF0pO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncGxheWVyJywgcGxheWVyKTtcclxuXHRcdFx0XHRcdFx0VG9uZVRpbWVsaW5lRmN0LnVuTXV0ZUFsbChzY29wZS4kcGFyZW50LnRyYWNrcyk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUobWljU3RhcnRJRCk7XHJcblx0XHRcdFx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUobWljRW5kSUQpO1xyXG5cdFx0XHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdG9wKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9LCBcIjJtXCIpO1xyXG5cclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zdGFydCgpO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0XHRzY29wZS5wcmV2aWV3ID0gZnVuY3Rpb24oY3VycmVudGx5UHJldmlld2luZykge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGN1cnJlbnRseVByZXZpZXdpbmcpO1xyXG5cdFx0XHRcdGlmKGN1cnJlbnRseVByZXZpZXdpbmcpIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdG9wKCk7XHJcblx0XHRcdFx0XHRzY29wZS50cmFjay5wcmV2aWV3aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNjb3BlLnRyYWNrLnBsYXllci5zdGFydCgpO1xyXG5cdFx0XHRcdFx0c2NvcGUudHJhY2sucHJldmlld2luZyA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUuY2hhbmdlV2V0bmVzcyA9IGZ1bmN0aW9uKGVmZmVjdCwgYW1vdW50KSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZWZmZWN0KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhhbW91bnQpO1xyXG5cclxuXHRcdFx0XHRlZmZlY3Qud2V0LnZhbHVlID0gYW1vdW50IC8gMTAwMDtcclxuXHRcdFx0fTtcclxuXHJcblx0XHR9XHJcblx0XHRcclxuXHJcblx0fVxyXG59KTsiLCJhcHAuZmFjdG9yeSgnQW5hbHlzZXJGY3QnLCBmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIHVwZGF0ZUFuYWx5c2VycyA9IGZ1bmN0aW9uIChhbmFseXNlckNvbnRleHQsIGFuYWx5c2VyTm9kZSwgY29udGludWVVcGRhdGUpIHtcclxuXHJcblx0XHRmdW5jdGlvbiB1cGRhdGUoKSB7XHJcblx0XHRcdHZhciBTUEFDSU5HID0gMztcclxuXHRcdFx0dmFyIEJBUl9XSURUSCA9IDE7XHJcblx0XHRcdHZhciBudW1CYXJzID0gTWF0aC5yb3VuZCgzMDAgLyBTUEFDSU5HKTtcclxuXHRcdFx0dmFyIGZyZXFCeXRlRGF0YSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XHJcblxyXG5cdFx0XHRhbmFseXNlck5vZGUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ5dGVEYXRhKTsgXHJcblxyXG5cdFx0XHRhbmFseXNlckNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDMwMCwgMTAwKTtcclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9ICcjRjZENTY1JztcclxuXHRcdFx0YW5hbHlzZXJDb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cdFx0XHR2YXIgbXVsdGlwbGllciA9IGFuYWx5c2VyTm9kZS5mcmVxdWVuY3lCaW5Db3VudCAvIG51bUJhcnM7XHJcblxyXG5cdFx0XHQvLyBEcmF3IHJlY3RhbmdsZSBmb3IgZWFjaCBmcmVxdWVuY3kgYmluLlxyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7ICsraSkge1xyXG5cdFx0XHRcdHZhciBtYWduaXR1ZGUgPSAwO1xyXG5cdFx0XHRcdHZhciBvZmZzZXQgPSBNYXRoLmZsb29yKCBpICogbXVsdGlwbGllciApO1xyXG5cdFx0XHRcdC8vIGdvdHRhIHN1bS9hdmVyYWdlIHRoZSBibG9jaywgb3Igd2UgbWlzcyBuYXJyb3ctYmFuZHdpZHRoIHNwaWtlc1xyXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqPCBtdWx0aXBsaWVyOyBqKyspXHJcblx0XHRcdFx0ICAgIG1hZ25pdHVkZSArPSBmcmVxQnl0ZURhdGFbb2Zmc2V0ICsgal07XHJcblx0XHRcdFx0bWFnbml0dWRlID0gbWFnbml0dWRlIC8gbXVsdGlwbGllcjtcclxuXHRcdFx0XHR2YXIgbWFnbml0dWRlMiA9IGZyZXFCeXRlRGF0YVtpICogbXVsdGlwbGllcl07XHJcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxTdHlsZSA9IFwiaHNsKCBcIiArIE1hdGgucm91bmQoKGkqMzYwKS9udW1CYXJzKSArIFwiLCAxMDAlLCA1MCUpXCI7XHJcblx0XHRcdFx0YW5hbHlzZXJDb250ZXh0LmZpbGxSZWN0KGkgKiBTUEFDSU5HLCAxMDAsIEJBUl9XSURUSCwgLW1hZ25pdHVkZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYoY29udGludWVVcGRhdGUpIHtcclxuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCB1cGRhdGUgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSggdXBkYXRlICk7XHJcblx0fVxyXG5cclxuXHJcblx0dmFyIGNhbmNlbEFuYWx5c2VyVXBkYXRlcyA9IGZ1bmN0aW9uIChhbmFseXNlcklkKSB7XHJcblx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoIGFuYWx5c2VySWQgKTtcclxuXHR9XHJcblx0cmV0dXJuIHtcclxuXHRcdHVwZGF0ZUFuYWx5c2VyczogdXBkYXRlQW5hbHlzZXJzLFxyXG5cdFx0Y2FuY2VsQW5hbHlzZXJVcGRhdGVzOiBjYW5jZWxBbmFseXNlclVwZGF0ZXNcclxuXHR9XHJcbn0pOyIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ0hvbWVGY3QnLCBmdW5jdGlvbigkaHR0cCl7XHJcblxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0VXNlcjogZnVuY3Rpb24odXNlcil7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcicsIHtwYXJhbXM6IHtfaWQ6IHVzZXJ9fSlcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc3VjY2Vzcyl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2Vzcy5kYXRhO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxufSk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5hcHAuZmFjdG9yeSgnUHJvamVjdEZjdCcsIGZ1bmN0aW9uKCRodHRwKXtcclxuXHJcbiAgICB2YXIgZ2V0UHJvamVjdEluZm8gPSBmdW5jdGlvbiAocHJvamVjdElkKSB7XHJcblxyXG4gICAgICAgIC8vaWYgY29taW5nIGZyb20gSG9tZUNvbnRyb2xsZXIgYW5kIG5vIElkIGlzIHBhc3NlZCwgc2V0IGl0IHRvICdhbGwnXHJcbiAgICAgICAgdmFyIHByb2plY3RpZD0gcHJvamVjdElkIHx8ICdhbGwnXHJcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9qZWN0cy8nICsgcHJvamVjdGlkIHx8IHByb2plY3RpZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgY3JlYXRlQUZvcmsgPSBmdW5jdGlvbihwcm9qZWN0KXtcclxuICAgIFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcHJvamVjdHMvJywgcHJvamVjdCkudGhlbihmdW5jdGlvbihmb3JrKXtcclxuICAgIFx0XHRyZXR1cm4gJGh0dHAucHV0KCdhcGkvdXNlcnMvJywgZm9yay5kYXRhKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgIFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgXHRcdH0pO1xyXG4gICAgXHR9KTtcclxuICAgIH1cclxuICAgIHZhciBuZXdQcm9qZWN0ID0gZnVuY3Rpb24odXNlcil7XHJcbiAgICBcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Byb2plY3RzJyx7b3duZXI6dXNlci5faWQsIG5hbWU6J1VudGl0bGVkJywgYnBtOjEyMCwgZW5kTWVhc3VyZTogMzJ9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgIFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgIFx0fSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldFByb2plY3RJbmZvOiBnZXRQcm9qZWN0SW5mbyxcclxuICAgICAgICBjcmVhdGVBRm9yazogY3JlYXRlQUZvcmssXHJcbiAgICAgICAgbmV3UHJvamVjdDogbmV3UHJvamVjdFxyXG4gICAgfTtcclxuXHJcbn0pO1xyXG4iLCJhcHAuZmFjdG9yeSgnUmVjb3JkZXJGY3QnLCBmdW5jdGlvbiAoJGh0dHAsIEF1dGhTZXJ2aWNlLCAkcSwgVG9uZVRyYWNrRmN0LCBBbmFseXNlckZjdCkge1xyXG5cclxuICAgIHZhciByZWNvcmRlckluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIHZhciBDb250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xyXG4gICAgICAgICAgICB2YXIgYXVkaW9Db250ZXh0ID0gbmV3IENvbnRleHQoKTtcclxuICAgICAgICAgICAgdmFyIHJlY29yZGVyO1xyXG5cclxuICAgICAgICAgICAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XHJcbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSAoXHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWFcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBuYXZpZ2F0b3Iud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgbmF2aWdhdG9yLm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lO1xyXG4gICAgICAgICAgICBpZiAoIW5hdmlnYXRvci5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXHJcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gbmF2aWdhdG9yLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBuYXZpZ2F0b3IubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xyXG5cclxuICAgICAgICAgICAgLy8gYXNrIGZvciBwZXJtaXNzaW9uXHJcbiAgICAgICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcImF1ZGlvXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWFuZGF0b3J5XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dFY2hvQ2FuY2VsbGF0aW9uXCI6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdvb2dBdXRvR2FpbkNvbnRyb2xcIjogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ05vaXNlU3VwcHJlc3Npb25cIjogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ29vZ0hpZ2hwYXNzRmlsdGVyXCI6IFwiZmFsc2VcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3B0aW9uYWxcIjogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoc3RyZWFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dFBvaW50ID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbiBBdWRpb05vZGUgZnJvbSB0aGUgc3RyZWFtLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbEF1ZGlvSW5wdXQgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF1ZGlvSW5wdXQgPSByZWFsQXVkaW9JbnB1dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXVkaW9JbnB1dC5jb25uZWN0KGlucHV0UG9pbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuYWx5c2VyIG5vZGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFuYWx5c2VyTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXNlck5vZGUuZmZ0U2l6ZSA9IDIwNDg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0UG9pbnQuY29ubmVjdCggYW5hbHlzZXJOb2RlICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSByZWNvcmRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRlciA9IG5ldyBSZWNvcmRlciggaW5wdXRQb2ludCApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgemVyb0dhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB6ZXJvR2Fpbi5nYWluLnZhbHVlID0gMC4wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFBvaW50LmNvbm5lY3QoIHplcm9HYWluICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHplcm9HYWluLmNvbm5lY3QoIGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbiApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShbcmVjb3JkZXIsIGFuYWx5c2VyTm9kZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBhdWRpbycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciByZWNvcmRTdGFydCA9IGZ1bmN0aW9uIChyZWNvcmRlcikge1xyXG4gICAgICAgIHJlY29yZGVyLmNsZWFyKCk7XHJcbiAgICAgICAgcmVjb3JkZXIucmVjb3JkKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlY29yZFN0b3AgPSBmdW5jdGlvbiAoaW5kZXgsIHJlY29yZGVyKSB7XHJcbiAgICAgICAgcmVjb3JkZXIuc3RvcCgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICAvLyBlLmNsYXNzTGlzdC5yZW1vdmUoXCJyZWNvcmRpbmdcIik7XHJcbiAgICAgICAgICAgIHJlY29yZGVyLmdldEJ1ZmZlcnMoZnVuY3Rpb24gKGJ1ZmZlcnMpIHtcclxuICAgICAgICAgICAgICAgIC8vZGlzcGxheSB3YXYgaW1hZ2VcclxuICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJ3YXZlZGlzcGxheVwiICsgIGluZGV4ICk7XHJcbiAgICAgICAgICAgICAgICBkcmF3QnVmZmVyKCAzMDAsIDEwMCwgY2FudmFzLmdldENvbnRleHQoJzJkJyksIGJ1ZmZlcnNbMF0gKTtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sYXRlc3RCdWZmZXIgPSBidWZmZXJzWzBdO1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmxhdGVzdFJlY29yZGluZ0ltYWdlID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB0aGUgT05MWSB0aW1lIGdvdEJ1ZmZlcnMgaXMgY2FsbGVkIGlzIHJpZ2h0IGFmdGVyIGEgbmV3IHJlY29yZGluZyBpcyBjb21wbGV0ZWQgLSBcclxuICAgICAgICAgICAgICAgIC8vIHNvIGhlcmUncyB3aGVyZSB3ZSBzaG91bGQgc2V0IHVwIHRoZSBkb3dubG9hZC5cclxuICAgICAgICAgICAgICAgIHJlY29yZGVyLmV4cG9ydFdBViggZnVuY3Rpb24gKCBibG9iICkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vbmVlZHMgYSB1bmlxdWUgbmFtZVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlY29yZGVyLnNldHVwRG93bmxvYWQoIGJsb2IsIFwibXlSZWNvcmRpbmcwLndhdlwiICk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgbG9vcCB0aW1lXHJcbiAgICAgICAgICAgICAgICAgICAgVG9uZVRyYWNrRmN0Lmxvb3BJbml0aWFsaXplKGJsb2IsIGluZGV4LCBcIm15UmVjb3JkaW5nMC53YXZcIikudGhlbihyZXNvbHZlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBcclxuXHJcbiAgICBcclxuICAgIHZhciBjb252ZXJ0VG9CYXNlNjQgPSBmdW5jdGlvbiAodHJhY2spIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnZWFjaCB0cmFjaycsIHRyYWNrKTtcclxuICAgICAgICByZXR1cm4gbmV3ICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblxyXG4gICAgICAgICAgICBpZih0cmFjay5yYXdBdWRpbykge1xyXG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwodHJhY2sucmF3QXVkaW8pO1xyXG4gICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcblxyXG5cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHNlbmRUb0FXUzogZnVuY3Rpb24gKHRyYWNrc0FycmF5LCBwcm9qZWN0SWQpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWFkUHJvbWlzZXMgPSB0cmFja3NBcnJheS5tYXAoY29udmVydFRvQmFzZTY0KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWFkUHJvbWlzZXMnLCByZWFkUHJvbWlzZXMpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICRxLmFsbChyZWFkUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKHN0b3JlRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RvcmVEYXRhJywgc3RvcmVEYXRhKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0cmFja3NBcnJheS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaywgaSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdG9yZURhdGFbaV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2sucmF3QXVkaW8gPSBzdG9yZURhdGFbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyYWNrc0FycmF5JywgdHJhY2tzQXJyYXkpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2F3cy8nLCB7IHRyYWNrcyA6IHRyYWNrc0FycmF5LCBwcm9qZWN0SWQgOiBwcm9qZWN0SWQgfSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGluIHNlbmRUb0FXU0ZhY3RvcnknLCByZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhOyBcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZWNvcmRlckluaXQ6IHJlY29yZGVySW5pdCxcclxuICAgICAgICByZWNvcmRTdGFydDogcmVjb3JkU3RhcnQsXHJcbiAgICAgICAgcmVjb3JkU3RvcDogcmVjb3JkU3RvcFxyXG4gICAgfVxyXG59KTsiLCIndXNlIHN0cmljdCc7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1RvbmVUaW1lbGluZUZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcclxuXHJcblx0dmFyIGNyZWF0ZVRyYW5zcG9ydCA9IGZ1bmN0aW9uIChsb29wRW5kKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0Lmxvb3AgPSB0cnVlO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wU3RhcnQgPSAnMG0nO1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5sb29wRW5kID0gbG9vcEVuZC50b1N0cmluZygpICsgJ20nO1xyXG5cdFx0XHR2YXIgcGxheUhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWJhY2tIZWFkJyk7XHJcblxyXG5cdFx0XHRjcmVhdGVNZXRyb25vbWUoKS50aGVuKGZ1bmN0aW9uIChtZXRyb25vbWUpIHtcclxuXHRcdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHR2YXIgcG9zQXJyID0gVG9uZS5UcmFuc3BvcnQucG9zaXRpb24uc3BsaXQoJzonKTtcclxuXHRcdFx0XHRcdHZhciBsZWZ0UG9zID0gKChwYXJzZUludChwb3NBcnJbMF0pICogMjAwICkgKyAocGFyc2VJbnQocG9zQXJyWzFdKSAqIDUwKSArIDMwMCkudG9TdHJpbmcoKSArICdweCc7XHJcblx0XHRcdFx0XHRwbGF5SGVhZC5zdHlsZS5sZWZ0ID0gbGVmdFBvcztcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcclxuXHRcdFx0XHRcdG1ldHJvbm9tZS5zdGFydCgpO1xyXG5cdFx0XHRcdH0sICc0bicpO1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKG1ldHJvbm9tZSk7XHJcblx0XHRcdH0pO1xyXG4gICAgICAgIH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBjaGFuZ2VCcG0gPSBmdW5jdGlvbiAoYnBtKSB7XHJcblx0XHRUb25lLlRyYW5zcG9ydC5icG0udmFsdWUgPSBicG07XHJcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQ7XHJcblx0fTtcclxuXHJcblx0dmFyIHN0b3BBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIuc3RvcCgpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dmFyIG11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gLTEwMDtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciB1bk11dGVBbGwgPSBmdW5jdGlvbiAodHJhY2tzKSB7XHJcblx0XHR0cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcclxuXHRcdFx0aWYodHJhY2sucGxheWVyKSB0cmFjay5wbGF5ZXIudm9sdW1lLnZhbHVlID0gMDtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBjcmVhdGVNZXRyb25vbWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0ICAgICAgICB2YXIgbWV0ID0gbmV3IFRvbmUuUGxheWVyKFwiL2FwaS93YXYvQ2xpY2sxLndhdlwiLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUobWV0KTtcclxuXHQgICAgICAgIH0pLnRvTWFzdGVyKCk7XHJcbiAgICAgICAgfSk7XHJcblx0fTtcclxuXHJcblx0dmFyIGFkZExvb3BUb1RpbWVsaW5lID0gZnVuY3Rpb24gKHBsYXllciwgc3RhcnRUaW1lQXJyYXkpIHtcclxuXHJcblx0XHRpZihzdGFydFRpbWVBcnJheS5pbmRleE9mKDApID09PSAtMSkge1xyXG5cdFx0XHRUb25lLlRyYW5zcG9ydC5zZXRUaW1lbGluZShmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHR9LCBcIjBtXCIpXHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHN0YXJ0VGltZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VGltZSkge1xyXG5cclxuXHRcdFx0dmFyIHN0YXJ0VGltZSA9IHN0YXJ0VGltZS50b1N0cmluZygpICsgJ20nO1xyXG5cclxuXHRcdFx0VG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTdGFydCcsIFRvbmUuVHJhbnNwb3J0LnBvc2l0aW9uKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0XHRcdHBsYXllci5zdGFydCgpO1xyXG5cdFx0XHR9LCBzdGFydFRpbWUpO1xyXG5cclxuXHRcdFx0Ly8gdmFyIHN0b3BUaW1lID0gcGFyc2VJbnQoc3RhcnRUaW1lLnN1YnN0cigwLCBzdGFydFRpbWUubGVuZ3RoLTEpKSArIDEpLnRvU3RyaW5nKCkgKyBzdGFydFRpbWUuc3Vic3RyKC0xLDEpO1xyXG5cdFx0XHQvLy8vIGNvbnNvbGUubG9nKCdTVE9QJywgc3RvcCk7XHJcblx0XHRcdC8vLy8gdHJhbnNwb3J0LnNldFRpbWVsaW5lKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0Ly8vLyBcdHBsYXllci5zdG9wKCk7XHJcblx0XHRcdC8vLy8gfSwgc3RvcFRpbWUpO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHR9O1xyXG5cdFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBjcmVhdGVUcmFuc3BvcnQ6IGNyZWF0ZVRyYW5zcG9ydCxcclxuICAgICAgICBjaGFuZ2VCcG06IGNoYW5nZUJwbSxcclxuICAgICAgICBhZGRMb29wVG9UaW1lbGluZTogYWRkTG9vcFRvVGltZWxpbmUsXHJcbiAgICAgICAgY3JlYXRlTWV0cm9ub21lOiBjcmVhdGVNZXRyb25vbWUsXHJcbiAgICAgICAgc3RvcEFsbDogc3RvcEFsbCxcclxuICAgICAgICBtdXRlQWxsOiBtdXRlQWxsLFxyXG4gICAgICAgIHVuTXV0ZUFsbDogdW5NdXRlQWxsXHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuYXBwLmZhY3RvcnkoJ1RvbmVUcmFja0ZjdCcsIGZ1bmN0aW9uICgkaHR0cCwgJHEpIHtcclxuXHJcblx0dmFyIGNyZWF0ZVBsYXllciA9IGZ1bmN0aW9uICh1cmwsIGRvbmVGbikge1xyXG5cdFx0dmFyIHBsYXllciAgPSBuZXcgVG9uZS5QbGF5ZXIodXJsLCBkb25lRm4pO1xyXG5cdFx0Ly8gVE9ETzogcmVtb3ZlIHRvTWFzdGVyXHJcblx0XHRwbGF5ZXIudG9NYXN0ZXIoKTtcclxuXHRcdC8vIHBsYXllci5zeW5jKCk7XHJcblx0XHQvLyBwbGF5ZXIubG9vcCA9IHRydWU7XHJcblx0XHRyZXR1cm4gcGxheWVyO1xyXG5cdH07XHJcblxyXG5cdHZhciBsb29wSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGJsb2IsIGluZGV4LCBmaWxlbmFtZSkge1xyXG5cdFx0cmV0dXJuIG5ldyAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdC8vUEFTU0VEIEEgQkxPQiBGUk9NIFJFQ09SREVSSlNGQUNUT1JZIC0gRFJPUFBFRCBPTiBNRUFTVVJFIDBcclxuXHRcdFx0dmFyIHVybCA9ICh3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuXHRcdFx0dmFyIGxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNhdmVcIitpbmRleCk7XHJcblx0XHRcdGxpbmsuaHJlZiA9IHVybDtcclxuXHRcdFx0bGluay5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdvdXRwdXQnK2luZGV4Kycud2F2JztcclxuXHRcdFx0d2luZG93LmxhdGVzdFJlY29yZGluZyA9IGJsb2I7XHJcblx0XHRcdHdpbmRvdy5sYXRlc3RSZWNvcmRpbmdVUkwgPSB1cmw7XHJcblx0XHRcdHZhciBwbGF5ZXI7XHJcblx0XHRcdC8vIFRPRE86IHJlbW92ZSB0b01hc3RlclxyXG5cdFx0XHRwbGF5ZXIgPSBuZXcgVG9uZS5QbGF5ZXIobGluay5ocmVmLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0cmVzb2x2ZShwbGF5ZXIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHZhciBlZmZlY3RzSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGNob3J1cyA9IG5ldyBUb25lLkNob3J1cygpO1xyXG5cdFx0dmFyIHBoYXNlciA9IG5ldyBUb25lLlBoYXNlcigpO1xyXG5cdFx0dmFyIGRpc3RvcnQgPSBuZXcgVG9uZS5EaXN0b3J0aW9uKCk7XHJcblx0XHR2YXIgcGluZ3BvbmcgPSBuZXcgVG9uZS5QaW5nUG9uZ0RlbGF5KCk7XHJcblx0XHRjaG9ydXMud2V0LnZhbHVlID0gMDtcclxuXHRcdHBoYXNlci53ZXQudmFsdWUgPSAwO1xyXG5cdFx0ZGlzdG9ydC53ZXQudmFsdWUgPSAwO1xyXG5cdFx0cGluZ3Bvbmcud2V0LnZhbHVlID0gMDtcclxuXHRcdGNob3J1cy5jb25uZWN0KHBoYXNlcik7XHJcblx0XHRwaGFzZXIuY29ubmVjdChkaXN0b3J0KTtcclxuXHRcdGRpc3RvcnQuY29ubmVjdChwaW5ncG9uZyk7XHJcblx0XHRwaW5ncG9uZy50b01hc3RlcigpO1xyXG5cclxuXHRcdHJldHVybiBbY2hvcnVzLCBwaGFzZXIsIGRpc3RvcnQsIHBpbmdwb25nXTtcclxuXHR9XHJcblxyXG5cdHZhciBjcmVhdGVUaW1lbGluZUluc3RhbmNlT2ZMb29wID0gZnVuY3Rpb24ocGxheWVyLCBtZWFzdXJlKSB7XHJcblx0XHRyZXR1cm4gVG9uZS5UcmFuc3BvcnQuc2V0VGltZWxpbmUoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cGxheWVyLnN0YXJ0KCk7XHJcblx0XHRcdH0sIG1lYXN1cmUrXCJtXCIpO1xyXG5cdH1cclxuXHJcblx0dmFyIHJlcGxhY2VUaW1lbGluZUxvb3AgPSBmdW5jdGlvbihwbGF5ZXIsIG9sZFRpbWVsaW5lSWQsIG5ld01lYXN1cmUpIHtcclxuXHRcdHJldHVybiBuZXcgJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnb2xkIHRpbWVsaW5lIGlkJywgb2xkVGltZWxpbmVJZCk7XHJcblx0XHRcdFRvbmUuVHJhbnNwb3J0LmNsZWFyVGltZWxpbmUocGFyc2VJbnQob2xkVGltZWxpbmVJZCkpO1xyXG5cdFx0XHQvLyBUb25lLlRyYW5zcG9ydC5jbGVhclRpbWVsaW5lcygpO1xyXG5cdFx0XHRyZXNvbHZlKGNyZWF0ZVRpbWVsaW5lSW5zdGFuY2VPZkxvb3AocGxheWVyLCBuZXdNZWFzdXJlKSk7XHJcblx0XHR9KVxyXG5cdH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGNyZWF0ZVBsYXllcjogY3JlYXRlUGxheWVyLFxyXG4gICAgICAgIGxvb3BJbml0aWFsaXplOiBsb29wSW5pdGlhbGl6ZSxcclxuICAgICAgICBlZmZlY3RzSW5pdGlhbGl6ZTogZWZmZWN0c0luaXRpYWxpemUsXHJcbiAgICAgICAgY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcDogY3JlYXRlVGltZWxpbmVJbnN0YW5jZU9mTG9vcCxcclxuICAgICAgICByZXBsYWNlVGltZWxpbmVMb29wOiByZXBsYWNlVGltZWxpbmVMb29wXHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsImFwcC5mYWN0b3J5KCd1c2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Z2V0VXNlck9iajogZnVuY3Rpb24odXNlcklEKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXJzJywge3BhcmFtczoge19pZDogdXNlcklEfX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNvb25zZSBpcycsIHJlc3BvbnNlLmRhdGEpXHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHRcdGZvbGxvdzogZnVuY3Rpb24odXNlciwgbG9nZ2VkSW5Vc2VyKXtcclxuXHRcdFx0cmV0dXJuICRodHRwLnB1dCgnYXBpL3VzZXJzJyx7dXNlclRvRm9sbG93OiB1c2VyLCBsb2dnZWRJblVzZXI6IGxvZ2dlZEluVXNlcn0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb2xsb3dVc2VyIEZhY3RvcnkgcmVzcG9uc2UnLCByZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fSlcclxuXHRcdH1cclxuXHR9XHJcblxyXG59KSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==