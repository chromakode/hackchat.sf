"use strict";

var userlist = {
  _users: {},

  install: function(primus) {
    this.primus = primus;
  },

  join: function(socket) {
    return {
      type: 'join',
      user: socket.headers.session.user,
      client: this.clientinfo(socket)
    };
  },

  part: function(socket) {
    return {
      type: 'part',
      user: socket.headers.session.user,
      client: this.clientinfo(socket)
    };
  },

  clientinfo: function(socket) {
    return {
      id: socket.id,
      ua: socket.headers['user-agent']
    };
  },

  list: function() {
    var users = {};
    var self = this;
    self.primus.forEach(function(s) {
      var name = s.headers.session.user;
      if (!users[name]) {
        users[name] = {clients: []};
      }

      users[name].clients.push(self.clientinfo(s));
    });

    users = _.map(users, function(info, name) {
      info.name = name;
      return info;
    });

    return users;
  }
};

module.exports = userlist;
