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
        message: { type: 'string', required: true }
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
}

var users = {};

module.exports = function(io) {
    io.sockets.on('connection', function(socket) {
        var user = socket.handshake.user;

        users[user.id] = socket;

        log.info('New socket.io connection from %s', user.email);

        // messaging
        socket.on('message', function(data) {
            log.debug('New message by user %s: ', user.email, data);

            var validation = jsonschema.validate(data, messageSchema);

            if (validation.errors.length > 0) {
                return log.warn('Message data is invalid: ', validation.errors);
            }

            if (data.target.type === 'user') {
                var target = users[data.target.id];

                if (!target) {
                    return log.warn('User does not exist or is offline.');
                }

                target.emit('message', data);
            } else if (data.target.type === 'game') {
                // TODO: All user in game have to join a socket.io room, the room shall be identified by the game _id.
            }
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

        socket.on('disconnect', function() {
            log.info('User %s disconnected.', user.email);
            users[user.id] = undefined;
        });
    });
}
