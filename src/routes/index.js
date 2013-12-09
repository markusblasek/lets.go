exports.user = require('./user');
exports.game = require('./game');

exports.index = function(req, res) {
    res.render('index');
};
