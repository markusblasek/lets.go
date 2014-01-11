'use strict';

angular.module('letsGo', [
  'ngRoute',
  'ngSanitize',
  'ngResource',
  'letsGo.services',
  'letsGo.controllers',
  'letsGo.directives'
])
.config(function($routeProvider, $httpProvider) {
  // add an interceptor for AJAX errors
  $httpProvider.responseInterceptors.push(function($q, $location) {
    return function(promise) {
      return promise.then(null, function(response) {
        if (response.status === 401) {
          $location.path('/user/login');
        }
        return $q.reject(response);
      });
    };
  });

  // prepend each route lookup with a proper user check
  var check = function(userManager) {
    return userManager.check();
  };

  $routeProvider
    .when('/', {
      templateUrl: '/static/partials/index.jade',
      controller: 'IndexCtrl'
    })
    .when('/user/login', {
      templateUrl: '/static/partials/user/login.jade',
      controller: 'UserLoginCtrl'
    })
    .when('/user/register', {
      templateUrl: '/static/partials/user/register.jade',
      controller: 'UserRegisterCtrl'
    })
    .when('/user/edit', {
      templateUrl: '/static/partials/user/edit.jade',
      controller: 'UserEditCtrl',
      resolve: {loggedIn: check}
    })
    .when('/messages', {
      templateUrl: '/static/partials/messages/index.jade',
      controller: 'MessagesCtrl',
      resolve: {loggedIn: check}
    })
    .when('/games', {
      templateUrl: '/static/partials/games/list.jade',
      controller: 'GamesListCtrl',
      resolve: {loggedIn: check}
    })
    .when('/games/create', {
      templateUrl: '/static/partials/games/create.jade',
      controller: 'GamesCreateCtrl',
      resolve: {loggedIn: check}
    })
    .when('/games/:gameId', {
      templateUrl: '/static/partials/games/view.jade',
      controller: 'GamesViewCtrl',
      resolve: {loggedIn: check}
    })
    .otherwise({redirectTo: '/'});
});
