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

    return {
      connect: function() {
        if (!socket) {
          socket = io.connect('/');

          socket.on('status', statusHandler);

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
      }
    };
  }).

  service('Game', function($resource) {
    return $resource('/games/:id', {id: '@id'});
  });
