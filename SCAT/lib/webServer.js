var path = require("path"), fs = require("fs"), url = require("url");
var express = require("express"), Primus = require("primus"),
    bodyParser = require('body-parser');

var assetsPath = path.join(__dirname, "webServer/assets"),
    bowerPath = path.join(__dirname, "../bower_components"),
    templatesPath = path.join(__dirname, "webServer/assets/templates");

module.exports = function(dep) {
  var config = dep.config, dh = dep.dh, pluginManager = dep.pluginManager,
      jobManager = dep.jobManager;

  var app = null, server = null, primus = null;
  var pluginStats = null;

  return {
    start : start
  };

  /* Pubilc Methods */
  function start(options, callback) {
    app = express();
    server = app.listen(config.web.server.port, function(err) {
      if (dh.guard(err, callback)) {return;}
      pluginManager.getPluginStats({}, function(err, stats) {
        if (dh.guard(err, callback)) {return;}
        pluginStats = stats;
        primus = new Primus(server, {});
        setupWebServer();
        setupSocketServer();
        callback();
      });
    });
  }

  /* Private Functions */
  function setupWebServer() {
    app.set("view engine", "ejs");
    app.set("views", templatesPath);
    app.set("view options", { layout:false, root: templatesPath });

    app.use(bodyParser.json());

    app.use("/assets", express.static(assetsPath));
    app.use("/assets/semanticui", express.static(path.join(bowerPath, "semantic/build/packaged")));
    app.use("/assets/angular", express.static(path.join(bowerPath, "angular")));
    app.use("/assets/angular-route", express.static(path.join(bowerPath, "angular-route")));
    app.use("/assets/angular-ui-router", express.static(path.join(bowerPath, "angular-ui-router/release")));
    app.use("/assets/jquery", express.static(path.join(bowerPath, "jquery/dist")));

    var pluginScriptUrls = setupPluginsAssets();

    app.get(/^\/assets\/primus\/primus\.js$/, function(req, res) { res.end(primus.library()); });

    app.get(/^\/$/, function(req, res) {
      var viewData = {
        plugins : {
          stats : pluginStats,
          scriptUrls : pluginScriptUrls
        }
      };
      res.render("index.ejs", viewData);
    });

    setupPluginsApi()
  }

  function setupPluginsAssets() {
    pluginStats.forEach(function(stat) {
      var pluginAssetsUrl = "/"+ stat.web.name +"/assets/";
      var pluginAssetsPath = path.join(stat.path, stat.web.assets.path);
      stat.web._ = {
        assetsUrl : pluginAssetsUrl
      };
      app.use(pluginAssetsUrl, express.static(pluginAssetsPath));
    });

    var pluginScriptUrls = [];
    pluginStats.forEach(function(stat) {
      stat.web.assets.scriptUrls.forEach(function(scriptUrl) {
        var finalUrl = url.resolve(stat.web._.assetsUrl, scriptUrl);
        pluginScriptUrls.push(finalUrl);
      });
    });

    return pluginScriptUrls;
  }

  function setupPluginsApi() {
    pluginStats.forEach(function(stat) {
      var api = stat.api;
      if (api == undefined) {return;}
      if (api.methods !== undefined) {
        Object.keys(api.methods).forEach(function(methodUrl) {
          var methodInfo = api.methods[methodUrl];
          var finalUrl = "/"+ stat.web.name +"/api"+ methodUrl;
          app.all(finalUrl, function(req, res) {
            methodInfo.controller(req.body, function(err, output){
              if (err) {
                dh.log("error", err);
                res.statusCode = 500;
                res.end(err.toString());
              } else {
                res.statusCode = 200;
                var outputString = null;
                if (output !== null) {
                  outputString = JSON.stringify(output);
                }
                res.end(outputString);
              }
            });
          });
        });
      }
    });
  }

  function setupSocketServer() {
    primus.on("connection", function(spark) {
      console.log("connected to socket server!");
      jobManager.events.on("JobProgressUpdated", function(args) {
        console.log("progress updated");
        console.log(args);
        spark.write({ type : "JobProgressUpdated", options : args });
      });
    });
  }

  function errorHandler(res) {
    return function(err) {
      res.end(JSON.stringify(err, null, 2));
    };
  }
};
