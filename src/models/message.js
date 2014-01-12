var mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId;

var messageSchema = new mongoose.Schema({
    senderID:{},
    senderAlias:{},
    acceptorID:{},
    acceptorAlias:{},
    subject: {},
    content: {},
    delFromSender:{type: String, enum: [true, false], default: false},
    delFromAcceptor:{type: String, enum: [true, false], default: false}
    /*
     senderID: { type: ObjectId, required: true },
     acceptorID: {type:objectID, required: true },
     subject: {type:string},
     content: {type:string}
     */
});

module.exports = mongoose.model('Message', messageSchema);

