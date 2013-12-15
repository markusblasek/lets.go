'use strict';

angular.module('letsGo.services', []).

  service('user', function($rootScope, $http) {
    var user = null;
    var socket = null;

    //TODO: Socket management should be moved into a separate service
    var setUser = function(aUser) {
      user = aUser;

      $rootScope.$broadcast('userChanged', user);

      if (!socket) {
        socket = io.connect('/');

        socket.on('status', function(data) {
          console.log('status', data);
          $rootScope.$broadcast('online', data.online);
        });

      } else {
        // due to https://github.com/LearnBoost/socket.io-client/issues/251
        socket.socket.reconnect();
      }
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

  service('Game', function($resource) {
    return $resource('/games/:id', {id: '@id'});
  });
