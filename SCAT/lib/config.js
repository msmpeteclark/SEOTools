module.exports = function() {
  return {
    web : {
      server : {
        port : 9001
      }
    },
    dal : {
      driver : require("./dal-mongodb.js"),
      settings : {
        uri : "mongodb://localhost/OPTool"
      }
    }
  };
};
