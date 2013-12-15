'use strict';

angular.module('letsGo.controllers', []).
  controller('AppCtrl', function($scope, $route, $http, $location, user) {
    $scope.$route = $route;

    $scope.$on('$routeChangeStart', NProgress.start);
    $scope.$on('$routeChangeSuccess', NProgress.done);
    $scope.$on('$routeChangeError', NProgress.done);

    $scope.$on('$viewContentLoaded', function() {
      $('.ui.dropdown').dropdown();
    });

    user.check();

    $scope.user = null;
    $scope.online = 0;
    $scope.logout = user.logout;
    $scope.running_games = [];

    $scope.$on('userChanged', function(event, user) {
      $scope.user = user;
    });

    $scope.$on('online', function(event, online) {
      $scope.$apply(function() {
        $scope.online = online;
      });
    });

    $scope.$on('gameStarted', function(event, game) {
      $location.url('/games/' + game._id);
    });
  }).

  controller('LoginCtrl', function($scope, $http, $location, user) {
    $scope.email = '';
    $scope.password = '';

    $scope.login = function() {
      $scope.loading = true;
      $scope.error = null;

      return user.login($scope.email, $scope.password).
        success(function(user){
          $location.url('/');
        }).
        error(function(error){
          $scope.error = error;
        }).
        finally(function() {
          $scope.loading = false;
        });
    };
  }).

  controller('RegisterCtrl', function($scope, $http, $location, user) {
    $scope.email = '';
    $scope.alias = '';
    $scope.name = '';
    $scope.password = '';

    $scope.register = function() {
      $scope.loading = true;
      $scope.error = null;

      user.register($scope.email, $scope.alias, $scope.name, $scope.password).
        success(function(user) {
          $location.url('/');
        }).
        error(function(error) {
          $scope.error = error;
        }).
        finally(function() {
          $scope.loading = false;
        });
    }
  }).

  controller('MessagesCtrl', function($scope, $http, $location) {
    $scope.users = ['ich', 'du'];
  }).

  controller('GamesListCtrl', function($scope, $location, Game, socket) {

    $scope.games = [];

    var update = function() {
      Game.query(function(games) {
        $scope.games = games;
      });
    };

    $scope.remove = function(id) {
      Game.delete({id: id}, update);
    };

    $scope.accept = function(id) {
      socket.accept(id);
    };

    $scope.view = function(id) {
      $location.url('/games/' + id);
    };

    update();
  }).

  controller('GamesCreateCtrl', function($scope, $location, Game) {
    $scope.game = {size: 9};
    $scope.loading = false;

    $scope.create = function() {
      $scope.loading = true;

      var game = new Game($scope.game);
      game.$save(function(game) {
        $location.url('/games');
      }, function(err) {
        $scope.error = 'Failed ' + err;
      });
    };
  }).

  controller('GamesViewCtrl', function($scope, $http, $location, $routeParams, socket, Game) {
    var gameId = $routeParams.gameId;

    $scope.game = {};
    $scope.board = [];

    var board = [
      '      B  ',
      '  W      ',
      '      B  ',
      '  W      ',
      '      B  ',
      '  W      ',
      '      B  ',
      '  W      ',
      '  W      '
    ].join('');

    var updateBoard = function(data) {

    };

    $scope.$on('gameState', function(event, game) {
      $scope.$apply(function() {
        $scope.game = game;
      });
    });

    socket.join(gameId);

    /*

    var better = [];

    for (var i = 0; i < board.length; ++i) {
      if (i % 9 == 0) {
        better.push([]);
      }

      better[parseInt(i/9)].push({
        cell: board[i]
      });
    };

    $scope.board = better;

    console.log($scope.board);

    console.log('bla');
    */
  });
