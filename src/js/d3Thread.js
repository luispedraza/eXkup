var PREPOSICIONES = {a:true,ante:true,bajo:true,cabe:true,con:true,contra:true,de:true,desde:true,durante:true,en:true,entre:true,hacia:true,hasta:true,mediante:true,para:true,por:true,según:true,sin:true,so:true,sobre:true,tras:true,versus:true,vía:true};
var VISUALIZER = null;


function dispatchFilterUser(username, filter) {
	var e = document.createEvent("CustomEvent");
	var detail = {'user': username, 'type': filter ? "add" : "remove"};
	e.initCustomEvent("updateFilter", false, false, detail);
	document.getElementById("svg").dispatchEvent(e);
};

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

function populateMessages(tree) {
	function expandElement($e) {
		$e.addClass("current")
			.add($e.parents(".msg-container")).addClass("on").css("width", "100%").siblings().css( "width", "0" );
	};
	function collapseElement($e) {
		$e.add($e.find(".msg-container.on")).each(function() {
			var $this = $(this);
			var width = (100 / ($this.siblings().length + 1)) + "px";
			$this.removeClass('on current').css("width", width).siblings().css( "width", width);
		});
	};
	function accordion(event) {
		var $element = $(this);
		event.stopPropagation();
		var $children = $element.children();
		var nChildren = $children.length;
		if (nChildren == 1) return;	// sólo hay un hijo, no tiene sentido lupa
		if($children.filter(".on").length) return;	// hay un mensaje hijo mostrado 

		var offset = $element.offset();
		var x = event.pageX - offset.left;	// origen de coordenadas de la función coseno: (cos(theta)+1)/2
		var width = $element.width();
		var span = width/nChildren;
		var sum = 0;
		var m = Math.min(nChildren, 30);		// número de elementos que sufren transformación
		var virtualSpan = width/m;			// span virtual, considerando solo elementos transformables
		var xScale = virtualSpan/span;
		$children.each(function(i) {
			var xPos = ((i*span+span/2)-x) * xScale;
			if (Math.abs(xPos)<=(width/2)) {
				var xTheta = xPos*(2*Math.PI/width);
				sum += (Math.cos(xTheta)+1)/2;
			};
		});
		// var k = width/sum;
		var k = 100/sum;
		$children.each(function(i) {
			var xPos = ((i*span+span/2)-x) * xScale;
			if (Math.abs(xPos)<=(width/2)) {
				var xTheta = xPos*(2*Math.PI/width);
				$(this).css("width", (k*(Math.cos(xTheta)+1)/2) + "%");
			} else {
				$(this).css("width", "0px");
			};
		});
		return false;
	};
	function accordionReset() {
		$(this).find(".msg-container:not(.on)").css("width","");
	};
	function appendMessage(msg, $container) {
		var $msg = createMessage(msg);
		$msg.data = msg;
		var $msgContainer = $("<div>").addClass('msg-container').appendTo($container);
		$msgContainer.on("click", function(e) {
			e.stopPropagation();
			var $this = $(this);
			if ($this.hasClass('on')) {
				var width = (100 / ($this.siblings().length + 1)) + "px";
				collapseElement($(this));
			} else {
				expandElement($(this));
			};
		});
		$msgContainer.append($msg);
		if (msg.children) {
			var children = msg.children.filter(function(c) {
				return c.needed;
			});
			if (children.length) {
				var $childrenContainer = $("<div>").addClass('children-container').appendTo($msgContainer);
				$childrenContainer
				.on("mousemove", accordion)
				.on("mouseleave", accordionReset);
				var width = (100/msg.children.length) +  "%";
				children.forEach(function(m) {
					appendMessage(m, $childrenContainer);//.css("width", width);
				});
			};
		};
		return $msgContainer;
	};
	$mainContainer = $("#chart-ouput").empty();
	$rootContainer = $("<div>").addClass('children-container').appendTo($mainContainer);
	appendMessage(tree, $rootContainer).addClass('on').off();		// conversación de mensajes
};

