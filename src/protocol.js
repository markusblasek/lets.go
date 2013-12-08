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

module.exports = function(io) {
    io.sockets.on('connection', function(socket) {

        //io.sockets.emit('message', {session: socket.handshake.sessionId, text: 'Joined'});

        // store socket to access later
        var user = socket.handshake.user;
        var session = socket.handshake.session;

        //users[user.id] = socket;

        log.info('New socket.io connection from %s', user.alias);

        // messaging
        socket.on('message', function(data) {
            /*log.debug('New message by user %s', user, data);

             if (data.target.type === 'user') {
             var target = users[data.target.id];
             target.emit('message', data);
             }*/
            // we need to..
            // 1. find the game/user or error out
            // 2. broadcast to appropriate room
        });

        // making moves in a game
        socket.on('move', function(data) {
            log.debug('move', data);

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
                    // game logic: check whether the move is actually a legit move!
                    move.row = data.row;
                    move.column = data.column;
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
            log.info('User %s disconnected.', user.alias);
        });
    });
}
