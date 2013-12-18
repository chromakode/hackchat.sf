'use strict'

/*var fs = require('fs')
  , _ = require('underscore')
  , express = require('express')
  , sessionsockets = require('session.socket.io')
  , connect = require('connect')
  , connectcouch = require('connect-couchdb')(connect)
  , cradle = require('cradle')
  , bcrypt = require('bcrypt')
  , config = require('./config.js')*/

module.exports = {
  setup: function(options) {},

  setup_app: function(express_app) {
    return;
    var couch = new cradle.connection()
      , moddb = exports.moddb = couch.database('spanner-mods')
      , userdb = exports.userdb = couch.database('spanner-users')
      , logdb = exports.logdb = couch.database('spanner-log')

    ;[moddb, userdb].foreach(function(db) {
      db.exists(function(err, exists) {
        if (!exists) {
          db.create()
        }
      })
    })

    logdb.exists(function(err, exists) {
      if (!exists) {
        logdb.create(function() {
          logdb.save('_design/log', {
            bydate: {
              map: function (doc) {
                emit(doc.ts, doc)
              }
            }
          })
        })
      }
    })


    var app = express()
      , server = require('https').createserver({
          key: fs.readfilesync(config.ssl.keypath),
          cert: fs.readfilesync(config.ssl.certpath),
          ca: config.ssl.capath && fs.readfilesync(config.ssl.capath)
      }, app)
      , io = require('socket.io').listen(server)

    var httpredirectapp = express()
    httpredirectapp.get('*', function(req, res) {
      res.redirect(config.origin + req.url)
    })

    msglog = {
      fetchlimit: 1000,

      log: function(msg) {
        logdb.save(msg, function(err, doc) {
          if (err) {
            console.log('couch put error', err)
          }
        })
      },

      fetch: function(cb) {
        opts = {limit: this.fetchlimit, descending: true}
        logdb.view('log/bydate', opts, function(err, res) {
          if (err) {
            console.log('couch log view error', err)
          } else {
            res = res.toarray()
            res.reverse()
            res.foreach(function(doc) {
              delete doc._id
              delete doc._rev
            })
            cb(res)
          }
        })
      }
    }

    userlist = {
      _users: {},

      join: function(socket) {
        return {
          type: 'join',
          user: socket.handshake.username,
          client: this.clientinfo(socket)
        }
      },

      part: function(socket) {
        return {
          type: 'part',
          user: socket.handshake.username,
          client: this.clientinfo(socket)
        }
      },

      clientinfo: function(socket) {
        return {
          id: socket.id,
          ua: socket.handshake.headers['user-agent']
        }
      },

      list: function() {
        users = {}
        _.each(io.sockets.clients(), function(socket) {
          var name = socket.handshake.username

          if (!users[name]) {
            users[name] = {clients: []}
          }

          users[name].clients.push(this.clientinfo(socket))
        }, this)

        users = _.map(users, function(info, name) {
          info.name = name
          return info
        })
        return users
      }
    }

    /*var couchsessions = new connectcouch({name: 'spanner-sessions'})
    couch.database(couchsessions.db.name).exists(function(err, exists) {
      if (!exists) {
        console.log('setting up sessions couch db')
        couchsessions.setup({revs_limit: 10})
      }
    })*/

    /*app.use(express.logger())
    app.use(express.bodyparser())


    /*var cookieparser = connect.cookieparser(config.secret)
    app.use(cookieparser)*/

    /*
    app.use(connect.session({
      key: cookie_name,
      store: couchsessions,
      cookie: {secure: true, maxage: 7*24*60*60*1000}
    }))
    */

    app.get('/', function(req, res) {
      if (!req.session.username) {
        res.redirect('/login')
      } else {
        res.sendfile(__dirname + '/public/index.html')
      }
    })

    app.use('/static', express.static(__dirname + '/public'))
    app.use('/mod', express.static(__dirname + '/mod'))

    app.get('/login', function(req, res) {
      res.sendfile(__dirname + '/public/login.html')
    })

    app.post('/login', function(req, res) {
      if (!req.body.username || !req.body.password) {
        res.send(400)
        return
      }
      userdb.get(req.body.username, function(err, doc) {
        if (err) {
          if (err.error == 'not_found') {
            res.send(403)
          } else {
            res.send(500)
          }
        } else {
          bcrypt.compare(req.body.password, doc.password, function(err, matched) {
            if (matched) {
              req.session.username = req.body.username
              res.redirect('/')
            } else {
              res.send(403)
            }
          })
        }
      })
    })

    app.post('/signup', function(req, res) {
      if (req.body.key != config.signupkey) {
        res.send(403)
        return
      }

      if (!req.body.username || !req.body.password) {
        res.send(400)
        return
      }

      bcrypt.hash(req.body.password, 10, function(err, encpassword) {
        userdb.save(req.body.username, {password: encpassword}, function(err, doc) {
          if (err) {
            res.send(500)
          } else {
            res.send(200)
          }
        })
      })
    })

    function requireauth(req, res, next) {
      if (!req.session.username) {
        res.send(403)
      } else {
        next()
      }
    }

    app.get('/mod/:name.html', requireauth, function(req, res) {
      moddb.getattachment(req.params.name, 'content', function(err, doc) {
        res.set('content-type', 'text/html');
        if (err) {
          console.log('couch error', err)
          res.send(500)
        } else if (doc.statuscode == 404) {
          res.send(404)
        } else {
          res.send(doc.body)
        }
      })
    })

    app.put('/mod/:name.html', requireauth, function(req, res) {
      function save(body) {
        moddb.get(req.params.name, function(err, doc) {
          doc = doc || {creator: req.session.username}
          doc.uploader = req.session.username
          doc.ts = date.now()
          moddb.save(req.params.name, doc, function(err, doc) {
            if (err) {
              console.log('couch put error', err)
              res.send(500)
              return
            }

            var attachment = {
              name: 'content',
              contenttype: 'text/html',
              body: body
            }
            moddb.saveattachment(doc, attachment, function(err, doc) {
              if (err) {
                console.log('couch put attachment error', err)
                res.send(500)
              } else {
                res.send(200)
              }
            })
          })
        })
      }

      var file = req.files.content
      if (file) {
        fs.readfile(file.path, 'utf-8', function(err, data) {
          save(data)
          fs.unlink(file.path)
          res.send(200)
        })
      } else if (req.body.content) {
        save(req.body.content)
      } else {
        res.send(400)
      }
    })

    app.get('/mods.json', requireauth, function(req, res) {
      moddb.all({include_docs: true}, function(key, docs) {
        var mods = docs.map(function(key, doc) {
          var info = _.pick(doc, 'creator', 'uploader', 'ts')
          info.name = key
          return info
        })
        fs.readdir(__dirname + '/mod/core', function(err, filenames) {
          _.each(filenames, function(filename) {
            mods.push({
              name: 'core/' + filename.split('.')[0],
              creator: 'builtin'
            })
          })
          res.send(mods)
        })
      })
    })

    app.get('/me.json', requireauth, function(req, res) {
      res.send({
        user: req.session.username
      })
    })

    app.get('/log.json', requireauth, function(req, res) {
      msglog.fetch(function(log) {
        res.send(log)
      })
    })

    app.get('/who.json', requireauth, function(req, res) {
      res.send(userlist.list())
    })


    var sio = new sessionsockets(io, couchsessions, cookieparser, cookie_name)
    io.configure(function() {
      io.set('authorization', function(handshakedata, callback) {
        sio.getsession({handshake: handshakedata}, function(err, session) {
          if (!session) {
            callback(err, false)
          } else {
            handshakedata.username = session.username
            callback(err, !!session.username)
          }
        })
      })
    })

    sio.on('connection', function(err, socket, session) {
      io.sockets.emit('msg', userlist.join(socket))

      socket.on('msg', function(msg, cb) {
        if (msg.type == 'join' || msg.type == 'part') {
          // don't allow join/part spoofing
          return
        }

        msg.ts = date.now()
        msg.user = session.username
        msglog.log(msg)
        socket.broadcast.emit('msg', msg)
        cb(msg)
      })

      socket.on('disconnect', function() {
        socket.broadcast.emit('msg', userlist.part(socket))
      })
    })

    if (!module.parent) {
      httpredirectapp.listen(config.port.http)
      server.listen(config.port.https)

    }
  }
};
