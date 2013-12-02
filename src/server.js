var express = require('express'),
    path = require('path'),
    http = require('http'),
    mongoose = require('mongoose');

var config = require('./config.js');
var log = require('./log.js');
var routes = require('./routes');

// establish mongodb connection
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/test');

// create app, http server and websocket server instances
var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
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
io.sockets.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});

// start to listen for incoming connections
server.listen(config.port, function() {
    log.info('Express server listening on port %d', config.port);
});

