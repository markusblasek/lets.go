'use strict';

angular.module('letsGo.controllers', []).
  controller('AppCtrl', function($scope, $route, $http, $location, user) {
    $scope.$route = $route;

    user.check();

    $scope.user = null;
    $scope.logout = user.logout;

    $scope.$on('userChanged', function(event, user) {
      $scope.user = user;
    });
  }).

  controller('LoginCtrl', function($scope, $rootScope, $http, $location, user) {
    $scope.email = '';
    $scope.password = '';

    $scope.login = function() {
      $scope.loading = true;
      $scope.error = null;

      return user.login($scope.email, $scope.password).
        success(function(user){
          $rootScope.message = 'Authentication successful!';
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

  controller('RegisterCtrl', function($scope, $rootScope, $http, $location) {
    $scope.user = {};

    $scope.register = function() {
      $scope.loading = true;
      $scope.error = null;

      $http.post('/user/register', $scope.user).
        success(function(user) {
          $rootScope.message = 'registered';
          $location.url('/');
        }).
        error(function(error) {
          $scope.error = error;
        }).
        finally(function() {
          $scope.loading = false;
        });
    }
  });
