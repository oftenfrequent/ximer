'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;
var UserModel = require('mongoose').model('User');

var mongoose = require('mongoose');




router.get('/', function (req, res) {
    UserModel.find(req.query).populate('projects').exec().then(function(data){
        res.send(data[0].projects);
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

router.delete(':id', function(req, res){
    UserModel.remove({_id: req.params.id}, function(err){
        if(err) res.status(500).send(err);
        res.send('Success!');
    });
});