'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

var mongoose = require('mongoose');
// var UserModel = require('mongoose').model('User');
// var ProjectModel = require('mongoose').model('Project');
var ForkModel = require('mongoose').model('Fork');



router.get('/', function(req, res, next) {
    ForkModel.find({}).populate('branch').exec().then(function(web){
        console.log('user', web);
        res.send(web);
    }, function(err){
        next(err);
    });
});

router.post('/', function(req, res){

});

router.put('/', function(req, res, next){
 
});


router.delete(':id', function(req, res){

});