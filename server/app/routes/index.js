'use strict';
var router = require('express').Router();
var fs = require('fs');
var path = require('path');
module.exports = router;

router.use('/', function (req, res, next) {
	console.log('HERE');
	next();
});

router.use('/wav/:loopname', function (req, res, next) {
	var p = path.join(__dirname, '../../../wav/');
	console.log('LOOP NAME', p);
	fs.readFile(p+req.params.loopname, function (err, data) {
		if(err) console.log(err);
		else {
			res.send(data);
		}
	});
});
router.use('/members', require('./members'));

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
    res.status(404).end();
});