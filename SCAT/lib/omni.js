var async = require("async");

var JobManager = require("./jobManager.js"), WebServer = require("./webServer.js"),
    PluginManager = require("./pluginManager.js"), DataManager = require("./dataManager.js"),
    DebugHelper = require("./debugHelper.js");
var Config = require("./config.js");

module.exports = function() {
  var dep = {};
  dep.config = Config();
  dep.dh = DebugHelper(dep);
  dep.pluginManager = PluginManager(dep);
  dep.dataManager = DataManager(dep);
  dep.jobManager = JobManager(dep);
  dep.webServer = WebServer(dep);

  return {
    start : start
  };

  function start(options, callback) {
    async.series([
      function(done) { dep.pluginManager.initialise({}, done); },
      function(done) { dep.dataManager.initialise({}, done); },
      function(done) { dep.webServer.start({}, done); }
    ], function(err) {
      if (dep.dh.guard(err, callback)) { return; }
      dep.dh.log("event", "Web server listening on port : "+ dep.config.web.server.port);
      callback();
    });
  }
};

var Omni = module.exports;
var omni = Omni();
omni.start({}, function(err) {
  if (err) { console.error(err); return; }
});
