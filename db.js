var MongoClient = require('mongodb').MongoClient;

//-------------------------------------------------------------------------------------------------
/**
 * Handles access to MongoDB.
 * @param {string} url MongoDB connection string.
 */
//-------------------------------------------------------------------------------------------------
var DB = function(url) {
  this.url = url;
};

//-------------------------------------------------------------------------------------------------
/**
 * Connects to mongo, issues logRotate against admin database, and disconnects.
 * @param {function} callback Params include err and logRotate command response.
 */
//-------------------------------------------------------------------------------------------------
DB.prototype.rotate = function(callback) {
  MongoClient.connect(this.url, function(err, db) {
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