var someID=0;
var someUsername = "Helga";
exports.setUpGame = function(db){
    return function(req, res) {
        var collection = db.get('gameCollection');
        //Looks if the user has already a number
        if(someID == 0){
            someID = Math.random();
        }
        collection.find({},{},function(e,docs){
            res.render('setUpGame', {
            "userlist" : docs,
            "id" : someID,
            "username" : someUsername
            });
        });
    };
};

exports.addGame = function(db){
    return function(reg, res){
        var gameName = reg.body.gameName;
        var setting1 = reg.body.setting1;
        var ruleSet = reg.body.ruleSet;
        var boardSize = reg.body.boardSize;
        var startColor = reg.body.startColor;

        // Set our collection
        var collection = db.get('gameCollection');

        //remove previous game settings for this user
        collection.remove({userID: someID});

        // Submit new game settings to the DB
        collection.insert({
            "gameName" : gameName,
            "userID" : someID,
            "settings" : setting1,
            "rSet" : ruleSet,
            "boardSize" : boardSize,
            "sColor" : startColor,
            "username1" : someUsername

        }, function (err, doc) {
            //TODO no idea how to access this
            if (err) {
                res.send("There was a problem adding the information to the database.");
            }
            else {
                res.redirect("setUpGame");
            }
        });

    }
}

exports.showGames = function(db){
    return function(req, res) {
        var collection = db.get('gameCollection');
        collection.find({},{},function(e,docs){
            res.render('showGames', {
                "userlist" : docs
            });
            console.log("say something");
        });
    };
};