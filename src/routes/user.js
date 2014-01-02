var passport = require('passport');

var User = require('../models/user');

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
    res.send('');
};

exports.get = function(req, res) {
  // TODO: We should not expose hash and salt this way, we also might hide __v.
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
