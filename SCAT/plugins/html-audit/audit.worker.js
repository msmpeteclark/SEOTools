var cluster = require("cluster"), worker = cluster.worker;
var Crawler = require("crawler").Crawler, cheerio = require("cheerio"), md5 = require("MD5");


var dh = require("../../lib/debugHelper.js")({ config : null });

var messageHandlers = {
  NewWork : NewWork,
  WorkAccepted : WorkAccepted,
  Shutdown : Shutdown
};

process.on("message", function(message) {
  var messageHandler = messageHandlers[message.type];
  if (dh.guard(messageHandler === undefined, "Unknown message type '"+ message.type +"' : "+ JSON.stringify(message, null, 2))) {return;}
  messageHandler(message.options || {});
});

ReadyForWork();

/* Message Handlers */
function NewWork(options) {
  var auditItems = options, auditItemLookup = {};

  var urls = [];
  auditItems.forEach(function(auditItem) {
    var url = auditItem.url;
    urls.push(url);
    auditItemLookup[md5(url)] = auditItem;
  });

  var c = new Crawler({
    maxConnections : 10, jQuery : false,
    callback : function(err, result) {
      if (err) { console.error(err); return; }
      var pageUrl = result.uri;
      var $ = cheerio.load(result.body);
      var pageTitle = $("title").text();

      var auditItem = auditItemLookup[md5(pageUrl)];
      auditItem.results = {
        pageTitle : pageTitle
      };
    },
    onDrain : function() {
      WorkComplete(auditItems);
    }
  });

  c.queue(urls);
}
function WorkAccepted(options) {
  ReadyForWork();
}
function Shutdown(options) {
  process.exit();
}

/* Master Methods */
function ReadyForWork() {
  process.send({ type : "ReadyForWork" });
}

function WorkComplete(options) {
  process.send({ type : "WorkComplete", options : options });
}
