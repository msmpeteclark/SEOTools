var events = require("events");

module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, dataManager = dep.dataManager,
      pluginManager = dep.pluginManager;

  var jobEvents = new events.EventEmitter();

  var runningJobs = [], runningJobsById = {};

  return {
    create : create,
    getActiveJobs : getActiveJobs,
    getJobsProgress : getJobsProgress,
    jobStart : jobStart,
    events : jobEvents
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
      jobsProgress.forEach(function(job) {
        augmentJobProgress(job);
      });
      callback(null, jobsProgress);
    });
  }

  function jobStart(options, callback) {
    var job = options.job;
    var driver = dataManager.getDriver();

    if (dh.guard(job_exists(job), "Job '"+ job._id +"' is already running", callback)) {return;}

    dataManager.getJob({ job : job }, function(err, job) {
      if (dh.guard(err, callback)) {return;}

      pluginManager.getJobType({ pluginType : job.pluginType, name : job.jobType }, function(err, jobType) {
        if (dh.guard(err, callback)) {return;}

        jobType.getController({job : job, driver : driver }, function(err, jobController) {
          if (dh.guard(err, callback)) {return;}

          job_add(job, jobController);

          jobController.start({}, callback);

          jobController.events.on("JobProgressUpdated", function(args) {
            if (job_existsById(args._id) === true) {
              augmentJobProgressById(args.progress, args._id);
            }
            jobEvents.emit("JobProgressUpdated", args);
          });

          jobController.events.on("JobCompleted", function(args) {
            if (job_existsById(args._id) === true) {
              job_removeById(args._id);
              augmentJobProgressById(args.progress, args._id);
            }
            jobEvents.emit("JobCompleted", args);
          });
        });
      });
    });
  }


  /* Private Functions */
  function job_exists(job) {
    return runningJobsById[job._id] !== undefined;
  }
  function job_existsById(jobId) {
    return runningJobsById[jobId] !== undefined;
  }
  function job_add(job, controller) {
    if (job_exists(job)) {
      throw new Error("Cannot add job to tracker because already exists");
    } else {
      var jobDesc = {
        job : job,
        controller : controller
      };
      runningJobs.push(jobDesc);
      runningJobsById[job._id] = jobDesc;
    }
  }
  function job_remove(job) {
    job_removeById(job._id);
  }
  function job_removeById(jobId) {
    if (!job_existsById(jobId)) {
      throw new Error("Cannot remove job from tracker because it does not exist");
    } else {
      var jobIndex = null;
      runningJobs.forEach(function(runningJob, i) { if (runningJob.job._id == jobId) { jobIndex = i } });
      runningJobs.splice(jobIndex, 1);
      delete runningJobsById[jobId];
    }
  }
  function augmentJobProgress(job) {
    augmentJobProgressById(job.progress, job._id);
  }
  function augmentJobProgressById(progress, jobId) {
    if (job_existsById(jobId) === true) {
      progress.runningState = "running";
    } else {
      progress.runningState = "stopped";
    }
  }
};
