var mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId;

var player = {
    player_id: { type: ObjectId, required: true },
    turn: { type: Boolean, default: false, required: true },
    prisoners: { type: Number, default: 0 }
};

var gameSchema = new mongoose.Schema({
    state: { type: String, enum: ['live', 'over'], required: true },
    challenger: player,
    challengee: player,
    board: { type: [String], required: true },
    created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);
