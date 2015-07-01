'use strict';
var crypto = require('crypto');
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
    name: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    forked: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    tracks: [{
        locations: [Number],
        url: String
    }],
    endMeasure: Number,
    bpm: Number
});


mongoose.model('Project', schema);