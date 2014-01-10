'use strict';

angular.module('letsGo.controllers', [])

  // ==== Main Controller ====

  .controller('AppCtrl', function($scope, $route, $http, $location, userManager) {
    $scope.$route = $route;

    $scope.$on('$routeChangeStart', NProgress.start);
    $scope.$on('$routeChangeSuccess', NProgress.done);
    $scope.$on('$routeChangeError', NProgress.done);

    $scope.$on('$viewContentLoaded', function() {
      $('.ui.dropdown').dropdown();
    });

    $scope.user = null;
    $scope.online = 0;
    $scope.logout = userManager.logout;
    $scope.running_games = [];

    $scope.$watch(function() {
      return userManager.user;
    }, function(newUser) {
      $scope.user = newUser;
    });

    $scope.$on('online', function(event, online) {
      $scope.$apply(function() {
        $scope.online = online;
      });
    });

    $scope.$on('gameStarted', function(event, game) {
      $location.path('/games/' + game._id);
    });
  })

  // ==== User Controllers ====

  .controller('UserLoginCtrl', function($scope, $http, $location, userManager) {
    $scope.user = {};

    $scope.login = function() {
      return userManager.login($scope.user.email, $scope.user.password).then(function(user) {
        $location.path('/');
      });
    };
  })

  .controller('UserRegisterCtrl', function($scope, $location, userManager) {
    $scope.user = {};

    $scope.register = function() {
      return userManager.register($scope.user).then(function(user) {
        $location.path('/');
      });
    }
  })

  .controller('UserEditCtrl', function($scope, userManager) {
    $scope.user = angular.copy(userManager.user());

    $scope.edit = function() {
      return userManager.edit($scope.user).then(function(user) {
        $scope.user = angular.copy(user);
      });
    };
  })

  // ==== Message Controllers ====

  .controller('MessagesCtrl', function($scope, $window, User, Message) {
    $scope.users = [];
    $scope.messages = [];

    User.query(function(users) {
      $scope.users = users;
    });

    var update = function() {
      Message.query(function(messages) {
        $scope.messages = messages;
      });
    };

    update();

    $scope.sendMessage = function() {
      Message.save({
        senderID: $scope.user._id,
        senderAlias: $scope.user.alias,
        acceptorID: $scope.name,
        subject: $scope.subject,
        content: $scope.content
      }, update);
    };

    $scope.removeMessage = function(id) {
      Message.remove({id: id}, update);
    };
  })

  // ==== Game Controllers ====

  .controller('GamesListCtrl', function($scope, $location, $timeout, Game, socketManager) {
    $scope.open = [];
    $scope.running = [];

    $scope.remove = function(id) {
      Game.delete({id: id}, update);
    };

    $scope.accept = socketManager.accept;

    $scope.view = function(id) {
      $location.path('/games/' + id);
    };

    $scope.$on('gameList', function(event) {
      update();
    });

    var update = function() {
      Game.query(function(games) {
        var states = _.groupBy(games, 'state');
        $scope.open = states.waiting || [];
        $scope.running = (states.live || []).concat(states.counting || []);
      });
    };

    update();
  })

  .controller('GamesCreateCtrl', function($scope, $location, Game) {
    $scope.game = {
      size: 9,
      color: 'random',
      komi: 6.5,
      private: false
    };

    $scope.create = function() {
      return Game.$save($scope.game, function(game) {
        $location.path('/games');
      }).$promise;
    };
  })

  .controller('GamesViewCtrl', function($scope, $http, $location, $routeParams, socketManager) {
    var gameId = $routeParams.gameId;

    var move = function(type, column, row) {
      if ($scope.game.state === 'live' &&
          $scope.game.turn === $scope.user._id) {
        socketManager.move($scope.game._id, type, column, row);
      }
    }

    $scope.game = {};
    $scope.board = [];

    $scope.cell = function(column, row) {
      var index = $scope.game.config.size *row + column;

      if ($scope.game.state === 'live' && $scope.game.board[index] === ' ') {
        move('play', column, row);
      }

      if ($scope.game.state === 'counting' && $scope.game.board[index] !== ' ') {
        socketManager.dead($scope.game._id, column, row);
      }
    };

    $scope.pass = function() {
      move('pass');
    };

    $scope.surrender = function() {
      move('surrender');
    };

    $scope.resume = function() {
      if ($scope.game.state === 'counting') {
        socketManager.resume($scope.game._id);
      }
    };

    $scope.done = function() {
      if ($scope.game.state === 'counting') {
        socketManager.done($scope.game._id);
      }
    };

    $scope.$on('gameState', function(event, game) {
      $scope.$apply(function() {
        $scope.game = game;

        $scope.board = [];
        for (var i = 0; i < game.board.length; ++i) {
          if (i % game.config.size == 0) {
            $scope.board.push([]);
          }

          var cell = {
            cell: game.board[i]
          };

          if (game.state === 'counting') {
            cell.dead = game.dead[i] === 'X';
            cell.countWhite = game.territory[i] === 'W';
            cell.countBlack = game.territory[i] === 'B';
          }

          $scope.board[parseInt(i/game.config.size)].push(cell);
        }
      });
    });

    socketManager.join(gameId);
  });
