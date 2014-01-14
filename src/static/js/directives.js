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
  })

  .directive('lgRtc', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        active: '=lgActive',
        target: '=lgTarget',
        initiator: '=lgInitiator'
      },
      templateUrl: '/static/partials/directives/rtc.jade',
      link: function(scope, element, attrs) {
        var remote = element.find('.remote');
        var local = element.find('.local');

        // resize event
        var resize = function() {
          var width = element.width();
          var remoteRatio = remote.prop('videoWidth') / remote.prop('videoHeight');
          if (isNaN(remoteRatio)) {
            remoteRatio = 1.33;
          }
          remote.width(width).height(width / remoteRatio);

          var localRatio = local.prop('videoWidth') / local.prop('videoHeight');
          if (isNaN(localRatio)) {
            localRatio = 1.33;
          }
          local.width(width *.33).height((width *.33) / localRatio);
        };

        remote.on('canplay canplaythrough', resize);
        local.on('canplay canplaythrough', resize);
        remote.on('playing', remote.show.bind(remote));
        local.on('playing', local.show.bind(local));
        remote.on('ended abort', remote.hide.bind(remote));
        local.on('ended abort', local.hide.bind(local));
      },
      controller: function($scope, $sce, socketManager) {
        var localMediaConstraints = {
          video: true,
          audio: true,
          /*
          optional: [{
            maxWidth: 640,
            maxHeight: 480,
            maxFps: 30,
            minWidth: 320,
            minHeight: 240,
            minFps: 25
          }]
          */
        };

        var sdpConstraints = {
          mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
          }
        };

        $scope.user = $scope.$parent.user;

        // globals describing the runtime
        var localStream = null;
        var peerConnection = null;
        var started = false;

        var logFailure = function(name) {
          return function(error) {
            console.log(name + ' failed: ', error);
          };
        };

        var getLocalMedia = function(cb) {
          if (localStream) console.error('localStream shouldnt be set')
          getUserMedia(localMediaConstraints, function(stream) {
            console.log('RTC: Add local stream', stream);
            localStream = stream;

            var v = stream.getVideoTracks();
            var a = v[0];
            console.log('video ', v, a);

            peerConnection.addStream(stream);
            $scope.$apply(function() {
              var url = URL.createObjectURL(stream);
              $scope.local = $sce.trustAsResourceUrl(url);
            });
            cb(stream);
          }, logFailure('navigator.getUserMedia'));

        };

        var createPeerConnection = function() {
          if (peerConnection) console.error('peerConnection shouldnt be set');
          peerConnection = new RTCPeerConnection({iceServers: [{url: 'stun:stun.l.google.com:19302'}]});
          peerConnection.onicecandidate = function(e) {
            if (e.candidate) {
              socketManager.rtc('candidate', $scope.target, JSON.stringify(e.candidate));
            }
          };
          peerConnection.onaddstream = function(e) {
            console.log('RTC: Add remote stream')
            $scope.$apply(function() {
              var url = URL.createObjectURL(e.stream);
              $scope.remote = $sce.trustAsResourceUrl(url);
            });
          };
        };

        var sendSdp = function(type) {
          return function(sdp) {
            var localSdp = new RTCSessionDescription(sdp);
            peerConnection.setLocalDescription(localSdp, function() {
              socketManager.rtc(type, $scope.target, JSON.stringify(sdp))
              console.log('RTC: Send ' + type);
            }, logFailure('RTCPeerConnection.setLocalDescription'));
          };
        };

        // only one has to call this function to start the peering
        var start = function(type) {
          if (!started) {
            console.log('RTC: Initiate call with ' + (type || 'offer'));
            started = true;

            createPeerConnection();
            getLocalMedia(function() {
              peerConnection.createOffer(sendSdp(type || 'offer'),
                logFailure('RTCPeerConnection.createOffer'), sdpConstraints);
            });
          }
        };

        // stop and remove everything
        var stop = function() {
          if (started) {
            console.log('RTC: End call');

            $scope.local = $scope.remote = null;

            if (peerConnection) {
              localStream = null;
              peerConnection.close();
              peerConnection = null;
            }

            started = false;
          }
        };

        $scope.$on('rtc', function(event, rtc) {
          if (rtc.sender === $scope.target) {
            if (!peerConnection) {
              createPeerConnection();
              started = true;
              console.log('RTC: Started as callee');
            }

            if (rtc.type === 'candidate') {
              peerConnection.addIceCandidate(
                new RTCIceCandidate(JSON.parse(rtc.message)));
            } else if (rtc.type === 'offer' || rtc.type === 'answer') {
              console.log('RTC: Received ' + rtc.type);
              peerConnection.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(rtc.message)));
            }

            if (rtc.type === 'offer') {
              getLocalMedia(function() {
                peerConnection.createAnswer(sendSdp('answer'),
                  logFailure('RTCPeerConnection.createAnswer'), sdpConstraints);
              });
            }
          }
        });

        $scope.$watch(function() {
          if ($scope.initiator !== undefined && $scope.active !== undefined && $scope.target !== undefined) {
            if ($scope.initiator === true && $scope.active === true) {
              start();
            }
            if (!$scope.active) {
              stop();
            }
          }
        });

        $scope.$on('$destroy', stop);
      }
    }
  });
