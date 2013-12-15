var jsonschema = require('jsonschema');

var log = require('./log'),
  logic = require('./logic'),
  Game = require('./models/game'),
  Move = require('./models/move');

var messageSchema = {
  type: 'object',
  properties: {
    target: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['player', 'game'], required: true },
        id: { type: 'string', required: true }
      }
    },
    text: { type: 'string', required: true }
  }
};

var moveSchema = {
  type: 'object',
  properties: {
    game_id: { type: 'string', required: true },
    type: { type: 'string', enum: ['pass', 'surrender', 'play'], required: true },
    row: { type: 'integer', minimum: 0, required: true },
    column: { type: 'integer', minimum: 0, required: true }
  }
};

var videoChatSchema = {
    type: 'object',
    properties: {
        idcallee: { type: 'string', required: true },
        type: { type: 'string', enum: ['sdp', 'candidate', 'callend'], required: true },
        message: { type: 'string', required: true }
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

    // messaging
    socket.on('message', function(data) {
      log.debug('New message by user %s: ', user.email, data);

      var validation = jsonschema.validate(data, messageSchema);

      if (validation.errors.length > 0) {
        return log.warn('Message data is invalid: ', validation.errors);
      }

      data.user = user.alias;

      if (data.target.type === 'user') {
        var target = users[data.target.id];

        if (!target) {
          return log.warn('User does not exist or is offline.');
        }

        target.emit('message', data);
      } else if (data.target.type === 'game') {
        // TODO: ensure that user joined the channel ...
        io.sockets.in(data.target.id).emit('message', data);
      }
    });

    // accepting a game
    socket.on('accept', function(data) {
      log.debug('New accept request by user %s: ', user.email, data);

      Game.findOne({_id: data.game_id, state: 'waiting'}, function(err, game) {
        if (err) {
          return log.warn('Unable to find waiting game by id %s', data.game_id);
        }

        if (game.challenger == user._id) {
          return log.warn('Unable to accept own game!');
        }

        game.challengee = user._id;
        game.state = 'live';

        game.save(function(err) {
          if (err) {
            return log.warn('Failed to save new game state: ', err);
          }

          socket.emit('start', game);
          users[game.challenger].emit('start', game);
        });
      })
    });

    // joining a game
    socket.on('join', function(data) {
      log.debug('New join request by user %s: ', user.email, data);

      Game
        .findById(data.game_id)
        .populate('challenger', 'alias')
        .populate('challengee', 'alias')
        .exec(function(err, game) {
          if (err) {
            return log.warn('Failed to get game: ', err);
          }

          socket.join(game.id);
          socket.emit('game', game);

          io.sockets.in(game.id).emit('message', {
            target: {type: 'game', id: game.id},
            user: 'System',
            text: 'User ' + user.alias + ' joined.'
          });
        });
    });

    // making moves in a game
    socket.on('move', function(data) {
      log.debug('New move by user %s: ', user.email, data);

      var validation = jsonschema.validate(data, moveSchema);

      if (validation.errors.length > 0) {
        return log.warn('Invalid data supplied in move command', data, validation.errors);
      }

      var game = Game.findById(data.game_id, function(err, game) {
        if (err) {
          return log.warn('Unable to find game by id %s', data.game_id);
        }

        if (game.state !== 'live') {
          return log.warn('Moves are only allowed for games that are live');
        }

        if (game.playing_id !== user.id) {
          return log.warn('User is not allowed to make a move.');
        }

        var move = new Move({
          game_id: game.id,
          player_id: user.id,
          type: data.type
        });

        if (data.type === 'play') {
          move.column = data.column;
          move.row = data.row;

          var board = logic.move(game.board, 'x', move.column, move.row);

          if (!board) {
            return log.warn('Illegal move.');
          }

          move.board;
        }

        move.save(function(err) {
          if (err) {
            return log.warn('Unable to save move', move, err);
          }

          // update game and broadcast move to other players
          // MOVE HAS TO INCORPORATE NEW BOARD!111

          io.sockets.in(data.game_id).emit('move', data);
        });
      });
    });

    // exchange messages between two clients to initialise the video chat
    socket.on('videochat', function (data){
        log.debug('New video chat message by user %s: ', user.email, data);
        var validation = jsonschema.validate(data, videoChatSchema);
        if (validation.errors.length > 0) {
            return log.warn('Video chat message data is invalid: ', validation.errors);
        };
        var target = users[data.idcallee];
        if (!target) {
            return log.warn('User does not exist or is offline.');
        }
        // set the id of the caller, so the callee does know who is calling
        data.idcaller = user.id;
        target.emit('videochat', data);
    });
    socket.on('disconnect', function() {
     log.info('User %s disconnected.', user.email);
      delete users[user.id];

      io.sockets.emit('status', {
        online: Object.keys(users).length
      });
    });
  });
}
