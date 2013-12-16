var express = require('express'),
    path = require('path'),
    http = require('http'),
    mongoose = require('mongoose'),
    cookie = require('cookie'),
    connect = require('connect'),
    passport = require('passport');

var config = require('./config'),
    log = require('./log'),
    routes = require('./routes'),
    protocol = require('./protocol'),
    User = require('./models/user');

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
// this should be done by passport, shouldn't it?
app.use(function(req, res, next) {
    res.locals.user = req.user;
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

// passport config
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var auth = function(req, res, next){
  if (!req.isAuthenticated())
    res.send(401);
  else
    next();
};

// routes below
app.get('/', routes.index);

app.get('/static/partials/*', routes.partials);

app.post('/user', routes.user.register);
app.post('/user/login', routes.user.login);
app.post('/user/logout', auth, routes.user.logout);
app.get('/user', auth, routes.user.get);

app.post('/games', auth, routes.games.create);
app.get('/games', auth, routes.games.list);
app.get('/games/:id', auth, routes.games.get);
app.delete('/games/:id', auth, routes.games.remove);

app.get('/setUpGame', routes.gameConfig.setUpGame);
app.get('/showGames', routes.gameConfig.showGames);
app.post('/addGame', routes.gameConfig.addGame);
app.post('/removeGame', routes.gameConfig.removeGame);

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

                User.findOne({ email: data.session.passport.user }, function(err, user) {
                    if (err) {
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
