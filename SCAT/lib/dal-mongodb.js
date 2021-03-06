var mongoose = require("mongoose"), async = require("async");

module.exports = function(dep, settings) {
  var config = dep.config, dh = dep.dh, pluginManager = dep.pluginManager;

  var Schemas = {
    JobSchema : null
  };
  var Models = {
    Job : null
  };
  defineSchemasAndModels();

  var driver = {
    initialise : initialise,
    createSession : createSession,
    registerPlugin : registerPlugin,
    createJob : createJob,
    getActiveJobs : getActiveJobs,
    getJob : getJob,
    getJobs : getJobs,
    getJobsProgress : getJobsProgress,
    createModel : createModel,
    getModels : getModels,
    getModelsStream : getModelsStream,
    saveModels : saveModels
  };
  return driver;

  /* Public Methods */
  function initialise(options, callback) {
    var mongoPath = settings.uri;
    mongoose.connect(mongoPath);
    var db = mongoose.connection;
    db.on("error", function(err) {
      dh.guard(err, "Cannot connect to mongodb : "+mongoPath, callback);
    });
    db.once("open", function() {
      callback();
    });
  }

  function createSession(options, callback) {
    var session = new Models.Session();
    session.save(function(err) {
      if (dh.guard(err, callback)) {return;}
      callback(null, session);
    });
  }

  function registerPlugin(plugin, callback) {
    var pluginName = plugin.name;
    var registerModelsForPlugin = plugin.dal.registerModels;
    if (typeof(registerModelsForPlugin) == "function") {
      registerModelsForPlugin({ mongoose : mongoose, Schemas : Schemas, Models : Models }, callback);
    } else {
      callback();
    }
  }

  function createJob(options, callback) {
    var pluginType = options.pluginType, jobTypeName = options.jobType,
        jobData = options.jobData;

    var job = new Models.Job({
      name : jobData.name,
      pluginType : pluginType,
      jobType : jobTypeName
    });

    job.save(function(err, job) {
      if (dh.guard(err, callback)) {return;}

      pluginManager.getJobType({ pluginType : pluginType, name : jobTypeName }, function(err, jobType) {
        if (dh.guard(err, callback)) {return;}
        if (dh.guard(jobType === null, "JobType '"+ jobTypeName +"' not found on plugin '"+ pluginType +"'", callback)) {return;}
        jobType.create({ job : job, jobData : jobData, driver : driver }, function(err, jobType) {
          if (dh.guard(err, callback)) {return;}
          callback(null, job);
        });
      });
    });
  }

  function getActiveJobs(options, callback) {
    var pluginType = options.pluginType, jobType = options.jobType;

    var query = {
      pluginType : pluginType,
      jobType : jobType
    };
    Models.Job.find(query, function(err, jobs) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobs);
    });
  }

  function getJob(options, callback) {
    var jobId = options.job._id;
    Models.Job.findOne({ _id : jobId }, function(err, job) {
      if (dh.guard(err, callback)) {return;}
      callback(null, job);
    });
  }

  function getJobs(options, callback) {
    var jobIds = options.jobs.map(function(job) { return job._id; });
    var query = {
      _id : { "$in" : jobIds }
    };
    Models.Job.find(query, function(err, jobs) {
      if (dh.guard(err, callback)) {return;}
      callback(null, jobs);
    });
  }

  function createModel(options, callback) {
    var pluginType = options.pluginType, modelName = options.name,
        properties = options.properties;

    var SelectedModel = Models[modelName];
    if (dh.guard(SelectedModel === undefined, "Cannot create model because name not recognised '"+  modelName +"'.", callback)) {return;}

    var model = new SelectedModel(properties);

    model.save(function(err, job) {
      if (dh.guard(err, callback)) {return;}
      callback(null, model);
    });
  }

  function getModels(options, callback) {
    var pluginType = options.pluginType, modelName = options.name,
        query = options.query, limit = options.limit || 10000;

    var SelectedModel = Models[modelName];

    SelectedModel
      .find(query)
      .limit(limit)
      .exec(function(err, models) {
        if (dh.guard(err, callback)) {return;}
        callback(null, models);
      });
  }

  function getModelsStream(options, callback) {
    var pluginType = options.pluginType, modelName = options.name,
        query = options.query, limit = options.limit || 10000;

    var SelectedModel = Models[modelName];

    var q = SelectedModel.find(query).limit(limit)
    var stream = q.stream();
    callback(null, stream);
  }

  function saveModels(options, callback) {
    var pluginType = options.pluginType, modelName = options.name, models = options.models;

    var SelectedModel = Models[modelName];

    async.forEach(models, function(model, next) {
      var updatedModel = new SelectedModel(model);
      updatedModel.remove(function(err) {
        if (dh.guard(err, next)) {return;}
        updatedModel.save(next);
      });
    }, callback);
  }

  function getJobsProgress(options, callback) {
    getJobs({ jobs : options.jobs }, function(err, jobs) {
      if (dh.guard(err, callback)) {return;}
      async.map(jobs, function(job, next) {
        var pluginType = job.pluginType, jobTypeName = job.jobType;

        pluginManager.getJobType({ pluginType : pluginType, name : jobTypeName }, function(err, jobType) {
          if (dh.guard(err, next)) {return;}
          jobType.progress({ job : job, driver : driver }, function(err, jobProgress) {
            if (dh.guard(err, next)) {return;}
            next(null, { _id : job._id, progress : jobProgress });
          });
        });
      }, callback);
    });
  }

  /* Private Functions */
  function defineSchemasAndModels() {
    Schemas.Job = mongoose.Schema({
      id : mongoose.Schema.ObjectId,
      name : { type : String, default : "Unnamed" },
      pluginType : String,
      jobType : String
    });
    Models.Job = mongoose.model("Job", Schemas.Job);

    Schemas.Session = mongoose.Schema({
      id : mongoose.Schema.ObjectId
    });
    Models.Session = mongoose.model("Session", Schemas.Session);
  }
};
