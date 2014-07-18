module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, dataManager = dep.dataManager;
  var AuditBatchStatus = {
    NotStarted : "not_started",
    Complete : "complete"
  };

  return {
    name : "audit",
    create : create,
    start : start,
    stop : stop,
    pause : pause,
    progress : progress,
    completed : completed
  };

  function create(options, callback) {
    var job = options.job, jobData = options.jobData, driver = options.driver;
    var batchSize = 2;

    var urls = jobData.urls;
    (function createBatch(batch) {
      if (batch.length === 0) {
        callback();
        return;
      }

      var opts = { pluginType : "HTML-Audit", name : "AuditBatch",
        properties : {
          jobId : job._id,
          status : AuditBatchStatus.NotStarted,
          urls : batch
        }
      };
      driver.createModel(opts, function(err, auditBatch) {
        if (dh.guard(err, callback)) {return;}
        console.log("created audit batch");
        console.log(auditBatch);
        createBatch(urls.splice(0, batchSize));
      });
    })(urls.splice(0, batchSize));
  }
  function start(options, callback) {

  }
  function stop(options, callback) {

  }
  function pause(options, callback) {

  }
  function progress(options, callback) {
    var job = options.job, driver = options.driver;
    var opts = { pluginType : "HTML-Audit", name : "AuditBatch",
      query : { jobId : job._id }
    };
    driver.getModels(opts, function(err, auditBatches) {
      if (dh.guard(err, callback)) {return;}
      var completedCount = 0;
      auditBatches.forEach(function(auditBatch) {
        if (auditBatch.status == AuditBatchStatus.Complete) { completedCount++; }
      });
      var jobProgress = (100 / auditBatches.length) * completedCount;
      callback(null, jobProgress);
    });
  }
  function completed(options, callback) {

  }
};
