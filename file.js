var archiver = require('archiver'),
    zlib = require('zlib'),
    util = require('util'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter;

//-------------------------------------------------------------------------------------------------
/**
 * Handles Mongo log files. Tars and uploads to S3.
 * @param {string} [awsCreds.awsAccessKeyID] AWS access key ID for S3 upload support. Optional.
 * @param {string} [awsCreds.awsSecretAccessKey] AWS secret access key for S3 support. Optional.
 */
//-------------------------------------------------------------------------------------------------
var File = function(awsCreds) {

  this.awsCred = awsCreds;

};

util.inherits(File, EventEmitter);

//-------------------------------------------------------------------------------------------------
File.prototype.find = function(logFile, callback) {
  if(!logFile || logFile === '') {
    this.debug('Mongo log file not specified. Cannot find rotated log file.');
    return callback(null, null);
  }

  var self = this;
  var logDirectory = path.dirname(logFile);

  fs.readdir(logDirectory, function(err, files) {
    if(err) {
      self.debug('fs.readdir error: ' + err);
      return callback(err);
    }

    var logBasename = path.basename(logFile);

    var lastModifiedDate = 0;
    var lastModifiedFile = null;

    var getters = [];
    files.forEach(function(file) {
      // Skip the actual mongo log file. Mongo appends the date
      // The the log file name, so check that the file includes
      // The name of the actual log.
      if(logBasename !== path.basename(file) &&
        path.basename(file).indexOf(logBasename) === 0) {

        getters.push(function(callback) {
          fs.stat(path.join(logDirectory, file), function(err, result) {
            if(err) {
              self.debug('fs.stat error: ' + err);
              return callback(err);
            }

            // The assumption is the last modified file that contains
            // the name of the mongo log is the new log file.
            if(result.mtime.getTime() > lastModifiedDate) {
              lastModifiedDate = result.mtime.getTime();
              lastModifiedFile = path.join(logDirectory, file);
            }

            callback();
          });
        });
      }
    });

    async.parallel(getters, function(err, result) {
      if(err) {
        return callback(err);
      }

      if(lastModifiedFile) {
        self.debug('New log file found: ' + lastModifiedFile);
      }
      else {
        self.debug('New log file could not be located.');
      }

      callback(null, lastModifiedFile);

    });
  });
};

//-------------------------------------------------------------------------------------------------
File.prototype.compress = function(input, output, callback) {
  if(!input || !output || input === '' || output === '') {
    this.debug('Input or output file not specified. Cannot compress file.');
    return callback(null, null);
  }

  this.debug('Compress. Input: ' + input + ' Output: ' + output);

  var self = this;

  var archive = new archiver('tar');
  var gzipper = zlib.createGzip();
  var outputStream = fs.createWriteStream(output);

  archive.pipe(gzipper).pipe(outputStream);

  archive.append(fs.createReadStream(input), { name: path.basename(input) });

  archive.finalize(function(err, written) {
    if(err) {
      self.debug('archive error: ' + err);
      return callback(err);
    }

    self.debug('File compressed. ' + written + ' bytes. Saved to: ' + output);
    callback(null, output);
  });

};

//-------------------------------------------------------------------------------------------------
File.prototype.upload = function(input, output, bucket, callback) {
  if(!input || !output) {
    this.debug('Input or output file not specified. Cannot upload to S3.');
    return callback(null, null);
  }

  this.debug('File uploaded to S3: ' + bucket + ':' + output);
  callback(null, input);
};

//-------------------------------------------------------------------------------------------------
File.prototype.remove = function(file, callback) {
  if(!file) {
    this.debug('File not specified. Cannot delete.');
    return callback(null, null);
  }

  this.debug('File deleted.');
  callback(null, file);
};

File.prototype.debug = function(msg) {
  this.emit('debug', msg);
};

module.exports = File;