'use strict';

angular.module('letsGo.controllers', [])

  // ==== Main Controller ====

  .controller('AppCtrl', function($scope, $route, $location, userManager) {
    $scope.$route = $route;

    $scope.$on('$routeChangeStart', NProgress.start);
    $scope.$on('$routeChangeSuccess', NProgress.done);
    $scope.$on('$routeChangeError', NProgress.done);

    $scope.$on('$viewContentLoaded', function() {
      $('.ui.dropdown').dropdown();
    });

    userManager.check(false);

    $scope.user = null;
    $scope.online = 0;
    $scope.logout = userManager.logout;

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
  })

  .controller('IndexCtrl', function($scope, $location, userManager) {
    $scope.newUser = {};

    $scope.register = function() {
      return userManager.register($scope.newUser).then(function(user) {
        $location.path('/');
      });
    };
  })

  // ==== User Controllers ====

  .controller('UserLoginCtrl', function($scope, $location, userManager) {
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
    };
  })

  .controller('UserEditCtrl', function($scope, userManager) {
    $scope.user = angular.copy(userManager.user);

    $scope.edit = function() {
      return userManager.edit($scope.user).then(function(user) {
        $scope.user = angular.copy(user);
      });
    };
  })

  .controller('UserViewCtrl', function($scope, $routeParams, $location, User, Game) {
    $scope.user = {};
    $scope.games = [];
    $scope.gamesWon = 0;
    $scope.gamesLost = 0;
    $scope.gamesDraw = 0;
    $scope.gamesPlayed = 0;

    User.get({id: $routeParams.userId}, function(user) {
      $scope.user = user;
    }, function() {
      $location.path('/');
    });

    Game.query({player: $routeParams.userId}, function(games) {
      $scope.games = games;
      $scope.gamesPlayed = games.length;
      _.each(games, function(game) {
        if(game.winner == $routeParams.userId) {
          $scope.gamesWon += 1;
          game.result = 'Won +' + Math.abs(game.score.challenger - game.score.challengee);
          game.won = true;
        } else if (!game.winner) {
          $scope.gamesDraw += 1;
          game.result = 'Draw';
          game.draw = true;
        } else {
          $scope.gamesLost += 1;
          game.result = 'Lost -' + Math.abs(game.score.challenger - game.score.challengee);
          game.lost = true;
        }
      });
    });
  })

  // ==== Message Controllers ====

    .controller('MessagesCtrl', function($scope, $window, User, Message) {
        $scope.users = [];
        $scope.messages = [];
        $scope.model = {
            curName: '',
            curID: '',
            subject: '',
            content: '',
            switchMess: 1
        };

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
                acceptorID: $scope.model.curID,
                acceptorAlias: $scope.model.curName,
                subject: $scope.model.subject,
                content: $scope.model.content
            }, update);
            $scope.model = {
                curName: '',
                curID: '',
                subject: '',
                content: '',
                switchMess: 2
            };
        };

        $scope.removeMessage = function(id) {
            Message.remove({id: id}, update);
        };
    })

  // ==== Game Controllers ====

  .controller('GamesListCtrl', function($scope, $location, $timeout, Game, socketManager) {
    $scope.my = [];
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
        var notOver = (states.live || []).concat(states.counting || []);
        $scope.my = _.filter(notOver, function(game) {
          return game.challenger._id === $scope.user._id ||
                 game.challengee._id === $scope.user._id;
        });
        $scope.open = states.waiting || [];
        $scope.running = _.filter(notOver, function(game) {
          return game.challenger._id !== $scope.user._id &&
                 game.challengee._id !== $scope.user._id;
        });
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
      return Game.save($scope.game, function(game) {
        $location.path('/games');
      }).$promise;
    };
  })

  .controller('GamesViewCtrl', function($scope, $http, $location, $routeParams, socketManager, rtcManager) {
    var gameId = $routeParams.gameId;

    var move = function(type, column, row) {
      if ($scope.game.state === 'live' &&
          $scope.game.turn === $scope.user._id) {
        socketManager.move($scope.game._id, type, column, row);
      }
    };

    $scope.game = {};

    $scope.click = function(column, row) {
      var index = $scope.game.size *row + column;

      if ($scope.game.state === 'live' && $scope.game.board[index] === ' ') {
        move('play', column, row);
      }

      if ($scope.game.state === 'counting' && $scope.game.board[index] !== ' ') {
        socketManager.dead($scope.game._id, column, row);
      }
    };

    var rtcStarted = false;

    //rtcManager.start(game.challenger._id);

    $scope.communicate = function(value) {
      socketManager.communicate($scope.game._id, value);
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
      game.over = game.state === "over";
      game.player = $scope.user._id === game.challenger._id || $scope.user._id === game.challengee._id;
      game.draw = game.over && !game.winner;
      game.win = game.over && game.winner === $scope.user._id;
      game.loose = game.over && game.winner && game.winner !== $scope.user._id && game.player;
      game.challenger.alias = game.challenger._id === $scope.user._id ? 'You' : game.challenger.alias;
      game.challenger.winner = game.over && game.winner && game.winner === game.challenger._id;
      game.challenger.loser = game.over && game.winner && game.winner !== game.challenger._id;
      game.challengee.alias = game.challengee._id === $scope.user._id ? 'You' : game.challengee.alias;
      game.challengee.winner = game.over && game.winner && game.winner === game.challengee._id;
      game.challengee.loser = game.over && game.winner && game.winner !== game.challengee._id;

      if (game.player && !rtcStarted && game.communicate.challenger && game.communicate.challengee) {
        rtcStarted = true;
        var opponent = $scope.user._id === game.challenger._id ? game.challengee._id : game.challenger._id;
        var elements = {caller: game._id + '-' + $scope.user._id, callee: game._id + '-' + opponent};
        setTimeout(function() {
          console.log('start rtc to ', opponent, ' elements ', elements);
          rtcManager.start(opponent, elements, $scope.user._id === game.challenger._id);
        }, 500);
      }

      $scope.$apply(function() {
        $scope.game = game;
      });
    });

    $scope.$on('$destroy', function() {
      console.log('lets go !');
      socketManager.leave(gameId);
    });

    socketManager.join(gameId);
  });
