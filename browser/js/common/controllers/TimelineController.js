app.controller('TimelineController', function($scope, $stateParams, RecorderFct, ProjectFct, TonePlayerFct, ToneTimelineFct) {
  
  var wavArray = [];
  
  $scope.numMeasures = [];
  for (var i = 0; i < 60; i++) {
    $scope.numMeasures.push(i);
  }

  $scope.measureLength = 1;
  $scope.tracks = [];
  $scope.loading = true;
  $scope.transport;


  // ProjectFct.getProjectInfo('5593228a9d2cc2e8ceea4d02').then(function (data) {

  //     var loaded = 0;
  //     var project = data.data;
  //     console.log('PROJECT', project); 

  //change getProjectInfo to a project that is in your database
  ProjectFct.getProjectInfo('5594c20ad0759cd40ce51e0d').then(function (project) {
      var loaded = 0;
      console.log('PROJECT', project);

      project.tracks.forEach(function (track) {
          var doneLoading = function () {
              loaded++;
              if(loaded === project.tracks.length) {
                  $scope.loading = false;
                  // Tone.Transport.start();
              }
          };
          track.player = TonePlayerFct.createPlayer(track.url, doneLoading);
          ToneTimelineFct.addLoopToTimeline(track.player, track.locations);
          $scope.tracks.push(track);
      });

      ToneTimelineFct.getTransport(project.endMeasure);
      ToneTimelineFct.changeBpm(project.bpm);

  });

  $scope.record = function (e) {

  	e = e.toElement;

        // start recording
        console.log('start recording');
        
        if (!audioRecorder)
            return;

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
        , 2000);

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


