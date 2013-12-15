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
    $scope.messages = [];

    $scope.send = function(text) {
      text = $('#text').val();
      if (text && text != '') {
        console.log('send ', text);
        socket.message('game', gameId, text);
      }
    };

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

    $scope.$on('message', function(event, message) {
      if (message.target.type === 'game' && message.target.id === gameId) {
        $scope.$apply(function() {
          $scope.messages.push(message);
        });
      }
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

    var idcaller = getUrlVars()["idcaller"];
    var idcallee = getUrlVars()["idcallee"];
    var videochat_candidate = {'type': 'candidate', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
    var videochat_sdp = {'type': 'sdp', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
    var videochat_callend = {'type': 'callend', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
    var id_video_caller = 'video_caller';
    var id_video_callee = 'video_callee';
    var video_callee, video_caller;
    video_callee = document.getElementById(id_video_callee);
    video_caller = document.getElementById(id_video_caller);
    var pcLocal, localstream;
    //Enter the configuration like stun-servers and ice-servers
    var rtcPeerConfiguration = null;//{ "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };

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
                "maxWidth": "1080",
                "minHeight": "180",
                "maxHeight": "720",
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
            socket.emit('videochat', videochat_sdp);
        }, onfailure);
    }
    function closeStreamAndPeerConn(){
        //Close the peerconnection and close the localstream
        pcLocal.close();
        pcLocal = null;
        localstream.stop();
        localstream = null;
        //Reset the video-tags.
        video_callee.src = '';
        video_caller.src = '';
    }
    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
            });
        return vars;
    }
        // Listening on video chat events
        socket.on('videochat',
            function (data) {
                trace("received videochat of type '" + data.type + "'");
                //trace(data);
                if(typeof data.type === 'string' && (data.type === 'candidate' || data.type === 'sdp' || data.type === 'callend')){
                    if(data.type === 'candidate'){
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
                        }, onfailure)
                    }else if(data.type === 'callend'){
                        trace("Callee stopped video chat.");
                        closeStreamAndPeerConn();
                    }else{
                        trace("ERROR: received videochat of not implemented type '" + data.type + "'");
                    }
                }else{
                    trace("ERROR: received videochat of UNKNOWN type '" + data.type + "'");
                }
            });
        function connectChat(){
            pcLocal = new RTCPeerConnection(rtcPeerConfiguration);
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
                    socket.emit('videochat', videochat_candidate);
                }
            };

            pcLocal.onnegotiationneeded = function () {
                pcLocal.createOffer(localDescCreated, onfailure);
            }

            pcLocal.onaddstream = function (evt) {
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
        $scope.videoChatConnectChat = function (){
            if(typeof idcaller !== 'undefined' && idcaller !== null && typeof idcallee !== 'undefined' && idcallee !== null){
                connectChat();
            }else{
                alert("The ID's of both paricipants must be encoded in the URL as GET parameters (for test purposes). Both user must exist and must be logged in. E.g.: http://<IPSERVER>:3000/#/game?idcallee=52adc8ebb71fec9c1f000003&idcaller=52a8dda096f1071021000001");
            }
        };
        $scope.videoChatCloseChat = function(){
            closeChat();

        };
  });
