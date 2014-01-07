var Game = require('../models/game');

exports.create = function(req, res) {
  console.log('reg ', req.body)
  var game = new Game({
    challenger: req.user._id,
    config: {
      size: req.body.size,
      name: req.body.name,
      private: !!req.body.private
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
    .populate('challenger')
    .populate('challengee')
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
    populate('challenger').
    populate('challengee').
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

