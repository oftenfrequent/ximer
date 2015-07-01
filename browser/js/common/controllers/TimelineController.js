app.controller('TimelineController', function($scope, RecorderFactory, ProjectFct, TonePlayerFct, ToneTimelineFct) {

  $scope.tracks = [];
  $scope.loading = true;
  $scope.transport;

  ProjectFct.getProjectInfo(1234).then(function (data) {
      var loaded = 0;
      var project = data.data;
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


  $scope.handleDrop = function() {
    // alert('Item has been dropped');
  }

  $scope.record = function (e) {

  	e = e.toElement;

  	if (e.classList.contains("recording")) {

        // stop recording
        console.log('stop recording');
        audioRecorder.stop();
        e.classList.remove("recording");
        audioRecorder.getBuffers( gotBuffers );
    } else {

        // start recording
        console.log('start recording');
        if (!audioRecorder)
            return;
        e.classList.add("recording");
        audioRecorder.clear();
        audioRecorder.record();
    }

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
  	debugger;
  	// t = Tone.Transport;

  	  var play = new Tone.Player(globalBuffer, function() {
  	  	console.log("Loaded");
  	  	play.start();
  	  });

  	  play.toMaster();
      play.loop = true;
  }

  $scope.sendToAWS = function(){
  	RecorderFactory.sendToAWS(window.recordedBlob, function(error, success){
  		if (error)
  			console.error(error);
  		else
  			console.log('Success', success);
  	});
  };


	


});


