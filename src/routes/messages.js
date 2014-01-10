var Message = require('../models/message');

exports.create = function(req, res) {
  new Message({
    senderID: req.body.senderID,
    senderAlias: req.body.senderAlias,
    acceptorID: req.body.acceptorID,
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
  // TODO: That's a security flaw, we should also include checks if that is a mesage of the user!!!
  Message.remove({
    _id: req.params.id
  }, function(err) {
    if (err) {
      res.send(500, err);
    }
    res.send('');
  });
};
