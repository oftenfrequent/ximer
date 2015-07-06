'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');


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
	var newProject = req.body;
	if(newProject.forkID){newProject.name = req.body.name + "(Forked)";}
	console.log(newProject);
	Project.create(newProject).then(function(project) {
		res.send(project);
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