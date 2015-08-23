'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('forkweb', {
        url: '/forkweb',
        templateUrl: 'js/forkweb/forkweb.html',
        controller: "ForkWebController"
    });

});

app.controller('ForkWebController', function($scope, $stateParams, $state, ProjectFct, AuthService, ForkFactory){

	ForkFactory.getWeb().then(function(webs){
		$scope.nodes = [];
    	var linkArr = [];
        webs.forEach(function(node){
        	var arr = [];
        	arr.push(node);
        	var newarr = arr.concat(node.branch);
        	$scope.nodes.push(newarr);
        });

        console.log("network", $scope.nodes);
		var testA = [];
		var counter = 0;
		$scope.nodes.forEach(function(nodeArr){
			for (var j = 1; j < nodeArr.length; j++) {
        		var aLink = {
        			'source': counter,
        			'target': j + counter,
        			'weight': 3
        		}
        		linkArr.push(aLink);
        	};
    		counter += (nodeArr.length);
		});

		var nodeArr = [];
		nodeArr = nodeArr.concat.apply(nodeArr, $scope.nodes);
		console.log("PLEASE", linkArr, nodeArr);
		var nodes = nodeArr;
		var links = linkArr;

		  var width = 960, height = 500;

		  var color = d3.scale.category20();

		  var fisheye = d3.fisheye.circular()
		      .radius(120);

		  var force = d3.layout.force()
		      .charge(-240)
		      .linkDistance(40)
		      .size([width, height]);

		  var svg = d3.select("#ui").append("svg")
		      .attr("width", width)
		      .attr("height", height);

		  svg.append("rect")
		      .attr("class", "background")
		      .attr("width", width)
		      .attr("height", height);

		    var n = nodes.length;

		    force.nodes(nodes).links(links);

		    // Initialize the positions deterministically, for better results.
		    nodes.forEach(function(d, i) { d.x = d.y = width / n * i; });

		    // Run the layout a fixed number of times.
		    // The ideal number of times scales with graph complexity.
		    // Of course, don't run too long—you'll hang the page!
		    force.start();
		    for (var i = n; i > 0; --i) force.tick();
		    force.stop();

		    // Center the nodes in the middle. 
		    var ox = 0, oy = 0;
		    nodes.forEach(function(d) { ox += d.x, oy += d.y; });
		    ox = ox / n - width / 2, oy = oy / n - height / 2;
		    nodes.forEach(function(d) { d.x -= ox, d.y -= oy; });

		    var link = svg.selectAll(".link")
		        .data(links)
		      .enter().append("line")
		        .attr("class", "link")
		        .attr("x1", function(d) { return d.source.x; })
		        .attr("y1", function(d) { return d.source.y; })
		        .attr("x2", function(d) { return d.target.x; })
		        .attr("y2", function(d) { return d.target.y; })
		        .style("stroke-width", function(d) { return 2; });

		    var node = svg.selectAll(".node")
		        .data(nodes)
		      .enter().append("circle")
		        .attr("class", "node")
		        .attr("cx", function(d) { return d.x; })
		        .attr("cy", function(d) { return d.y; })
		        .attr("r", 4.5)
		        .style("fill", function(d) { return "blue"; })
		        .call(force.drag);

		    svg.on("mousemove", function() {
		      fisheye.focus(d3.mouse(this));

		      node.each(function(d) { d.fisheye = fisheye(d); })
		          .attr("cx", function(d) { return d.fisheye.x; })
		          .attr("cy", function(d) { return d.fisheye.y; })
		          .attr("r", function(d) { return d.fisheye.z * 4.5; });

		      link.attr("x1", function(d) { return d.source.fisheye.x; })
		          .attr("y1", function(d) { return d.source.fisheye.y; })
		          .attr("x2", function(d) { return d.target.fisheye.x; })
		          .attr("y2", function(d) { return d.target.fisheye.y; });
		    });
		
	});
	
});