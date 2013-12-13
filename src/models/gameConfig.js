var mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId;

var gcSchema = new mongoose.Schema({
    userID: {type: String}
    , gameID:{type:String}
	, gameName:{type: String}
    , settings:{type: String, enum:['Free', 'Demonstration', 'Teaching', 'Simul', 'Rengo']}
    , ruleSet: {type: String, enum:['Japanese', 'Chinese', 'AGA', 'New Zealand']}
    , boardSize: {type: String, enum:['9x9', '13x13', '19x19']}
    , startColor: {type: String, enum:['black', 'white']}
    , username1: {type: String}
    , username2: {type: String}
});

module.exports = mongoose.model('gameConfig', gcSchema);
