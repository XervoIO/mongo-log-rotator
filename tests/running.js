var Rotator = require(__dirname + '/../rotator.js');


// Every 30 seconds. Rotate, compress, upload to s3, and delete.
var rotator = new Rotator('30 * * * * *', {
  mongoURL: 'mongodb://test:qwerty@localhost:27017',
  mongoLog: '/opt/mongo/mongo.log',
  compress: true,
  s3Upload: true,
  autoStart: true,
  autoDelete: true,
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

setInterval(function() { }, 1000);