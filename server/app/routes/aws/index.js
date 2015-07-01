'use strict';
var router = require('express').Router();
module.exports = router;

var _ = require('lodash');
var body = require('body-parser');
var mongoose = require('mongoose');
var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var s3 = new AWS.S3();
var fs = require('fs');
var path = require('path');
var bucketName = 'fullstacktracks';

var Project = mongoose.model('Project');


router.post('/', function (req, res, next) {

	var tracks = req.body.tracks;

	var urlTracks = [];
	// console.log('tracks', tracks);

	tracks.forEach(function(track){
		
		var slicedTrack = track.split(',');
		console.log('Sliced Track', slicedTrack)
		var trackBuffer = new Buffer(slicedTrack[1],'base64'); // the blob


		//the uuid generates a unique string of characters each time
		var keyName = 'sample'+ uuid.v4()+'.wav';
		var url = 'https://s3-us-west-2.amazonaws.com/fullstacktracks/'+keyName;
		urlTracks.push(url)
		var params = {Bucket: bucketName, Key: keyName, Body: trackBuffer};

		s3.putObject(params, function(err, data) {
		if (err)
		 console.log(err)
		else
		 console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
		 console.log('data is', data)


		});
	})
	res.send(urlTracks);
});
