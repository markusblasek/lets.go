/**
 * Created by ACNeumann on 06.01.14.
 */
var Message = require('../models/message');

exports.sendMessage = function(req, res){
    var message = new Message();
    message.senderID = req.body.senderID;
    message.senderAlias = req.body.senderAlias;
    message.acceptorID = req.body.acceptorID;
    message.subject = req.body.subject;
    message.content = req.body.content;

    message.save(function(err, message) {
        if (err) {
            return res.send(400, err);
        }
    });
};

exports.getMessages = function(req, res){
    var message = new Array(Message);
    Message
        .find({})
        .exec(function(err, data) {
            for(var i=0; i<data.length; i++){
                if(data[i].senderID == req.user._id){
                    message[i] = data[i];
                }
                if(data[i].acceptorID == req.user._id){
                    message[i] = data[i];
                }
            }
            res.send(message)
        });

};

exports.removeMessage = function(req, res){
    Message.findOne({_id: req.body.messID}, function(err, doc){
        if(err){
            console.log("error in exports.removeMessage")
        }else{
            doc.remove();
        }
    })

}
