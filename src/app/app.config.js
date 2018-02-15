(function() {
  'use strict';

  angular.module('app').config(configBlock);

  /** @ngInject */
  function configBlock($locationProvider, $logProvider, $translateProvider,
                       tmhDynamicLocaleProvider) {
    $locationProvider.
        html5Mode(false);

    $logProvider.
        debugEnabled(true);

    $translateProvider.
        useStaticFilesLoader({
          prefix: '/locales/',
          suffix: '.json',
        }).
        preferredLanguage('en').
        fallbackLanguage('en').
        useSanitizeValueStrategy('escape').
        useMissingTranslationHandlerLog();

    tmhDynamicLocaleProvider.
        localeLocationPattern('/locales/angular-locale_{{locale}}.js').
        defaultLocale('en');
  }

})();
