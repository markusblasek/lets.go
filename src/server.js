var config = require('./config.js');
var routes = require('./routes');

var express = require('express'),
    path = require('path'),
    http = require('http');

var User = require('./models/user.js');

var mongoose = require('mongoose');
mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('works');
});

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

app.get('/create', function(req, res) {
    var u = new User({firstName: 'Ich', lastName: 'du'});
    u.save(function (err) {
        console.log('created ', err);

        res.send('user: ' + u._id);
    }); 

    console.log('bla');
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
app.get('/create', function(req, res) {
    var u = new User({firstName: 'Ich', lastName: 'du'});
    u.save(function (err) {
        console.log('created ', err);

        res.send('user: ' + u._id);
    }); 

    console.log('bla');
});

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
