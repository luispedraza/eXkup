var PREPOSICIONES = {a:true,ante:true,bajo:true,cabe:true,con:true,contra:true,de:true,desde:true,durante:true,en:true,entre:true,hacia:true,hasta:true,mediante:true,para:true,por:true,según:true,sin:true,so:true,sobre:true,tras:true,versus:true,vía:true};
/* Convierte la estructura de partida en un árbol para d3js */
function makeInfoTree(info) {
	var messages = info.mensajes;
	var index = {};
	var rootMsg = messages[0];
	index[rootMsg.idMsg] = rootMsg;
	var replies = messages.slice(1);
	replies.forEach(function(m) {
		console.log(m.level);
		var parentID = m.idMsgRespuesta;
		var parentObj = index[parentID];
		var children = (parentObj.children || (parentObj.children = []));
		children.push(m);
		index[m.idMsg] = m;
	});
	return rootMsg;
};

function populateUsers(users) {
	users = makeArray(users);
	var li = d3.select("#users-list").selectAll("li").data(users);
	li.enter().append("li")
		.text(function(d){return d.__key})
		.on("mouseover", function(d) {
			d3.selectAll("g.node")
				.attr("opacity", function(n) {
					return (n.usuarioOrigen == d.__key) ? 1 : .1;
				});
		});

	// $ul = $("#users-list");
	// users.forEach(function(u) {
	// 	$ul.append($("<li>").text(u.__key)
	// 		.on("mouseover", function() {

	// 		}));
	// });
};

function d3Translate(vector) {
	return " translate(" + vector + ")";
};
function d3Scale(scale) {
	return " scale(" + scale + ")";
};
function d3Rotate(rot) {
	return " rotate(" + rot + ")";
};
function d3Matrix(matrix) {
	return " matrix("+matrix.join(",")+")"
};
function d3PolyPath(r, n) {
	var points = [],
        alfa = Math.PI/n,	// initial angle
        delta = alfa*2;
    do {
    	points.push([r*Math.cos(alfa), r*Math.sin(alfa)].join(","));
    	alfa += delta;
    } while (alfa < 2*Math.PI);
    return points.join(" ");
};


// visualización en árbol:
function TalkVisualizer(data) {
	// Manipulación de los datos
	console.log(data);
	populateUsers(data.perfilesUsuarios);
	var root = makeInfoTree(data);
	console.log(root);

	var node_index = 0,
	    duration = 500;

	// Funciones de dibujo:
	var diameter = 960;
	var tree = d3.layout.tree()
		.size([360, diameter / 2 - 120])
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

	var diagonal = d3.svg.diagonal.radial()
		.projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
	
	/* zoom behavior: */
	var zm = d3.behavior.zoom()
		.scaleExtent([.25,8])
		.on("zoom", function() {
			var vector = d3.event.translate;
			chart.attr("transform", d3Translate(vector) + d3Scale(d3.event.scale));
		});
	var svg = d3.select("body").insert("svg", "#chart-control")
		.on("dblclick", function() {
			zm.translate([diameter/2,diameter/2]);
			zm.scale(1);
			zm.event(svg);
		})
		.call(zm)
		.on("dblclick.zoom", null);
	var chart = svg.append("g")
		.attr("transform", d3Translate(diameter/2,diameter/2));
	
	// root.children.forEach(collapse);
	var nodes, links;
	var $currentMessage = null;
	//root.children.forEach(collapse);
	update(root);

	function stashPositions() {
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});	
	};
	// Toggle children on click.
	function clickOnNode(d) {
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
		};
	};
	function nodePosition(d) {  return d3Rotate(d.x-90) + d3Translate(d.y); };
	function nodePosition0(d) { return d3Rotate(d.x0-90) + d3Translate(d.y0); };

	/* Principal función de actualización */
	function update(source) {
		// Projected position of source node:
		function updateNodes() {
			var node = chart.selectAll(".node")
			  	.data(nodes, function(d) { return d.id || (d.id = ++node_index); });
			var nodeEnter = node.enter().append("g")
				.attr("class", "node")
				.attr("transform", function() {return nodePosition0(source);})	// new nodes enter at source's position
				// CLICK event ofr nodes:
				.on("click", clickOnNode)
				.on("mouseenter", function(d, e) {
					currentMessage = document.createElement("div");
					currentMessage.id = "current-message";
					$("body").append(currentMessage);
					appendMsg(d, currentMessage)
						.css("left", d3.event.offsetX+"px").css("top", d3.event.offsetY);
					// Función de zoom local
					chart.selectAll(".node circle")
						.transition().duration(duration)
						.attr("r", function(near) {
							var dx = Math.abs(near.x-d.x);
							var dy = Math.abs(near.y-d.y);
							if ((dx<5) && (dy<5)) {
								return 10 - (8/25) * (dx*dx+dy*dy);
							};
							return 2;
						});

				})
				.on("mouseleave", function() {
					$("#current-message").remove();
					chart.selectAll(".node circle")
						.transition().duration(duration)
						.attr("r", 2);
				});
			nodeEnter.append("circle")
				.attr("r", 2);
			// Node name:
			// nodeEnter.append("text")
			// 	.attr("transform", LAYOUT.textTransform)
			// 	.attr("text-anchor", LAYOUT.textAnchor)
			// 	.attr("dy", ".35em")
			// 	.text(function(d) { return d.name; })
			// 	.style("fill-opacity", 1e-6);

			// Transition nodes to their new position.
			var nodeUpdate = node.transition()
				.duration(duration)
				.attr("transform", nodePosition);
			// nodeUpdate.select("text")
			// 	.attr("transform", LAYOUT.textTransform)
			// 	.attr("text-anchor", LAYOUT.textAnchor)
			// 	.style("fill-opacity", 1);
			
			// Transition exiting nodes to the parent's new position.
			var nodeExit = node.exit().transition()
				.duration(duration)
				.attr("transform", function(d) { return nodePosition(source); })
				.remove();
			nodeExit.select("circle")
				.attr("r", 1e-6);
			// nodeExit.select("text")
			// 	.style("fill-opacity", 1e-6);
		};
		function updateTreeLinks() {
			var link = chart.selectAll("path.link")
				.data(links, function(d) { return d.target.id; });
			// Los nuevos nodos entran en la posición previa del padre
			link.enter().insert("path", "g.node")
				.attr("class", "link")
				.attr("d", function(d) {
					var o = {x: source.x0, y: source.y0};
					return diagonal({source: o, target: o});
				});
			// Transición a nueva posición
			link.transition()
				.duration(duration)
				.attr("d", diagonal);
			// Transition exiting nodes to the parent's new position.
			link.exit().transition()
				.duration(duration)
				.attr("d", function(d) {
					var o = {x: source.x, y: source.y};
					return diagonal({source: o, target: o});
				})
				.remove();
		};
		function updateSVG() {
			updateNodes();
			updateTreeLinks();
		};
		nodes = tree.nodes(root); //.reverse()
		links = tree.links(nodes);
		updateSVG();
		// Stash the old positions for transition.
		stashPositions();
	};
};


/* se obtiene la información de la extensión */
if (typeof SAMPLE_DATA != "undefined") {
	var test = 1;
	if (test === 0) {
		new TalkVisualizer(SAMPLE_DATA._testMedium);
	} else if (test === 1) {
		new TalkVisualizer(SAMPLE_DATA._testBig);
	}
} else {
	chrome.runtime.onMessage.addListener (
		function(request, sender) {
			console.log(request);
			new TalkVisualizer(request.info);
		});	
};

