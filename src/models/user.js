var mongoose = require('mongoose'),
    passportLocalMongoose = require('passport-local-mongoose');

var User = new mongoose.Schema({
    email: { type: String, unique: true, required: true, index: true },
    forename: String,
    surname: String,
    salt: String,
    hash: String
});

User.plugin(passportLocalMongoose, {
    usernameField: 'email',
    saltField: 'salt',
    hashField: 'hash'
});

module.exports = mongoose.model('User', User);
