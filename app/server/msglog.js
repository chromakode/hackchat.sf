"use strict";

var logdb = require_app("server/db").logdb;

var msglog = {
  fetchlimit: 1000,

  log: function(msg) {
    logdb.save(msg, function(err, doc) {
      if (err) {
        console.log('couch put error', err)
      }
    })
  },

  fetch: function(cb) {
    var opts = {limit: this.fetchlimit, descending: true};
    logdb.view('log/bydate', opts, function(err, res) {
      if (err) {
        console.log('couch log view error', err);
      } else {
        res = res.toArray();
        res.reverse();
        res.forEach(function(doc) {
          delete doc._id;
          delete doc._rev;
        });

        cb(res);
      }
    });
  }
};

module.exports = msglog;
