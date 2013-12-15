'use strict';

angular.module('letsGo', [
  'ngRoute',
  'ngSanitize',
  'ngResource',
  'letsGo.services',
  'letsGo.controllers'
]).
config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
  // add an interceptor for AJAX errors
  $httpProvider.responseInterceptors.push(function($q, $location) {
    return function(promise) {
      return promise.then(
        // Success: just return the response
        function(response){
          return response;
        },
        // Error: check the error status to get only the 401
        function(response) {
          if (response.status === 401)
            $location.url('/user/login');
          return $q.reject(response);
        }
      );
    }
  });

  $routeProvider.
    when('/user/login', {
      templateUrl: '/static/partials/user/login.jade',
      controller: 'LoginCtrl'
    }).
    when('/user/register', {
      templateUrl: '/static/partials/user/register.jade',
      controller: 'RegisterCtrl'
    }).
    when('/messages', {
      templateUrl: '/static/partials/messages/index.jade',
      controller: 'MessagesCtrl'
    }).
    when('/games', {
      templateUrl: '/static/partials/games/list.jade',
      controller: 'GamesListCtrl'
    }).
    when('/games/create', {
      templateUrl: '/static/partials/games/create.jade',
      controller: 'GamesCreateCtrl'
    }).
    when('/games/:gameId', {
      templateUrl: '/static/partials/games/view.jade',
      controller: 'GamesViewCtrl'
    }).
    otherwise({redirectTo: '/'});
}]);
