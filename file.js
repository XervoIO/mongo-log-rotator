var archiver = require('archiver'),
    zlib = require('zlib'),
    util = require('util'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    knox = require('knox'),
    EventEmitter = require('events').EventEmitter;

//-------------------------------------------------------------------------------------------------
/**
 * Handles Mongo log files. Tars and uploads to S3.
 * @param {string} [aws.awsAccessKeyID] AWS access key ID for S3 upload support. Optional.
 * @param {string} [aws.awsSecretAccessKey] AWS secret access key for S3 support. Optional.
 * @param {string} [aws.bucket] AWS S3 bucket to upload logs files to. Optional.
 */
//-------------------------------------------------------------------------------------------------
var File = function(aws) {

  var self = this;

  if(aws.awsAccessKeyID && aws.awsSecretAccessKey && aws.bucket) {
    this.s3Client = knox.createClient({
      key: aws.awsAccessKeyID,
      secret: aws.awsSecretAccessKey,
      bucket: aws.bucket
    });
  }
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
      callback(err);
    }

    self.debug('File compressed. ' + written + ' bytes. Saved to: ' + output);
  });

  // Need to wait for close event. The file is not complete when the
  // finalize callback is called.
  outputStream.on('close', function() {

    // Delete the input file, now that it's compressed.
    fs.unlink(input, function(err) {
      callback(err, output);
    });
  });

};

//-------------------------------------------------------------------------------------------------
File.prototype.upload = function(input, output, bucket, callback) {

  var self = this;

  if(!input || !output) {
    this.debug('Input or output file not specified. Cannot upload to S3.');
    return callback(null, null);
  }

  if(!this.s3Client) {
    this.debug('S3 credentials not provided. Cannot upload to s3.');
    return callback(null, null);
  }

  self.debug('Uploading ' + input + ' to ' + bucket + ': ' + output);
  
  this.s3Client.putFile(input, output, function(err, result) {
    self.debug('Upload complete.');
    callback(err, input);
  });
};

//-------------------------------------------------------------------------------------------------
File.prototype.remove = function(input, callback) {
  if(!input) {
    this.debug('File not specified. Cannot delete.');
    return callback(null, null);
  }

  this.debug('Deleting file: ' + input);

  fs.unlink(input, function(err) {
    callback(err, input);
  });
};

//-------------------------------------------------------------------------------------------------
File.prototype.debug = function(msg) {
  this.emit('debug', msg);
};

module.exports = File;