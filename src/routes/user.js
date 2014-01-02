var passport = require('passport');
var passportGoogle = require('passport-google');
var passportFacebook = require('passport-facebook');

var User = require('../models/user');
var log = require('../log');
var config = require('../config');

// don't abuse it plz
var FACEBOOK_APP_ID = '723348891027933';
var FACEBOOK_APP_SECRET = 'b82698180e06348651c4cf1a8285f54b';

// setup

exports.setup = function(app) {
  // add local strategy
  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  // add google strategy
  passport.use(new passportGoogle.Strategy({
    returnURL: config.address + '/user/auth/google/return',
    realm: config.address
  },
  function(identifier, profile, done) {
    User.findOne({email: profile.emails[0].value}, function(err, user) {
      if (user) {
        log.info('Google user logged in: %s', user.email);
        done(null, user);
      } else {
        user = new User({
          alias: profile.name.givenName,
          name: profile.displayName,
          email: profile.emails[0].value
        });
        user.save(function(err) {
          if (err) {
            return log.error('Failed to create new google user: ', profile);
          }
          log.info('New google user created and logged in: %s', user.email);
          done(null, user);
        });
      }
    });
  }));

  // add facebook strategy
  passport.use(new passportFacebook.Strategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: config.address + '/user/auth/facebook/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({email: profile.emails[0].value}, function(err, user) {
      if (user) {
        log.info('Facebook user logged in: %s', user.email);
        done(null, user);
      } else {
        user = new User({
          alias: profile.name.givenName,
          name: profile.displayName,
          email: profile.emails[0].value
        });
        user.save(function(err) {
          if (err) {
            return log.error('Failed to create new facebook user: ', profile);
          }
          log.info('New facebook user created and logged in: %s', user.email);
          done(null, user);
        });
      }
    });
  }));
};

// middleware functions

exports.isAuthed = function(req, res, next) {
  (!req.isAuthenticated()) ? res.send(401) : next();
};

exports.authGoogle = passport.authenticate('google', {
  failureRedirect: '/user/login'
});

exports.authFacebook = passport.authenticate('facebook', {scope: ['email']});

exports.authFacebookCb = passport.authenticate('facebook', {
  failureRedirect: '/user/login'
});

// handler functions

exports.register = function(req, res) {
  var user = new User({
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
  res.send(req.user);
};

exports.getUser = function(req, res){
    User
        .findOne({_id: req.user._id})
        .exec(function(err, user) {
            if (err) {
                return res.send(400, err);
            }
            var userArray = [
                {
                    email: user.email,
                    alias: user.alias,
                    name: user.name
                }
            ]
            res.send(userArray);
        });
};

exports.changeUserDetail = function(req, res){
    User.findOne({_id: req.user._id}, function(err, doc){
        if(err){
            console.log("error in exports.changeUserDetail")
        }else{
            if(req.body.name!=''){
                doc.name = req.body.name;
            }
            if(req.body.alias != ''){
                doc.alias = req.body.alias;
            }
            /*
            if(req.body.email != '' && req.body.email != undefined){
                doc.email = req.body.email;
            }
            */
            doc.save();
        }
    })
};
