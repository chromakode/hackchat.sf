"use strict";

var db = require_app("server/db");
var userlist = require_app("server/userlist");
var msglog = require_app("server/msglog");

var _replay = [];
module.exports = {
  routes: {
    "" : "index"
  },

  index: function(ctx, api) {
    this.set_title('spanner');
    var template_str = api.template.render("controllers/spanner.html.erb");
    api.page.render({ content: template_str, socket: true });
  },

  socket: function(s) {
    var user = s.session.user;
    if (!user) {
      user = _.uniqueId("hax0r");
      s.session.user = user;
      s.session.save();
    }

    s.on('message', function(msg) {
      var packed = {
        user: s.session.user,
        text: msg,
        ts: Date.now()
      };
      s.broadcast.emit('message', packed);
      db.logdb.save(packed);
      _replay.push(packed);
    });

    s.on('end', function() {
      s.broadcast.emit('part', user);
    });

    s.on('who', function() {
      s.emit('who', userlist.list());
    });

    s.broadcast.emit('join', user);

    // replay log
    msglog.fetch(function(msgs) {
      _.each(msgs, function(p) {
        s.emit('message', p);
      });
    });

  }
};
