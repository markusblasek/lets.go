var crypto = require('crypto');

var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new mongoose.Schema({
  identifier: {type: String, required: true, unique: true, index: true},
  email: {type: String, unique: true, required: true, index: true},
  alias: {type: String, required: true},
  name: String,
  photo: String
});

var transform = function(doc, ret, options) {
  delete ret.identifier;
  delete ret.hash;
  delete ret.salt;
  ret.photo = doc.photo || ('http://robohash.org/' +
                            crypto.createHash('md5').update(doc.identifier).digest('hex') +
                            '.png?size=50x50&bgset=bg2');
};
userSchema.set('toJSON', {transform: transform});
userSchema.set('toObject', {transform: transform});

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'identifier',
    saltField: 'salt',
    hashField: 'hash'
});

module.exports = mongoose.model('User', userSchema);
