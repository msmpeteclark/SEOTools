var path = require("path"), events = require("events");
var async = require("async");

var cluster = require("cluster");
cluster.setupMaster({
  exec : path.join(__dirname, "./audit.worker.js"),
  silent : false
});

module.exports = function(options, callback) {
  var dep = options.dep, config = dep.config, dh = dep.dh, dataManager = dep.dataManager;

  var workerCount = options.workers || 4;
  var job = options.job, driver = options.driver, jobMethods = options.jobMethods;

  var auditEvents = new events.EventEmitter();

  var messageHandlers = {
    ReadyForWork : ReadyForWork,
    WorkComplete : WorkComplete
  };

  var dataSession = null;
  var workersById = null, workers = null;
  var isRunning = false;

  var controller = {
    start : start,
    events : auditEvents
  };

  callback(null, controller);

  /* Controller Methods */
  function start(options, callback) {
    if (dh.guard(isRunning == true, "Cannot start job as it is already running", callback)) {return;}

    dataManager.getSession({}, function(err, session) {
      if (dh.guard(err, callback)) {return;}
      if (dh.guard(session === null, "Database session not started.", callback)) {return;}

      dataSession = session;

      ClearJobSession(function(err) {
        if (dh.guard(err, callback)) {return;}

        workersById = {}; workers = [];
        for(var i=0; i<workerCount; i++) {
          (function(worker) {
            workersById[worker.id] = worker;
            workers.push(worker);
            worker.on("message", function(message) {
              var messageHandler = messageHandlers[message.type];
              if (dh.guard(messageHandler === undefined, "Unknown message type '"+ message.type +"' : "+ JSON.stringify(message, null, 2))) {return;}
              messageHandler(worker, message.options || {});
            });
          })(cluster.fork());
        }
      });

      callback();
    });
  }

  /* Message Handlers */
  function ReadyForWork(worker, options) {
    jobMethods.getUnassignedAuditItemsQuery({ jobId : job._id }, function(err, query) {
      driver.getModels({ pluginType : "HTML-Audit", name : "AuditItem", query : query, limit : 2 }, function(err, auditItems) {
        if (dh.guard(err)) {return;}
        async.forEach(auditItems, function(auditItem, next) {
          auditItem.sessionId = dataSession._id;
          next();
        }, function(err) {
          if (dh.guard(err)) {return;}
          driver.saveModels({ pluginType : "HTML-Audit", name : "AuditItem", models : auditItems }, function(err) {
            if (dh.guard(err)) {return;}
            NewWork(worker, auditItems);
          });
        });
      });
    });
  }

  function WorkComplete(worker, auditItems) {
    jobMethods.setAuditItemsComplete({ auditItems : auditItems }, function(err) {
      if (dh.guard(err)) {return;}
      driver.saveModels({ pluginType : "HTML-Audit", name : "AuditItem", models : auditItems }, function(err) {
        if (dh.guard(err)) {return;}
        console.log("Completion acknowledged.");
        jobMethods.jobProgressUpdated({}, function(err) {
          console.log("Called method.");
          WorkAccepted(worker);
        });
      });
    });
  }

  /* Worker Methods */
  function NewWork(worker, auditItems) {
    worker.send({ type : "NewWork", options : auditItems });
  }
  function WorkAccepted(worker) {
    worker.send({ type : "WorkAccepted", options : {} });
  }


  /*Private Functins */
  function ClearJobSession(callback) {
    driver.getModels({ pluginType : "HTML-Audit", name : "AuditItem", query : { jobId : job._id, sessionId : { "$ne" : null } }}, function(err, auditItems) {
      if (dh.guard(err, callback)) {return;}
      async.forEach(auditItems, function(auditItem, next) {
        auditItem.sessionId = null;
        next();
      }, function(err) {
        if (dh.guard(err, callback)) {return;}
        driver.saveModels({ pluginType : "HTML-Audit", name : "AuditItem", models : auditItems }, function(err) {
          if (dh.guard(err, callback)) {return;}
          callback();
        });
      });
    });
  }

};
