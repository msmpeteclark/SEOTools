var OPTool = {
  name : "OPTool",
  primus : null,
  module : null,
  plugins : []
};

(function(config) {
  var primus = config.primus = Primus.connect("//localhost:9001", { manual : true });
  primus.on("open", function() { });
  primus.on("end", function(spark) { });
  primus.on("error", function(spark) { });
  primus.open();
})(OPTool);

/* Semantic UI Stuff */
$(function() {
  $(".ui.dropdown").dropdown({
    on: "hover"
  });

  $(".masthead .information").transition("scale in");
});
