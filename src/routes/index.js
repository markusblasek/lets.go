exports.user = require('./user');
exports.games = require('./games');

exports.index = function(req, res) {
    res.render('index');
};

exports.partials = function(req, res) {
  var filename = req.params[0];
  res.render('partials/' + filename);
};
