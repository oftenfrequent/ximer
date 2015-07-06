'use strict';
var path = require('path');
var passport = require('passport');
var SC = require('node-soundcloud');
var SoundCloudStrategy = require('passport-soundcloud').Strategy;
var mongoose = require('mongoose');
var UserModel = mongoose.model('User');

module.exports = function (app) {

    var soundcloudConfig = app.getValue('env').SOUNDCLOUD;

   var soundCloudCredentials = {
        clientID: soundcloudConfig.clientID,
        clientSecret: soundcloudConfig.clientSecret,
        callbackURL: soundcloudConfig.callbackURL
    };

    var verifyCallback = function (accessToken, refreshToken, profile, done) {
        debugger;
        UserModel.findOne({ 'soundcloud.id': profile.id }, function (err, user) {

            if (err) return done(err);

            if (user) {
                done(null, user);
            } else {
                UserModel.create({
                    soundcloud: {
                        id: profile.id
                    }
                }).then(function (user) {
                    done(null, user);
                }, function (err) {
                    console.error('Error creating user from SoundCloud authentication', err);
                    done(err);
                });
            }

        });

    };

    passport.use(new SoundCloudStrategy(soundCloudCredentials, verifyCallback));

    app.get('/auth/soundcloud', passport.authenticate('soundcloud'));

    app.get('/auth/soundcloud/callback',
        passport.authenticate('soundcloud', { failureRedirect: '/login' }),
        function (req, res) {
            res.redirect('/');
        });

};