"use strict";

var cradle = require('cradle');
function install() {
  var couch = new (cradle.Connection)();
  var moddb = module.exports.moddb = couch.database('spanner-mods');
  var userdb = module.exports.userdb = couch.database('spanner-users');
  var logdb = module.exports.logdb = couch.database('spanner-log');


  [moddb, userdb].forEach(function(db) {
    db.exists(function(err, exists) {
      if (!exists) {
        db.create()
      }
    })
  });

  logdb.exists(function(err, exists) {
    if (!exists) {
      logdb.create(function() {

        // TODO: dunno what this is gonna do....
        logdb.save('_design/log', {
          bydate: {
            map: function (doc) {
              emit(doc.ts, doc);
            }
          }
        });
      });
    }
  });

}

module.exports = {
  install: install
};
