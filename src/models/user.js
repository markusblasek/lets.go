var mongoose = require('mongoose');                                                                                                                           

var userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
