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
	var projectId = req.body.projectId;
	var projectName = req.body.projectName;
	var urlTracks = [];
	

	tracks.forEach(function (track) {
		
		if (track.rawAudio) {
			// base64 data prepends header, spliting the header
			var slicedTrack = track.rawAudio.split(',');
			var trackBuffer = new Buffer(slicedTrack[1], 'base64'); // the blob

			//the uuid generates a unique string of characters each time
			var keyName = uuid.v4() + '.wav';
			var url = 'https://s3-us-west-2.amazonaws.com/fullstacktracks/' + keyName;
			urlTracks.push(url);
			var params = {Bucket: bucketName, Key: keyName, Body: trackBuffer};

			s3.putObject(params, function(err, data) {
				if (err)
				 console.log(err);
				else
				 console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
			});
		}
		
	});

	Project.findById(projectId).exec().then(function (project) {

		// clearing all the project tracks so that the updated tracks can be pushed
		project.tracks = [];

		project.name = projectName;

		tracks.forEach(function (track, i) {

			if (track.rawAudio) {

				var newTrack = {};
				newTrack.url = urlTracks[i];
				newTrack.location = track.location;
				newTrack.img = track.img;
				newTrack.effectsRack = track.effectsRack;
				newTrack.name = track.name;
				project.tracks.push(newTrack);

			} else {
				
				delete track.buffer;
				delete track.effectsRack;
				delete track.empty;
				delete track.onTimeline;
				delete track.recording;
				delete track.rawAudio;
				delete track.previewing;
				delete track.player;
				project.tracks.push(track);
			}
		});

		setTimeout(function () {
			// invocation of the node script to stitch wav files and retrieve compiled file
			// script will take project id
			// dispatching async request to create track wavs
			var executeCommand = require('child_process').exec;
	        var command = 'node stitch.js ' + projectId;
	        var options = {
	            cwd : path.join(__dirname, '../../../../')
	        };

	        console.log('running', command);

	        executeCommand(command, options, function (err, stdout, stderr) {
	            if (stderr) console.log('stderr', stderr);
	            else console.log('stdout', stdout);
	        });
		}, 5000);
		

    	return project.save();

    }).then(function () {
    	res.send('great success!');
    });



});
