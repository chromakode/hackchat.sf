"use strict";

var template = require_core("server/template")

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
      _replay.push(packed);
    });

    s.on('end', function() {
      s.broadcast.emit('part', user);
    });

    s.broadcast.emit('join', user);

    // replay log
    _.each(_replay, function(p) {
      s.emit('message', p);
    });
  }
};
