var Game = require('../models/game');

exports.create = function(req, res) {
  var game = new Game({
    name: req.body.name,
    challenger: req.user._id,
    config: {
      size: req.body.size
    }
  });

  game.save(function(err, game) {
    if (err) {
      return res.send(400, err);
    }
    res.send(game);
  });
};

exports.list = function(req, res) {
  Game
    .find()
    .populate('challenger', 'alias')
    .exec(function(err, games) {
      if (err) {
        return res.send(400, err);
      }
      res.send(games);
    });
};

exports.get = function(req, res) {
  Game.
    findOne({_id: req.params.id}).
    populate('challenger', 'alias').
    populate('challengee', 'alias').
    exec(function(err, game) {
      if (err) {
        res.send(400, err);
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
      res.send(400, err);
    }
    res.send('');
  });
};

