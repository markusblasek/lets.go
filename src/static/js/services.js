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

    return {
      connect: function() {
        if (!socket) {
          socket = io.connect('/');
          socket.on('status', statusHandler);
          socket.on('game', createHandler('gameState'));
          socket.on('message', createHandler('message'));
          socket.on('list', createHandler('gameList'));
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

      //temporary solution
      emit: function(event, data){
        if (socket) {
            socket.emit(event, data);
        }
      },
      on: function(event, handler){
        if(socket){
            socket.on(event, handler);
        }
      }
    };
  })

  .service('rtcManager', function(socketManager) {

    // code

    return {
      start: function(opponentId, elements, initiate) {
          var idcaller = '';
          var idcallee = opponentId;
          var videochat_candidate = {'type': 'candidate', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
          var videochat_sdp = {'type': 'sdp', 'message': '', 'idcaller': idcaller, 'idcallee': idcallee};
          var videochat_callend = {'type': 'callend', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};

          //enter ids of the video tags
          var id_video_caller = elements.caller;
          var id_video_callee = elements.callee;

          var video_callee = document.getElementById(id_video_callee);
          var video_caller = document.getElementById(id_video_caller);

          var pcLocal, localstream;
          //Enter the configuration like stun-servers and ice-servers
          var rtcPeerConfiguration = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };

          //Enter the session constrains of the offer
          var sdpConstraints = {'mandatory': {
              'OfferToReceiveAudio':true,
              'OfferToReceiveVideo':true
          }};
          var constraints = {
              "audio": true,
              "video": {
                  "mandatory": {
                      "minWidth": "320",
                      "maxWidth": "720",
                      "minHeight": "180",
                      "maxHeight": "480",
                      "minFrameRate": "30"
                  },
                  "optional": []
              }
          };
          // Some helper functions....
          function gotStream(stream){
              trace("Received local stream");

              localstream = stream;
              //Attach a stream to a video tag
              attachMediaStream(video_caller, localstream);

              var videoTracks = localstream.getVideoTracks();
              var audioTracks = localstream.getAudioTracks();
              if (videoTracks.length > 0)
                  trace('Using Video device: ' + videoTracks[0].label);
              if (audioTracks.length > 0)
                  trace('Using Audio device: ' + audioTracks[0].label);

              pcLocal.addStream(localstream);
          }
          function onfailure(error){
              trace(error);
          }
          function localDescCreated(desc) {
              pcLocal.setLocalDescription(desc, function () {
                  videochat_sdp.message = JSON.stringify(pcLocal.localDescription);
                  socketManager.emit('videochat', videochat_sdp);
              }, onfailure);
          }
          function closeStreamAndPeerConn(){
              //Close the peerconnection and close the localstream
              if(pcLocal)
                  pcLocal.close();
              pcLocal = null;
              if(localstream)
                  localstream.stop();
              localstream = null;
              //Reset the video-tags.
              video_callee.src = '';
              video_caller.src = '';
          }
          // Listening on video chat events
          socketManager.on('videochat',
              function (data) {
                  trace("received videochat of type '" + data.type + "'");
                  //trace(data);
                  if(typeof data.type === 'string' && (data.type === 'candidate' || data.type === 'sdp' || data.type === 'callend')){
                      if(data.type === 'candidate'){
                          console.log(data.message);
                          pcLocal.addIceCandidate(new RTCIceCandidate(JSON.parse(data.message)));
                      }else if(data.type === 'sdp'){
                          if(!pcLocal){
                              connectChat();
                          }
                          pcLocal.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.message)), function () {
                              // if we received an offer, we need to answer
                              if (pcLocal.remoteDescription.type == 'offer'){
                                  pcLocal.createAnswer(localDescCreated, onfailure);
                              }
                          }, onfailure);
                      }else if(data.type === 'callend'){
                          trace("Callee stopped video chat.");
                          closeStreamAndPeerConn();
                      }else{
                          trace("ERROR: received video chat of not implemented type '" + data.type + "'");
                      }
                  }else{
                      trace("ERROR: received video chat of UNKNOWN type '" + data.type + "'");
                  }
              });

          //Try to connect to videochat
          function connectChat(){
              pcLocal = new RTCPeerConnection(rtcPeerConfiguration, {"optional": [{"DtlsSrtpKeyAgreement": true}]});
              pcLocal.oniceconnectionstatechange =
                  function(evt){
                      if(evt.currentTarget.iceConnectionState === 'disconnected'){
                          trace("remote peerconnection disconnected");
                          closeStreamAndPeerConn();
                      }
                  };
              pcLocal.onicecandidate = function (evt) {
                  if (evt.candidate){
                      videochat_candidate.message = JSON.stringify(evt.candidate);
                      socketManager.emit('videochat', videochat_candidate);
                  }
              };

              pcLocal.onnegotiationneeded = function () {
                  pcLocal.createOffer(localDescCreated, onfailure);
              }

              pcLocal.onaddstream = function (evt) {
                  //reattachMediaStream(video_caller, localstream);
                  attachMediaStream(video_callee, evt.stream);
              };

              getUserMedia(constraints,
                  gotStream, onfailure);
          };
          function closeChat(){
              trace("Ending call");
              socket.emit('videochat', videochat_callend);
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
