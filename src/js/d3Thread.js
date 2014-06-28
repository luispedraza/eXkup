var PREPOSICIONES = {a:true,ante:true,bajo:true,cabe:true,con:true,contra:true,de:true,desde:true,durante:true,en:true,entre:true,hacia:true,hasta:true,mediante:true,para:true,por:true,según:true,sin:true,so:true,sobre:true,tras:true,versus:true,vía:true};
var ARTICULOS = {el:true, la:true, los:true, las:true, un:true, una:true, unos:true, unas:true};
var VISUALIZER = null;


var USER_COLOR = new ColorGenerator();

/* Obtiene el color de pintado para un mensaje dado */
function getMsgColor(msg) {
	return msg.selected ? msg.author.color : "#ccc";
};
function getUserColor(user) {
	return user.selected ? user.color : "#ccc";
};


function dispatchSelectUser(username, add) {
	var e = document.createEvent("CustomEvent");
	var detail = {'user': username, 'add': add};
	e.initCustomEvent("updateSelection", false, false, detail);
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
	function toggleElement(event) {
		event.stopPropagation();
		var $this = $(this);
		if ($this.hasClass('on')) {	// colapsar
			$this.add($this.find(".msg-container.on")).each(function() {
				$(this).removeClass('on current').css("width", "")
					.find(".message").remove();
				this.msg = this._msg; this._msg = null;
			});
		} else {	// expandir
			$this.addClass("current")
				.add($this.parents(".msg-container")).addClass("on").css("width", "100%")
				.each(function() {
					if (this.msg) {
						$(this).find("> .handle").append(createMessage(this.msg));
						this._msg = this.msg; this.msg = null;
					};
				})
				.siblings().css( "width", "0" );
		};
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
	function accordionReset() {$(this).find(".msg-container:not(.on)").css("width","");};
	function appendMessage(msg, $container) {
		var $msgContainer = $("<div>").addClass('msg-container').appendTo($container)
			.attr("data-user", msg.usuarioOrigen)
			.append($("<div>").addClass('handle').css("background-color", getMsgColor(msg)))
			.on("click", toggleElement)	// muestra u oculta la conversación
		$msgContainer.get(0).msg = msg; // guardamos el mensaje con el elemento
		if (msg.children) {
			var children = msg.children;
			var $childrenContainer = $("<div>").addClass('children-container').appendTo($msgContainer)
				.on("mousemove", accordion)
				.on("mouseleave", accordionReset);
			children.forEach(function(m) {
				appendMessage(m, $childrenContainer).addClass(m.selected ? "sel" : "nosel");
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
	function initUsers(users) {
		var userNicknames = Object.keys(users);
		var nUsers = Object.keys(users).length;
		userNicknames.forEach(function(u,i) {
			var user = users[u];
			user.color = d3.hsl(i*360/nUsers, .5, .5).toString();
			user.selected = !hideAll;
		});
	};
	function messageProcessor(m) {
		var id = m.idMsg;
		THAT.messages[id] = m;
		// referencias 
		m.referencesCounter = 0;	// contador de referencias a este objeto
		// usuario
		var author = THAT.users[m.usuarioOrigen];	// autor del mensaje
		if (author.nMessages) author.nMessages++; else author.nMessages=1;
		if (m.borrado) {
			if (author.nDeleted) author.nDeleted++; else author.nDeleted=1;
		};
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
		// vídeos:
		var $msg = $("<div>").html(m.contenido);
		var links = findVideos($msg);
		var content = $msg.text();
		
		// Número de palabras:
		var words = THAT.words;
		var count = 0;
		content.replace(/\W+/g, " ").replace(/ +/g, " ")
			.toLowerCase().split(" ")
			.forEach(function(w) {
				if (!PREPOSICIONES[w] && !ARTICULOS[w]) {
					words[w] ? (words[w].n++) : (words[w]={n:1});
					count++;
				};
			});
		if (author.nWords) author.nWords+=count; else author.nWords=count;
	};
	function computeFrequencies() {
		var frequency = {};
		var maxFreq = 0;
		function addMessage(m) {
			var msgTS = roundTimeHour(m.tsMensaje*1000)/1000;
			var ts = frequency[msgTS];
			ts ? (ts.y++) : (ts = frequency[msgTS] = {y:1});
			maxFreq = Math.max(maxFreq, ts.y);
			if (m.children) m.children.forEach(addMessage);
		};
		addMessage(THAT.tree);
		var data = THAT.freq.data = sortNumArray(makeIntArray(frequency, "x"), "x");
		data.fRange = [0, maxFreq];
		data.tsRange = [data[0].x, data.slice(-1)[0].y];
	};

	/* Selección de mensajes */
	this.select = function(selector) {
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
			var needed = (msg.selected || (msg.referencesCounter!=0));		// necesidad del elemento
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
							parent._hidden = pHidden.concat(pCollapsed.splice(index, 1));
							removeFound(parent);
							return;
						};
					};
				};
			};
			removeFound(parent);
		};
		/* Evaluación de un mensaje 
			@param select: true para agregar, false para eliminar
		*/
		function evaluateMessage(m, select) {
			if (m.selected == select) return; // el mensaje no cambia su estado de selección
			m.selected = select; // true si se agrega el filtro, false si se elimina
			(select) ? addFound(m) : removeFound(m);
		};
		var allMessages = THAT.messages;
		if (selector.user) {
			if (selector.user == "*") {
				for (m in allMessages) evaluateMessage(allMessages[m], selector.add);
			} else  {
				var mIDs = THAT.users[selector.user].messages;	// array de ids de mensajes del usuario
				mIDs.forEach(function(id) {
					evaluateMessage(allMessages[id], selector.add);
				});
			};
		};
		computeFrequencies();	// recalcular frecuencias para el nuevo conjunto de mensajes
	};
	// Procesamiento de los datos:
	if (typeof hideAll == "undefined") hideAll = false;
	var THAT = this;
	this.words = {};
	this.images = {};
	this.videos = {};
	this.messages = {};	// Diccionario de mensajes, ESCLUIDO EL RAIZ
	this.users = data.perfilesUsuarios;	
	this.freq = {}; 	// frecuencias de mensajes para la selección actual

	var index = THAT.messages;
	var messages = data.mensajes;
	var rootMsg = messages[0];
	rootMsg.selected = true;			// el raíz nunca es filtrado

	// var endTS = roundTimeHour(messages.slice(-1)[0].tsMensaje*1000);	// final de tiempos
	messageProcessor(rootMsg);
	var replies = messages.slice(1);
	if (hideAll) {
		replies.forEach(function(m) {
			var parentObj = index[m.idMsgRespuesta];
			m.parent = parentObj;		// el padre de este mensaje
			var pHidden = (parentObj._hidden || (parentObj._hidden = []));
			pHidden.push(m);			// se agrega como hijo  OCULTO del padre
			m.selected = false;
			messageProcessor(m);		// procesamiento del mensaje para extraer información
		});
	} else {
		replies.forEach(function(m) {
			var parentObj = index[m.idMsgRespuesta];
			m.parent = parentObj;		// el padre de este mensaje
			var pChildren = (parentObj.children || (parentObj.children = []));
			pChildren.push(m);			// se agrega como hijo del padre
			m.selected = true;
			parentObj.referencesCounter++;
			messageProcessor(m);		// procesamiento del mensaje para extraer información
		});
	};
	this.tree = rootMsg;
	computeFrequencies();
	initUsers(this.users);
};

