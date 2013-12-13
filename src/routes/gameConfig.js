var mongoose = require('mongoose');
var GameConfig = require('../models/gameConfig');

//----------------------------
var someID = 0;
var someUsername = "Helga";

exports.setUpGame = function(req, res){
        //Look if the user has already a number
        if(someID == 0){
            someID = new String(mongoose.Types.ObjectId());
        }
        GameConfig.find(function(err, gameConfig){
            if(err){
                console.log("Error in export.showGames")
            }else{
                res.render('setUpGame', {
                    "userlist" : gameConfig,
                    "gID": someID,
                    "username": someUsername
                });
            }
        })
};

exports.addGame = function(reg, res){
        var gameName = reg.body.gameName;
        var setting1 = reg.body.setting;
        var ruleSet = reg.body.ruleSet;
        var boardSize = reg.body.boardSize;
        var startColor = reg.body.startColor;

        var objGC = new GameConfig({
            gameName: gameName,
            settings: setting1,
            ruleSet: ruleSet,
            boardSize: boardSize,
            startColor: startColor,
            username1: someUsername,
            gameID: someID,
            userID: someID
        })

        GameConfig.find({gameID: someID}).remove();

        objGC.save(function (err, objGC) {
            if (err){
                console.log("Error in exports.addGame");
            }
        });
    res.redirect('setUpGame');

}

exports.showGames = function(req, res){
        GameConfig.find(function(err, gameConfig){
            if(err){
                console.log("Error in export.showGames")
            }else{
                res.render('showGames', {
                    "userlist" : gameConfig
                });
            }
        })
};

exports.removeGame = function(reg, res){
    console.log("please remove the current game");

    var gameName = reg.body.gameName;
    var setting1 = reg.body.setting;
    var ruleSet = reg.body.ruleSet;
    var boardSize = reg.body.boardSize;
    var startColor = reg.body.startColor;

    var objGC = new GameConfig({
        gameName: gameName,
        settings: setting1,
        ruleSet: ruleSet,
        boardSize: boardSize,
        startColor: startColor,
        username1: someUsername,
        gameID: someID,
        userID: someID
    })

    GameConfig.find({gameID: someID}).remove();
    res.redirect('/');
}