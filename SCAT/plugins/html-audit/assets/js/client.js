(function(config) {
  var urls = {
    root : "/html-audit",
    api : "/html-audit/api",
    templateFolder : "/html-audit/assets/templates"
  };

  var plugin = {
    name : "HTML Audit",
    url : urls.root,
    initialise : initialise
  };
  config.plugins.push(plugin);

  function initialise($stateProvider) {
    $stateProvider
      .state("HTMLAudit", {
        url: urls.root,
        templateUrl: urls.templateFolder +"/htmlaudit.htm",
        controller : HTMLAudit
      })
        .state("HTMLAudit.AddJob", {
          url: "/add-job",
          templateUrl: urls.templateFolder +"/htmlaudit.addjob.htm",
          controller : HTMLAudit_AddJob
        })
        .state("HTMLAudit.ActiveJobs", {
          url: "/active-jobs",
          templateUrl: urls.templateFolder +"/htmlaudit.activejobs.htm",
          controller : HTMLAudit_ActiveJobs
        })
          .state("HTMLAudit.ActiveJobs.View", {
            url: "/:jobId"
          });


    /* State Controllers */
    function HTMLAudit($rootScope, $scope, $state) {
      console.log("HTMLAUDIT");
      $scope.currentState = $state.current.name;
      var removeStateChangeListener = $rootScope.$on('$stateChangeSuccess', function stateChangeSuccess(event, toState, toParams, fromState, fromParams){
        $scope.currentState = toState.name;
      });
      $scope.$on("$destroy", function() { removeStateChangeListener(); });
    }

    function HTMLAudit_AddJob($scope, $http, $state) {
      console.log("ADDJOB");
      $scope.model = {
        jobName : "",
        urlsToScan : ""
      };
      $scope.submit = submitForm;

      function submitForm() {
        var urlsToScan = $scope.model.urlsToScan.split("\n");
        var postData = {
          jobName : $scope.model.jobName,
          urlsToScan : urlsToScan
        };
        $http.post(urls.api +"/add-job", postData)
          .success(function(data, status, headers, config) {
            console.log("Success");
            console.log(data);
            $state.go("HTMLAudit.ActiveJobs");
          })
          .error(function(data, status, headers, config) {
            console.log("Error")
            console.log(data);
          });
      }
    }

    function HTMLAudit_ActiveJobs($rootScope, $scope, $http, $state) {
      $scope.jobs = [];
      $scope.jobInfo = {};
      $scope.jobId = $state.params.jobId || null;
      $scope.startJob = startJob;

      var removeStateChangeListener = $rootScope.$on('$stateChangeSuccess', function stateChangeSuccess(event, toState, toParams, fromState, fromParams) {
        $scope.jobId = toParams.jobId || null;
      });
      $scope.$on("$destroy", function() {
        removeStateChangeListener();
        console.log("Destroy active jobs");
        OPTool.primus.off("data", primusDataListener);
      });

      OPTool.primus.on("data", primusDataListener);

      $http.get(urls.api +"/active-jobs")
        .success(function(data, status, headers, config) {
          $scope.jobs = data;
          for(var i=0; i<$scope.jobs.length; i++) {
            var job = $scope.jobs[i];
            $scope.jobInfo[job._id] = {
              job : job,
              progress : { status : "active", percent : 0 }
            };
          }
          var postData = { jobs : $scope.jobs };
          $http.post(urls.api +"/job-progress", postData)
            .success(function(data, status, headers, config) {
              console.log("got progress");
              console.log(data);
              for (var i=0; i<data.length; i++) {
                var job = data[i];
                $scope.jobInfo[job._id].progress = job.progress;
              }
            })
            .error(function(data, status, headers, config) {
              console.log("Error getting job progress")
              console.log(data);
            });
        })
        .error(function(data, status, headers, config) {
          console.log("Error active jobs")
          console.log(data);
        });

      /* Socket Server Handlers */
      function primusDataListener(data) {
        var options = data.options;
        var jobId = options._id;
        console.log("Progress updated for Job ID : "+ jobId);
        console.log(data);
        if ($scope.jobInfo[jobId] !== undefined) {
          $scope.jobInfo[jobId].progress = options.progress;
          $scope.$apply();
        }
      }

      /* View Methods */
      function startJob() {
        var job = $scope.jobInfo[$scope.jobId].job;
        var postData = { job : job };
        $http.post(urls.api +"/job-start", postData)
          .success(function(data, status, headers, config) {
            console.log("job started");
            console.log(data);
          })
          .error(function(data, status, headers, config) {
            console.log("Error starting job");
            console.log(data);
          });
      }
    }
  }
})(OPTool);
