'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');


var ensureAdminAuthenticated = function(req, res, next) {
    if(req.isAuthenticated()) {
        next();
    } else {
        res.status(401).end();
    }
}


//anything below this users need to be authenticated
router.use('/', ensureAdminAuthenticated);

//route to get loops
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
router.use('/projects', require('./projects'));
router.use('/aws', require('./aws'));

router.use('/project/:projectId', function (req, res, next) {
	Project.findById('559371e8f2b61c5582762796').exec().then(function (project) {
		res.send(project);
	});
});

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
    res.status(404).end();
});