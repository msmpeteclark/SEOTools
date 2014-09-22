var async = require("async");

module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, pluginManager = dep.pluginManager;

  var dal = config.dal;
  var driver = dal.driver(dep, dal.settings);

  var dbSession = null;

  return {
    initialise : initialise,
    createJob : createJob,
    getActiveJobs : getActiveJobs,
    getJobsProgress : getJobsProgress,
    getJob : getJob,
    getDriver : getDriver,
    getSession : getSession
  };

  function getSession(options, callback) {
    callback(null, dbSession);
  }

  function initialise(options, callback) {
    async.series([
      function(done) { driver.initialise({}, done); },
      function(done) { driver.createSession({}, function(err, session) {
        if (dh.guard(err, done)) {return;}
        dbSession = session;
        done();
      }); },
      function(done) {
        pluginManager.getPlugins({}, function(err, plugins) {
          if (dh.guard(err, done)) {return;}
          async.forEach(plugins, driver.registerPlugin, function(err) {
            if (dh.guard(err, done)) {return;}
            done();
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

  function getJob(options, callback) {
    driver.getJob(options, function(err, job) {
      if (dh.guard(err, callback)) {return;}
      callback(null, job);
    });
  }

  function getDriver() {
    return driver;
  }
};
