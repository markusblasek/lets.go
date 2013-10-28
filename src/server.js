var express = require('express');                                                                                                                             

var User = require('./models/user.js');

var mongoose = require('mongoose');
mongoose.connect('mongodb://' + process.env.IP + '/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('works');
});

var app = express();

app.get('/create', function(req, res) {
    var u = new User({firstName: 'Ich', lastName: 'du'});
    u.save(function (err) {
        console.log('created ', err);

        res.send('user: ' + u._id);
    }); 

    console.log('bla');
});

app.listen(process.env.PORT);
console.log('Listening on ' + process.env.IP + ':' + process.env.PORT);
