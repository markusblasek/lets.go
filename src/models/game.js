var mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId;

/*
var player = {
    player_id: { type: ObjectId, ref: 'User', required: true },
    turn: { type: Boolean, default: false, required: true },
    prisoners: { type: Number, default: 0 }
};
*/

var gameSchema = new mongoose.Schema({
  state: {type: String, enum: ['waiting', 'live', 'over'], default: 'waiting', required: true},
  name: {type: String},
  config: {
    size: {type: Number, min: 9, max: 19, required: true},
    color: {type: String, enum: ['black', 'white', 'random'], default: 'random', required: true}
  },
  challenger: {type: ObjectId, ref: 'User', required: true},
  challengee: {type: ObjectId, ref: 'User'},
  board: {type: String},
  created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Game', gameSchema);
