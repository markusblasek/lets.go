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
              socket.message(attrs.lgTargetType, attrs.lgTargetId, text);
              $this.val('');
            }
          }
        });
      }
    };
  });
