'use strict';
var router = require('express').Router();
module.exports = router;
var UserModel = require('mongoose').model('User');




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