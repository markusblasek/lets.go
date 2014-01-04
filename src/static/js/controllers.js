'use strict';

angular.module('letsGo.controllers', ['letsGo.directives']).
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

  controller('UserDetailCtrl', function($scope, $window, UserDetail, ChangeUserDetail) {
        //controller('UserDetailCtrl', function($scope, UserDetail, ChangeUserDetail) {
        UserDetail.query(function(userDet) {
            $scope.userDetails = userDet;
            $scope.name= '';
            $scope.alias='';
            //$scope.email='';
        });

        $scope.changeUserDetail = function(){
            //TODO ggf. Ändern des AnzeigeNamens oben in der Menüleiste...f5 hilft bis dahin
            //ChangeUserDetail.changeUserDetail($scope.email, $scope.alias, $scope.name);
            ChangeUserDetail.changeUserDetail($scope.alias, $scope.name);
            $window.location = "#/userDetail/.";
        }
  }).

  controller('MessagesCtrl', function($scope, $http, $location) {
    $scope.users = ['ich', 'du'];
  }).

  controller('GamesListCtrl', function($scope, $location, $timeout, Game, socket) {

    $scope.open = [];
    $scope.running = [];

    (function tick() {
      Game.query(function(games) {
        var states = _.groupBy(games, 'state');
        $scope.open = states.waiting || [];
        $scope.running = (states.live || []).concat(states.counting || []);

        $timeout(tick, 10 * 1000);
      });
    })();

    $scope.remove = function(id) {
      Game.delete({id: id}, update);
    };

    $scope.accept = function(id) {
      socket.accept(id);
    };

    $scope.view = function(id) {
      $location.url('/games/' + id);
    };
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

    var move = function(type, column, row) {
      if ($scope.game.state === 'live' &&
          $scope.game.turn === $scope.user._id) {
        socket.move($scope.game._id, type, column, row);
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
        socket.dead($scope.game._id, column, row);
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
        socket.resume($scope.game._id);
      }
    };

    $scope.done = function() {
      if ($scope.game.state === 'counting') {
        socket.done($scope.game._id);
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

        console.log('new board', $scope.board);
      });
    });

    socket.join(gameId);

    var idcaller = getUrlVars()["idcaller"];
    var idcallee = getUrlVars()["idcallee"];
    var videochat_candidate = {'type': 'candidate', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
    var videochat_sdp = {'type': 'sdp', 'message': '', 'idcaller': idcaller, 'idcallee': idcallee};
    var videochat_callend = {'type': 'callend', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
    var id_video_caller = 'video_caller';
    var id_video_callee = 'video_callee';
    var video_callee, video_caller;
    video_callee = document.getElementById(id_video_callee);
    video_caller = document.getElementById(id_video_caller);
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
            socket.emit('videochat', videochat_sdp);
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
                    socket.emit('videochat', videochat_candidate);
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
