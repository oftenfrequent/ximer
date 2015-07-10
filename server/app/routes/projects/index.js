'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var User = mongoose.model('User');
var Fork = mongoose.model('Fork');



router.get('/:id', function (req, res, next) {

    //for HomeController
    if(req.params.id === 'all'){
    	Project.find({}).populate('owner').exec().then(function(projects){
            console.log('project is', projects);
            res.send(projects);
        }, function(err){
            next(err);
        });
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
	// TODO: Need to Change to be dynamic
	var newProject = req.body;
	if(newProject.forkID){
		newProject.name = req.body.name + "(Forked)";
		console.log(newProject);
		Project.create(newProject).then(function(project) {
			User.update({_id: project.owner}, {$push: {projects: project._id}}).exec().then(function(update){
	            res.send(update);
	        }, function(err){
	            res.send(err);
	        });
	        // if(Fork.find({original: newProject.forkOrigin}).length === 0){
	        // 	var newFork = new Fork
	        // 	Fork.create
	        // } else {

	        // }
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
	Project.findByIdAndUpdate(req.params.id, {$set: req.body}, {upsert: false})
	.exec().then(function (err, project) {
            res.send(project);
    }, function (err) {
        return next(err);
    });
});

router.delete('/:id', function(req, res, next) {
	Project.findByIdAndRemove(req.params.id).exec().then(function (project) {
		console.log('Data is',data)
		if(project.forkID){

			//need to fill this up


		}
        res.sendStatus('its been deleted');
    }, function (err){
        next(err);
    });
});