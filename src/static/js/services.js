'use strict';

angular.module('letsGo.services', []).

  service('user', function($rootScope, $http, socket) {
    var user = null;

    var setUser = function(aUser) {
      user = aUser;
      $rootScope.$broadcast('userChanged', user);
      socket.connect();
    }

    return {
      check: function() {
        if (user) return false;
        $http.get('/user').success(setUser);
      },
      login: function(email, password) {
        return $http.post('/user/login', {
          email: email,
          password: password
        })
        .success(setUser);
      },
      logout: function() {
        return $http.post('/user/logout')
          .success(function() {
            user = null;
            socket.disconnect();

            $rootScope.$broadcast('userChanged', user);
          });
      },
      register: function(email, alias, name, password) {
        return $http.post('/user', {
          email: email,
          alias: alias,
          name: name,
          password: password
        }).success(setUser);
      }
    }
  }).

  service('socket', function($rootScope) {
    var socket = null;
    var connected = false;

    var statusHandler = function(data) {
      $rootScope.$broadcast('online', data.online);
    };

    var createHandler = function(name) {
      return function(data) {
        $rootScope.$broadcast(name, data);
      }
    };

    var acceptAction = function(gameId) {
      if (connected) {
        socket.emit('accept', {gameId: gameId});
      }
    };

    var joinAction = function(gameId) {
      if (connected) {
        socket.emit('join', {gameId: gameId});
      }
    };

    var messageAction = function(type, target, text) {
      if (connected) {
        socket.emit('message', {
          target: {type: type, id: target},
          text: text
        });
      }
    };

    var moveAction = function(gameId, type, column, row) {
      if (connected) {
        var data = {
          gameId: gameId,
          type: type
        };

        if (type === 'play') {
          data.column = column;
          data.row = row;
        }

        socket.emit('move', data);
      }
    };

    var resumeAction = function(gameId) {
      if (connected) {
        socket.emit('resume', {gameId: gameId});
      }
    };

    var deadAction = function(gameId, column, row) {
      if (connected) {
        socket.emit('dead', {
          gameId: gameId,
          column: column,
          row: row
        });
      }
    };

    var doneAction = function(gameId) {
      if (connected) {
        socket.emit('done', {gameId: gameId});
      }
    };

    return {
      connect: function() {
        if (!socket) {
          socket = io.connect('/');

          socket.on('status', statusHandler);
          socket.on('start',createHandler('gameStarted'));
          socket.on('game', createHandler('gameState'));
          socket.on('message', createHandler('message'));
          socket.on('list', createHandler('gameList'));

        } else if (!connected) {
          // due to https://github.com/LearnBoost/socket.io-client/issues/251
          socket.socket.reconnect();
        } else {
          return false;
        }

        connected = true;

        return true;
      },
      disconnect: function() {
        if (!connected) {
          return false;
        }

        socket.disconnect();
        connected = false;

        return true;
      },
      accept: acceptAction,
      join: joinAction,
      message: messageAction,
      move: moveAction,
      resume: resumeAction,
      dead: deadAction,
      done: doneAction,

      //temporary solution
      emit: function(event, data){
        if (socket) {
            socket.emit(event, data);
        }
      },
      on: function(event, handler){
        if(socket){
            socket.on(event, handler);
        }
      }
    };
  }).

  service('Game', function($resource) {
    return $resource('/games/:id', {id: '@id'});
  }).

  service('UserDetail', function($resource) {
    return $resource('/userDetail');//ruft in server.js auf???
  }).

  service('ChangeUserDetail', function($resource, $http) {
    return{
        //changeUserDetail: function(email, alias, name) {
        changeUserDetail: function(alias, name) {
            return $http.post('/userDetail', {
                //email: email,
                alias: alias,
                name: name
            })
        }
    }
    }).
    service('MessageUser', function($resource){
        return $resource('/messageUser');
    }).
    service('MessageData', function($resource){
        return $resource('/messageData');
    }).
    service('Message', function($resource, $http){
        return{
            /*getUser: function(req, res){
             console.log("????")
             return $http.get('/message');
             },*/

            sendMessage: function(senderID, senderAlias, acceptorID, subject, content){
                return $http.post('/sendMessage',{
                    senderID: senderID,
                    senderAlias: senderAlias,
                    acceptorID:acceptorID,
                    subject:subject,
                    content:content
                })
            },

            removeMessage: function(messID){
                return $http.post('/removeMessage',{
                    messID:messID
                })
            }
        }

    });
