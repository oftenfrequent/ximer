'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
var UserModel = require('mongoose').model('User');
var ProjectModel = require('mongoose').model('Project');





router.get('/', function (req, res) {

    UserModel.findOne(req.query).populate('projects followers following').exec().then(function(user){
      res.send(user);
    }, function(err){
        res.status(500).send(err.message);
    });
});

router.post('/', function(req, res){
    var user = req.body;
    UserModel.create(user).then(function(createdProduct){
        res.send(createdProduct);
    }, function(err){
        res.status(500).send(err.message);
    });
});

router.put('/', function(req, res, next){
    if(req.body.userToFollow){
        UserModel.update({_id: req.body.loggedInUser._id}, {$push: {following: req.body.userToFollow._id}}).exec().then(function(update){

        }, function(err){
            next(err);
        });
        UserModel.update({_id: req.body.userToFollow._id},{$push: {followers: req.body.loggedInUser._id}}).exec().then(function(user){
            res.send(user);
        }, function(err){
            next(err);
        });
    }

    if(req.body.forkID){
        UserModel.update({_id: req.body.owner}, {$push: {projects: req.body._id}}).exec().then(function(update){
            res.send(update);
        }, function(err){
            res.send(err);
        });
    }
    if(req.body.userToUnfollow){
        UserModel.update({_id: req.body.loggedInUser._id}, {$pull: {following: req.body.userToUnfollow._id}}).exec().then(function(update){

        }, function(err){
            next(err);
        });
        UserModel.update({_id: req.body.userToUnfollow._id},{$pull: {followers: req.body.loggedInUser._id}}).exec().then(function(user){
            console.log('Both have been updated');
            res.send(user);
        }, function(err){
            next(err);
        });
    }
    UserModel.update({_id: req.params.id}, req.body);
});

router.put('/userproject', function(req, res){
    // UserModel.findById(req.body.owner).then(function(user){
    //     console.log('User has been updated', user);
    //     user.save();
    //     res.send(user)
    // });
});


router.delete(':id', function(req, res){
    UserModel.remove({_id: req.params.id}, function(err){
        if(err) res.status(500).send(err);
        res.send('Success!');
    });
});