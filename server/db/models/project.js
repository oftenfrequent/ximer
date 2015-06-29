'use strict';
var crypto = require('crypto');
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
    Name: String,
    Owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    Forked: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    Tracks: [String],
    BPM: Number
});


mongoose.model('Project', schema);