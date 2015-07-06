'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var User = mongoose.model('User');



router.get('/:id', function (req, res, next) {
	Project.findById(req.params.id).exec().then(function (project) {
		res.send(project);
	}, function (err){
		next(err);
    });
});

router.post('/', function(req, res, next) {
	//req.body {name: req.body.name, bpm: req.body.bpm}
	// TODO  - Need to Change to be dynamic

	req.body.endMeasure = 16;
	console.log('req.body is', req.body);
	Project.create(req.body).then(function (project) {

		console.log('Newly created project is', project)
	// 	User.update({_id: req.body.owner},{
	// 		$push: {projects:project._id}
	// 	}).then(function(user){
	// 		console.log('User has now', user.projects)
	// 		user.save();
		User.findById(req.body.owner).exec().then(function(user){
			user.projects.push(project._id);
			console.log('user now has', user);
			user.save();
			res.send(user);

		})
	
	// 
	}, function (err){
        next(err);
    });
});

router.put('/:id', function (req, res, next) {
	//update project info
	//WILL REQUIRE A LOT MORE LOGIC
});

router.delete('/:id', function(req, res, next) {
	Project.findByIdAndRemove(req.params.id).exec().then(function (data) {
        res.sendStatus(200);
    }, function (err){
        next(err);
    });
});