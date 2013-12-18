"use strict";

require('core/client/component');


module.exports = {
  init: function() {
    var page = this.$page;
    var self = this;
    $C('chat', {}, function(cmp) {
      self.chat = cmp;
      page.find('.main-pane').append(cmp.$el);
      cmp.focus();
    });
  },

  socket: function(s) {
    var self = this;
    // should figure out the username, me thinks
    s.on('message', function(msg) {
      self.chat.renderLine(msg);
    });

    s.on('join', function(user) {
      console.log("USER JOINED", user);
    });

    s.on('part', function(user) {
      console.log("USER LEFT", user);
    });
  },
  send: function(msg) {
    SF.socket().emit("message", msg);
  }
};
