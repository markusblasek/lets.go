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

    var startHandler = function(data) {
      $rootScope.$broadcast('gameStarted', data);
    };

    var gameHandler = function(data) {
      $rootScope.$broadcast('gameState', data);
    };

    var messageHandler = function(data) {
      $rootScope.$broadcast('message', data);
    }

    var acceptAction = function(game_id) {
      if (connected) {
        socket.emit('accept', {game_id: game_id});
      }
    };

    var joinAction = function(game_id) {
      if (connected) {
        socket.emit('join', {game_id: game_id});
      }
    };

    var messageAction = function(type, target, text) {
      if (connected) {
        socket.emit('message', {
          target: {type: type, id: target},
          text: text
        });
      }
    }

    return {
      connect: function() {
        if (!socket) {
          socket = io.connect('/');

          socket.on('status', statusHandler);
          socket.on('start', startHandler);
          socket.on('game', gameHandler);
          socket.on('message', messageHandler);

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
  });
