var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var User = new mongoose.Schema({
  email: {type: String, unique: true, required: true, index: true},
  alias: {type: String, required: true},
  name: String
});

User.plugin(passportLocalMongoose, {
    usernameField: 'email',
    saltField: 'salt',
    hashField: 'hash'
});

module.exports = mongoose.model('User', User);
