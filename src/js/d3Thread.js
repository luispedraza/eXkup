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
			var children = msg.children;
			var $childrenContainer = $("<div>").addClass('children-container').appendTo($msgContainer)
				.on("mousemove", accordion)
				.on("mouseleave", accordionReset);
			var width = (100/msg.children.length) +  "%";
			children.forEach(function(m) {
				appendMessage(m, $childrenContainer).addClass(m.filtered ? "filter" : "nofilter");
			});
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
function DataProcessor(data, hideAll) {
	if (typeof hideAll == "undefined") hideAll = false;
	var THAT = this;
	this.words = {};
	this.images = {};
	this.videos = {};
	this.messages = {};	// Diccionario de mensajes, ESCLUIDO EL RAIZ
	this.users = data.perfilesUsuarios;
	/* Convierte la estructura de partida en un árbol para d3js */
	function makeInfoTree(info, hideAll) {
		var index = THAT.messages;
		var messages = info.mensajes;
		var rootMsg = messages[0];
		rootMsg.filtered = true;		// el raíz nunca eas filtrado
		messageProcessor(rootMsg);
		var replies = messages.slice(1);
		replies.forEach(function(m) {
			var parentObj = index[m.idMsgRespuesta];
			m.parent = parentObj;		// el padre de este mensaje
			if (hideAll) {
				var pHidden = (parentObj._hidden || (parentObj._hidden = []));
				pHidden.push(m);			// se agrega como hijo  OCULTO del padre
				m.filtered = false;
			} else {
				var pChildren = (parentObj.children || (parentObj.children = []));
				pChildren.push(m);			// se agrega como hijo del padre
				m.filtered = true;
				parentObj.referencesCounter++;
			};
			messageProcessor(m);		// procesamiento del mensaje para extraer información
		});
		return rootMsg;
	};
	function messageProcessor(m) {
		var id = m.idMsg;
		THAT.messages[id] = m;
		// referencias 
		m.referencesCounter = 0;	// contador de referencias a este objeto
		// usuario
		var author = THAT.users[m.usuarioOrigen];	// autor del mensaje
		if (author.nMessages) author.nMessages++; else author.nMessages=1;
		var authorReplied = THAT.users[m.autorMsgRespuesta];
		if (authorReplied.nReplies) authorReplied.nReplies++; else authorReplied.nReplies=1;
		m.author = author;
		var userMsgs = author.messages || (author.messages = []);
		userMsgs.push(id);	// todos los mensajes de este usuario
		// imagen
		var images = THAT.images;
		if (m.cont_adicional) {
			var content = m.cont_adicional;
			var imgElement = images[content] || (images[content] = {'messages': []});
			imgElement.messages.push(id);
		};
		// Número de palabras:
		if (author.nWords) author.nWords+=12; else author.nWords=12;
	};

	/* Filtrado de mensajes */
	this.filter = function(filter) {
		function addFound(msg) {
			var parent = msg.parent;
			if (!parent) return;
			parent.referencesCounter++; 	// se incrementa el contador (número de nodos que dependen de él)
			var pChildren = (parent.children || (parent.children = []));
			if (pChildren.indexOf(msg)<0) {
				if (parent._hidden) {					// ¿Es un nodo oculto?
					var pHidden = parent._hidden;
					var index = pHidden.indexOf(msg);
					if (index>=0) {
						parent.children = pChildren.concat(pHidden.splice(index, 1));
						addFound(parent);
						return;
					};
				};
				if (parent._children) { 			// ¿Es un nodo colapsado?
					var pCollapsed = parent._children;
					var index = pCollapsed.indexOf(msg);
					if (index>=0) {
						parent.children = pChildren.concat(pCollapsed.splice(index, 1));
						addFound(parent);
						return;
					};
				};
			};
			addFound(parent);
		};
		function removeFound(msg) {
			var parent = msg.parent;
			if (!parent) return;
			parent.referencesCounter--;
			var needed = (msg.filtered || (msg.referencesCounter!=0));		// necesidad del elemento
			if (!needed) {
				var pHidden = (parent._hidden || (parent._hidden = []));
				if (pHidden.indexOf(msg)<0) {		
					if (parent.children) {				// ¿Es un nodo visible?
						var pChildren = parent.children;
						var index = pChildren.indexOf(msg);
						if (index>=0) {
							parent._hidden = pHidden.concat(pChildren.splice(index, 1));
							removeFound(parent);
							return;
						};
					} else if (parent._children) {		// ¿Es un nodo colapsado?
						var pCollapsed = parent._children;			
						var index = pCollapsed.indexOf(msg);
						if (index>=0) {
							parent.children = pChildren.concat(pCollapsed.splice(index, 1));
							removeFound(parent);
							return;
						};
					};
				};
			};
			removeFound(parent);
		};
		function evaluateMessage(m, add) {
			m.filtered = add;								// true si se agrega el filtro, false si se elimina
			(add) ? addFound(m) : removeFound(m);
		};
		var filterAdd = (filter.type === "add");
		var allMessages = THAT.messages;
		if (filter.user) {
			if (filter.user == "*") {
				for (m in allMessages) evaluateMessage(allMessages[m], filterAdd);
			} else  {
				var mIDs = THAT.users[filter.user].messages;	// array de ids de mensajes del usuario
				mIDs.forEach(function(id) {
					evaluateMessage(allMessages[id], filterAdd);
				});
			};
		};			
	};
	// Procesamiento de los datos:
	this.tree = makeInfoTree(data, hideAll);
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
	var USER_COLOR = new ColorGenerator();
	// Manipulación de los datos
	// console.log(data);
	// console.log(JSON.stringify(data));
	var PROCESSOR = new DataProcessor(data, true);

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
		PROCESSOR.filter(e.detail);
		update();
	});
	
	//root.children.forEach(collapse);
	// collapse(root);

	var nodes, links;
	var $currentMessage = null;
	populateController();
	update();

	function populateController() {
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
			var theUsers = sortArray(makeArray(PROCESSOR.users), "__key");
			$("#n-users").text("("+theUsers.length+")");
			var $list = $("#users-list");
			theUsers.forEach(function(user) {
				var $row = $("<li>").addClass("item")
					.append($("<span>").addClass("check").text("@"+user.__key).attr("data-user", user.__key)
						.on("mouseover", function() {
							var username = this.getAttribute("data-user");
							d3.selectAll("g.node circle")
							.transition().duration(duration)
							.attr("r", function(n) {
								return (n.usuarioOrigen == username) ? (RADIUS*3) : RADIUS;
							});
						})
						.on("mouseout", function() {
							d3.selectAll("g.node circle").attr("r", RADIUS);			
						})
						.on("click", function() {
							var username = this.getAttribute("data-user");
							var user = PROCESSOR.users[username];
							user.color = user.color || (user.color = USER_COLOR.get());	// color asignado a este usuario
							dispatchFilterUser(username, $(this).toggleClass('on').hasClass('on'));
							$(this).closest("li").find(".color-picker").css("background-color", user.color).find("input").val(user.color);
						}))
					.append($("<span>").addClass("color-picker")
						.append($("<input>").attr("type", "color")
							.on("change", function(e) {
								var newColor = this.value;
								$(this).closest('.color-picker').css("background-color", newColor);
							})))
					.append($("<span>").text(user.nMessages))
					.append($("<span>").text(user.nWords))
					.append($("<span>").text(user.nReplies));
				$row.get(0).user = user;
				$list.append($row);	// guardamos también el usuario correspondientes
			});
		};
		function populateImages() {
			var theImages = makeArray(PROCESSOR.images);
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
		populateUsers();
		populateImages();
		populateVideos();
		populateWords();
	};

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
				.attr("r", function(d) {return RADIUS})
				.attr("fill", function(d) {return d.filtered ? (d.author.color || "#f30") : "#eee"});
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
				.attr("fill", function(d) {return d.filtered ? (d.author.color || "#f30") : "#eee"});
			// nodeUpdate.select("text")
			// 	.attr("transform", LAYOUT.textTransform)
			// 	.attr("text-anchor", LAYOUT.textAnchor)
			// 	.style("fill-opacity", 1);
			
			// Transition exiting nodes to the parent's new position.
			var nodeExit = node.exit().transition().duration(duration)
				.attr("transform", function(d) { return nodePosition(source); })
				.remove();
			nodeExit.select("circle")
				.transition().duration(duration)
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
				.attr("stroke", "#999");
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
		populateMessages(root);	// los mensajes de la barra izquierda
		nodes = treeLayout.nodes(root); //.reverse()
		links = treeLayout.links(nodes);
		updateSVG();
		// Stash the old positions for transition.
		stashPositions();
	};
};

