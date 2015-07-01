app.controller('TimelineController', function($scope, $stateParams, RecorderFct, ProjectFct, TonePlayerFct, ToneTimelineFct) {
  
  var wavArray = [];
  
  $scope.numMeasures = [];
  for (var i = 0; i < 60; i++) {
    $scope.numMeasures.push(i);
  }

  $scope.tracks = [];
  $scope.loading = true;
  $scope.transport;

  // var wavesurfer = Object.create(WaveSurfer);

  // wavesurfer.init({
  //     container: document.querySelector('#wave'),
  //     waveColor: 'violet',
  //     progressColor: 'purple'
  // });

  // wavesurfer.on('ready', function () {
  //     wavesurfer.play();
  // });

  // wavesurfer.load('/api/wav/percussionvocalssynths.wav');

  ProjectFct.getProjectInfo('559371e8f2b61c5582762796').then(function (project) {
      var loaded = 0;
      console.log('PROJECT', project);

      $scope.transport = ToneTimelineFct.transport(project.endMeasure);
      ToneTimelineFct.changeBpm($scope.transport, project.bpm);



      project.tracks.forEach(function (track) {
          var doneLoading = function () {
              loaded++;
              ToneTimelineFct.addLoopToTimeline($scope.transport, track.player, track.locations);
              if(loaded === project.tracks.length) {
                  $scope.loading = false;
                  console.log('STARTING');
                  $scope.transport.start();
              }
          };
          track.player = TonePlayerFct.createPlayer(track.url, doneLoading);
          $scope.tracks.push(track);
      });
  });

  $scope.measureLength = 1;


  $scope.handleDrop = function() {
    // alert('Item has been dropped');
  }

  $scope.record = function (e) {

  	e = e.toElement;

        // start recording
        console.log('start recording');
        
        if (!audioRecorder)
            return;
          console.log('yo');
        e.classList.add("recording");
        audioRecorder.clear();
        audioRecorder.record();

        window.setTimeout(function() {
          audioRecorder.stop();
          e.classList.remove("recording");
          audioRecorder.getBuffers( gotBuffers );
          
          window.setTimeout(function () {
            wavArray.push(window.latestRecording);
            console.log('wavArray', wavArray);
          }, 500);
          
        }
        ,2000);

  }


  $scope.play2 = function(e) {
  	console.log("inside play", globalBuffer);
    var newSource = audioContext.createBufferSource();

    newSource.buffer = globalBuffer;
    newSource.connect( audioContext.destination );
    newSource.start(0);
      // play.toMaster();
      // play.loop = true;
      // Tone.Buffer.onload = 
  }

  $scope.play = function(e) {
  	console.log("inside play", globalBuffer);

  	  var play = new Tone.Player(globalBuffer, function() {
  	  	console.log("Loaded");
  	  	play.start();
  	  });

  	  play.toMaster();
      play.loop = true;
  }

  $scope.addTrack = function () {

  }

  $scope.sendToAWS = function () {

    RecorderFct.sendToAWS(wavArray).then(function (response) {
        // wave logic
        console.log('response from sendToAWS', response);

    })
  };


	


});


