(function() {
  'use strict';

  angular.module('app', [
    'pascalprecht.translate',
    'tmh.dynamicLocale',
    'ui.router',
    'ngMaterial',
    'md.data.table'
  ])
  .config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('indigo')
        .accentPalette('teal')
        .warnPalette('orange')
        .backgroundPalette('grey');
  });

})();
