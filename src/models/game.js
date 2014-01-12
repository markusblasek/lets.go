var mongoose = require('mongoose');
var _ = require('underscore');

var ObjectId = mongoose.Schema.Types.ObjectId;

var User = require('./user');

var gameSchema = new mongoose.Schema({
  // the game accepts different commands depending on its state
  state: {
    type: String,
    enum: ['waiting', 'live', 'counting', 'over'],
    default: 'waiting',
    required: true
  },

  // defined by the creator
  name: {type: String},
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
  },
  komi: {type: Number, min: 0, default: 6.5},
  private: {type: Boolean, default: false, required: true},

  // challenger is the creator, challengee might be assigned later
  challenger: {type: ObjectId, ref: 'User', index: true, required: true},
  challengee: {type: ObjectId, ref: 'User', index: true},

  // once the game is live, the started date is set and black player is defined
  started: {type: Date},
  black: {type: ObjectId},

  // used while playing
  board: {type: String},
  prisoners: {
    challenger: {type: Number, min: 0},
    challengee: {type: Number, min: 0}
  },
  turn: {type: ObjectId},

  // used while counting
  dead: {type: String},
  territory: {type: String},
  accepted: [ObjectId],

  // once its over, the game has a result
  winner: {type: ObjectId},
  reason: {type: String, enum: ['score', 'surrender']},

  created: {type: Date, default: Date.now}
});

var score = function(player) {
  return function() {
    if (!this[player]) {
      return 0;
    }

    var score = this.prisoners[player];
    var user = {_id: this.populated(player) || this[player]};

    if (this.hasColor(user) === 'W') {
      score += this.komi;
    }

    if ((this.state === 'over' || this.state === 'counting') &&
        this.territory && this.dead) {
      // territory
      var counts = _.countBy(this.territory, _.identity);
      score += counts[this.hasColor(user)] || 0;

      // dead stones
      _.each(_.zip(this.board, this.dead), function(pair) {
        score += (pair[0] !== this.hasColor(user) && pair[1] === 'X') ? 1 : 0;
      }, this);
    }

    return score;
  };
};

gameSchema.virtual('next').get(function() {
  if (!this.turn || !this.challenger || !this.challengee) return null;
  return this.turn.equals(this.challenger._id) ?
    this.challengee._id : this.challenger._id;
});

gameSchema.virtual('score.challenger').get(score('challenger'));
gameSchema.virtual('score.challengee').get(score('challengee'));

gameSchema.methods.hasColor = function(user) {
  if (!this.black) return null;
  return this.black.equals(user._id) ? 'B' : 'W';
};

gameSchema.set('toObject', {virtuals: true});
gameSchema.set('toJSON', {virtuals: true});

module.exports = mongoose.model('Game', gameSchema);
