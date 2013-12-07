var mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId;

var player = {
    player_id: { type: ObjectId, required: true },
    prisoners: { type: Number, default: 0 }
};

var gameSchema = new mongoose.Schema({
    state: {
        type: String,
        enum: ['live', 'over'],
        required: true
    },
    playing_id: ObjectId,
    challenger: player,
    challengee: player,
    board: { type: [String], required: true },
    created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);
