'use strict';

angular.module('letsGo.services', [])

  // ==== Managers ====

  .service('userManager', function($q, $location, socketManager, User) {
    var setUser = function(aUser) {
      if (!service.user && aUser) {
        socketManager.connect();
      }
      if (!aUser && service.user) {
        socketManager.disconnect();
      }
      service.user = aUser;
      return aUser;
    };

    var service = {
      user: null,
      check: function(redirect) {
        var deferred = $q.defer();

        User.me(function(user) {
          if (!user || user._id === undefined) {
            deferred.reject();
            if (redirect === undefined || !!redirect) {
              $location.path('/user/login');
            }
            setUser(null);
          } else {
            setUser(user);
            deferred.resolve();
          }
        });

        return deferred.promise;
      },
      login: function(email, password) {
        return User.login({
          email: email,
          password: password
        }).$promise.then(setUser);
      },
      logout: function() {
        return User.logout().$promise.then(function() {
          setUser(null);
        });
      },
      register: function(user) {
        return User.save(user).$promise.then(setUser);
      },
      edit: function(user) {
        return User.save(user).$promise.then(setUser);
      }
    };

    return service;
  })

  .service('socketManager', function($rootScope) {
    var socket = null;
    var connected = false;

    var statusHandler = function(data) {
      $rootScope.$broadcast('online', data.online);
    };

    var rtcHandler = function(data) {
      $rootScope.$broadcast('rtc', data);
    };

    var createHandler = function(name) {
      return function(data) {
        $rootScope.$broadcast(name, data);
      }
    };

    var acceptAction = function(gameId) {
      if (connected) {
        socket.emit('accept', {gameId: gameId});
      }
    };

    var joinAction = function(gameId) {
      if (connected) {
        socket.emit('join', {gameId: gameId});
      }
    };

    var messageAction = function(type, target, text) {
      if (connected) {
        socket.emit('message', {
          target: {type: type, id: target},
          text: text
        });
      }
    };

    var moveAction = function(gameId, type, column, row) {
      if (connected) {
        var data = {
          gameId: gameId,
          type: type
        };

        if (type === 'play') {
          data.column = column;
          data.row = row;
        }

        socket.emit('move', data);
      }
    };

    var resumeAction = function(gameId) {
      if (connected) {
        socket.emit('resume', {gameId: gameId});
      }
    };

    var communicateAction = function(gameId, value) {
      if (connected) {
        socket.emit('communicate', {gameId: gameId, communicate: value});
      }
    };

    var deadAction = function(gameId, column, row) {
      if (connected) {
        socket.emit('dead', {
          gameId: gameId,
          column: column,
          row: row
        });
      }
    };

    var doneAction = function(gameId) {
      if (connected) {
        socket.emit('done', {gameId: gameId});
      }
    };

    var rtcAction = function(type, target, message) {
      if (connected) {
        socket.emit('rtc', {
          type: type,
          target: target,
          message: message
        });
      }
    };

    return {
      connect: function() {
        if (!socket) {
          socket = io.connect('/');
          socket.on('status', statusHandler);
          socket.on('game', createHandler('gameState'));
          socket.on('message', createHandler('message'));
          socket.on('list', createHandler('gameList'));
          socket.on('rtc', rtcHandler);
        } else if (!connected) {
          // due to https://github.com/LearnBoost/socket.io-client/issues/251
          socket.socket.reconnect();
        } else {
          return false;
        }
        return (connected = true);
      },
      disconnect: function() {
        if (!connected) {
          return false;
        }
        socket.disconnect();
        return !(connected = false);
      },
      accept: acceptAction,
      join: joinAction,
      message: messageAction,
      move: moveAction,
      resume: resumeAction,
      dead: deadAction,
      done: doneAction,
      communicate: communicateAction,
      rtc: rtcAction
    };
  })

  .service('rtcManager', function($rootScope, socketManager) {
    // code
    var constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 320,
          maxWidth: 720,
          minHeight: 180,
          maxHeight: 480,
          minFrameRate: 30
        },
        optional: []
      }
    };
    var rtcPeerConfiguration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};

    return {
      start: function(opponent, elements, initiate) {
        var video_callee = document.getElementById(elements.callee);
        var video_caller = document.getElementById(elements.caller);

        var pcLocal, localstream;

        var logFailure = function(error) {
          console.log('Something failed: ', error);
        };

        var localDescCreated = function(desc) {
          pcLocal.setLocalDescription(desc, function() {
            socketManager.rtc('sdp', opponent, JSON.stringify(pcLocal.localDescription));
          }, logFailure);
        };

        var closeStreamAndPeerConn = function() {
          pcLocal && pcLocal.close();
          pcLocal = null;
          localstream && localstream.stop();
          localstream = null;
          video_callee.src = video_caller.src = '';
        };

        $rootScope.$on('rtc', function(event, rtc) {
          console.log('RTC message received:', rtc);

          if (rtc.type === 'candidate') {
            pcLocal.addIceCandidate(new webrtcsupport.IceCandidate(JSON.parse(rtc.message)));
          } else if (rtc.type === 'sdp') {
            pcLocal || connectChat();
            pcLocal.setRemoteDescription(new webrtcsupport.SessionDescription(JSON.parse(rtc.message)), function() {
              // if we received an offer, we need to answer
              if (pcLocal.remoteDescription.type === 'offer'){
                pcLocal.createAnswer(localDescCreated, logFailure);
              }
            }, logFailure);
          } else if (rtc.type === 'callend') {
            closeStreamAndPeerConn();
          } else {
            console.log('Unknown RTC message');
          }
        });

        var connectChat = function() {
          pcLocal = new webrtcsupport.PeerConnection(rtcPeerConfiguration, {"optional": [{"DtlsSrtpKeyAgreement": true}]});
          pcLocal.oniceconnectionstatechange = function(e) {
            if (e.currentTarget.iceConnectionState === 'disconnected') {
              console.log('Remote peer connection disconnected');
            }
          };
          pcLocal.onicecandidate = function(e) {
            if (e.candidate){
              socketManager.rtc('candidate', opponent, JSON.stringify(e.candidate));
            }
          };
          pcLocal.onnegotiationneeded = function() {
            pcLocal.createOffer(localDescCreated, logFailure);
          };
          pcLocal.onaddstream = function (evt) {
            //reattachMediaStream(video_caller, localstream);
            attachMediaStream(evt.stream, video_callee);
          };

          getUserMedia({video: true, audio: true}, function(err, stream) {
            if (err || !stream) {
              return console.log('failed to get local stream: ', err);
            }
            localstream = stream;
            attachMediaStream(localstream, video_caller, {muted: true});
            pcLocal.addStream(localstream);
          });
        };

        var closeChat = function() {
          socketManager.rtc('callend', opponent, '');
          closeStreamAndPeerConn();
        };

        if (initiate) {
          connectChat();
        }
      }
    };
  })

  // ==== REST Resources ====

  .service('User', function($resource) {
    return $resource('/user/:id', {id: '@_id'}, {
      me: {method: 'GET', url: '/user/me'},
      login: {method: 'POST', url: '/user/login'},
      logout: {method: 'POST', url: '/user/logout'}
    });
  })

  .service('Game', function($resource) {
    return $resource('/games/:id', {id: '@_id'});
  })

  .service('Message', function($resource) {
    return $resource('/messages/:id', {id: '@_id'});
  });
