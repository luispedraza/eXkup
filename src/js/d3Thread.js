var PREPOSICIONES = {a:true,ante:true,bajo:true,cabe:true,con:true,contra:true,de:true,desde:true,durante:true,en:true,entre:true,hacia:true,hasta:true,mediante:true,para:true,por:true,según:true,sin:true,so:true,sobre:true,tras:true,versus:true,vía:true};

function updateButtons() {
	// Respuestas a mensajes:
	$("#chart-ouput .btn.reply").off("click").on("click", function() {
		onShowEditor();
	});
};

function onShowEditor() {
	$container = $("<div>").addClass('editor-container');
	EDITOR = new Editor($container, API);
	new ModalDialog("Nuevo mensaje", $container, ["Cancelar"]);
};

function DataProcessor(data) {
	var THAT = this;
	var infoTree;
	this.words = {};
	this.images = {};
	this.videos = {};
	this.messages = {};	// Diccionario de mensaje
	this.users = data.perfilesUsuarios;
	/* Convierte la estructura de partida en un árbol para d3js */
	function makeInfoTree(info) {
		var messages = info.mensajes;
		var index = {};
		var rootMsg = messages[0];
		index[rootMsg.idMsg] = rootMsg;
		var replies = messages.slice(1);
		replies.forEach(function(m) {
			var parentID = m.idMsgRespuesta;
			var parentObj = index[parentID];
			var children = (parentObj.children || (parentObj.children = []));
			children.push(m);
			index[m.idMsg] = m;
			messageProcessor(m);
		});
		return rootMsg;
	};
	function messageProcessor(m) {
		var id = m.idMsg;
		var users = THAT.users;
		var images = THAT.images;
		THAT.messages[id] = m;
		// usuario
		var userID = m.usuarioOrigen;
		var userMsgs = users[userID].messages || (users[userID].messages = []);
		userMsgs.push(id);
		// imagen
		if (m.cont_adicional) {
			var item = images[m.cont_adicional] || (images[m.cont_adicional] = {ids: []});
			item.ids.push(id);
		};
	};

	function insertMessage(id, clean) {
		var $ouput = $('#chart-ouput');
		if (typeof clean == "undefined") clean=true;
		if (clean) $ouput.empty();
		if (isArray(id)) id.forEach(function(i) {insertMessage(i, false);});
		else {
			$ouput.append(createMessage(THAT.messages[id]));	
		};
	};

	this.populateUsers = function() {
		var theUsers = makeArray(THAT.users);
		var li = d3.select("#users-list").selectAll("li").data(theUsers);
		li.enter().append("li")
			.text(function(d){return "@"+d.__key})
			.on("mouseover", function(d) {
				d3.selectAll("g.node")
					.attr("opacity", function(n) {
						return (n.usuarioOrigen == d.__key) ? 1 : .1;
					});
			})
			.on("click", function(d) {
				insertMessage(THAT.users[d.__key].messages);
			});
	};
	this.populateImages = function() {
		var theImages = makeArray(THAT.images);
		console.log("....", theImages)
		var li = d3.select("#images-list").selectAll("li").data(theImages);
		li.enter().append("img")
			.attr("src", function(d){return d.__key})
			.on("mouseover", function(d) {
				d3.selectAll("g.node")
					.attr("opacity", function(n) {
						return (n.cont_adicional == d.__key) ? 1 : .1;
					});
			})
			.on("click", function(d) {
				d.ids.forEach(function(id) {
					insertMessage(id);
					updateButtons();
				});
			});
	};
	// PRocesamiento de los datos:
	this.tree = makeInfoTree(data);
};


function populateVideos(videos) {

};
function populateWords(words) {

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
	var RADIUS_DEFAULT = 3,
		RADIUS = RADIUS_DEFAULT;
	// Manipulación de los datos
	console.log(data);
	var PROCESSOR = new DataProcessor(data);
	PROCESSOR.populateUsers();
	PROCESSOR.populateImages();
	var root = PROCESSOR.tree;
	console.log(root);

	var center = {x: window.innerWidth/2, y: window.innerHeight/2};
	console.log(center);

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
			//vector = [center.x+vector[0], center.y+vector[1]];
			chart.attr("transform", d3Translate(vector) + d3Scale(d3.event.scale));
			RADIUS = RADIUS_DEFAULT / d3.event.scale;
		})
		.on("zoomend", function() {
			svg.selectAll(".node circle")
				.transition().duration(duration)
				.attr("r", RADIUS);	// escalado de los nodos
		});
	var svg = d3.select("body").insert("svg", "#chart-control")
		.on("dblclick", function() {
			zm.translate([diameter/2,diameter/2]);
			zm.scale(1);
			zm.event(svg);
		})
		.call(zm)
		.on("dblclick.zoom", null);
	var chart = svg.append("g");
		// .attr("transform", d3Translate([center.x,center.y]))
		// .append("g");
	
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
					$thisMsg = $("<div>").attr("id", "current-message")
						.append(createMessage(d).css("left", d3.event.offsetX+"px").css("top", d3.event.offsetY))
						.appendTo('body');
					// Función de zoom local
					// chart.selectAll(".node circle")
					// 	.transition().duration(duration)
					// 	.attr("r", function(near) {
					// 		var dx = Math.abs(near.x-d.x);
					// 		var dy = Math.abs(near.y-d.y);
					// 		if ((dx<5) && (dy<5)) {
					// 			return 10 - (8/25) * (dx*dx+dy*dy);
					// 		};
					// 		return 2;
					// 	});

				})
				.on("mouseleave", function() {
					$("#current-message").remove();
					chart.selectAll(".node circle")
						.transition().duration(duration)
						.attr("r", 2);
				});
			nodeEnter.append("circle")
				.attr("r", RADIUS);
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
 var TEST = 0;
if ((typeof SAMPLE_DATA != "undefined") && (typeof TEST != "undefined")) {
	if (TEST === 0) {
		new TalkVisualizer(SAMPLE_DATA._testMedium);
	} else if (TEST === 1) {
		new TalkVisualizer(SAMPLE_DATA._testBig);
	}
} else {
	chrome.runtime.onMessage.addListener (
		function(request, sender) {
			console.log(request);
			new TalkVisualizer(request.info);
		});	
};

