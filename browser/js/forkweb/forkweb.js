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

		var w = 900;
		var h = 500;
		var svg = d3.select('#ui') 
		      .append('svg')
		      .attr('width', w)
		      .attr('height', h);


		// create force layout in memory
		var force = d3.layout.force()
		      .nodes(nodes)
		      .links(links)
		      .size([900, 500])
		      .linkDistance([w /(nodeArr.length)]);
		
		var fisheye = d3.fisheye.circular()
		    			.radius(200)
		    			.distortion(2);


		// append a group for each data element
		var node = svg.selectAll('circle')
		      .data(nodes).enter()
		      .append('g')
		      .call(force.drag)
		      .attr("class", "nodeObj");

		// append circle onto each 'g' node
		node.append('circle')
		      .attr('fill', "green")
		      .attr('r', 10);


		force.on('tick', function(e) {
	      node.attr('transform', function(d, i) {
	            return 'translate('+ d.x +', '+ d.y +')';
	      })

	      link
	            .attr('x1', function(d) { return d.source.x })
	            .attr('y1', function(d) { return d.source.y })
	            .attr('x2', function(d) { return d.target.x })
	            .attr('y2', function(d) { return d.target.y })
		});



		var link = svg.selectAll('line')
		      .data(links).enter()
		      .append('line')
		      .attr('stroke', "grey")

		force.start();
		
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