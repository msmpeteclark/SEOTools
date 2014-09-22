module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, dataManager = dep.dataManager, driver = dep.dataManager.getDriver(),
      jobManager = dep.jobManager;

  return {
    routes : {
      "/report/:jobId" : { verb : "GET", controller : report }
    }
  };

  function report(options, callback) {
    var req = options.request, res = options.response;
    var jobId = req.params.jobId;

    driver.getJob({ job : { _id : jobId } }, function(err, job) {
      if (dh.guard(err, callback)) {return;}
      driver.getModelsStream({ pluginType : "HTML-Audit", name : "AuditItem", query : { jobId : jobId } }, function(err, stream) {
        var builder = csvBuilder();
        console.log(job);
        builder.addColumn("url", "URL");
        builder.addColumn("status", "Status");

        res.setHeader("Content-Disposition", 'attachment; filename="Report - '+ job.name +'.csv"');

        res.write(builder.buildHeaderRow());

        stream.on("data", function(doc) {
          res.write(builder.buildRow(doc));
        }).on("close", function() {
          res.end();
        }).on("error", function(err) {
          console.error("Error getting data for report");
          callback(err);
        });
      });
    });

  }

  /* Private Functions */
  function csvBuilder() {
    var cols = [];

    var builder = {
      addColumn : addColumn,
      buildHeaderRow : buildHeaderRow,
      buildRow : buildRow
    };

    return builder;

    /* Builder Methoda */
    function addColumn(propName, title) {
      cols.push({ propName : propName, title : title });
    }
    function buildHeaderRow() {
      var headerRow = "";
      cols.forEach(function(col) {
        if (headerRow.length > 0) { headerRow += ","; }
        headerRow += "\""+ col.title +"\"";
      });
      headerRow += "\n";

      return headerRow;
    }
    function buildRow(data) {
      var row = "";

      cols.forEach(function(col) {
        var value = data[col.propName];
        if (value === undefined) {
          value = "";
        }
        if (row.length > 0) { row+=","; }
        row += "\"" + value.replace(/\"/g, "\\\"") + "\"";
      });
      row += "\n";

      return row;
    }
  }
};
