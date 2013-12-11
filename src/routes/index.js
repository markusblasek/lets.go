var fs = require('fs');

exports.user = require('./user');
exports.game = require('./game');

exports.index = function(req, res) {
    res.render('index');
};

exports.partials = function(req, res) {
  var filename = req.params[0];
  res.render('partials/' + filename);
};
