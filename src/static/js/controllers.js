'use strict';

angular.module('letsGo.controllers', []).
  controller('AppCtrl', function($scope, $route, $http, $location, user) {
    $scope.$route = $route;


    $scope.$on('$routeChangeStart', NProgress.start);
    $scope.$on('$routeChangeSuccess', NProgress.done);
    $scope.$on('$routeChangeError', NProgress.done);

    user.check();

    $scope.user = null;
    $scope.online = 0;
    $scope.logout = user.logout;

    $scope.$on('userChanged', function(event, user) {
      $scope.user = user;
    });

    $scope.$on('online', function(event, online) {
      $scope.$apply(function() {
        $scope.online = online;
      });
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
  });
