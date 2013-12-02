var express = require('express'),
    path = require('path'),
    http = require('http'),
    mongoose = require('mongoose');

var config = require('./config.js');
var routes = require('./routes');

// establish mongodb connection
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/test');

var app = express();

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

http.createServer(app).listen(config.port, function() {
  console.log('Express server listening on port ' + config.port);
});