/* Función principal de procesamiento de datos
	@param data: datos obtenidos de la api para una conversación
	@ param hidden: inicialmente todas las respuestas están ocultas
*/
function DataProcessor(data, hide) {
	if (typeof hide == "undefined") hide = false;
	var THAT = this;
	this.words = {};
	this.images = {};
	this.videos = {};
	this.messages = {};	// Diccionario de mensaje
	this.users = data.perfilesUsuarios;
	/* Convierte la estructura de partida en un árbol para d3js */
	function makeInfoTree(info) {
		var messages = info.mensajes;
		var index = {};		// variable auxiliar para encontrar rápido los mensajes
		var rootMsg = messages[0];
		rootMsg.filtered = true;	// el raíz nunca eas filtrado
		rootMsg.needed = true;		// es necesario mostrar este mensaje siempre
		index[rootMsg.idMsg] = rootMsg;
		var replies = messages.slice(1);
		rootMsg.referencesCounter = 0;
		replies.forEach(function(m) {
			var parentID = m.idMsgRespuesta;
			var parentObj = index[parentID];
			m.parent = parentObj;	// el padre de este mensaje
			var children = (parentObj.children || (parentObj.children = []));
			children.push(m);

			m.filtered = !hide;
			m.needed = !hide;			// necesidad de mostrar el elemento
			m.referencesCounter = 0;	// contador de referencias a este objeto

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
			var imgMsgs = images[m.cont_adicional] || (images[m.cont_adicional] = {messages: []});
			imgMsgs.messages.push(id);
		};
	};
	/* Filtrado de resultados en el árbol 
		@param filter. de la forma {user: username, word: word, photo: photo_url, video, video_url}
	*/
	this.filterAdd = function(filter, node) {
		function addFound(msg) {
			var parent = msg.parent;
			if (!parent) return;
			parent.needed = true;
			parent.referencesCounter++; // se incrementa el contador (número de nodos que dependen de él)
			var pChildren = (parent.children || (parent.children = []));
			if (pChildren.indexOf(msg)>=0) return;	// ya es visible
			// ¿Es un nodo colapsado?
			var pCollapsed = parent._children;
			if (pCollapsed) {
				var index = pCollapsed.indexOf(msg);
				if (index>=0) {
					parent.children = pChildren.concat(pCollapsed.splice(index, 1));
				};
			};
			addFound(parent);
		};
		if (typeof node === "undefined") {
			node = THAT.tree;	// el nodo raíz, que nunca se oculta o filtra
		} else if (filter.user) {
			if ((filter.user == "*")||(node.usuarioOrigen == filter.user)) {
				node.filtered = true;
				node.needed = true;
				addFound(node);
			};
		};
		if (node.children) {
			// recursión sobre los hijos
			var children = node.children;
			for (var i=children.length-1; i>=0; i--) {
				THAT.filterAdd(filter, children[i]);
			};
		};
		if (node._children) {
			// recursión sobre los hijos ocultos
			var _children = node._children;
			for (var i=_children.length-1; i>=0; i--) {
				THAT.filterAdd(filter, _children[i]);
			};
		};
	};
	/* Eliminación de un filter
		@return: la necesidad de este nodo
	*/
	this.filterRemove = function(filter, node) {
		function removeFound(msg) {
			var parent = msg.parent;
			if (!parent) return;
			parent.referencesCounter--;
			if (parent.referencesCounter==0) parent.needed = false;
			removeFound(parent);
		};
		if (typeof node === "undefined") {
			node = THAT.tree;	// el nodo raíz, que nunca se oculta o filtra
		} else if (filter.user) {
			if ((filter.user == "*")||(node.usuarioOrigen == filter.user)) {
				node.filtered = false;
				removeFound(node);
			};
		};
		if (node.children) {
			// recursión sobre los hijos
			var children = node.children;
			for (var i=children.length-1; i>=0; i--) {
				THAT.filterRemove(filter, children[i]);
			};
		};
		if (node._children) {
			// recursión sobre los hijos ocultos
			var _children = node._children;
			for (var i=_children.length-1; i>=0; i--) {
				THAT.filterRemove(filter, _children[i]);
			};
		};
	};
	// Procesamiento de los datos:
	this.tree = makeInfoTree(data);
};

function ConversationController(processor) {
	var PROC = processor;
	function insertMessage(id, clean) {
		var $ouput = $('#chart-ouput');
		if (typeof clean == "undefined") clean=true;
		if (clean) $ouput.empty();
		if (isArray(id)) id.forEach(function(i) {insertMessage(i, false);});
		else {
			$ouput.append(createMessage(THAT.messages[id]));	
		};
	};
	function populateUsers() {
		var theUsers = makeArray(PROC.users);
		var li = d3.select("#users-list").selectAll("li").data(theUsers);
		li.enter().append("li")
			.text(function(d){return "@"+d.__key})
			.attr("class", "check")
			.on("mouseover", function(d) {
				d3.selectAll("g.node")
					.attr("opacity", function(n) {
						return (n.usuarioOrigen == d.__key) ? 1 : .1;
					});
			})
			.on("mouseout", function(d) {
				d3.selectAll("g.node")
					.attr("opacity", 1);
			})
			.on("click", function(d) {
				$this = $(this);
				$this.toggleClass('on');
				dispatchFilterUser(d.__key, $this.hasClass('on'));
				// insertMessage(THAT.users[d.__key].messages);
			});
	};
	function populateImages() {
		var theImages = makeArray(PROC.images);
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
				d.messages.forEach(function(id) {
					// insertMessage(id);
					// updateButtons();
				});
			});
	};
	function populateVideos(videos) {

	};
	function populateWords(words) {

	};
	this.populate = function() {
		populateUsers();
		populateImages();
		populateVideos();
		populateWords();
	};
};

function expandToElement(root, callbackCondition) {
	if (root.children) {
		root.children.forEach(function() {

		});
	};
};

