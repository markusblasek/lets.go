var express = require('express');
var path = require('path');
var http = require('http');
var mongoose = require('mongoose');
var cookie = require('cookie');
var connect = require('connect');
var passport = require('passport');

mongoose.Error.messages.general.required = '{PATH} is mandatory.';
mongoose.Error.messages.Number.min = '{PATH} has to be equal to or larger than {MIN}';
mongoose.Error.messages.Number.max = '{PATH} has to be equal to or smaller than {MAX}';
mongoose.Error.messages.String.enum = '"{VALUE}" is not valid for {PATH}';

var config = require('./config');
var log = require('./log');
var routes = require('./routes');
var protocol = require('./protocol');
var User = require('./models/user');

// establish mongodb connection
mongoose.connection.on('error', log.error.bind(log, 'connection error:'));
mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/test');

// create app, http server and websocket server instances
var app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server);


var MongoStore = require('connect-mongo')(express);
var sessionStore = new MongoStore({
  //mongoose_connection: mongoose.connections[0]
  db: 'test'
});

// all environments
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session({
  key: config.session.name,
  secret: config.session.secret,
  store: sessionStore
}));
app.use(passport.initialize());
app.use(passport.session());
// TODO: not sure if there is a better way to pass the io instance to the handler
app.use(function(req, res, next) {
  req.io = io;
  next();
});
app.use(app.router);
app.use(require('less-middleware')({
  src: path.join(__dirname, 'static'),
  compress: true
}));
app.use('/static', express.static(path.join(__dirname, 'static')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


routes.user.setup(app);

// routes below

var home = function(req, res) {
  res.redirect('/');
};

app.get('/', routes.index);

app.get('/static/partials/*', routes.partials);

app.post('/user', routes.user.register);
app.post('/user/login', routes.user.login);
app.get('/user/me', routes.user.me);
app.post('/user/logout', routes.user.isAuthed, routes.user.logout);
app.get('/user', routes.user.isAuthed, routes.user.list);
app.get('/user/:id', routes.user.isAuthed, routes.user.get);
app.post('/user/:id', routes.user.isAuthed, routes.user.edit);
app.get('/user/auth/google', routes.user.authGoogle, home);
app.get('/user/auth/google/callback', routes.user.authGoogleCb, home);
app.get('/user/auth/facebook', routes.user.authFacebook, function(){});
app.get('/user/auth/facebook/callback', routes.user.authFacebookCb, home);

app.post('/messages', routes.user.isAuthed, routes.messages.create);
app.get('/messages', routes.user.isAuthed, routes.messages.list);
app.delete('/messages/:id', routes.user.isAuthed, routes.messages.remove);

app.post('/games', routes.user.isAuthed, routes.games.create);
app.get('/games', routes.user.isAuthed, routes.games.list);
app.get('/games/:id', routes.user.isAuthed, routes.games.get);
app.delete('/games/:id', routes.user.isAuthed, routes.games.remove);

// websocket stuff below
io.configure(function() {
  io.set('authorization', function(data, callback) {
    if (!data.headers.cookie) {
      return callback('Session cookie required.', false);
    }

    var cookies = cookie.parse(data.headers.cookie),
      signedCookie = cookies[config.session.name],
      sid = connect.utils.parseSignedCookie(signedCookie,
        config.session.secret);

    if (signedCookie == sid) {
      return callback('Invalid session cookie.', false);
    }

    sessionStore.get(sid, function(err, session) {
      if (err || !session) {
        return callback('Unable to retrieve session.', false);
      } else {
        data.session = session;
        data.sessionId = sid;

        if (!data.session.passport.user) {
          return callback('You need to be logged in.', false);
        }

        User.findOne({_id: data.session.passport.user}, function(err, user) {
          if (err || !user) {
            return callback('Unable to retrieve user object: ' + err, false);
          }

          data.user = user;

          return callback(null, true);
        });
      }
    });
  });
});

io.configure('production', function() {
  io.enable('browser client minification');
  io.enable('browser client etag');
  io.enable('browser client gzip');
  io.set('log level', 1);
});

protocol(io);

// start to listen for incoming connections
server.listen(config.port, function() {
  log.info('Express server listening on port %d', config.port);
});
