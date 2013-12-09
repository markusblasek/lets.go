'use strict';

angular.module('letsGo.services', []).

  service('user', function($rootScope, $http) {
    var user = null;
    var socket = null;

    return {
      check: function() {
        if (user) return false;

        $http.get('/user')
          .success(function(aUser) {
            user = aUser;
            socket = io.connect('/');

            $rootScope.$broadcast('userChanged', user);
          });
      },
      login: function(email, password) {
        return $http.post('/user/login', {
          email: email,
          password: password
        })
        .success(function(aUser){
          user = aUser;
          socket = io.connect('/');

          $rootScope.$broadcast('userChanged', user);
        });
      },
      logout: function() {
        return $http.post('/user/logout')
          .success(function() {
            user = null;
            socket.disconnect();
            socket = null;

            $rootScope.$broadcast('userChanged', user);
          });
      }
    }
  });
