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

router.use('/users', require('./users'));

router.use('/project/:projectId', function (req, res, next) {
	Project.findById('5593228a9d2cc2e8ceea4d02').exec().then(function (project) {
		res.send(project);
	});
	

});

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
    res.status(404).end();
});