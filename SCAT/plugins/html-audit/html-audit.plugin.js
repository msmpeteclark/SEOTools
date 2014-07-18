module.exports = function(dep) {
  return {
    name : "HTML-Audit",
    web : {
      name : "html-audit",
      assets : {
        path : "./assets/",
        scriptUrls : [
          "./js/client.js"
        ]
      }
    },
    dal : {
      registerModels : registerModels
    },
    api : require("./html-audit.plugin.api.js")(dep),
    jobTypes : [
      require("./html-audit.plugin.jobTypes.audit.js")(dep)
    ]
  };
};

/* Data */
function registerModels(options, callback) {
  var mongoose = options.mongoose, Schemas = options.Schemas, Models = options.Models;

  Schemas.AuditBatch = mongoose.Schema({
    id : mongoose.Schema.ObjectId,
    jobId : String,
    status : String,
    urls : [
      { type : String }
    ]
  });
  Models.AuditBatch = mongoose.model("AuditBatch", Schemas.AuditBatch);

  callback();
}
