var path = require("path");

var glob = require("glob"), async = require("async");

var modulesPath = path.join(__dirname, "../plugins");

module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, jobManager = dep.jobManager;

  var plugins = null, pluginsByName = {};

  return {
    initialise : initialise,
    getPlugin : getPlugin,
    getPlugins : getPluginStats,
    getPluginStats : getPluginStats, //duplicate OLD version of getPlugins...need to remove
    getJobType : getJobType
  };

  /* Public Methods */
  function initialise(options, callback) {
    async.series([
      function(done) { loadPlugins({}, done); }
    ], callback);
  }

  function getPlugin(options, callback) {
    var plugin = pluginsByName[options.name];
    if (dh.guard(plugin===undefined, "Cannot find plugin '"+ options.name +"'", callback)) {return;}
    callback(null, plugin);
  }

  function getPluginStats(options, callback) {
    callback(null, plugins);
  }

  function getJobType(options, callback) {
    var pluginType = options.pluginType, jobTypeName = options.name;

    getPlugin({ name : pluginType }, function(err, plugin) {
      if (dh.guard(err, callback)) {return;}
      var matchedJobType = null;
      for(var i=0; i<plugin.jobTypes.length; i++) {
        if (jobTypeName === plugin.jobTypes[i].name) {
          matchedJobType = plugin.jobTypes[i];
          break;
        }
      }
      callback(null, matchedJobType);
    });
  }

  /* Private Functions */
  function loadPlugins(options, callback) {
    glob(path.join(modulesPath, "**/*.plugin.js"), {}, function(err, filenames) {
      if (dh.guard(err, "Problem occurred scanning for plugins", callback)) {return;}
      plugins = [];
      filenames.forEach(function(filename) {
        var Module = require(filename);
        var module = Module(dep);
        module.path = path.dirname(filename);
        plugins.push(module);
        pluginsByName[module.name] = module;
      });
      callback();
    });
  }
};
