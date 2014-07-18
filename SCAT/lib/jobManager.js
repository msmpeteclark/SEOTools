module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, dataManager = dep.dataManager,
      pluginManager = dep.pluginManager;

  return {
    create : create,
    getActiveJobs : getActiveJobs,
    getJobsProgress : getJobsProgress
  };

  /* Public Methods */
  function create(options, callback) {
    var pluginType = options.pluginType, jobTypeName = options.jobType,
        jobData = options.jobData;

    dataManager.createJob(options, function(err, job) {
      if (dh.guard(err, callback)) {return;}
      callback(null, job);
    });
  }

  function getActiveJobs(options, callback) {
    dataManager.getActiveJobs(options, function(err, jobs) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobs);
    });
  }

  function getJobsProgress(options, callback) {
    dataManager.getJobsProgress(options, function(err, jobsProgress) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobsProgress);
    });
  }
};
