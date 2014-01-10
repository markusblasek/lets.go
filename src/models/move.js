var mongoose = require('mongoose');

var ObjectId = mongoose.Schema.Types.ObjectId;

var moveSchema = new mongoose.Schema({
  game: {type: ObjectId, ref: 'Game', index: true, required: true},
  user: {type: ObjectId, ref: 'User', required: true},
  type: {type: String, enum: ['pass', 'surrender', 'play'], required: true},
  row: {type: Number, min: 0},
  column: {type: Number, min: 0},
  board: {type: String, required: true},
  created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Move', moveSchema);