// visualización en árbol:
function TalkVisualizer(data) {
	var RADIUS_DEFAULT = 4,
		RADIUS = RADIUS_DEFAULT;
	// Manipulación de los datos
	// console.log(data);
	// console.log(JSON.stringify(data));
	var PROCESSOR = new DataProcessor(data, true);
	var CONTROLLER = new ConversationController(PROCESSOR);

	var root = PROCESSOR.tree;
	console.log(root);

	var center = {x: window.innerWidth/2, y: window.innerHeight/2};

	var node_index = 0,
	    duration = 500;

	// Funciones de dibujo:
	var diameter = 960;
	var treeLayout = d3.layout.tree()
		.size([360, diameter / 2 - 120])
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

	var diagonal = d3.svg.diagonal.radial()
		.projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
	
	/* zoom behavior: */
	var zm = d3.behavior.zoom()
		.scaleExtent([.25,8])
		.on("zoom", function() {
			var vector = d3.event.translate;
			// vector = [center.x+vector[0], center.y+vector[1]];
			chart.attr("transform", d3Translate(vector) + d3Scale(d3.event.scale));
			RADIUS = RADIUS_DEFAULT / d3.event.scale;
		})
		.on("zoomend", function() {
			chart.selectAll(".node circle")
				.transition().duration(duration)
				.attr("r", RADIUS);	// escalado de los nodos
		});
	var svg = d3.select("body").insert("svg", "#chart-control")
		.attr("id", "svg")
		.on("dblclick", function() {
			zm.translate([0,0]);
			zm.scale(1);
			zm.event(svg);
		})
		.call(zm)
		.on("dblclick.zoom", null);

	var chart = svg.append("g")
				.attr("transform", d3Translate([center.x,center.y]))
				.append("g").attr("id", "chart");

	/* Actualización de filtros */
	document.getElementById("svg").addEventListener("updateFilter", function(e) {
		var type = e.detail.type;
		if (type==="add") {
			PROCESSOR.filterAdd(e.detail);
			update();
		} else if (type==="remove") {
			PROCESSOR.filterRemove(e.detail);
			update();
		};
	});
	
	//root.children.forEach(collapse);
	// collapse(root);

	CONTROLLER.populate();
	
	var nodes, links;
	var $currentMessage = null;
	update();

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
	/* Colapsa los nodos de la estructura de datos de árbol */
	function collapse(d) {
		if (d.children.length) {
	  		d._children = d.children;
	  		d._children.forEach(collapse);
	  		d.children = null;
		};
	};
	function nodePosition(d) {  return d3Rotate(d.x-90) + d3Translate(d.y); };
	function nodePosition0(d) { return d3Rotate(d.x0-90) + d3Translate(d.y0); };

	/* Principal función de actualización */
	function update(source) {
		if (typeof source == "undefined") source = root;
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
					// chart.selectAll(".node circle")
					// 	.transition().duration(duration)
					// 	.attr("r", RADIUS);
				});
			nodeEnter.append("circle")
				.attr("r", function(d) {
					return d.filtered ? RADIUS : 1e-6;
				});
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
				.attr("transform", nodePosition)
				.select("circle")
				.attr("r", function(d) {
					return d.filtered ? RADIUS : 1e-6;
				});
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
				})
				.attr("stroke", "#fff");
			// Transición a nueva posición
			link.transition()
				.duration(duration)
				.attr("d", diagonal)
				.attr("stroke", function(d) {
					return d.target.needed ? "#999" : "#fff";
				});
			// Transition exiting nodes to the parent's new position.
			link.exit().transition()
				.duration(duration)
				.attr("d", function(d) {
					var o = {x: source.x, y: source.y};
					return diagonal({source: o, target: o});
				})
				.attr("stroke", "#fff")
				.remove();
		};
		function updateSVG() {
			updateNodes();
			updateTreeLinks();
		};
		populateMessages(root);	// los mensajes de la barra izquierda
		nodes = treeLayout.nodes(root); //.reverse()
		links = treeLayout.links(nodes);
		updateSVG();
		// Stash the old positions for transition.
		stashPositions();
		
	};
};

/* se obtiene la información de la extensión */
var TEST = 0;

if ((typeof SAMPLE_DATA != "undefined") && (typeof TEST != "undefined")) {
	if (TEST === 0) {
		VISUALIZER = new TalkVisualizer(SAMPLE_DATA._testTiny);
	} else if (TEST === 1) {
		VISUALIZER = new TalkVisualizer(SAMPLE_DATA._testSmall);
	} else if (TEST === 2) {
		VISUALIZER = new TalkVisualizer(SAMPLE_DATA._testMedium);
	} else if (TEST === 3) {
		VISUALIZER = new TalkVisualizer(SAMPLE_DATA._testBig);
	};
} else {
	chrome.runtime.onMessage.addListener (
		function(request, sender) {
			VISUALIZER = new TalkVisualizer(request.info);
		});	
};

/* EVENTOS */
// selección de todos los usuarios
$("#check-all-users").on("click", function() {
	var $this = $(this);
	$this.toggleClass('on');
	$("#users-list li").toggleClass('on', $this.hasClass('on'));
	dispatchFilterUser("*", $this.hasClass('on'))
});

