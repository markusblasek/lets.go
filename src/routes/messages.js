var Message = require('../models/message');

exports.create = function(req, res) {
  new Message({
    senderID: req.body.senderID,
    senderAlias: req.body.senderAlias,
    acceptorID: req.body.acceptorID,
    acceptorAlias: req.body.acceptorAlias,
    subject: req.body.subject,
    content: req.body.content
  }).save(function(err, message) {
    if (err) {
        return res.send(400, err);
    }
    res.send(message);
  });
};

exports.list = function(req, res) {
  Message.find({}, function(err, messages) {
    if (err) {
      res.send(500, err);
    }
    res.send(messages || []);
  });
};

exports.remove = function(req, res) {
    var delFlag = false;
    var saveFlag = false;


    Message.findOne({_id: req.params.id}, function(err, doc){

        if(doc.senderID == req.user._id){
            if(doc.delFromAcceptor == 'true'){
                delFlag=true;
            }else{
                doc.delFromSender = true;
                saveFlag = true;
            }
        }
        if(doc.acceptorID == req.user._id){
            if(doc.delFromSender == 'true'){
                delFlag = true;
            }else{
                doc.delFromAcceptor = true;
                saveFlag = true;
            }
        }
        if(saveFlag){
            doc.save(function(err, doc){
                err ? res.send(500, err) : res.send('');
            })
        }
        if(delFlag){
            doc.remove(function(err, doc) {
                err ? res.send(500, err) : res.send('');
            });
        }

    });
};
