var _ = require('lodash');
var mongoose = require('mongoose');
var connectToDb = require('./server/db');
var q = require('q');
var Project = mongoose.model('Project');
var request = require('request');
var blank = 'https://s3-us-west-2.amazonaws.com/fullstacktracks/4a08e37c-2828-4186-95fd-032f43b4baca.wav';
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));

// for AWS
var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var s3 = new AWS.S3();
var path = require('path');
var bucketName = 'fullstacktracks';


function createFolder (dir) {
    if (!fs.existsSync(dir)) {
        // fs.unlinkSync('final.wav');
        fs.mkdirSync(dir);
    }
}

connectToDb.then(function () {

    var trackFolderNames = [];

    Project.findById(process.argv[2]).exec().then(function (project) {
        // console.log('PROJECT', project);

        var measures = _.range(0, project.endMeasure + 2);
        var wavs = measures.map(function (measure) {
            return blank;
        });

        var promiseArray;

        // we would have to add unique folder to maintain scalability
        createFolder('tmp');

        project.tracks.forEach(function (track, tindex) {
            
            // if track has aws url
            if (track.url) {

                track.location.forEach(function (eachLoop) {
                    wavs[eachLoop] = track.url;
                });

                createFolder('tmp/track' + tindex);

                promiseArray = wavs.map(function (wavFile, i) {

                    return new Promise(function(resolve, reject) {
                        
                        var writeStream = fs.createWriteStream('tmp/track' + tindex + '/' + i + '.wav');

                        var readStream = request(wavFile);
                        readStream.pipe(writeStream);

                        readStream.on('error', reject);
                        writeStream.on('error', reject);

                        writeStream.on('finish', function () {
                            console.log("writestream of ", i, "ended")
                            resolve(i);
                        })

                    })
                });

                trackFolderNames.push('track' + tindex);
                
            }
        });

        return q.all(promiseArray);

    }).then(function (trackMeasures) {

        var executeCommand = require('child_process').exec;
        var command = 'python mergeTracks.py ';

        trackFolderNames.forEach(function (folder) {
            command += folder + ' ';
        });


        var options = {
            cwd : __dirname
        };

        setTimeout(function() {

            console.log('command', command);
            executeCommand(command, options, function (err, stdout, stderr) {

                if (stderr) console.log('stderr', stderr);
                else console.log('stdout', stdout);

            });

        }, 5000);




        setTimeout(function() {

            var projectWAV = fs.readFileSync('final.wav');

            console.log('projectWAV', projectWAV);
            
            // the uuid generates a unique string of characters each time
            var keyName = uuid.v4() + '.wav';
            var url = 'https://s3-us-west-2.amazonaws.com/fullstacktracks/' + keyName;
            console.log('url', url);
            var params = {
                Bucket: bucketName, 
                Key: keyName, 
                Body: projectWAV
            };

            s3.putObject(params, function(err, data) {
                if (err)
                 console.log(err)
                else
                 console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
            });

            setTimeout(function () {

                Project.findById(process.argv[2]).exec().then(function (project) {
                    project.download = url;
                    return project.save();
                }).then(function () {

                    var executeCommand = require('child_process').exec;
                    var command = 'rm -rf tmp';
                    var options = {
                        cwd : __dirname
                    };

                    executeCommand(command, options, function (err, stdout, stderr) {

                        if (stderr) console.log('stderr', stderr);
                        else console.log('stdout', stdout);

                    });

                    console.log('great success');

                });
            }, 5000);

        }, 20000);

    });

}).catch(function (err) {
    console.error(err);
    process.kill(1);
});





