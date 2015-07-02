
app.factory('RecorderFct', function ($http, AuthService) {

    return {
    	sendToAWS: function (tracksArray) {

	    	tracksArray.forEach(function (track, count) {
	    		
	    		// audio encoding
	    		var reader = new FileReader();

				reader.onloadend = function(e) {
					var arrayBuffer = reader.result;
					track.rawAudio = arrayBuffer;
					count++;

		    		if (count === tracksArray.length) {
			            return $http.post('/api/aws/', { tracks : tracksArray }).then(function (response) {
			                console.log('response', response);
			                return response.data; 
			        	});
			        }
				}

				if (track.url) {
					 reader.readAsDataURL(track.url);

				}

	    	});

    // 		var storeData = [];
    // 		wavArray.forEach(function (blob) {

    // 			var reader = new FileReader();

				// reader.onloadend = function(e) {
				// 	var arrayBuffer = reader.result;
				// 	storeData.push(arrayBuffer)

		  //   		if (storeData.length === wavArray.length) {
			 //            return $http.post('/api/aws/', { tracks : storeData }).then(function (response) {
			 //                console.log('response', response);
			 //                return response.data; 
			 //        	});
			 //        }


				// }

				// if (blob) {
				// 	 reader.readAsDataURL(blob);

				// }
    // 		});
        }
    }
});