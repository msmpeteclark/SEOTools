module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, dataManager = dep.dataManager,
      jobManager = dep.jobManager;

  return {
    methods : {
      "/add-job" : { controller : addJob },
      "/active-jobs" : { controller : activeJobs },
      "/job-progress" : { controller : jobProgress },
      "/job-start" : { controller : jobStart }
    }
  };

  function addJob(options, callback) {
    var job = {
      pluginType : "HTML-Audit",
      jobType : "audit",
      jobData : { name : options.jobName, urls : options.urlsToScan }
    };
    jobManager.create(job, function(err, job) {
      if (dh.guard(err, callback)) {return;}
      callback();
    });
  }

  function activeJobs(options, callback) {
    var jobScope = { pluginType : "HTML-Audit", jobType : "audit" };
    jobManager.getActiveJobs(jobScope, function(err, jobs) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobs);
    });
  }

  function jobProgress(options, callback) {
    var jobs = options.jobs;
    jobManager.getJobsProgress({ jobs : jobs }, function(err, jobsProgress) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobsProgress);
    });
  }

  function jobStart(options, callback) {
    var job = options.job;
    jobManager.jobStart({ job : job }, function(err) {
      if (dh.guard(err, callback)) {return;}
      callback();
    });
  }
};
