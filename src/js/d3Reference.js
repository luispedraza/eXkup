/* THE TREE REPRESENTATION */
function biiTree(data, element) {
	THAT = this;
	var margin = {top: 20, right: 120, bottom: 20, left: 120},
		width = 960 - margin.right - margin.left,
		height = 600 - margin.top - margin.bottom,
		diameter = height;

	var node_index = 0,
		dep_index = 0,
		DURATION = 500,			// default transition duration
	    duration = DURATION,	// current transition duration
	    spacing = 100,			// depeth spacting between nodes
		indent = false;			// indent nodes by dependency level 

	/* IMPORTANT VARIABLES FOR TREE TREPRESENTATION: */
	/* Layout-specific functions for visual representation */
	var layouts = {
		"linear": {
			tree: d3.layout.tree().size([height, width]),
			diagonal: d3.svg.diagonal()
				.projection(function(d) { return [d.y, d.x];}),
	    	transform: function(d) {d.position = [d.y, d.x]; return d3Translate(d.position);},
	    	transform0: function(d) {d.position0 = [d.y0, d.x0]; return d3Translate(d.position0);},
	    	inverse: function(pos) { return [pos[1], pos[0]]; },
	    	textAnchor: function(d) { return d.children || d._children ? "end" : "start"; },
	    	textTransform: function (d) {return d3Translate((d.children || d._children) ? -(d.size+3) : (d.size+3)); },
	    	dependencyPath: d3DependencyPathLineal
		},
		"radial": {
			tree: d3.layout.tree().size([360, diameter / 2 - 120])
	    		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; }),
		    diagonal: d3.svg.diagonal.radial()
 				.projection(function(d) { return [d.y, d.x / 180 * Math.PI];}),
	    	transform: function(d) {
	    		var angle = (Math.PI/180)*(d.x-90);
	    		d.position = [Math.cos(angle)*d.y, Math.sin(angle)*d.y];
	    		return d3Rotate(d.x-90) + d3Translate(d.y);
	    	},
	    	transform0: function(d) {
	    		var angle = (Math.PI/180)*(d.x0-90);
	    		d.position0 = [Math.cos(angle)*d.y0, Math.sin(angle)*d.y0];
	    		return d3Rotate(d.x0-90) + d3Translate(d.y0);
	    	},
	    	inverse: function(pos) { return [180-(180/Math.PI)*Math.atan2(pos[0], pos[1]), Math.sqrt(pos[1]*pos[1]+pos[0]*pos[0])]; },
	    	textAnchor: function(d) { return (d.x < 180) ? "start" : "end"; },
	    	textTransform: function (d) { return (d.x < 180) ? d3Translate(d.size+3) : d3Rotate(180)+d3Translate(-(d.size+3)); },
	    	dependencyPath: d3DependencyPathRadial
		},
		"force": {
			tree: d3.layout.tree().size([height, width]),
			diagonal: d3.svg.diagonal()
				.projection(function(d) { return [d.y, d.x];}),
	    	transform: function(d) {d.position = [d.y, d.x]; return d3Translate(d.position);},
	    	transform0: function(d) {d.position0 = [d.y0, d.x0]; return d3Translate(d.position0);},
	    	inverse: function(pos) { return [pos[1], pos[0]]; },
	    	textAnchor: function(d) { return d.children || d._children ? "end" : "start"; },
	    	textTransform: function (d) {return d3Translate((d.children || d._children) ? -(d.size+3) : (d.size+3)); },
	    	dependencyPath: d3DependencyPathLineal
		},
	};
	var LAYOUT = layouts["linear"];	// initial layout
	/* Set Layout-specific functions */
	THAT.setLayout = function(l) {
		LAYOUT = layouts[l];
		update();
	};
	/* zoom behavior: */
	var zm = d3.behavior.zoom()
	    		.scaleExtent([.2,2])
	    		.on("zoom", function() {
	    			var vector = d3.event.translate;
	    			vector[0]+=margin.right;
	    			vector[1]+=margin.top;
	    			svg.attr("transform", d3Translate(vector) + d3Scale(d3.event.scale));
	    		});
	var svg = d3.select(element)
			.append("svg")
				.attr("id", "graph")
		    	// .attr("width", width + margin.right + margin.left)
		    	// .attr("height", height + margin.top + margin.bottom)
		    	.on("dblclick", function() {
		    		zm.translate([0,0]);
		    		zm.scale(1);
		    		zm.event(svg);
		    	})		    	
		    	.call(zm)
		    	.on("dblclick.zoom", null)
		  	.append("g")
		    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	var showDependencies = {
		i: true,	// show implicit dependencies
		e: true,	// show explicit dependencies
		s: true,	// show system dependencies	
		u: true,	// show unresolved dependencies
		v: true		// show virtual dependencies
	}

	var root = graphProcess(data);
	root.x0 = 0;
	root.y0 = margin.left;
	root.children.forEach(collapse);
	var nodes, links, deps;
	update(root);

	THAT.doIndent = function(do_indent) {
		indent = do_indent;
		update(root);
	};
	THAT.showDepType = function(type, show_type) {
		showDependencies[type] = show_type;
		// hide/unhide dependencies
		svg.selectAll("path.dep."+type)
			.style("opacity", show_type ? .3 : 0);
	};

	THAT.expand = function() {

	};
	THAT.collapse = function() {

	};
	
	/* main graph update function */
	function update(source) {
		// Projected position of source node:
		function updateNodes() {
			var node = svg.selectAll("g.node")
			  	.data(nodes, function(d) { return d.id || (d.id = ++node_index); });
			var nodeEnter = node.enter().append("g")
				.attr("class", function(d) { return "node " + d.type; })				// class for node
				.attr("transform", function(d) { return LAYOUT.transform0(source); })	// new nodes enter at source's position
				// DRAG behavior for nodes:
				.call(d3.behavior.drag()
					.on("dragstart", function(d) {
						d3.event.sourceEvent.stopPropagation();
						duration = 0;
					})
					.on("drag", function(d) {
						d3.event.sourceEvent.stopPropagation();
						var mousePos = LAYOUT.inverse(d3.mouse(svg.node())) ;	// current mouse position
						if (d3.event.sourceEvent.shiftKey) {
							deltaX = mousePos[0]-d.x;
							deltaY = mousePos[1]-d.y;
							(function propagateDrag(aNode) {
								aNode.x+=deltaX; aNode.y+=deltaY;
								if (aNode.children) aNode.children.forEach(propagateDrag);
							})(d);
						} else {
							d.x = mousePos[0];
							d.y = mousePos[1];
						}
						updateSVG();
						stashPositions();
					})
					.on("dragend", function(d) {
						d3.event.sourceEvent.stopPropagation();
						duration = DURATION;	// default duration for transitions
					})
				)
				// CLICK event ofr nodes:
				.on("click", clickOnNode);
			// Node name:
			nodeEnter.append("text")
				.attr("transform", LAYOUT.textTransform)
				.attr("text-anchor", LAYOUT.textAnchor)
				.attr("dy", ".35em")
				.text(function(d) { return d.name; })
				.style("fill-opacity", 1e-6);

			var nodeCellEnter = nodeEnter.filter(function (d) { return typeCell(d.type); });
			var nodeFolderEnter = nodeEnter.filter(function (d) { return typeFolder(d.type); });
			var nodeBlockEnter = nodeEnter.filter(function (d) { return typeBlock(d.type); });
			var nodeContainerEnter = nodeEnter.filter(function (d) {return typeContainer(d.type); });
			// CELLS
			nodeCellEnter.append("polygon")
				.attr("class", "meta")
				.attr("points", function(d) {return d3PolyPath(d.size, 6);})
				.attr("stroke", function(d) {return d.block.color})
			nodeCellEnter.append("polygon")
				.attr("class", "content")
				.attr("points", function(d) {return d3PolyPath(d.size-3, 6);})
				.attr("fill", function(d) {return d.color})
			// FOLDERS
			nodeFolderEnter.append("path")
				.attr("d", function(d) {return d3FolderPath(d.size);})
				.attr("fill", function(d) {return d._children ? d.block.colorDark : d.block.color;})
				.attr("stroke", function(d) {return "#fff";});
			// BLOCKS
			nodeBlockEnter.append("polygon")
				.attr("points", function(d) {return d3PolyPath(d.size, 4);})
				.attr("fill", function(d) {return d._children ? d.colorDark : d.color;})
				.attr("stroke", function(d) {return d.colorDark;});
			// CONTAINERS:
			nodeContainerEnter.append("circle")
				.attr("r", 1e-6)
				.style("fill", function(d) { return d._children ? d.color : "#fff"; })
				.attr("stroke", function(d) {return d.colorDark;});
			
			// Transition nodes to their new position.
			var nodeUpdate = node.transition()
				.duration(duration)
				.attr("transform", LAYOUT.transform);
			nodeUpdate.select("text")
				.attr("transform", LAYOUT.textTransform)
				.attr("text-anchor", LAYOUT.textAnchor)
				.style("fill-opacity", 1);

			var nodeFolderUpdate = nodeUpdate.filter(function (d) { return typeFolder(d.type); })
				.select("path")
				.attr("fill", function(d) {return d._children ? d.block.colorDark : d.block.color;})
			var nodeBlockUpdate = nodeUpdate.filter(function (d) { return typeBlock(d.type); })
				.select("polygon")
				.attr("fill", function(d) {return d._children ? d.colorDark : d.color;});
			var nodeContainerUpdate = nodeUpdate.filter(function (d) {return typeContainer(d.type); });
			nodeContainerUpdate.select("circle")
				.attr("r", function(d){return d.size})
				.style("fill", function(d) { return d._children ? d.color : d.colorBright; });
			
			// Transition exiting nodes to the parent's new position.
			var nodeExit = node.exit().transition()
				.duration(duration)
				.attr("transform", function(d) { return LAYOUT.transform(source); })
				.remove();
			nodeExit.select("circle")
				.attr("r", 1e-6);
			nodeExit.select("text")
				.style("fill-opacity", 1e-6);
			// NOW THE EVENTS:
			node
				.on("mouseover", function(d,i) {
					if ((!d.parent)||(!d.parent.children)) return;		// cells being collapsed (animated) must not trigger this function
					if (!typeCell(d.type)) return;
					svg.selectAll("path.dep")
						.filter(function(dep) { return dep.source==d || dep.target==d; })
						.style("opacity", .85);
					svg.selectAll("path.link")
						.attr("opacity", .2);
					svg.selectAll(".node")
						.attr("opacity", .2);
					svg.selectAll(".node")
						.filter(function(node) {
							if (node==d) return true;
							for (var i=0; i<d.depArray.length; i++){
								if (node==d.depArray[i].target) return true;
							}
							if (!node.children)
								for (var i=0; i<node.depArray.length; i++){
									if (d==node.depArray[i].target) return true;
								}
							return false;
						})
						.attr("opacity", 1)
						.transition()
						.duration(100)
						.attr('transform', function(d) {
							return LAYOUT.transform(d) + d3Matrix([1.5,0,0,1.5,0,0]);
						});
					})
				.on("mouseout", function(d,i) {
					if ((!d.parent)||(!d.parent.children)) return;		// cells being collapsed (animated) must not trigger this function
					if (!typeCell(d.type)) return;
					svg.selectAll("path.dep").style("opacity", .3);
					svg.selectAll("path.link")
						.attr("opacity", 1);
					svg.selectAll(".node")
						.attr("opacity", 1);
					svg.selectAll(".node")
						.filter(function(node) {
							if (node==d) return true;
							for (var i=0; i<d.depArray.length; i++){
								if (node==d.depArray[i].target) return true;
							}
							if (!node.children)
								for (var i=0; i<node.depArray.length; i++){
									if (d==node.depArray[i].target) return true;
								}
							return false;
						})
						.transition()
						.duration(100)
						.attr('transform', function(d) {
							return LAYOUT.transform(d);
						});
				});
		};
		function updateTreeLinks() {
			var link = svg.selectAll("path.link")
				.data(links, function(d) { return d.target.id; });
			// Enter any new links at the parent's previous position.
			link.enter().insert("path", "g.node")
				.attr("class", "link")
				.attr("d", function(d) {
					var o = {x: source.x0, y: source.y0};
					return LAYOUT.diagonal({source: o, target: o});
				});
			// Transition links to their new position.
			link.transition()
				.duration(duration)
				.attr("d", LAYOUT.diagonal);
			// Transition exiting nodes to the parent's new position.
			link.exit().transition()
				.duration(duration)
				.attr("d", function(d) {
					var o = {x: source.x, y: source.y};
					return LAYOUT.diagonal({source: o, target: o});
				})
				.remove();
		};
		function updateDepLinks() {
			var _dep = svg.selectAll("path.dep")
				.data(deps, function(d) { return d.id; });
			// Enter any dep links at the parent's previous position.
			_dep.enter().insert("path", "g")
				.attr("class", function(d) { return "dep " + d.type})
				.attr("d", function(d) {
					return LAYOUT.dependencyPath(source.position0,source.position0);
				})
				.style("opacity", 0);
			// Transition links to their new position.
			_dep.transition()
				.duration(duration)
				.attr("d", function (d) { return LAYOUT.dependencyPath(d.source.position, d.target.position); })
				.style("opacity", function(d){return showDependencies[d.type] ? .3 : 0;});
			// Transition exiting nodes to the parent's new position.
			_dep.exit().transition()
				.duration(duration)
				.attr("d", function(d) {
					return LAYOUT.dependencyPath(source.position,source.position);
				})
				.style("opacity", 0)
				.remove();
		};
		function updateSVG() {
			updateNodes();
			updateTreeLinks();
			updateDepLinks();
		}
		// Compute the new tree layout.
		nodes = LAYOUT.tree.nodes(root).reverse();
		links = LAYOUT.tree.links(nodes);
		// reset dependencies levels
		deps = computeDeps(nodes);
		// Normalize for fixed-depth.
		nodes.forEach(function(d, i) { d.y = (indent ? d.level : d.depth) * spacing; });
		updateSVG();
		// Stash the old positions for transition.
		function stashPositions() {
			nodes.forEach(function(d) {
				d.x0 = d.x;
				d.y0 = d.y;
				d.position0 = d.position;
			});	
		};
		stashPositions();
	};
	// Toggle children on click.
	function clickOnNode(d) {
		if (d3.event.defaultPrevented) return;
		if (d.children) {
	    	d._children = d.children;
	    	d.children = null;
		} else {
			d.children = d._children;
			d._children = null;
		};
		update(d);
	};
	function collapse(d) {
		if (d.children) {
	  		d._children = d.children;
	  		d._children.forEach(collapse);
	  		d.children = null;
		}
	};
};
