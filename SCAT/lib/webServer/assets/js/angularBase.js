(function(config) {
  var module = config.module = angular.module(config.name, ["ngRoute", "ui.router"]);
  module.config(function ($urlRouterProvider, $stateProvider) {
     // For any unmatched url, send to /route1
    $urlRouterProvider.otherwise("/")

    $stateProvider.state("homepage", {
      url: "/",
      templateUrl: "/assets/templates/homepage.htm"
    });

    for(var i=0; i<config.plugins.length; i++) {
      var plugin = config.plugins[i];
      plugin.initialise($stateProvider);
    }
  });

  module.controller("Menu", function($scope, $element, $location) {
    $scope.plugins = config.plugins;
  });

  module.controller("Index", function($scope, $element) {
  });
})(OPTool);
