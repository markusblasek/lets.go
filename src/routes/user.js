var crypto = require('crypto');

var passport = require('passport');
var passportLocal = require('passport-local');
var passportGoogleOauth = require('passport-google-oauth');
var passportFacebook = require('passport-facebook');

var User = require('../models/user');
var log = require('../log');
var config = require('../config');

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
            user.bigPhoto = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
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
    clientID: config.google.id,
    clientSecret: config.google.secret,
    callbackURL: config.address + '/user/auth/google/callback'
  }, strategyHandler(function(user, profile) {
    if (profile._json['picture']) {
      user.photo = profile._json['picture'];
      user.bigPhoto = 'https://plus.google.com/s2/photos/profile/' + profile.id + '?sz=300';
    }
  })));

  // add facebook strategy
  passport.use(new passportFacebook.Strategy({
    clientID: config.facebook.id,
    clientSecret: config.facebook.secret,
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
      return res.send(400, err);
    }
    passport.authenticate('local')(req, res, function () {
      res.send(user);
    });
  });
};

exports.login = function(req, res) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return res.send(400, err);
    }
    if (!user) {
      res.send(400, info || 'Incorrect credentials.');
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

exports.me = function(req, res) {
  res.send(req.user || '');
};

exports.get = function(req, res) {
  User.findById(req.params.id, function(err, user) {
    if (err) {
      log.warn('Failed to fetch user by id %s', req.params.id, err);
      return res.send(500, err.message);
    }
    return res.send(user || 404);
  });
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

    if (user.identifier.indexOf('local-') === 0) {
      user.identifier = 'local-' + user.email;
    }

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
