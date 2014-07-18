var async = require("async");

module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, pluginManager = dep.pluginManager;

  var dal = config.dal;
  var driver = dal.driver(dep, dal.settings);

  return {
    initialise : initialise,
    createJob : createJob,
    getActiveJobs : getActiveJobs,
    getJobsProgress : getJobsProgress
  };

  function initialise(options, callback) {
    async.series([
      function(done) { driver.initialise({}, done); },
      function(done) {
        pluginManager.getPlugins({}, function(err, plugins) {
          if (dh.guard(err, callback)) {return;}
          async.forEach(plugins, driver.registerPlugin, function(err) {
            if (dh.guard(err, callback)) {return;}
            callback();
          });
        });
      }
    ], callback);
  }

  function createJob(options, callback) {
    driver.createJob(options, function(err, job) {
      if (dh.guard(err, callback)) {return;}
      callback(null, job);
    });
  }

  function getActiveJobs(options, callback) {
    driver.getActiveJobs(options, function(err, jobs) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobs);
    });
  }

  function getJobsProgress(options, callback) {
    driver.getJobsProgress(options, function(err, jobsProgress) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobsProgress);
    });
  }
};
