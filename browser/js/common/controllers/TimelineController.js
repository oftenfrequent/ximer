app.controller('TimelineController', function($scope) {
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

});


