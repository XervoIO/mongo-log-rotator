var Rotator = require(__dirname + '/../rotator.js'),
    async = require('async');


var rotator = new Rotator('* * * * * *', {
  autoStart: false,
  s3Bucket: 'myBucket',
  awsAccessKeyID: 'xxxxxxxx',
  awsSecretAccessKey: 'xxxxxxxx'
});

rotator.on('debug', function(msg) {
  console.log(msg);
});

rotator.on('error', function(err) {
  console.log(err);
});

rotator.on('rotate', function(file) {
  console.log('Rotation complete. New log file: ' + file);
});

async.series([
  function(callback) {
    //
    // Standard rotate, no log file specified.
    //
    rotator.options.mongoURL = 'mongodb://test:qwerty@localhost:27017';
    rotator.rotate(function() { setTimeout(callback, 5000); });
  },
  function(callback) {
    //
    // Standard rotate, log file specified.
    //
    rotator.options.mongoLog = '/opt/mongo/mongo.log';
    rotator.rotate(function() { setTimeout(callback, 5000); });
  },
  function(callback) {
    //
    // Standard rotate, log file specified, compressed.
    //
    rotator.options.mongoLog = '/opt/mongo/mongo.log';
    rotator.options.compress = true;
    rotator.rotate(function() { setTimeout(callback, 5000); });
  },
  function(callback) {
    //
    // Standard rotate, log file specified, compressed, uploaded.
    //
    rotator.options.mongoLog = '/opt/mongo/mongo.log';
    rotator.options.compress = true;
    rotator.options.s3Upload = true;
    rotator.rotate(function() { setTimeout(callback, 5000); });
  }
]);


setInterval(function() { }, 1000);