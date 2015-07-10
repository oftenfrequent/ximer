/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

Refer to the q documentation for why and how q.invoke is used.

*/

var mongoose = require('mongoose');
var connectToDb = require('./server/db');
var User = mongoose.model('User');
var Project = mongoose.model('Project');
var Fork = mongoose.model('Fork');
var q = require('q');
var chalk = require('chalk');

var getCurrentUserData = function () {
    return q.ninvoke(User, 'find', {});
};

var seedUsers = function () {

    var users = [
        {
            email: 'testing@fsa.com',
            password: 'password',
            username: 'Tester'
        },
        {
            email: 'obama@gmail.com',
            password: 'potus',
            username: 'Leader of the Free World'
        },
        {
            email: 'qwe@qwe.com',
            password: '123',
            username: 'Qwerty-Man'
        },
        {
            email: 'asd@asd.com',
            password: '123',
            username: 'Hollow Tapes'
        },
        {
            email: 'zxc@zxc.com',
            password: '123',
            username: 'Random String of Letter'
        }
    ];

    return q.invoke(User, 'create', users);
};

var seedProjects = function (users) {
    var projects =[
        {
            name: 'Starter',
            owner: users[0]._id,
            tracks: [
                {
                    name: "Track 1",
                    locations : [0,1,2,3,4,5,6,7,8,9,12,13,14,15],
                    url : "/api/wav/percussionvocalssynths.wav"
                },
                {
                    name: "Track 2",
                    locations : [4,5,6,7,12,13,14,15,16],
                    url : "/api/wav/bass-loop-3_synths.wav"
                },
                {
                    name: "Track 3",
                    locations : [4,5,6,7,8,9,10,11],
                    url : "/api/wav/drum-loop-32_drums.wav"
                },
                {
                    name: "Track 4",
                    locations : [1,3,5,7,9,11,13,15],
                    url : "/api/wav/drum-loop-41_drums_loop.wav"
                },
                {
                    name: "Track 5",
                    locations : [8,9,10,11],
                    url : "/api/wav/synth-loop-7.wav"
                },
                {
                    name: "Track 6",
                    locations : [12,13,14,15],
                    url : "/api/wav/vocal-loop-3.wav"
                }],
            endMeasure: 16,
            bpm: 123
        },
        {
            name: 'Blammed',
            owner: users[1]._id,
            tracks: [
                {
                    name: "Track 1",
                    locations : [4,5,6,7,8,9,10,11],
                    url : "/api/wav/percussionvocalssynths.wav"
                },
                {
                    name: "Track 2",
                    locations : [8,9,10,11],
                    url : "/api/wav/bass-loop-3_synths.wav"
                },
                {
                    name: "Track 3",
                    locations : [0,1,2,3,4,5,6,7,8,9,12,13,14,15],
                    url : "/api/wav/drum-loop-32_drums.wav"
                },
                {
                    name: "Track 4",
                    locations : [1,3,5,7,9,11,13,15],
                    url : "/api/wav/drum-loop-41_drums_loop.wav"
                },
                {
                    name: "Track 5",
                    locations : [4,5,6,7,12,13,14,15,16],
                    url : "/api/wav/synth-loop-7.wav"
                },
                {
                    name: "Track 6",
                    locations : [12,13,14,15],
                    url : "/api/wav/vocal-loop-3.wav"
                }],
            endMeasure: 16,
            bpm: 123
        },
        {
            name: 'Stuttering',
            owner: users[2]._id,
            tracks: [
                {
                    name: "Track 1",
                    locations : [10,11,12,13,14,15],
                    url : "/api/wav/percussionvocalssynths.wav"
                },
                {
                    name: "Track 2",
                    locations : [8,9,10,11],
                    url : "/api/wav/bass-loop-3_synths.wav"
                },
                {
                    name: "Track 3",
                    locations : [0,2,4,6,8,10,12,13,14,15],
                    url : "/api/wav/drum-loop-32_drums.wav"
                },
                {
                    name: "Track 4",
                    locations : [1,3,5,7,9,11,13,15],
                    url : "/api/wav/drum-loop-41_drums_loop.wav"
                },
                {
                    name: "Track 5",
                    locations : [4,5,6,7,12,13,14,15],
                    url : "/api/wav/synth-loop-7.wav"
                },
                {
                    name: "Track 6",
                    locations : [12,13,14,15],
                    url : "/api/wav/vocal-loop-3.wav"
                }],
            endMeasure: 16,
            bpm: 123
        },
        {
            name: 'Tackle Box',
            owner: users[3]._id,
            tracks: [
                {
                    name: "Track 1",
                    locations : [0,1,2,3,4,5,6,7,8,9,12,13,14,15],
                    url : "/api/wav/percussionvocalssynths.wav"
                },
                {
                    name: "Track 2",
                    locations : [0,1,2,3,4,5,6,7,8,9,12,13,14,15],
                    url : "/api/wav/bass-loop-3_synths.wav"
                },
                {
                    name: "Track 3",
                    locations : [8,9,12,13,14,15],
                    url : "/api/wav/drum-loop-32_drums.wav"
                },
                {
                    name: "Track 4",
                    locations : [6,7,8,9,12,13],
                    url : "/api/wav/drum-loop-41_drums_loop.wav"
                },
                {
                    name: "Track 5",
                    locations : [8,9,10,11],
                    url : "/api/wav/synth-loop-7.wav"
                },
                {
                    name: "Track 6",
                    locations : [12,13,14,15],
                    url : "/api/wav/vocal-loop-3.wav"
                }],
            endMeasure: 16,
            bpm: 123
        },
        {
            name: 'Starter',
            owner: users[4]._id,
            tracks: [],
            endMeasure: 16,
            bpm: 123
        }
    ];

    return q.invoke(Project, 'create', projects);
}

connectToDb.then(function () {
    getCurrentUserData().then(function (users) {
        if (users.length === 0) {
            return seedUsers();
        } else {
            console.log(chalk.magenta('Seems to already be user data, exiting!'));
            process.kill(0);
        }
    }).then(function () {
        return getCurrentUserData();
    }).then(function (users){
        return seedProjects(users);
    }).then(function (){
        return q.ninvoke(Project, 'find', {}).then(function (projectArr) {
            projectArr.forEach(function (proj) {
                User.findById(proj.owner).exec().then(function (user) {
                    user.projects.push(proj._id);
                    user.save().exec();
                });
            });
        });

        console.log(chalk.green('Seed successful!'));
        process.kill(0);
    });
}).catch(function (err) {
    console.error(err);
    process.kill(1);
});
