var MONOSILABOS = ".";
var PREPOSICIONES = "ante|bajo|cabe|con|contra|de(sde)?|durante|en(tre)?|hacia|hasta|mediante|para|por|segun|sin|so(bre)?|tras|versus|via";
var ARTICULOS = "el|l[ao]s?|un|un[ao]s?|al|del|este|est[ao]s?|mis?|sus?";
var INTERJECCIONES = "ah|arre|a+y+|bah+|buah+|chiton|ea|eh|ey+|guau|guay|hala|hey|o+h+|ole|ojala|puaj|puf+|(j+a+)+";
var CONJUNCIONES = "ni|pero|sino|conque|luego|tan|tanto|asi|que";
// http://www.solosequenosenada.com/gramatica/spanish/listado/lista_07_pronombres.php
var PRONOMBRES_PER = "yo|me|mi|nos(otr[ao]s)?|t[eiu]|os|usted(es)?|vos(otr[ao]s)?|contigo|el(l[ao]s?)?|l[aeo]s?|s[ei]|consigo";
var PRONOMBRES_DEM = "aquel(l[ao]s?)?|es[aeo]s?|est[aeo]s?";
var PRONOMBRES_POS = "mi[ao]s?|[nv]uestr[ao]s?|[st]uy[ao]s|tus?";
var PRONOMBRES_IND = "algo|alguien|algun([ao]s?)?|cual(es)?quiera|demas|mism[ao]s?|much[ao]s?|nada|nadie|ningun([ao]s?)?|otr[ao]s?|poc[ao]s?|quien(es)?quiera|tant[ao]s?|tod[ao]s?|ultim[ao]s?|un([ao]s?)?|vari[ao]s";
var PRONOMBRES_INT = "a?donde|como|cual(es)?|cuando|cuant[ao]s?|que|quien(es)?";
var PRONOMBRES_REL = "cuy[ao]s"; // se han omitido algunos por redundancia con los anteriores
var PRONOMBRES = [PRONOMBRES_PER, PRONOMBRES_DEM, PRONOMBRES_POS, PRONOMBRES_IND, PRONOMBRES_INT, PRONOMBRES_REL].join("|");

var ADV_LUGAR = "aqui|all[ai]|ahi|aca|arriba|abajo|cerca|lejos|delante|detras|encima|debajo|enfrente|atras|alrededor";
var ADV_TIEMPO = "pront[ao]|tarde|temprano|todavia|aun(que)?|ya|ayer|hoy|mañana|siempre|nunca|jamas|proxim[ao]|anoche|enseguida|ahora|mientras|anterior";
var ADV_MODO = "bien|mal|regular|despacio|deprisa|tal|como|aprisa|adrede|peor|mejor";
var ADV_CANT = "muy|poco|mucho|bastante|mas|menos|algo|demasiado|casi|sol[ao]|tan(to)?|tod[ao]|nada|aproximad[ao]";
var ADV_AFIRM = "si|tambien|ciert[ao]|efectiv[ao]|clar[ao]|exact[ao]|obvi[ao]|verdader[ao]|segur[ao]";
var ADV_NEGAC = "no|jamas|nunca|tampoco";
var ADV_DUDA = "quizas?|acaso|probable|posible|tal vez|puede( ser)?";
var ADV_OTROS = "inclusive|ademas|unic[ao]s?|incluso|\w+mente|viceversa|siquiera|por\s?que";
var ADVERBIOS = [ADV_LUGAR, ADV_TIEMPO, ADV_MODO, ADV_CANT, ADV_AFIRM, ADV_NEGAC, ADV_DUDA, ADV_OTROS].join("|");

var OTROS = "dos|tres|vale(nrs])?|ve[ron]|creo|sabes?|quier[aeo]([ns])?|parece|decir|tengo|dar|hecho|vez|dice|digo|cada|es|ha([nsy])?|haya(n)?(is)?|soy?n?(mos)?|s?era?n?|tiene([ns])?|pues|van?(mos)?|estoy|estan?(mos)?(is)?|hace[nr]?(mos)?|haciendo|sean?(mos)?(is)?|he(mos)?|fue|era(mos)?(is)?|sido|da|van|etc|haber";

var NO_WORDS = new RegExp(" "+[MONOSILABOS, PREPOSICIONES, ARTICULOS, INTERJECCIONES, CONJUNCIONES, PRONOMBRES, ADVERBIOS, OTROS].join("|").replace(/\|/g," \| ")+" ", "g");

var VISUALIZER = null;

var USER_COLOR = new ColorGenerator();

/* Obtiene el color de pintado para un mensaje dado */
function getMsgColor(msg) {
	return msg.selected ? msg.author.color : "#ccc";
};
function getUserColor(user) {
	return user.selected ? user.color : "#ccc";
};

