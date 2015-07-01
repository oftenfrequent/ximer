
app.factory('RecorderFactory', function ($http, AuthService) {

    return {
    	sendToAWS: function (waveFiles) {
    		return $http.get('/api/sendToAWS/',{waveFiles: waveFiles} ).then(function(response){
                console.log('response', response.data);
                return response.data;
            });	
    	}
}
});