app.factory('RecorderFct', function ($http, AuthService, $q, ToneTrackFct, AnalyserFct) {

    var recorderInit = function () {

        return $q(function (resolve, reject) {
            var Context = window.AudioContext || window.webkitAudioContext;
            var audioContext = new Context();
            var recorder;

            var navigator = window.navigator;
            navigator.getUserMedia = (
                navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia
            );
            if (!navigator.cancelAnimationFrame)
                navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
            if (!navigator.requestAnimationFrame)
                navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

            // ask for permission
            navigator.getUserMedia(
                    {
                        "audio": {
                            "mandatory": {
                                "googEchoCancellation": "false",
                                "googAutoGainControl": "false",
                                "googNoiseSuppression": "false",
                                "googHighpassFilter": "false"
                            },
                            "optional": []
                        },
                    }, function (stream) {
                        var inputPoint = audioContext.createGain();

                        // create an AudioNode from the stream.
                        var realAudioInput = audioContext.createMediaStreamSource(stream);
                        var audioInput = realAudioInput;
                        audioInput.connect(inputPoint);

                        // create analyser node
                        var analyserNode = audioContext.createAnalyser();
                        analyserNode.fftSize = 2048;
                        inputPoint.connect( analyserNode );

                        //create recorder
                        recorder = new Recorder( inputPoint );
                        var zeroGain = audioContext.createGain();
                        zeroGain.gain.value = 0.0;
                        inputPoint.connect( zeroGain );
                        zeroGain.connect( audioContext.destination );

                        resolve([recorder, analyserNode]);

                    }, function (e) {
                        alert('Error getting audio');
                        // console.log(e);
                        reject(e);
                    });
        });
    }

    var recordStart = function (recorder) {
        recorder.clear();
        recorder.record();
    }

    var recordStop = function (index, recorder) {
        recorder.stop();
        return new $q(function (resolve, reject) {
            // e.classList.remove("recording");
            recorder.getBuffers(function (buffers) {
                //display wav image
                var canvas = document.getElementById( "wavedisplay" +  index );
                var canvasLoop = document.getElementById( "waveForLoop" +  index );
                drawBuffer( 300, 100, canvas.getContext('2d'), buffers[0] );
                drawBuffer( 198, 98, canvasLoop.getContext('2d'), buffers[0] );
                window.latestBuffer = buffers[0];
                window.latestRecordingImage = canvasLoop.toDataURL("image/png");

                // the ONLY time gotBuffers is called is right after a new recording is completed - 
                // so here's where we should set up the download.
                recorder.exportWAV( function ( blob ) {
                    //needs a unique name
                    // Recorder.setupDownload( blob, "myRecording0.wav" );
                    //create loop time
                    ToneTrackFct.loopInitialize(blob, index, "myRecording0.wav").then(resolve);
                });
            });
        });
    };
    

    
    var convertToBase64 = function (track) {
        console.log('each track', track);
        return new $q(function (resolve, reject) {
            var reader = new FileReader();

            if(track.rawAudio) {
                reader.readAsDataURL(track.rawAudio);
                reader.onloadend = function(e) {
                    resolve(reader.result);
                }
            } else {
                resolve(null);
            }
        });
    };




    return {
        sendToAWS: function (tracksArray, projectId, projectName) {

            var readPromises = tracksArray.map(convertToBase64);

            return $q.all(readPromises).then(function (storeData) {
                // console.log('storeData',storeData);
                tracksArray.forEach(function (track, i) {
                    if (storeData[i]) {
                        track.rawAudio = storeData[i];
                    }
                    track.effectsRack = track.effectsRack.map(function (effect) {
                        console.log("EFFECT", effect.saveValue);
                        return effect.saveValue;
                    });
                });
                console.log('BEFORE SAVE', tracksArray);
                return $http.post('/api/aws/', { tracks : tracksArray, projectId : projectId, projectName : projectName })
                    .then(function (response) {
                        console.log('response in sendToAWSFactory', response);
                        return response.data; 
                });
            });
            
        },
        recorderInit: recorderInit,
        recordStart: recordStart,
        recordStop: recordStop
    }
});