/* se obtiene la información de la extensión */
var TEST = 1;

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

function sortUsers(sorting) {
	var $list = $("#users-list");
	var $items = $list.find("li");
	$items = $items.sort(function(a,b) {
		if (sorting=="nickname") {
			if (a.user.__key < b.user.__key) return -1;
			else if (a.user.__key > b.user.__key) return 1;
			return 0;
		} else {	// valores numéricos
			if ((a.user[sorting]||0) > (b.user[sorting]||0)) return -1;
			else if ((a.user[sorting]||0) < (b.user[sorting]||0)) return 1;
			return 0;
		};
	});
	$items.detach().appendTo($list);
};

/* EVENTOS */
// selección de todos los usuarios
$("#check-all-users").on("click", function() {
	var $this = $(this);
	$this.toggleClass('on');
	$("#users-list .check").toggleClass('on', $this.hasClass('on'));
	dispatchFilterUser("*", $this.hasClass('on'))
});
$("#sort-nickname").on("click", function() {
	sortUsers("nickname");
});
$("#sort-nmessages").on("click", function() {
	sortUsers("nMessages");
});
$("#sort-nwords").on("click", function() {
	sortUsers("nWords");
});
$("#sort-nreplies").on("click", function() {
	sortUsers("nReplies");
});
$(".expand").on("click", function() {
	$this = $(this);
	$this.toggleClass('on');
	var $expandable = $(this).closest(".expandable");
	var newSize = "";
	if ($this.hasClass('on')) {
		var newSize = $expandable.attr("data-width");
		if (newSize=="max") {
			newSize = (window.innerWidth - $expandable.offset().left - 20) + "px";
		};
	};
	$expandable.css("width", newSize);
	
});
