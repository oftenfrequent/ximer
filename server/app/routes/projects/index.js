'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var User = mongoose.model('User');



router.get('/:id', function (req, res, next) {

    //for HomeController
    if(req.params.id === 'all'){
    	Project.find({}).populate('owner').exec().then(function(projects){
            res.send(projects);
        }, function(err){
            next(err);
        })
    }
    else{
        Project.findById(req.params.id).exec().then(function (project) {
            res.send(project);
        }, function (err){
            next(err);
        });
    }
});

router.post('/', function(req, res, next) {

	//req.body {name: req.body.name, bpm: req.body.bpm}
	// TODO  - Need to Change to be dynamic
	var newProject = req.body;
	if(newProject.forkID){
		newProject.name = req.body.name + "(Forked)";
		console.log(newProject);
		Project.create(newProject).then(function(project) {
			res.send(project);
		}, function(err){
			next(err);
		});
	} else {
		Project.create(req.body).then(function (project) {
	        console.log('Newly created project is', project);
	        project.bpm = 120;
	        project.endMeasure = 16;
	        User.findById(req.body.owner).exec().then(function(user){
	            user.projects.push(project._id);
	            console.log('user now has', user);
	            user.save();
	            res.send(project._id);
	        });
	
	    }, function (err){
	       next(err);
	    });
	}
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