function dispatchSelect(type, value, add) {
	var e = document.createEvent("CustomEvent");
	var detail = {'add': add};
	detail[type] = value;
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
		THAT.index[m.idMsg] = m;
		// referencias 
		m.referencesCounter = 0;	// contador de referencias a este objeto
		// usuario
		var author = THAT.users[m.usuarioOrigen];	// autor del mensaje
		if (author.nMessages) author.nMessages++; else author.nMessages=1;
		var authorReplied = THAT.users[m.autorMsgRespuesta];
		if (authorReplied.nReplies) authorReplied.nReplies++; else authorReplied.nReplies=1;
		m.author = author;
		var userMsgs = author.messages || (author.messages = []);
		userMsgs.push(m);	// todos los mensajes de este usuario
		// Mensajes borrados:
		if (m.borrado) {
			if (author.nDeleted) author.nDeleted++; else author.nDeleted=1;
			return; // no hay imágenes, vídeos o palabras que procesar
		};
		// imagen
		var images = THAT.images;
		if (m.cont_adicional) {
			var cont = m.cont_adicional;
			var imgElement = images[cont] || (images[cont] = {'messages': []});
			imgElement.messages.push(m);
		};
		// vídeos:
		var $msg = $("<div>").html(m.contenido);
		var $links = processContent($msg, false);
		$links.remove();
		// Número de palabras:
		var content = " " + $msg.text() + " ";
		var words = THAT.words;
		content = content.replace(/[ \d-'`~¡!@#$%^&*_€+=¿?;:'"“”,\|\.<>\(\)\{\}\[\]\\\/]+/g, "  ");
		var count = content.split("  ").length;
		content = content.toLowerCase()
			.replace(/[aáàä]/g, "a")
			.replace(/[eéèë]/g, "e")
			.replace(/[iíìï]/g, "i")
			.replace(/[oóòö]/g, "o")
			.replace(/[uúùü]/g, "u")
			.replace(NO_WORDS, " ")
			.replace(/ +/g, " ").trim();
		if (content.length) {
			var localIndex = {};	// para evitar asociar dos ceces un mensaje a la misma palabra (duplicadas)
			content.split(" ").forEach(function(w) {
				if (words[w]) {
					words[w].n++;
					if (localIndex[w]) return;	// ya está asociado el mensaje a la palabra
					words[w].messages.push(m);
				} else {
					words[w] = {messages: [m], n: 1};
				};
				localIndex[w] = 1;
			});
		};
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
			m.selected += (select) ? 1 : (-1);
			if (m.selected*select==1) addFound(m);	// se ha pasado de 0 a 1
			else if (m.selected==0) removeFound(m);
		};
		var messages;
		if (selector.user) {
			if (selector.user == "*") {
				messages = THAT.messages;
			} else  {
				messages = THAT.users[selector.user].messages;	// array de mensajes
			};
		} else if (selector.word) {
			messages = THAT.words[selector.word].messages;
		};
		messages.forEach(function(m) {
			evaluateMessage(m, selector.add);
		});
		computeFrequencies();	// recalcular frecuencias para el nuevo conjunto de mensajes
	};
	// Procesamiento de los datos:
	if (typeof hideAll == "undefined") hideAll = false;
	var THAT = this;
	this.words = {};
	this.images = {};
	this.videos = {};	
	this.users = data.perfilesUsuarios;	
	this.freq = {}; 	// frecuencias de mensajes para la selección actual

	var index = this.index = {};				// Diccionario de todos los mensajes
	
	var rootMsg = data.mensajes[0];
	rootMsg.selected = 1;			// el raíz nunca es filtrado
	messageProcessor(rootMsg);
	var replies = this.messages = data.mensajes.slice(1); // Array de mensajes, excluido el raiz
	if (hideAll) {
		replies.forEach(function(m) {
			var parentObj = index[m.idMsgRespuesta];
			m.parent = parentObj;		// el padre de este mensaje
			var pHidden = (parentObj._hidden || (parentObj._hidden = []));
			pHidden.push(m);			// se agrega como hijo  OCULTO del padre
			m.selected = 0;
			messageProcessor(m);		// procesamiento del mensaje para extraer información
		});
	} else {
		replies.forEach(function(m) {
			var parentObj = index[m.idMsgRespuesta];
			m.parent = parentObj;		// el padre de este mensaje
			var pChildren = (parentObj.children || (parentObj.children = []));
			pChildren.push(m);			// se agrega como hijo del padre
			m.selected = 1;
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
	// console.log(JSON.stringify(data));
	var PROCESSOR = new DataProcessor(data, true);
	var FREQUENCIES = new FrequencyVisualizer("#d3-frequency", PROCESSOR);

	var root = PROCESSOR.tree;
	root.x0 = root.y0 = 0;
	// console.log(root);


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
			var $list = $("#chart-control .users-list ul");
			theUsers.forEach(function(user) {
				var $row = $("<li>").addClass("item").attr("data-user", user.__key)
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
					.append($("<span>").addClass("nickname check").text("@"+user.__key)
						.on("click", function() {
							var user = $(this).closest("li").get(0).user;
							dispatchSelect("user", user.__key, $(this).toggleClass('on').hasClass('on'));
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
					.append($("<span>").addClass("nmessages").text(user.nMessages))
					.append($("<span>").addClass("ndeleted").text(user.nDeleted))
					.append($("<span>").addClass("nwords").text(user.nWords))
					.append($("<span>").addClass("nreplies").text(user.nReplies));
				$row.get(0).user = user;
				$list.append($row);	// guardamos también el usuario correspondientes
			});
		};
		function populateImages() {
			var theImages = makeArray(PROCESSOR.images);
			var li = d3.select("#chart-control .images-list ul").selectAll("li").data(theImages);
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
			var theWords = sortNumArray(makeArray(PROCESSOR.words, "word"), "n", true).slice(0,65);
			var $list = $("#chart-control .words-list .list");
			theWords.forEach(function(w) {
				$list.append($("<li>").addClass("word").text(w.word + " (" + w.n + ")")
					.data(w)
					.on("click", function() {
						var $this = $(this);
						dispatchSelect("word", $this.data().word, $(this).toggleClass('on').hasClass('on'));
					}));
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
	var $list = $("#chart-control .users-list .list");
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
	$("#chart-control .users-list .list .check").toggleClass('on', $this.hasClass('on'));
	dispatchSelect("user", "*", $this.hasClass('on'))
});
// Ordenación de usuarios:
$("#chart-control .sort-users").on("click", function() {
	sortUsers($(this).attr("data-field"));
});
$(".expand").on("click", function() {
	var $expandable = $(this).closest(".expandable").toggleClass('on');
	var newSize = "";
	if ($expandable.hasClass('on')) {
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



