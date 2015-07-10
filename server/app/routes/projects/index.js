'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var User = mongoose.model('User');
var SC = require('node-soundcloud');
var socketio = require('../../../io/index.js')();





router.get('/:id', function (req, res, next) {

    //for HomeController
    if(req.params.id === 'all'){
    	Project.find({}).sort({_id:-1}).populate('owner').exec().then(function(projects){
            res.send(projects)
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
	console.log('req.user is', req.user);
	  var soundCloudCode = req.user.soundcloud.code;
	  console.log('soundCloudCode', soundCloudCode);

	  	SC.init({
  		clientId: '45c5e6212ac58c73e7d05f8636a9bf22',
  		clientSecret: 'ae88cd6434e65ec74ed1ade69eeb9cca',
  		redirectUri: 'https://127.0.0.1:8000/auth/soundcloud/callback'
	});


	  SC.authorize(soundCloudCode, function(err, accessToken) {
    	if ( err ) {
    		console.log('ERRORR IS ', err)
      		throw err;
    	} else {
      // Client is now authorized and able to make API calls
      console.log('access token:', accessToken);
    	}
  	});
 

	// SC.post('/tracks',{title: 'Hey'}, function(err, response){
	// 	console.log('error is',err);
	// 	console.log('response is', response)
	// })
})