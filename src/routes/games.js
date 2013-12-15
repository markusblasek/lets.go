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
    .find({state: 'waiting'})
    .populate('challenger', 'alias')
    .exec(function(err, games) {
      if (err) {
        return res.send(400, err);
      }
      res.send(games);
    });
};

exports.get = function(req, res) {
  Game.find({_id: req.params.id}, function(err, game) {
    if (err) {
      res.send(400, err);
    }
    res.send(game);
  });
};

exports.remove = function(req, res) {
  // TODO: Check whether the user is allowed to remove the game!
  Game.remove({_id: req.params.id}, function(err) {
    if (err) {
      res.send(400, err);
    }
    res.send('');
  });
};

