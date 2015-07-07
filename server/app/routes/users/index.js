'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;
var UserModel = require('mongoose').model('User');

var mongoose = require('mongoose');




router.get('/', function (req, res) {
    UserModel.findOne(req.query).populate('projects').exec().then(function(user){
        console.log('user', user)
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

router.put('/', function(req, res){
    if(req.body.forkID){
        console.log("htatlatalta", req.body);
        UserModel.update({_id: req.body.owner}, {$push: {projects: req.body._id}}).exec().then(function(update){
            res.send(update);
        }, function(err){
            res.send(err);
        });
    }
    UserModel.update({_id: req.params.id}, req.body);
});

router.put('/userproject', function(req, res){
    console.log('YOOOO')
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