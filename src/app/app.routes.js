(function() {
  'use strict';

  angular.module('app').config(routerConfig);

  /** @ngInject */
  function routerConfig($stateProvider, $urlRouterProvider) {
    var homeState = {
      name: 'home',
      url: '/',
      component: 'home'
    }
  
    var nbaState = {
      name: 'nba',
      url: '/nba',
      component: 'nba'
    }

    $stateProvider.state(homeState);
    $stateProvider.state(nbaState);

    $urlRouterProvider.otherwise('/');
  }

})();
