var mongoose = require('mongoose');

var ObjectId = mongoose.Schema.Types.ObjectId;

var User = require('./user');

var gameSchema = new mongoose.Schema({
  state: {
    type: String,
    enum: ['waiting', 'live', 'over'],
    default: 'waiting',
    required: true
  },
  name: {type: String},
  config: {
    size: {
      type: Number,
      min: 9,
      max: 19,
      required: true
    },
    color: {
      type: String,
      enum: ['black', 'white', 'random'],
      default: 'random',
      required: true
    }
  },
  black: {type: ObjectId},
  challenger: {type: ObjectId, ref: 'User', required: true},
  challengee: {type: ObjectId, ref: 'User'},

  // used while live
  runtime: {
    board: {type: String},
    score: {
      challenger: {type: Number, min: 0},
      challengee: {type: Number, min: 0}
    },
    turn: {type: ObjectId}
  },

  // used while over
  result: {
    winner: {type: ObjectId, ref: 'User'},
    reason: {type: String}
  },

  started: {type: Date},
  created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Game', gameSchema);
