var jsonschema = require('jsonschema');
var _ = require('underscore');

var log = require('./log');
var logic = require('./logic');
var Game = require('./models/game');
var Move = require('./models/move');
var User = require('./models/user');

var messageSchema = {
  type: 'object',
  properties: {
    target: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['player', 'game', 'global'], required: true },
        id: { type: 'string', required: true }
      }
    },
    text: { type: 'string', required: true }
  }
};

var acceptSchema = {
  type: 'object',
  properties: {
    gameId: {type: 'string', required: true}
  }
};

var joinSchema = acceptSchema;

var moveSchema = {
  type: 'object',
  properties: {
    gameId: {type: 'string', required: true},
    type: {type: 'string', enum: ['pass', 'surrender', 'play'], required: true},
    row: {type: 'integer', minimum: 0},
    column: {type: 'integer', minimum: 0}
  }
};

var resumeSchema = acceptSchema;

var deadSchema = {
  type: 'object',
  properties: {
    gameId: {type: 'string', required: true},
    row: {type: 'integer', minimum: 0, required: true},
    column: {type: 'integer', minimum: 0, required: true}
  }
};

var doneSchema = acceptSchema;

var communicateSchema = {
  type: 'object',
  properties: {
    gameId: {type: 'string', required: true},
    communicate: {type: 'boolean', required: true}
  }
};

var rtcSchema = {
  type: 'object',
  properties: {
    type: {type: 'string', enum: ['sdp', 'candidate', 'callend'], required: true},
    target: {type: 'string', required: true},
    message: {type: 'string', required: true}
  }
};

var users = {};

