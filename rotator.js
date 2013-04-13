var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    DB = require('./DB'),
    cronJob = require('cron').CronJob;

//-------------------------------------------------------------------------------------------------
/**
 * MongoDB log rotator. Connects to a mongo instance and issues a logRotate database command.
 * @param {string} schedule Cron schedule definition.
 * @param {string} [options.mongoURL] Mongo connection string. If auth is enabled, connection
 * string must include credentials for the admin database. Required.
 * @param {string} [options.mongoLog] Path to the mongo log. Only applies if mongo is running
 * locally. Rotator will return path to "rotated" file if it can. Optional.
 * @param {boolean} [options.autoStart] Whether or not to automatically start. 
 * Defaults to true. Optional.
 * @throws {exception} Throws exception if schedule is invalid.
 */
//-------------------------------------------------------------------------------------------------
var Rotator = function(schedule, options) {
  var self = this;
  this.db = new DB(options.mongoURL);
  options = this.initOptions(options);

  this.cron = new cronJob(schedule, function() {
    self.rotate();
  });

  if(options.autoStart) {
    this.start();
  }
};

util.inherits(Rotator, EventEmitter);

//-------------------------------------------------------------------------------------------------
/**
 * Initializes input options.
 */
//-------------------------------------------------------------------------------------------------
Rotator.prototype.initOptions = function(options) {
  options = options || {};
  if(typeof options.autoStart !== 'boolean') {
    options.autoStart = true;
  }

  return options;
};

//-------------------------------------------------------------------------------------------------
/**
 * Invoked by cron to rotate the logs.
 */
//-------------------------------------------------------------------------------------------------
Rotator.prototype.rotate = function() {

  var self = this;

  this.db.rotate(function(err, result) {
    console.log(err);
    console.log(result);
    self.emit('rotate');
  });
};

//-------------------------------------------------------------------------------------------------
/**
 * Starts log rotation.
 */
//-------------------------------------------------------------------------------------------------
Rotator.prototype.start = function() {
  this.cron.start();
};

//-------------------------------------------------------------------------------------------------
/**
 * Stops log rotation.
 */
//-------------------------------------------------------------------------------------------------
Rotator.prototype.stop = function() {
  this.cron.stop();
};

module.exports = Rotator;