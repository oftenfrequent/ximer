'use strict';
var crypto = require('crypto');
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
    name: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    forkID: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    tracks: [{
        name: String,
        location: [Number],
        url: String,
        img: String,
        effectsRack: [Number]
    }],
    endMeasure: Number,
    bpm: Number
});


mongoose.model('Project', schema);