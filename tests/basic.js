var Rotator = require(__dirname + '/../rotator.js');

// Every 30 seconds.
var rotator = new Rotator('0,30 * * * * *', { mongoURL: 'mongodb://test:qwerty@localhost:27017' });

rotator.on('rotate', function() {
  console.log('Rotated: ' + new Date());
});

setInterval(function() { }, 1000);