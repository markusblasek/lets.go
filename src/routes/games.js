var GameConfig = require('../models/gameConfig');

exports.create = function(reg, res) {
  var gameName = reg.body.gameName;
  var setting1 = reg.body.setting;
  var ruleSet = reg.body.ruleSet;
  var boardSize = reg.body.boardSize;
  var startColor = reg.body.startColor;

  var gameConfig = new GameConfig({
    gameName: gameName,
    settings: setting1,
    ruleSet: ruleSet,
    boardSize: boardSize,
    startColor: startColor,
  });

  gameConfig.save(function(err, gameConfig) {
    if (err) {
      return res.send(400, err);
    }
    res.send(gameConfig);
  });
};

exports.list = function(req, res) {
  GameConfig.find(function(err, gameConfigs) {
    if (err) {
      return res.send(400, err);
    }
    res.send(gameConfigs);
  });
};

exports.get = function(req, res) {
  GameConfig.find({_id: req.params.id}, function(err, gameConfig) {
    if (err) {
      res.send(400, err);
    }
    res.send(gameConfig);
  });
};

exports.remove = function(req, res) {
  // TODO: Check whether the user is allowed to remove the game!
  GameConfig.remove({_id: req.params.id}, function(err) {
    if (err) {
      res.send(400, err);
    }
    res.send('');
  });
};