// visualización en árbol:
function TalkVisualizer(data) {
	var RADIUS_DEFAULT = 5,
		RADIUS = RADIUS_DEFAULT
		NODE_BORDER_DEFAULT = 1,
		NODE_BORDER = NODE_BORDER_DEFAULT+"px";
	// Manipulación de los datos
	// console.log(data);
	console.log(JSON.stringify(data));
	var PROCESSOR = new DataProcessor(data, true);
	var FREQUENCIES = new FrequencyVisualizer("#d3-frequency", PROCESSOR);

	var root = PROCESSOR.tree;
	root.x0 = root.y0 = 0;
	console.log(root);


	var container = document.querySelector("#d3-chart"),
		rect = container.getBoundingClientRect(),
		width = rect.width,
		height = rect.height;
	var center = {x: width/2, y: height/2};

	var node_index = 0,
	    duration = 500;

	var diagonal = d3.svg.diagonal.radial()
		.projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
	
	/* zoom behavior: */
	var zm = d3.behavior.zoom()
		.scaleExtent([.25,8])
		.on("zoom", function() {
			var vector = d3.event.translate;
			var scale = d3.event.scale;
			// vector = [center.x+vector[0], center.y+vector[1]];
			svg.attr("transform", d3Translate(vector) + d3Scale(scale));
			RADIUS = RADIUS_DEFAULT / scale;
			NODE_BORDER = (NODE_BORDER_DEFAULT / scale)+"px";
		})
		.on("zoomend", function() {
			svg.selectAll(".node circle")
				.transition().duration(duration)
				.attr("r", RADIUS);	// escalado de los nodos
		});
	var svg = d3.select("#d3-chart").append("svg")
		.attr("id", "svg")
		.on("dblclick", function() {
			zm.translate([0,0]);
			zm.scale(1);
			zm.event(svg);
		})
		.call(zm)
		.on("dblclick.zoom", null)
		.append("g");

	var chart = svg
				.append("g").attr("id", "chart")
				.attr("transform", d3Translate([center.x,center.y]));

	/* Actualización de filtros */
	document.getElementById("svg").addEventListener("updateSelection", function(e) {
		PROCESSOR.select(e.detail);
		update();
	});
	
	//root.children.forEach(collapse);
	// collapse(root);

	var nodes, links;
	var $currentMessage = null;
	populateController();
	function configureLayout (layout) {
		if (typeof layout == "undefined") layout = "tree";
		LAYOUT_TYPE = layout;
		if ((layout=="tree")||(layout=="timeline")) {
			var xSize, ySize; 
			if (layout=="tree") {
				xSize = 360; ySize = Math.min(width, height)/2-50;
					nodePosition = radialNodePosition;
					nodePosition0 = radialNodePosition0;
					chart.transition().duration(duration)
						.attr("transform", d3Translate([center.x,center.y]));
			} else if(layout=="timeline") {
				xSize = 100, ySize = 100;
					nodePosition = timelineNodePosition;
					nodePosition0 = timelineNodePosition0;
					chart.transition().duration(duration)
						.attr("transform", d3Translate([0,0]));
			};
			LAYOUT = d3.layout.tree()
				.size([xSize, ySize])
				.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
		};
	};
	var LAYOUT_TYPE = null;
	var LAYOUT = null;
	configureLayout();	// para que haya un layout inicial de árbol

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
				var $row = $("<li>").addClass("item").attr("data-user", user.__key)
					.append($("<span>").addClass("check").text("@"+user.__key)
						.on("mouseover", function() {
							var username = $(this).closest("li").attr("data-user");
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
							var user = $(this).closest("li").get(0).user;
							dispatchSelectUser(user.__key, $(this).toggleClass('on').hasClass('on'));
							$(this).closest("li").find(".color-picker").css("background-color", user.color).find("input").val(user.color);
						}))
					.append($("<span>").addClass("color-picker").css("background-color", getUserColor(user))
						.append($("<input>").attr("type", "color").val(getUserColor(user))
							.on("change", function(e) {
								var $this = $(this);
								var newColor = $this.val();
								// var username = $(this).closest('li').attr("data-user");
								$this.closest('.color-picker').css("background-color", newColor);
								// Actualización del color en visualizaciones
								var user = $this.closest('li').get(0).user;
								user.color = newColor;
								d3.selectAll("g.node.user-"+user.__key+" circle").attr("fill", newColor);
								$("#chart-messages .msg-container[data-user="+user.__key+"] .handle").css("background-color", newColor);
							})))
					.append($("<span>").text(user.nMessages))
					.append($("<span>").text(user.nDeleted))
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
			var theWords = sortArray(makeArray(PROCESSOR.words), "__key");
			var $list = $("#words-list");
			theWords.forEach(function(word) {
				$list.append($("<li>").addClass("word").text(word.__key + " (" + word.n + ")"));
			});			
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

	function radialNodePosition(d) {  return d3Rotate(d.x-90) + d3Translate(d.y);};
	function radialNodePosition0(d) { return d3Rotate(d.x0-90) + d3Translate(d.y0); };
	function timelineNodePosition(d) { return d3Translate([width*d.y/100, height*d.x/100]); };
	function timelineNodePosition0(d) { return d3Translate([width*d.y0/100, height*d.x0/100]); };

	var nodePosition = radialNodePosition;
	var nodePosition0 = radialNodePosition0;

	/* Principal función de actualización */
	function update(source) {
		if (typeof source == "undefined") source = root;
		// Projected position of source node:
		function updateNodes() {
			var node = chart.selectAll(".node")
			  	.data(nodes, function(d) { return d.id || (d.id = ++node_index); });
			var nodeEnter = node.enter().append("g")
				.attr("class", function(d) {
					return "node user-" + d.usuarioOrigen;
				})
				.attr("transform", function() {return nodePosition0(source);})	// new nodes enter at source's position
				.on("click", clickOnNode)
				.on("mouseenter", function(d, e) {
					$thisMsg = $("<div>").attr("id", "current-message")
						.append(createMessage(d).css("left", d3.event.offsetX+"px").css("top", d3.event.offsetY))
						.appendTo('body');
				})
				.on("mouseleave", function() {
					$("#current-message").remove();
				});
			nodeEnter.append("circle")
				.attr("r", function(d) {return RADIUS})
				.attr("fill", getMsgColor)
				.attr("stroke", "#fff")
				.attr("stroke-width", "1");

			// Transition nodes to their new position.
			var nodeUpdate = node.transition()
				.duration(duration)
				.attr("transform", nodePosition)
				.select("circle")
					.attr("fill", getMsgColor)
					.attr("stroke", function(d) {
						return (d._children) ? d3.rgb(getMsgColor(d)).darker().toString() : "#fff";
					});
					// .attr("stroke-width", NODE_BORDER);
			
			// Transition exiting nodes to the parent's new position.
			var nodeExit = node.exit().transition().duration(duration)
				.attr("transform", function(d) { return nodePosition(source); })
				.remove();
			nodeExit.select("circle")
				.transition().duration(duration)
				.attr("r", 1e-6);
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

		nodes = LAYOUT.nodes(root);
		links = LAYOUT.links(nodes);
		updateSVG();

		FREQUENCIES.update();
		// Stash the old positions for transition.
		stashPositions();
	};

	this.config = function(configuration) {
		if (configuration.layout) configureLayout(configuration.layout);
		update();
	};

	update();
};

/* Visualización de frecuencias */
function FrequencyVisualizer(element, processor) {
	var frequencies = processor.freq;
	var container = document.querySelector(element),
		rect = container.getBoundingClientRect(),
		width = rect.width,
		height = rect.height;
	var graph = new Rickshaw.Graph({
		element: container,
		series: [{
			color: "lightblue",
			data: frequencies.data,
			name: "Mensajes/h"
		}]
	});
	this.update = function() {
		var data = frequencies.data
		graph.series[0].data = data;
		graph.update();
	};
	var x_axis = new Rickshaw.Graph.Axis.Time({graph: graph});
	var y_axis = new Rickshaw.Graph.Axis.Y({
		graph: graph,
		orientation: 'left',
		tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
		element: container,
	});
	graph.render();
};

/* se obtiene la información de la extensión */
var TEST = 3;

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
	dispatchSelectUser("*", $this.hasClass('on'))
});
// Ordenación de usuarios:
$("#chart-control .sort-users").on("click", function() {
	sortUsers($(this).attr("data-field"));
});
$(".expand").on("click", function() {
	$this = $(this);
	$this.toggleClass('on');
	var $expandable = $(this).closest(".expandable").toggleClass('on');
	var newSize = "";
	if ($this.hasClass('on')) {
		var newSize = $expandable.attr("data-width");
		if (newSize=="max") {
			newSize = (window.innerWidth - $expandable.offset().left - 20) + "px";
		};
	};
	$expandable.css("width", newSize);
});

$("#set-timeline").on("click", function() {
	$("#d3-frequency").addClass('on');
	VISUALIZER.config({layout:"timeline"});
});
$("#set-tree").on("click", function() {
	$("#d3-frequency").removeClass('on');
	VISUALIZER.config({layout:"tree"});
});



