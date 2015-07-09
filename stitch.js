var _ = require('lodash');
var mongoose = require('mongoose');
var connectToDb = require('./server/db');
var q = require('q');
var Project = mongoose.model('Project');
var request = require('request');
var blank = 'https://s3-us-west-2.amazonaws.com/fullstacktracks/28a683ec-da26-4f24-a5ed-a114172a0f82.wav';
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));


function createFolder (dir) {
    if (!fs.existsSync(dir)) {
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

        console.log('command', command);

        var options = {
            cwd : __dirname
        };

        executeCommand(command, options, function (err, stdout, stderr) {

            if (stderr) console.log('stderr', stderr);
            else console.log('stdout', stdout);

        });
    });

}).catch(function (err) {
    console.error(err);
    process.kill(1);
});





