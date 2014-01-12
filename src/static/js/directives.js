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
      controller: function($scope) {
        $scope.messages = [];
        $scope.$on('message', function(event, message) {
          if (message.target.type === $scope.targetType &&
              message.target.id === $scope.targetId) {
            message.date = new Date();
            $scope.$apply(function() {
              $scope.messages.push(message);
            });
          }
        });
      },
      link: function(scope, element, attrs) {
        var chat = element.find('.chat');
        scope.done = function(last) {
          if (last) {
            chat.animate({scrollTop: chat.prop('scrollHeight')}, 500);
          }
        };
        element.find('input.message').keyup(function(e) {
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
      template: '<canvas class="board"></canvas>',
      link: function(scope, element, attrs) {
        var canvas = element.get(0);
        var ctx = canvas.getContext('2d');

        var cell = 0, offsetX = 0, offsetY = 0, length = 0, highlight = -1;

        var draw = function(game) {
          if (!game || !game.board) return;

          var w = Math.min(element.parent().width() / game.size, 50) * game.size;
          canvas.height = canvas.width = Math.floor(w);
          length = Math.min(canvas.width, canvas.height);
          cell = length / game.size;
          offsetX = (canvas.width - length + cell) / 2;
          offsetY = (canvas.height - length + cell) / 2;
          length -= cell;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // markers
          var markers = {
            9: [2, 4, 6],
            13: [3, 6, 9],
            19: [3, 9, 15]
          };

          // grid
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#4a362d';
          ctx.fillStyle = '#4a362d';
          for (var i = 0; i < game.size; ++i) {
            var x = Math.round(offsetX + i*cell) - .5;
            var y = Math.round(offsetY + i*cell) - .5;
            ctx.beginPath();
            ctx.moveTo(x, Math.round(offsetY) - .5);
            ctx.lineTo(x, Math.round(offsetY + length) - .5);
            ctx.moveTo(Math.round(offsetX) - .5, y);
            ctx.lineTo(Math.round(offsetX + length) - .5, y);
            ctx.stroke();

            var ms = markers[game.size] || [];
            ctx.beginPath();
            for (var j = 0; ms.indexOf(i) >= 0 && j < ms.length; ++j) {
              ctx.arc(x, Math.round(offsetY + ms[j]*cell), cell/13, 0, 2*Math.PI);
            }
            ctx.fill();
          }

          var counting = game.state === 'counting' || game.state === 'over';

          // stones
          ctx.lineWidth = 1;
          for (var i = 0; i < game.board.length; ++i) {
            var image = null;
            var s = cell;

            ctx.save();
            if (game.board[i] !== ' ') {
              ctx.globalAlpha = (counting && game.dead[i] === 'X') ? .5 : 1.;
              image = (game.board[i] === 'W') ? white : black;
            } else if (game.state === 'live' && highlight === i && game.turn === scope.$parent.user._id) {
              image = (game.black === scope.$parent.user._id) ? black : white;
              ctx.globalAlpha = .5;
            }
            if (image) {
              ctx.drawImage(image, Math.round(offsetX + (i % game.size)*cell - s/2),
                Math.round(offsetY + Math.floor(i / game.size)*cell - s/2), s, s);
            }

            if (game.last === i && !counting) {
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#d15d5d';
              ctx.beginPath();
              ctx.arc(Math.round(offsetX + (i % game.size)*cell),
                Math.round(offsetY + Math.floor(i / game.size)*cell), cell/5, 0, 2*Math.PI);
              ctx.stroke();
            }
            ctx.globalAlpha = 1.;

            if (counting && game.territory[i] !== ' ') {
              image = game.territory[i] === 'W' ? white : black;
              ctx.globalAlpha = .5;
              s /= 2;
            } else {
              continue;
            }

            ctx.drawImage(image, Math.round(offsetX + (i % game.size)*cell - s/2),
                          Math.round(offsetY + Math.floor(i / game.size)*cell - s/2), s, s);
            ctx.restore();
          }
        };

        // load image resources
        var black= new Image(), white = new Image();
        black.onload = white.onload = function() { draw(scope.game); };
        black.src = '/static/img/black.png';
        white.src = '/static/img/white.png';

        // calculate mouse position
        var coords = function(event) {
          var position = element.position();
          var x = Math.floor((event.pageX - position.left) / cell);
          var y = Math.floor((event.pageY - position.top) / cell);
          if (x >= 0 && y >= 0 && x <= scope.game.size && y <= scope.game.size) {
            return {x: x, y: y};
          }
        };

        element
          .mouseout(function(event) {
            highlight = -1;
            draw(scope.game);
          })
          .mousemove(function(event) {
            var position = coords(event);
            if (scope.game.state === 'live' && position && attrs.lgClick) {
              var newHighlight = position.y * scope.game.size + position.x;
              if (highlight != newHighlight) {
                highlight = newHighlight;
                draw(scope.game);
              }
            }
          })
          .mousedown(function(event) {
            event.preventDefault();
          })
          .click(function(event) {
            event.preventDefault();
            var position = coords(event);
            if (position) {
              scope.click({column: position.x, row: position.y});
            }
          });

        scope.$watch('game', draw);

        var resize = function() {
          var w = Math.min(element.parent().width() / scope.game.size, 50) * scope.game.size;
          canvas.height = canvas.width = Math.floor(w);
          draw(scope.game);
        };
        window.addEventListener('resize', resize, false);
        resize();
      }
    }
  });
