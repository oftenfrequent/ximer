'use strict';
var crypto = require('crypto');
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
    original: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    name: String,
    branch: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }]
});


mongoose.model('Fork', schema);