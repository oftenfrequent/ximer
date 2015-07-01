app.controller('TimelineController', function($scope, RecorderFactory, ProjectFct, TonePlayerFct, ToneTimelineFct) {

  $scope.tracks = [];
  $scope.loading = true;
  $scope.transport;

  ProjectFct.getProjectInfo(1234).then(function (data) {

      var loaded = 0;
      var project = data.data;

      project.tracks.forEach(function (track) {
          var doneLoading = function () {
              loaded++;
              if(loaded === project.tracks.length) {
                  $scope.loading = false;
                  Tone.Transport.start();
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


