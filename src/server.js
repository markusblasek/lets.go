var express = require('express'),
    path = require('path'),
    http = require('http'),
    mongoose = require('mongoose'),
    cookie = require('cookie'),
    connect = require('connect');

var config = require('./config.js'),
    log = require('./log.js'),
    routes = require('./routes'),
    protocol = require('./protocol.js'),
    User = require('./models/user.js');

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
app.use(app.router);
app.use(require('less-middleware')({
    src: path.join(__dirname, 'public'),
    compress: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// routes below
app.get('/', routes.index);

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

                /*
                if (!data.session.user_id) {
                    return callback('You need to be logged in.', false);
                }
                */

                //User.findById(
                
                data.user = new User({
                    alias: 'testUser'
                });

                return callback(null, true);
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

