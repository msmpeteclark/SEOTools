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
      },
      routes : require("./html-audit.plugin.web.routes.js")(dep)
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

  Schemas.AuditItem = mongoose.Schema({
    id : mongoose.Schema.ObjectId,
    jobId : String,
    sessionId : { type : String, default : null },
    status : String,
    url : String,
    results : { type : Object, default : null }
  });
  Models.AuditItem = mongoose.model("AuditItem", Schemas.AuditItem);

  callback();
}
