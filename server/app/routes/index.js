'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');

router.use('/', function (req, res, next) {
	console.log('HERE');
	next();
});

router.use('/wav/:loopname', function (req, res, next) {
	var p = path.join(__dirname, '../../../wav/');
	console.log('LOOP NAME', p);
	fs.readFile(p+req.params.loopname, function (err, data) {
		if(err) console.log(err);
		else {
			res.send(data);
		}
	});
});

router.use('/project/:projectId', function (req, res, next) {
	Project.findById('5593228a9d2cc2e8ceea4d02').exec().then(function (project) {
		res.send(project);
	});
	
	// var project = new Project({
	// 	name: 'starter',
	// 	owner: '5592b83c520347b665e007fb',
	// 	tracks: [
 //            {
 //                locations : [0,1,2,3,4,5,6,7,8,9,12,13,14,15],
 //                url : "/api/wav/percussionvocalssynths.wav"
 //            },
 //            {
 //                locations : [4,5,6,7,12,13,14,15,16],
 //                url : "/api/wav/bass-loop-3_synths.wav"
 //            },
 //            {
 //                locations : [4,5,6,7,8,9,10,11],
 //                url : "/api/wav/drum-loop-32_drums.wav"
 //            },
 //            {
 //                locations : [1,3,5,7,9,11,13,15],
 //                url : "/api/wav/drum-loop-41_drums_loop.wav"
 //            },
 //            {
 //                locations : [8,9,10,11],
 //                url : "/api/wav/synth-loop-7.wav"
 //            },
 //            {
 //                locations : [12,13,14,15],
 //                url : "/api/wav/vocal-loop-3.wav"
 //            }],
 //        endMeasure: 16,
 //        bpm: 123
	// });
	// project.save(function (err, newProj){
	// 	if(err) next(err);
	// 	else {
	// 		console.log('SUCCESSFUL', newProj);
	// 		res.send(newProj);
	// 	}
	// });
});
router.use('/members', require('./members'));

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
    res.status(404).end();
});