'use strict';

angular.module('letsGo.directives', []).

  directive('lgMessageBox', function($rootScope, $http, socket) {
    return {
      restrict: 'E',
      scope: {
        targetType: '@lgTargetType',
        targetId: '@lgTargetId'
      },
      templateUrl: '/static/partials/directives/message-box.jade',
      link: function(scope, element, attrs) {
        var messages = element.find('.messages');
        var input = element.find('input.text');
        var send = element.find('.send');

        scope.$on('message', function(event, message) {
          if (message.target.type === attrs.lgTargetType &&  message.target.id === attrs.lgTargetId) {
            messages.append('<p><b>' + message.user + ': </b> ' + message.text + '</p>');
          }
        });

        send.on('click', function() {
          var text = input.val();
          if (text && text != '') {
            socket.message(attrs.lgTargetType, attrs.lgTargetId, text);
          }
        })
      }
    };
  });
