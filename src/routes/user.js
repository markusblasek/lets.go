var crypto = require('crypto');

var passport = require('passport');
var passportLocal = require('passport-local');
var passportGoogleOauth = require('passport-google-oauth');
var passportFacebook = require('passport-facebook');

var User = require('../models/user');
var log = require('../log');
var config = require('../config');

// LOCALHOST
var FACEBOOK_APP_ID = '723348891027933';
var FACEBOOK_APP_SECRET = 'b82698180e06348651c4cf1a8285f54b';
var GOOGLE_CLIENT_ID = '179733906984-b3cg0psdbp97ou2th4689o7ia4qt34lg.apps.googleusercontent.com';
var GOOGLE_CLIENT_SECRET = 'S8IkqL0X3uWnSFOMxFQw2VMe';

// REAKTOR42.de
/*
var FACEBOOK_APP_ID = '259268590897864';
var FACEBOOK_APP_SECRET = '5e833bb4b8d90406a0a7dfc73622504b';
var GOOGLE_CLIENT_ID = '179733906984-0774u6lq7mu0fof6am7gbk7bms1dl2io.apps.googleusercontent.com';
var GOOGLE_CLIENT_SECRET = 'BGryGckhim__F2B8dh_uFCHt';
*/


// setup

exports.setup = function(app) {
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  var strategyHandler = function(update) {
    return function(accessToken, refreshToken, profile, done) {
      var identifier = {identifier: profile.provider + '-' + profile.id};
      User.findOne(identifier, function(err, user) {
        if (!user) {
          user = new User(identifier);
          user.alias = profile.name.givenName;
          user.name = profile.displayName;
          user.email = profile.emails[0].value;
          if (profile.photos && profile.photos[0]) {
            user.photo = profile.photos[0].value;
          }
          if (update) {
            update(user, profile);
          }
        }

        user.save(function(err) {
          if (err) {
            log.error('Unable to save user ', user, ' with profile ', profile);
          }
          done(err, err ? null : user);
        });
      });
    };
  };

  // add local strategy
  passport.use(new passportLocal.Strategy({
    usernameField: 'email',
    passwordField: 'password'
  }, function(username, password, done) {
    var identifier = {identifier: 'local' + '-' + username};
    User.findOne(identifier, function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false);
      }
      user.authenticate(password, function(err, correct, asd) {
        done(null, user === correct ? user : false);
      })
    });
  }));

  // add google strategy
  passport.use(new passportGoogleOauth.OAuth2Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: config.address + '/user/auth/google/callback'
  }, strategyHandler(function(user, profile) {
    if (profile._json['picture']) {
      user.photo = profile._json['picture'];
    }
  })));

  // add facebook strategy
  passport.use(new passportFacebook.Strategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: config.address + '/user/auth/facebook/callback',
    profileFields: ['name', 'displayName', 'emails', 'photos']
  }, strategyHandler()));
};

// middleware functions

exports.isAuthed = function(req, res, next) {
  (!req.isAuthenticated()) ? res.send(401) : next();
};

exports.authGoogle = passport.authenticate('google', {
  scope: ['https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'],
  failureRedirect: '/user/login'
});

exports.authGoogleCb = passport.authenticate('google', {
    failureRedirect: '/user/login'
});

exports.authFacebook = passport.authenticate('facebook', {scope: ['email']});

exports.authFacebookCb = passport.authenticate('facebook', {
  failureRedirect: '/user/login'
});

// handler functions

exports.register = function(req, res) {
  var user = new User({
    identifier: 'local-' + req.body.email,
    email: req.body.email,
    alias: req.body.alias,
    name: req.body.name
  });

  User.register(user, req.body.password, function(err) {
    if (err) {
      return res.send(400, err.message);
    }
    passport.authenticate('local')(req, res, function () {
      res.send(user);
    });
  });
};

exports.login = function(req, res) {
  passport.authenticate('local', function(err, user, info) {
    if (!user) {
      res.send(400, 'Incorrect credentials');
    } else {
      req.logIn(user, function(err) {
        res.send(user);
      })
    }
  })(req, res);
};

exports.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};

exports.get = function(req, res) {
  if (!req.params.id) {
    return res.send(req.user);
  } else {
    User.findById(req.params.id, function(err, user) {
      if (err) {
        log.warn('Failed to fetch user by id %s', req.params.id, err);
        return res.send(500, err.message);
      }
      return res.send(user || 404);
    });
  }
};

exports.edit = function(req, res){
  if (req.user.id !== req.body._id) {
    log.warn('Users may edit only their own account');
    return res.send(403);
  }

  User.findById(req.body._id, function(err, user) {
    if (err) {
      return res.send(500, err);
    }
    if (!user) {
      return res.send(404);
    }

    user.alias = req.body.alias;
    user.name = req.body.name;
    user.email = req.body.email;

    // TODO: Update identifier if local, but i think that would break the hash

    user.save(function(err, user) {
      err ? res.send(500, err) : res.send(user);
    });
  });
};

exports.list = function(req, res) {
  User.find({}, function(err, users) {
    if (err) {
      res.send(500, err);
    }
    res.send(users || []);
  });
};