module.exports = function(io) {
  io.sockets.on('connection', function(socket) {
    var user = socket.handshake.user;

    users[user.id] = socket;

    log.info('New socket.io connection from %s', user.email);

    io.sockets.emit('status', {
      online: Object.keys(users).length
    });

    // helper method to add a game callback, it checks the schema, retrieves
    // the game, checks the user rights and saves/distributes the game
    var addGameHandler = function(event, schema, state, cb, saved) {
      addHandler(event, schema, function(data) {
        Game
          .findById(data.gameId)
          .populate('challenger')
          .populate('challengee')
          .exec(function(err, game) {
            if (err || !game) {
              return log.warn('Unable to find game by id %s: ', data.gameId, err);
            }

            if (state !== '*' && game.state !== state) {
              return log.warn('Game is not in expected state %s', state);
            }

            if (game.state !== 'waiting' &&
                game.challenger.id !== user.id &&
                game.challengee.id !== user.id &&
                !(event === 'join' && !game.private)) {
              return log.warn('User is not participating in the game and game is private');
            }

            cb(game, data, function(save) {
              if (save !== false) {
                game.save(function(err) {
                  if (err) {
                    return log.warn('Failed to save new game state: ', err);
                  }
                  io.sockets.in(game.id).emit('game', game);

                  if (typeof saved === 'function') {
                    saved(game);
                  }
                });
              }
            });
          });
      });
    };

    // helper method to add an schema validated event handler
    var addHandler = function(event, schema, cb) {
      socket.on(event, function(data) {
        log.debug('New message of type %s by user %s: ', event, user.email, data);

        if (typeof schema !== 'function') {
          var validation = jsonschema.validate(data, schema);
          if (validation.errors.length > 0) {
            return log.warn('Supplied data is invalid: ', validation.errors);
          }
        }

        User.findById(user._id, function(err, aUser) {
          if (err || !aUser) {
            return log.warn('Unable to retrieve user ', err);
          }
          user = aUser;
          (typeof schema === 'function' ? schema : cb)(data);
        })
      });
    };


    // messaging
    addHandler('message', messageSchema, function(data) {
      data.user = user;
      if (data.target.type === 'user') {
        var target = users[data.target.id];

        if (!target) {
          return log.warn('User does not exist or is offline.');
        }

        target.emit('message', data);
      } else if (data.target.type === 'game') {
        if (io.sockets.clients(data.target.id).indexOf(socket) === -1) {
          return log.warn('User is not allowed to message to that game.');
        }
        io.sockets.in(data.target.id).emit('message', data);
      } else if (data.target.type === 'global') {
        io.sockets.emit('message', data);
      }
    });

    // accepting a game
    addGameHandler('accept', acceptSchema, 'waiting', function(game, data, done) {
      if (game.challenger === user._id) {
        return log.warn('Unable to accept own game!');
      }

      game.challengee = user._id;
      game.state = 'live';
      game.started = new Date();

      // decide who has black, thus starts
      if (game.color == 'black') {
        game.black = game.challenger;
      } else if (game.color == 'white') {
        game.black = game.challengee;
      } else {
        game.black = Math.random() < .5 ? game.challenger : game.challengee;
      }

      game.board = new Array(game.size * game.size + 1).join(' ');
      game.prisoners.challenger = 0;
      game.prisoners.challengee = 0;
      game.turn = game.black;

      done();
    }, function() {
      io.sockets.emit('list');
    });

    // joining a game
    addGameHandler('join', joinSchema, '*', function(game) {
      socket.join(game.id);
      socket.emit('game', game);
    });

    // making a move: play, pass or surrender
    addGameHandler('move', moveSchema, 'live', function(game, data, done) {
      if (game.turn.toString() !== user.id) {
        return log.warn('User is not allowed to make a move, not his turn.');
      }

      game.turn = game.next;
      game.last = null;

      var saveMove = function() {
        move.save(function(err) {
          if (err) {
            return log.warn('Unable to save move', move, err);
          }

          done();
        });
      };

      var move = new Move({
        game: game._id,
        user: user._id,
        type: data.type,
        board: game.board
      });

      // normal move
      if (data.type === 'play') {
        move.column = data.column;
        move.row = data.row;

        var board = logic.move(game.board, game.hasColor(user), move.column,
          move.row);
        if (!board) {
          return log.warn('Illegal move.');
        }

        var prisoners = logic.prisoners(game.board, board);
        if (!prisoners) {
          return log.warn('Unable to count prisoners');
        }

        move.board = board;
        game.board = board;
        game.last = move.row * game.size + move.column;
        game.prisoners.challenger += prisoners[game.hasColor(game.challenger)] || 0;
        game.prisoners.challengee += prisoners[game.hasColor(game.challengee)] || 0;

        saveMove();
      }
      // pass: check if passed two times in a row and start counting
      // TODO; check the performance of that mongo query!
      else if (data.type === 'pass') {
        Move
          .find({game: game._id})
          .sort('-created')
          .limit(1)
          .exec(function(err, moves) {
            if (err) {
              return log.warn('Unable to retrieve moves for game', game, err);
            }

            if (moves && moves.length === 1 && moves[0].type === 'pass') {
              game.state = 'counting';
              game.dead = new Array(game.size * game.size + 1).join(' ');
              game.territory = logic.territory(game.board, game.dead);
              if (game.territory === null) {
                return log.warn('Unable to compute territory');
              }
            }

            saveMove();
          })
      }
      // surrender
      else if (data.type === 'surrender') {
        game.winner = game.turn;
        game.state = 'over';
        game.reason = 'surrender';
        saveMove();
      }
    }, function(game) {
      if (game.state === 'over') {
        io.sockets.emit('list');
      }
    });

    // counting: let's continue playing
    addGameHandler('resume', resumeSchema, 'counting', function(game, data, done) {
      game.state = 'live';
      game.accepted = [];
      done();
    });

    // counting: mark stone/group as dead
    addGameHandler('dead', deadSchema, 'counting', function(game, data, done) {
      if (game.board[data.row * game.size + data.column] === ' ') {
        return log.warn('The marked position must be occupied');
      }

      game.dead = logic.dead(game.board, game.dead, data.column, data.row);
      if (game.dead === null) {
        return log.warn('Unable to compute death map');
      }

      game.territory = logic.territory(game.board, game.dead);
      if (game.territory === null) {
        return log.warn('Unable to compute territory');
      }

      done();
    });

    // counting: player is done
    addGameHandler('done', doneSchema, 'counting', function(game, data, done) {
      game.accepted.addToSet(user._id);
      if (game.accepted.length === 2) {
        game.state = 'over';
        game.reason = 'score';
        if (game.score.challenger > game.score.challengee) {
          game.winner = game.challenger._id;
        } else if (game.score.challenger < game.score.challengee) {
          game.winner = game.challengee._id;
        } else {
          game.winner = null;
        }
      }
      done();
    }, function(game) {
      if (game.state === 'over') {
        io.sockets.emit('list');
      }
    });

    // rtc in a game
    addGameHandler('communicate', communicateSchema, '*', function(game, data, done) {
      var player = (user.id === game.challenger._id.toString()) ? 'challenger' : 'challengee';
      game.communicate[player] = data.communicate;
      done();
    });

    // video chat yeah yeah
    addHandler('rtc', rtcSchema, function(data) {
      var target = users[data.target];
      if (!target) {
        return log.warn('User does not exist or is offline.');
      }
      // set the id of the caller, so the callee does know who is calling
      data.sender = user.id;
      target.emit('rtc', data);
    });

    // a user disconnected
    addHandler('disconnect', function() {
      log.info('User %s disconnected.', user.email);
      delete users[user.id];
      io.sockets.emit('status', {online: Object.keys(users).length});
    });
  });
}
