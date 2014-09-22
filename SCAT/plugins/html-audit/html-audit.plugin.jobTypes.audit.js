var async = require("async");

var events = require("events");

var Master = require("./audit.master.js");

module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, dataManager = dep.dataManager;
  var AuditItemStatus = {
    NotStarted : "not_started",
    Complete : "complete"
  };

  return {
    name : "audit",
    create : create,
    progress : progress,
    getController : getController
  };

  function create(options, callback) {
    var job = options.job, jobData = options.jobData, driver = options.driver;
    var batchSize = 2;

    var urls = jobData.urls;

    async.forEach(urls, function(url, next) {
      var opts = { pluginType : "HTML-Audit", name : "AuditItem",
        properties : {
          jobId : job._id,
          status : AuditItemStatus.NotStarted,
          url : url
        }
      };
      driver.createModel(opts, function(err, auditBatch) {
        if (dh.guard(err, next)) {return;}
        next();
      });
    }, function(err, res) {
      if (dh.guard(err, callback)) {return;}
      callback(null, res);
    });
  }

  function progress(options, callback) {
    var job = options.job, driver = options.driver;
    var opts = { pluginType : "HTML-Audit", name : "AuditItem", query : { jobId : job._id } };
    driver.getModels(opts, function(err, auditItems) {
      if (dh.guard(err, callback)) {return;}
      var completedItems = auditItems.filter(function(b) {  return b.status == AuditItemStatus.Complete; });
      var percent = (100 / auditItems.length) * completedItems.length;
      var jobProgress = {
        percent : percent,
        total : auditItems.length,
        count : completedItems.length,
        status : percent > 0
          ? percent < 100
            ? "active"
            : "complete"
          : "not_started"
      };
      callback(null, jobProgress);
    });
  }

  function getController(options, callback) {
    var job = options.job, driver = options.driver;

    var jobEvents = new events.EventEmitter();
    var master = null;

    var controller = {
      start : start,
      stop : stop,
      pause : pause,
      events : jobEvents
    };

    var jobMethods = {
      setAuditItemsComplete : setAuditItemsComplete,
      getUnassignedAuditItemsQuery : getUnassignedAuditItemsQuery,
      jobProgressUpdated : jobProgressUpdated,
      jobCompleted : jobCompleted
    };

    callback(null, controller);

    /* Controller Methods */
    function start(options, callback) {
      Master({ dep : dep, workers : 1, job : job, driver : driver, jobMethods : jobMethods }, function(err, masterController) {
        if (dh.guard(err, callback)) {return;}
        master = masterController;
        master.start({}, callback);
      });
    }
    function stop(options, callback) {
      if (dh.guard(master == null, "Cannot stop job as it is not currently running", callback)) {return;}
      master.stop({}, callback);
    }
    function pause(options, callback) {

    }

    /* Job Methods */
    function setAuditItemsComplete(options, callback) {
      var auditItems = options.auditItems;

      auditItems.forEach(function(auditItem) {
        auditItem.status = AuditItemStatus.Complete;
      });

      callback();
    }
    function getUnassignedAuditItemsQuery(options, callback) {
      callback(null,{ jobId : options.jobId, sessionId : null, status : AuditItemStatus.NotStarted });
    }
    function jobProgressUpdated(options, callback) {
      progress({ driver : driver, job : job }, function(err, jobProgress) {
        if (dh.guard(err, callback)) {return;}
        jobEvents.emit("JobProgressUpdated", { _id : job._id, progress : jobProgress });
        callback();
      });
    }
    function jobCompleted() {
      progress({ driver : driver, job : job }, function(err, jobProgress) {
        jobEvents.emit("JobCompleted", { _id : job._id, progress : jobProgress });
      });
    }
  }
};
