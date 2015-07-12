'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var User = mongoose.model('User');
var Fork = mongoose.model('Fork');
var SC = require('node-soundcloud');
var socketio = require('../../../io/index.js')();





router.get('/:id', function (req, res, next) {

    //for HomeController
    if(req.params.id === 'all'){
    	Project.find({}).sort({_id:-1}).populate('owner').exec().then(function(projects){
            res.send(projects)
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
		// console.log(newProject);
		Project.create(newProject).then(function(project) {
			User.update({_id: project.owner}, {$push: {projects: project._id}}).exec().then(function(update){
	            // res.send(update);
	        }, function(err){
	            next(err);
	        });
	        Fork.findOne({original: project.forkOrigin}).exec().then(function(afork){
	        	if(!afork){
		        	Fork.create({
		        		original: project.forkOrigin,
		        		name: project.name.split('(')[0] + ' Alpha',
		        		branch: [project]
		        	}).then(function(newFork){
		        		console.log("NEWFORK!", newFork, project);
		        		res.send(newFork);
		        	}, function(err){
		        		next(err);
		        	});
	        	} else{
	        		console.log("here");
	        		console.log(project.forkOrigin);
		        	Fork.update({original: project.forkOrigin}, {$push: {branch: project._id}}).exec().then(function(fork){
		        		console.log("adding to fork", fork);
		        		res.send(fork);
		        	}, function(err){
		        		next(err);
		        	});	
	        	}
	        }, function(err){
	        	next(err);
	        });
		}, function(err){
			next(err);
		});
	} else {
		Project.create(req.body).then(function (project) {
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
		if(project.forkID){

			//need to fill this up


		}
        res.sendStatus('its been deleted');
    }, function (err){
        next(err);
    });
});

router.post('/soundcloud', function(req, res, next){
	  var accessToken = req.user.soundcloud.accessToken;
	  console.log('accessToken', accessToken);

	  	SC.init({
  		id: '45c5e6212ac58c73e7d05f8636a9bf22',
  		secret: 'ae88cd6434e65ec74ed1ade69eeb9cca',
  		uri: 'https://127.0.0.1:8000/auth/soundcloud/callback',
  		accessToken: accessToken
	});




	SC.post('/tracks',{track:{name:hry}}, function(err, response){
		if(err){
			console.log('error is',err);

		}
		else{
			console.log(response)
		}
	})
});
