'use strict';

angular.module('letsGo.directives', [])

  .directive('lgMessageBox', function($rootScope, $http, socketManager) {
    return {
      restrict: 'E',
      scope: {
        targetType: '@lgTargetType',
        targetId: '@lgTargetId'
      },
      templateUrl: '/static/partials/directives/message-box.jade',
      link: function(scope, element, attrs) {
        var messages = element.find('.comments');

        scope.$on('message', function(event, message) {
          if (message.target.type === attrs.lgTargetType &&  message.target.id === attrs.lgTargetId) {
            var html = '<div class="comment">' +
                         '<a class="avatar">' +
                           '<img src="http://robohash.org/' + message.user + '?set=set3&size=32x32">' +
                         '</a>' +
                         '<div class="content">' +
                           '<a href="#/user/123" class="author">' + message.user + '</a>' +
                           '<div class="text">' + message.text + '</div>' +
                         '</div>' +
                       '</div>';
            messages.append(html);
            messages.animate({scrollTop: messages.prop('scrollHeight')}, 500);
          }
        });

        element.find('input.text').keyup(function(e) {
          if (e.keyCode === 13) {
            var $this = $(this);
            var text = $this.val();
            if (text && text != '') {
              socketManager.message(attrs.lgTargetType, attrs.lgTargetId, text);
              $this.val('');
            }
          }
        });
      }
    };
  })

  .directive('lgValidatedForm', function() {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {
        button: '@lgButton',
        submit: '&lgSubmit'
      },
      templateUrl: '/static/partials/directives/validated-form.jade',
      controller: function($scope) {
        this.scope = $scope;
        $scope.action = function() {
          $scope.form.lgLoading = true;
          $scope.form.lgError = false;
          $scope.form.lgSuccess = false;
          // TODO: Flash success messages?

          _.each($scope.form, function(field) {
            delete field.lgError;
          });

          $scope.submit()
            .catch(function(error) {
              if (typeof error.data === 'string') {
                $scope.form.lgError = error.data;
              }

              if (typeof error.data === 'object') {
                var fields = false;
                _.each(error.data.errors || {}, function(error, field) {
                  if ($scope.form[field]) {
                    $scope.form[field].lgError = error.message;
                    fields = true;
                  }
                });
                if (typeof error.data.message === 'string' && !fields) {
                  $scope.form.lgError = error.data.message;
                }
              }
            })
            .finally(function() {
              $scope.form.lgLoading = false;
            });
        }
      }
    }
  })

  .directive('lgValidatedField', function() {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {
        field: '@lgField',
        label: '@lgLabel'
      },
      require: '^lgValidatedForm',
      templateUrl: '/static/partials/directives/validated-field.jade',
      link: function(scope, element, attrs, formController) {
        scope.form = formController.scope.form;
        element.find('.ui.dropdown').dropdown();
      }
    }
  })

  .directive('lgBoard', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        game: '=lgGame',
        click: '&lgClick'
      },
      template: '<canvas width="500" height="500"></canvas>',
      link: function(scope, element, attrs) {
        var ctx = element.get(0).getContext('2d');
        var width = element.width();
        var height = element.height();
        var total = Math.min(width, height);

        var cell = 0;
        var stone = 0;
        var offset = 0;
        var length = 0;

        element.click(function(event) {
          var position = element.position();
          var x = Math.floor((event.pageX - position.left) / cell);
          var y = Math.floor((event.pageY - position.top) / cell);
          if (x >= 0 && y >= 0 && x <= scope.game.size && y <= scope.game.size && attrs.lgClick) {
            scope.click({column: x, row: y});
          }
        });

        scope.$watch('game', function(game, oldGame) {
          ctx.clearRect(0, 0, width, height);

          cell = total / game.size;
          stone = cell * .8;
          offset = cell / 2;
          length = total - cell;

          // grid
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#666666';
          ctx.beginPath();
          for (var i = 0; i < game.size; ++i) {
            ctx.moveTo(offset + i*cell, offset);
            ctx.lineTo(offset + i*cell, offset + length);
            ctx.moveTo(offset, offset + i*cell);
            ctx.lineTo(offset + length, offset + i*cell);
          }
          ctx.stroke();

          var counting = game.state === 'counting';

          // stones
          for (var i = 0; game.board && i < game.board.length; ++i) {
            var color = game.board[i];
            var x = i % game.size;
            var y = Math.floor(i / game.size);
            if (color !== ' ') {

              var dead = counting && game.dead[i] === 'X';

              ctx.beginPath();
              ctx.arc(offset + x * cell, offset + y * cell, stone/2, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(50, 50, 50, ' + (dead ? .3 : 1) + ')';
              ctx.fillStyle = (color === 'W') ? 'rgba(255, 255, 255, ' + (dead ? .3 : 1) + ')' : ctx.strokeStyle;
              ctx.fill();
              ctx.stroke();
            }

            else if (counting && game.territory[i] !== ' ') {
              ctx.beginPath();
              ctx.arc(offset + x * cell, offset + y * cell, stone/4, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(50, 50, 50, .3)';
              ctx.fillStyle = (game.territory[i] === 'W') ? 'rgba(255, 255, 255, .3)' : 'rgba(0,0,0,.3)';
              ctx.fill();
              ctx.stroke();
            }
          }
        }, true);
      }
    }
  });
