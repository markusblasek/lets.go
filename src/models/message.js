/**
 * Created by ACNeumann on 06.01.14.
 */

var mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId;

var messageSchema = new mongoose.Schema({
    senderID:{},
    senderAlias:{},
    acceptorID:{},
    subject: {},
    content: {}
    /*
     senderID: { type: ObjectId, required: true },
     acceptorID: {type:objectID, required: true },
     subject: {type:string},
     content: {type:string}
     */
});

module.exports = mongoose.model('Message', messageSchema);
