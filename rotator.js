var util = require('util'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    DB = require('./db'),
    File = require('./file'),
    cronJob = require('cron').CronJob,
    async = require('async');

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
 * @param {boolean} [options.s3Upload] Whether or not upload old log data to S3.
 * Defaults to false. Optional.
 * @param {string} [options.awsAccessKeyID] AWS access key ID for S3 upload support. Optional.
 * @param {string} [options.awsSecretAccessKey] AWS secret access key for S3 support. Optional.
 * @param {string} [options.s3Bucket] Name of the S3 bucket to upload log files to. Optional.
 * @param {boolean} [options.compress] Whether or not compress old log data. 
 * Defaults to false. Optional.
 * @param {boolean} [options.autoDelete] Whether or not to delete old log data after rotate.
 * Defaults to false. Optional.
 * @throws {exception} Throws exception if schedule is invalid.
 */
//-------------------------------------------------------------------------------------------------
var Rotator = function(schedule, options) {
  var self = this;
  this.options = this.initOptions(options);

  this.db = new DB();
  this.file = new File({
      awsAccessKeyID: options.awsAccessKeyID,
      awsSecretAccessKey: options.awsSecretAccessKey,
      bucket: options.s3Bucket
    }
  );

  this.file.on('debug', function(msg) {
    self.emit('debug', msg);
  });

  this.file.on('error', function(err) {
    self.emit('error', err);
  });

  this.db.on('debug', function(msg) {
    self.emit('debug', msg);
  });

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
  options.mongoURL = options.mongoURL || 'mongo://localhost:27017';
  options.mongoLog = options.mongoLog;
  options.autoStart = options.autoStart || false;
  options.s3Upload = options.s3Upload || false;
  options.awsAccessKeyID = options.awsAccessKeyID;
  options.awsSecretAccessKey = options.awsSecretAccessKey;
  options.compress = options.compress || false;
  options.autoDelete = options.autoDelete || false;

  return options;
};

//-------------------------------------------------------------------------------------------------
/**
 * Invoked by cron to rotate the logs.
 */
//-------------------------------------------------------------------------------------------------
Rotator.prototype.rotate = function(callback) {

  var self = this;

  var returnVal = {
    version: null,
    file: null
  };

  async.waterfall([
    // Send rotate command to mongo.
    function(callback) {
      self.db.rotate(self.options.mongoURL, callback);
    },
    // Find the new log file.
    function(result, callback) {
      returnVal.version = result.version.version;
      self.file.find(self.options.mongoLog, callback);
    },
    // Compress log file.
    function(result, callback) {
      if(self.options.compress) {
        var output = self.setCompressedFileName(result);
        self.file.compress(result, output, callback);
      }
      else {
        callback(null, result);
      }
    },
    // Upload file to S3.
    function(result, callback) {
      if(self.options.s3Upload) {
        var output = self.setS3FileName(result);
        self.file.upload(result, output, self.options.s3Bucket, callback);
      }
      else {
        callback(null, result);
      }
    },
    function(result, callback) {
      if(self.options.autoDelete) {
        self.file.remove(result, callback);
      }
      else {
        callback(null, result);
      }
    }
  ], function(err, result) {
    returnVal.file = result;
    if(err) {
      console.log(err);
      self.emit('error', err);
    }
    else {
      self.emit('rotate', returnVal);
    }
    if(callback) {
      callback(err, returnVal);
    }
  });
};

//-------------------------------------------------------------------------------------------------
/**
 * Allows users to override the name of the file before being uploaded to S3.
 * @param {string} original The original filename.
 */
//-------------------------------------------------------------------------------------------------
Rotator.prototype.setS3FileName = function(original) {
  return path.basename(original);
};

//-------------------------------------------------------------------------------------------------
/**
 * Allows users to override the name and path of the compressed file.
 * @param {string} original The original filename.
 */
//-------------------------------------------------------------------------------------------------
Rotator.prototype.setCompressedFileName = function(original) {
  return original + '.tar.gz';
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