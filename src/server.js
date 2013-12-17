var express = require('express'),
    path = require('path'),
    http = require('http'),
    mongoose = require('mongoose'),
    cookie = require('cookie'),
    connect = require('connect'),
    passport = require('passport'),
    GoogleStrategy = require('passport-google').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy;

// don't abuse it plz
var FACEBOOK_APP_ID = "723348891027933";
var FACEBOOK_APP_SECRET = "b82698180e06348651c4cf1a8285f54b";

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

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new GoogleStrategy({
        returnURL: 'http://localhost:3000/auth/google/return',
        realm: 'http://localhost:3000/'
    },
    function(identifier, profile, done) {
        // check, if user with this email already exists
        var query = User.findOne({ email: profile.emails[0].value});
        query.exec(function (err, oldUser) {
            if(oldUser) {
                console.log('Google user: ' + oldUser.email + ' found and logged in!');
                done(null, oldUser);
            }
            else
            {
                var newUser = new User();
                newUser.alias = profile.name.givenName;
                newUser.name = profile.displayName;
                newUser.email = profile.emails[0].value;

                newUser.save(function(err) {
                    if(err) {throw err;}
                    console.log('New Google user: ' + newUser.email + ' created and logged in!');
                    done(null, newUser);
                });
            }
        });
    }
));

// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
        clientID: FACEBOOK_APP_ID,
        clientSecret: FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        //check, if user with this email already exists
        var query = User.findOne({ email: profile.emails[0].value});
        query.exec(function (err, oldUser) {
                if(oldUser) {
                    console.log('Facebook user: ' + oldUser.email + ' found and logged in!');
                    done(null, oldUser);
                }
                else
                {
                    var newUser = new User();
                    newUser.alias = profile.name.givenName;
                    newUser.name = profile.displayName;
                    newUser.email = profile.emails[0].value;

                    newUser.save(function(err) {
                        if(err) {throw err;}
                        console.log('New Facebook user: ' + newUser.email + ' created and logged in!');
                        done(null, newUser);
                    });
                }
        });
    }
));

var auth = function(req, res, next){
  if (!req.isAuthenticated())
    res.send(401);
  else
    next();
};

// routes below

// TODO: move passport app.gets to routes/user (did not work for some reason...)
// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve redirecting
//   the user to google.com.  After authenticating, Google will redirect the
//   user back to this application at /auth/google/return
app.get('/auth/google',
    passport.authenticate('google', { failureRedirect: '/user/login' }),
    function(req, res) {
        res.redirect('/');
    });

// GET /auth/google/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/return',
    passport.authenticate('google', { failureRedirect: '/user/login' }),
    function(req, res) {
        res.redirect('/');
    });


// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
    passport.authenticate('facebook', { scope: ['email']}),
    function(req, res){
        // The request will be redirected to Facebook for authentication, so this
        // function will not be called.
    });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/user/login' }),
    function(req, res) {
        res.redirect('/');
    });

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
