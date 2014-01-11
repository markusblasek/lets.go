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
  });
