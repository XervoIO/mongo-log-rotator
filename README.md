mongo-log-rotator
============

Library for rotating MongoDB logs on a cron-like schedule. Includes support for compression and S3 uploading.

Rotator can be used both locally on the same machine as mongo, or remotely. Most of the 
features are only available when running locally because it needs access to Mongo's log files.

## Installation
    npm install mongo-log-rotator

## Usage
    var Rotator = require('mongo-log-rotator');

    // Every 30 seconds.
    var schedule = '30 * * * * *';

    var rotator = new Rotator(schedule, { 
      mongoURL: 'mongodb://user:pass@localhost:27017', 
      /* other options */ 
    });

    rotator.on('rotate', function(newFile) {
      // A rotation has been completed.
      // newFile is the path to the rotated log file.
    });

    rotator.start();

### Schedule
Cron scheduling is implemented using the [node-cron](https://github.com/ncb000gt/node-cron) module. The
pattern documentation can be found at [crontab.org](http://crontab.org).

Examples:

* `30 * * * * *` every 30 seconds.
* `0 0 * * * *` ever hour.
* `0 0 0 15 * *` the 15th of every month.

### Options

* `mongoURL` (required): The fully qualified mongo URL. For example: `mongodb://user:pass@localhost:27017`.
Rotator requires admin privileges on the database to issue the logRotate command.
* `mongoLog`: If running locally (recommended), this is the full path to the mongo log file. This is required
if using the compression or s3 uploading features.
* `autoStart`: Defaults to false. Whether or not to automatically start rotating. If false, you must call
start() to begin the cron task.
* `compress`: Defaults to false. Whether or not to compress logs once they've been rotated. If enabled, the 
original, uncompressed log file will be deleted once compressed.
* `s3Upload`: Defaults to false. Whether or not to upload rotated logs to s3.
* `s3Bucket`: The S3 bucket to upload log files. Required if `s3Upload` is enabled.
* `awsAccessKeyID`: AWS access key for uploading data to s3. Required if `s3Upload` is enabled.
* `awsSecretAccessKey`: AWS secret key for uploading data to s3. Required if `s3Upload` is enabled.
* `autoDelete`: Defaults to false. Whether or not to automatically delete rotated log files. Should be
used on conjunction with `s3Upload`. If the upload to S3 fails, the log file will not be deleted.

### start()
Starts the Rotator cron schedule. This can be skipped if the `autoStart` option is enabled.

    rotator.start();

### stop()
Stops the Rotator cron schedule. If a rotation is currently in process, it will not be interrupted.

    rotator.stop();


## Events

### Event: 'rotate'
Occurs whenever the mongo log is rotated.

* `newFile` (string) The path to the rotated log file.

### Event: 'error'
Emitted whenever an error occurs at any stage of the rotation process. Errors will not stop the rotator schedule.

* `err` (Error) The error that occurred.

### Event: 'debug'
Prints information about what is occurring. Useful for debugging why something may not be working.

* `msg` (string) The debug message.