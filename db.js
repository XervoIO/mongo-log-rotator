var MongoClient = require('mongodb').MongoClient,
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

//-------------------------------------------------------------------------------------------------
/**
 * Handles access to MongoDB.
 */
//-------------------------------------------------------------------------------------------------
var DB = function() {

};

util.inherits(DB, EventEmitter);

//-------------------------------------------------------------------------------------------------
/**
 * Connects to mongo, issues logRotate against admin database, and disconnects.
 * @param {function} callback Params include err and logRotate command response.
 */
//-------------------------------------------------------------------------------------------------
DB.prototype.rotate = function(url, callback) {

  this.emit('debug', 'Rotating log at Mongo: ' + url);

  MongoClient.connect(url, function(err, db) {
    if(err) {
      return callback(err);
    }

    var admin = db.admin();
    admin.command({ logRotate: 1 }, function(err, result) {
      db.close();
      callback(err, result);
    });

  });
};

module.exports = DB;