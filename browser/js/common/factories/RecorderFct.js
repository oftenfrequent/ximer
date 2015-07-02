app.factory('RecorderFct', function ($http, AuthService, $q) {

    var convertToBase64 = function (track) {

        return new $q(function (resolve, reject) {


            var reader = new FileReader();

            if(track.rawAudio) {
                reader.readAsDataURL(track.rawAudio);

                reader.onloadend = function(e) {
                    resolve(reader.result);
                }
            }

        });
    };

    return {
        sendToAWS: function (tracksArray, projectId) {


            var readPromises = tracksArray.map(convertToBase64);

            console.log('ReadPromises are', readPromises);
            return $q.all(readPromises).then(function (storeData) {
                console.log('storeData', storeData);

                tracksArray.forEach(function(track, i){
                    track.rawAudio = storeData[i];
                })
                return $http.post('/api/aws/', { tracks : storeData, projectId: projectId })
                    .then(function (response) {
                        console.log('response in sendToAWSFactory', response);
                        return response.data; 
                });
            });
            
        }
    }
});