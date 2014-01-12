var Game = require('../models/game');

exports.create = function(req, res) {
  var game = new Game({
    challenger: req.user._id,
    size: req.body.size,
    color: req.body.color,
    komi: req.body.komi,
    name: req.body.name,
    private: !!req.body.private
  });

  game.save(function(err, game) {
    if (err) {
      return res.send(500, err);
    }
    res.send(game);
    req.io.sockets.emit('list');
  });
};

exports.list = function(req, res) {
  var query = Game
    .find()
    .populate('challenger')
    .populate('challengee')
    .sort('-created');

  if (req.query.player !== undefined) {
    query.or([{challenger: req.query.player}, {challengee: req.query.player}]);
  } else {
    query
      .where('state').ne('over')
      .or([{challenger: req.user._id}, {challengee: req.user._id}, {private: false}, {state: 'waiting'}]);
  }

  query.exec(function(err, games) {
    if (err || !games) {
      return res.send(404, err);
    }
    res.send(games);
  });
};

exports.get = function(req, res) {
  Game.
    findOne({_id: req.params.id}).
    populate('challenger').
    populate('challengee').
    exec(function(err, game) {
      if (err || !game) {
        res.send(404, err);
      }
      res.send(game);
    });
};

exports.remove = function(req, res) {
  Game.remove({
    _id: req.params.id,
    challenger: req.user._id,
    state: 'waiting'
  }, function(err) {
    if (err) {
      res.send(500, err);
    }
    res.send('');
  });
};

