var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new mongoose.Schema({
  email: {type: String, unique: true, required: true, index: true},
  alias: {type: String, required: true},
  name: String,
  photo: String,
  facebookId: String,
  googleId: String
});

userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.hash;
    delete ret.salt;
  }
});

userSchema.set('toObject', {
  transform: function(doc, ret, options) {
    delete ret.hash;
    delete ret.salt;
  }
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'email',
    saltField: 'salt',
    hashField: 'hash'
});

module.exports = mongoose.model('User', userSchema);
