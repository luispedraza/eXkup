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

/* Obtiene el color de pintado para un mensaje dado */
function getMsgColor(msg) {
	return msg.selected ? msg.author.color : "#ccc";
};
function getUserColor(user) {
	return user.selected ? user.color : "#ccc";
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
	/* Activa un contenedor de mensajes, insertando el mensaje correspondiente */
	function toggleElement(event, $element) {
		if (event) event.stopPropagation();
		var $this = $element || $(this);
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
		updateButtons();
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
	function appendMessageContainer(msg, $container) {
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
				appendMessageContainer(m, $childrenContainer).addClass(m.selected ? "sel" : "nosel");
			});
		};
		return $msgContainer;
	};
	$mainContainer = $("#chart-ouput").empty();
	// $rootContainer = $("<div>").addClass('children-container').appendTo($mainContainer);
	$rootMsgContainer = appendMessageContainer(tree, $mainContainer).off();		// conversación de mensajes
	toggleElement(null, $rootMsgContainer);
};
/* Función principal de procesamiento de datos
	@param data: datos obtenidos de la api para una conversación
	@ param hidden: inicialmente todas las respuestas están ocultas
*/
function DataProcessor(data) {
	function initUsers(users) {
		var users = makeArray(users, "nickname");
		var nUsers = users.length;
		var color = chroma.scale(["#00ff00", "#ff00ff"]).domain([0,nUsers-1]);
		// users.forEach(function(u,i) {
		// 	// users[u].color = d3.hsl(i*360/nUsers, .5, .5).toString();
		// 	u.color = color(i);
		// });
		// var color = d3.scale.linear()
		// 	.domain([0, nUsers/2, nUsers-1])
		// 	.range(["#0f0000", "#ff0000", "ffff00"]);
		// var N = 765;
		// var scale = d3.scale.linear()
		// .domain([0, nUsers-1])
		// .range([0,765]);
		users.forEach(function(u,i) {
			u.color = d3.hsl(i*360/nUsers, .5+Math.random()*.2, .5+Math.random()*.1).toString();
		});
	};

	function messageProcessor(m) {
		index[m.idMsg] = m;
		// referencias
		m.referencesCounter = 0;	// contador de nodos que dependen de este mensaje
		m.selected = false;			// estado de selección del mensaje
		m.selCounter = 0;			// contador de selectores que actúan sobre este mensaje
		// usuario
		var author = THAT.users[m.usuarioOrigen];	// autor del mensaje
		m.author = author;
		if (author.nMessages) author.nMessages++; else author.nMessages=1;
		var authorReplied = THAT.users[m.autorMsgRespuesta];
		if (authorReplied.nReplies) authorReplied.nReplies++; else authorReplied.nReplies=1;
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
	function computeFrequencies(minTS, maxTS) {
		var iniTS = minTS || firstTS;
		var endTS = maxTS || lastTS;
		var spanTS = endTS-iniTS;	// duración total en segundos
		var frequency = {};
		// var maxFreq = 0;
		function addMessage(m) {
			var ts = m.tsMensaje;	// timestamp del mensaje segundos
			m.tsX = (ts-iniTS)/spanTS;	// posición en porcentaje de tiempo
			var msgTS = floorTimeHour(ts*1000)/1000;	// timestamp del mensaje redondeado en horas
			(frequency[msgTS] || (frequency[msgTS] = {y:0})).y++;
			// maxFreq = Math.max(maxFreq, ts.y);
			if (m.children) m.children.forEach(addMessage);
		};
		addMessage(THAT.tree);
		THAT.freq = {data: sortNumArray(makeIntArray(frequency, "x"), "x")};
		// data.fRange = [0, maxFreq];
		// data.tsRange = [data[0].x, data.slice(-1)[0].y];
	};
	this.selectMode = function(mode) {
		selectorMode = mode;
		THAT.select(null);	// actualización de la selección completa
	};
	/* Cálculo de la mamtmriz de interacciones entre usuarios */
	function computeInteraction() {
		/* evalúa las interacciones de un mensaje */
		function evaluateInteraction(m) {
			// if (m.selected) {
				// sólo contamos mensajes de la selección actual
				var i = usersArray.indexOf(m.author);
				var j = usersArray.indexOf(users[m.autorMsgRespuesta]);
				interaction[i][j]++;
			// };
			if (m.children) m.children.forEach(evaluateInteraction);
		};
		var users = THAT.users;
		var usersArray = THAT.usersArray;
		var nUsers = usersArray.length;
		var interaction = initArray(nUsers, nUsers, 0);
		evaluateInteraction(THAT.tree);
		THAT.interaction = {users: usersArray, matrix: interaction};
	};

	/* Selección de mensajes */
	this.select = function(selector) {
		function addFound(msg) {
			// Hay que conseguir que el nodo se muestre visible en el grafo
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
				if (parent._children) { 			// si llegamos aquí, tiene que estar colapsado
					var pCollapsed = parent._children;
					var index = pCollapsed.indexOf(msg);
					parent.children = pChildren.concat(pCollapsed.splice(index, 1));
					addFound(parent);
					return;
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
		/* Evaluación de un mensaje */
		var evaluateMessageOR = function(m) {
			return (m.selCounter > 0);
		};
		/* Evaluación de un mensaje */
		var evaluateMessageAND = function(m) {
			return ((selectorCounter!=0)&&(m.selCounter==selectorCounter));
		};
		var messages = [];
		if (selector) {
			var count = selector.add ? 1 : -1;
			selectorCounter += (count*selector.value.length);	// incremento/decremento del número total de selectores	
			if (selector.type=="user") {
				selector.value.forEach(function(u) {
					var user = THAT.users[u];
					user.selected = selector.add;
					messages = messages.concat(user.messages);
				});
			} else if (selector.type=="word") {
				selector.value.forEach(function(w) {
					var word = THAT.words[w];
					word.selected = selector.add;
					messages = messages.concat(word.messages);
				});
			};
			messages.forEach(function(m) {
				m.selCounter+=count; // cambio de contabilidad de los mensajes
			});	
		};
		var evaluate = (selectorMode=="AND") ? evaluateMessageAND : evaluateMessageOR;
		var selected;
		THAT.messages.forEach(function(m) {
			selected = evaluate(m);
			if (m.selected==selected) return;
			m.selected = selected;
			selected ? addFound(m) : removeFound(m);
		});
		computeFrequencies();	// recalcular frecuencias para el nuevo conjunto de mensajes
		computeInteraction();	// recalcular la matriz de interacciones para estos mensajes
	};
	this.getInteraction = function() {
		computeInteraction();
		return THAT.interaction;
	};
	// Procesamiento de los datos:
	var THAT = this;
	this.words = {};
	this.images = {};
	this.videos = {};	
	this.users = data.perfilesUsuarios;	
	this.usersArray = sortArray(makeArray(this.users, "nickname"), "nickname");
	var selectorMode = "OR"; 	// modo de selección de mensajes: and (y lógico de criterios), or (o lógico de criterios)
	var selectorCounter = 0;	// número de selectores/filtros aplicados
	var index = this.index = {};				// Diccionario de todos los mensajes
	var rootMsg = data.mensajes[0];
	messageProcessor(rootMsg);
	rootMsg.selected = true;			// el raíz nunca es filtrado
	// index[rootMsg.idMsg] = rootMsg;			// No se procesa el mensaje raíz
	this.messages = data.mensajes;
	var replies = this.messages.slice(1); // Array de mensajes, excluido el raiz
	// var messages = this.messages = data.mensajes;
	replies.forEach(function(m) {
		var parentObj = index[m.idMsgRespuesta];
		m.parent = parentObj;		// el padre de este mensaje
		var pHidden = (parentObj._hidden || (parentObj._hidden = []));
		pHidden.push(m);			// se agrega como hijo  OCULTO del padre
		messageProcessor(m);		// procesamiento del mensaje para extraer información
	});
	this.tree = rootMsg;
	var firstTS = floorTimeHour(data.mensajes[0].tsMensaje*1000)/1000;
	var lastTS = ceilTimeHour(data.mensajes[data.numMensajes-1].tsMensaje*1000)/1000;
	computeFrequencies();			// cálculo de las frecuencias de los mensajes
	computeInteraction();
	initUsers(this.users);
};

// VISUALIZACIÓN DE MENSAJES:
function TalkVisualizer(containerID, processor) {
	// console.log(data);
	// console.log(JSON.stringify(data));
	var RADIUS_DEFAULT = 5,
		RADIUS = RADIUS_DEFAULT
		NODE_BORDER_DEFAULT = 1,
		NODE_BORDER = NODE_BORDER_DEFAULT,
		LINK_WIDTH_DEFAULT = .5,
		LINK_WIDTH_TIMELINE_DEFAULT = 10,
		LINK_WIDTH = LINK_WIDTH_DEFAULT;
	function getLinkWidth() {
		var scale = zoom.scale();
		return ((LAYOUT_TYPE=="timeline") ? LINK_WIDTH_TIMELINE_DEFAULT : LINK_WIDTH_DEFAULT)/scale;
	};
	var root = processor.tree;
	var container = document.querySelector(containerID),
		rect = container.getBoundingClientRect(),
		width = rect.width,
		height = rect.height;
	var center = {x: width/2, y: height/2};
	var margin = 65;
	var node_index = 0,
		author_index = 0,	// focos de autores (grafo)
		replied_index = 0,		// focos de palabrasa (grapfo)
		chord_index = 0,
		chord_index_array = null;	// almacena los índices de las cuerdas, ha de ser inicializado 
		DEFAULT_DURATION = 500,
	    DURATION = DEFAULT_DURATION;
	var diagonal = null;	// función de pintado de los links
	var line = d3.svg.line()
		.x(function(d) { return d.x; })
		.y(function(d) { return d.y; });
	// var d3TranslateNode = null;
	var LAYOUT_TYPE = "tree";
	var LAYOUT = d3.layout.tree()
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
	var FORCE = d3.layout.force()
		.charge(-100)
		.linkDistance(40)
		.gravity(0.1)
		.friction(.9)
		.size([width, height])
		.on("tick", ticUpdate);
	var CHORD = d3.layout.chord()
		.padding(0);
		// .sortGroups(d3.ascending)
		// .sortSubgroups(d3.ascending);

	/* zoom behavior: */
	function zoomAction() {
		var vector = d3.event.translate;
		var scale = d3.event.scale;
		svg.attr("transform", d3Translate(vector) + d3Scale(scale));
	};
	/* para activar o desactivar temporalmente el zoom cuando se hace algo con una selección */
	function overrideZoom(selection) {
		selection.on("mousedown", function() {
			d3.select("#svg")
				.call(d3.behavior.zoom());
		});
		selection.on("mouseup", function() {
			d3.select("#svg")
				.call(zoom)
				.on("dblclick.zoom", null)
		});
	};
	var zoom = d3.behavior.zoom()
		.scaleExtent([.25,8])
		.on("zoom", zoomAction)
		.on("zoomend", function() {
			var scale = zoom.scale();
			RADIUS = RADIUS_DEFAULT / scale;
			NODE_BORDER = NODE_BORDER_DEFAULT / scale;
			LINK_WIDTH = getLinkWidth();
			svg.selectAll(".node circle")
				.transition().duration(DURATION)
				.attr("r", RADIUS)
				.attr("stroke-width", NODE_BORDER);	// escalado de los nodos
			svg.selectAll(".link")
				.attr("stroke-width", LINK_WIDTH);
		});
	var svg = d3.select(containerID).append("svg")
		.attr("id", "svg")
		.on("dblclick", resetZoom)
		.call(zoom)
		.on("dblclick.zoom", null)
		.append("g");
	var chart = svg
				.append("g").attr("id", "chart")
				.attr("transform", d3Translate([center.x,center.y]));
	var chartLinks = chart.append("g");	// grupo para los links
	var chartFocus = chart.append("g");	// grupo para los focos 
	var chartNodes = chart.append("g");	// grupo para los nodos 

	var chartInteraction = svg
				.append("g").attr("id", "d3-chart-interaction")
				.attr("transform", d3Translate([center.x,center.y]))
				.append("g");

	var nodes, links;
	var authorFocus=[], repliedFocus=[];	// agrupación de nodos en layout de grafo

	/* Configuración de los focos del grafo */
	function configureFocus(options) {
		var focusPadding = 120;		// espacio entre elementos
		var N = Math.floor((width-2*margin) / focusPadding);	// elementos por cada fila
		authorFocus = [];
		repliedFocus = [];
		options.forEach(function(o) {
			if (o=="group-author") {
				// Los focos son los autores que forman parte de las selección
				authorFocus = processor.usersArray.filter(function(u) {
					return u.selected;
				});
				// autor para "resto de autores"
				authorFocus.push({
					nickname: "OTROS"
				});
				authorFocus.forEach(function(a,i) {
					var i_row = Math.floor(i/N);
					var i_col = Math.floor(i%N);
					a.x = margin + i_col * focusPadding;
					a.y = margin + i_row * focusPadding;
				});
			} else if (o=="group-replied") {
				// Los focos son los autores que forman parte de las selección
				repliedFocus = processor.usersArray.filter(function(u) {
					return u.selected;
				});
				// autor para "resto de autores"
				repliedFocus.push({
					nickname: "OTROS"
				});
				repliedFocus.forEach(function(a,i) {
					var i_row = Math.floor(i/N);
					var i_col = Math.floor(i%N);
					a.x = margin + i_col * focusPadding;
					a.y = margin + i_row * focusPadding;
				});
			};
		});
	};

	/* Configuración del layout de la visualización 
	{	layout: tree, timeline, graph, interaction,
		options: group-user, group-word
	}
	*/
	function configureLayout (configuration) {
		if (typeof configuration=="undefined") configuration = {layout: "tree"};
		var layout = configuration.layout || "tree";
		var options = configuration.options || [];
		LAYOUT_TYPE = layout;
		FORCE.stop();
		var chartPosition = [center.x,center.y];
		if ((layout=="tree")||(layout=="timeline")) {
			DURATION = DEFAULT_DURATION;
			var xSize, ySize; 
			if (LAYOUT_TYPE=="tree") {
				diagonal = d3.svg.diagonal.radial()
					.source(function(d) {return {x: d.source.ang, y: d.source.r}})
					.target(function(d) {return {x: d.target.ang, y: d.target.r}})
					.projection(function(d) {return [d.y, d.x+_PI_2]; });
				xSize = _2_PI; 
				ySize = Math.min(width, height)/2-margin;
			} else if(LAYOUT_TYPE=="timeline") {
				diagonal = d3.svg.diagonal()
					.source(function(d) { return {x:d.source.y, y:d.source.x}; })            
				    .target(function(d) { return {x:d.target.y, y:d.target.x}; })
				    .projection(function(d) { return [d.y, d.x]; });
				xSize = 100;
				ySize = 100;
				chartPosition = [0,0];
			};
			LAYOUT.size([xSize, ySize]);
			// d3TranslateNode = d3TranslateNodeXXYY;
		} else if (LAYOUT_TYPE=="graph") {
			DURATION = 0;
			chartPosition = [0,0];
			// d3TranslateNode = d3TranslateNodeXY;
			diagonal = function(d) { return line([d.source, d.target]); };
			configureFocus(options);
		};
		if (LAYOUT_TYPE=="interaction") {
			DURATION = DEFAULT_DURATION;
			chartInteraction
				.style("pointer-events", "auto")
				.attr("transform", d3Scale(0))
				.transition().duration(DEFAULT_DURATION)
				.attr("transform", d3Scale(1));
			chart.transition().duration(DEFAULT_DURATION)
				.style("pointer-events", "none")
				.style("opacity", 0);
		} else {
			chartInteraction
				.style("pointer-events", "none")
				.transition().duration(DEFAULT_DURATION)
				.attr("transform", d3Scale(0));
			chart.transition().duration(DEFAULT_DURATION)
				.style("pointer-events", "auto")
				.style("opacity", 1)
				.attr("transform", d3Translate(chartPosition));
		};
	};
	// colapsa/expandir hijos
	function clickOnNode(d) {
		if (d.children) { d._children = d.children; d.children = null; } 
		else { d.children = d._children; d._children = null;};
		update(d);
		return false;
	};
	/* Colapsa los nodos de la estructura de datos de árbol */
	function collapse(d) { if (d.children.length) { d._children = d.children; d._children.forEach(collapse); d.children = null; }; };

	/* actualización del grafo en cada tic */
	function ticUpdate(e) {
		/* foco de autores */
		if (authorFocus.length) {
			var k = 1 * e.alpha;
			// Empujar los nodos hacia su foco:
			nodes.forEach(function(m, i) {
				var fakeUser = authorFocus[authorFocus.length-1];	// el usuario "fake": OTROS
				var user = authorFocus[authorFocus.indexOf(m.author)] || fakeUser;
				m.x += (user.x - m.x) * k;
				m.y += (user.y - m.y) * k;
			});
		} else if (repliedFocus.length) {
			var k = 1 * e.alpha;
			// Empujar los nodos hacia su foco:
			nodes.forEach(function(m, i) {
				var fakeUser = repliedFocus[repliedFocus.length-1];	// el usuario "fake": OTROS
				var user = repliedFocus[repliedFocus.indexOf(m.parent ? m.parent.author : root)] || fakeUser;
				m.x += (user.x - m.x) * k;
				m.y += (user.y - m.y) * k;
			});
		};
		updateNodes();
		updateTreeLinks();
	};
	/* Visualización de los focos del grafo, cuandod hay agrupación */
	function updateFocus() {
		/* Focos de autores */
		var f_author = chartFocus.selectAll(".focus-author")
		  	.data(authorFocus, function(d) { return d.graph_id || (d.graph_id = ++author_index); });
		var f_authorEnter = f_author.enter().append("g")
			.attr("class", "focus-author")
			.attr("transform", d3TranslateNode)
			.call(overrideZoom);	// para desactivar el zoom cuando se clickea, draggea un nodo
		f_authorEnter.append("image")
			.attr("xlink:href", function(d) {return checkUserPhoto(d.pathfoto);})
			.attr("x", -15)
			.attr("y", -15)
			.attr("width", 30)
			.attr("height", 30);
		f_authorEnter.append("text")
			.attr("dy", ".35em")
			.attr("font-size", "10px")
			.attr("transform", d3Translate([-15, 30]))
        	.text(function(d,i) { return "@" + d.nickname; });
		var f_authorUpdate = f_author.transition()
			.duration(DURATION)
			.attr("transform", d3TranslateNode);
		var f_authorExit = f_author.exit().transition().duration(DURATION)
			.style("opacity", 0)
			.remove();
		/* Focos de autores respondidos */
		var f_replied = chartFocus.selectAll(".focus-replied")
		  	.data(repliedFocus, function(d) { return d.graph_id || (d.graph_id = ++replied_index); });
		var f_repliedEnter = f_replied.enter().append("g")
			.attr("class", "focus-replied")
			.attr("transform", d3TranslateNode)
			.call(overrideZoom);	// para desactivar el zoom cuando se clickea, draggea un nodo
		f_repliedEnter.append("image")
			.attr("xlink:href", function(d) {return checkUserPhoto(d.pathfoto);})
			.attr("x", -15)
			.attr("y", -15)
			.attr("width", 30)
			.attr("height", 30);
		f_repliedEnter.append("text")
			.attr("dy", ".35em")
			.attr("font-size", "10px")
			.attr("transform", d3Translate([-15, 30]))
        	.text(function(d,i) { return "@" + d.nickname; });
		var f_repliedUpdate = f_replied.transition()
			.duration(DURATION)
			.attr("transform", d3TranslateNode);
		var f_repliedExit = f_replied.exit().transition().duration(DURATION)
			.style("opacity", 0)
			.remove();
	};

	function updateNodes() {
		var node = chartNodes.selectAll(".node")
		  	.data(nodes, function(d) { return d.id || (d.id = ++node_index); });
		var nodeEnter = node.enter().append("g")
			.attr("class", function(d) {
				return "node user-" + d.usuarioOrigen;
			})
			.attr("transform", d3TranslateNode)
			.style("opacity", 0)
			.call(overrideZoom)	// para desactivar el zoom cuando se clickea, draggea un nodo
			.on("click", clickOnNode)
			.on("mouseenter", function(d, e) {
				var tooltipConfig = {autoClose: "no"};
				new ChartTooltip(this, d3.event.offsetX, d3.event.offsetY, createMessage(d), tooltipConfig);
			})
			.call(FORCE.drag);
		nodeEnter.append("circle")
			.attr("r", RADIUS)
			.attr("fill", getMsgColor)
			.attr("stroke", "#fff")
			.attr("stroke-width", NODE_BORDER);

		// Transition nodes to their new position.
		var nodeUpdate = node.transition()
			.duration(DURATION)
			.style("opacity", 1)
			.attr("transform", d3TranslateNode)
			.select("circle")
				.attr("fill", getMsgColor);

		var nodeExit = node.exit().transition().duration(DURATION)
			.style("opacity", 0)
			.remove();
		nodeExit.select("circle")
			.transition().duration(DURATION)
			.attr("r", 1e-6);
	};
	function updateTreeLinks() {
		var linkWidth = getLinkWidth();
		var linkOpacity = (LAYOUT_TYPE=="timeline") ? .3 : 1;
		var link = chartLinks.selectAll("path.link")
			.data(links, function(d) { return d.target.id; });
			// .data(links, function(d) { return d.target.id; });
		// Los nuevos nodos entran en la posición previa del padre
		link.enter().append("path")
			.attr("class", "link")
			.attr("d", diagonal)
			.attr("stroke", "#ccc")
			.attr("stroke-width", linkWidth)
			.style("opacity", 0);
		// Transición a nueva posición
		link.transition()
			.duration(DURATION)
			.attr("d", diagonal)
			.attr("stroke-width", linkWidth)
			.style("opacity", linkOpacity);
		// Transition exiting nodes to the parent's new position.
		link.exit().transition()
			.duration(DURATION)
			.style("opacity", 0)
			.remove();
	};
	/* Actualización del gráfico de interacciones */
	function updateInteraction () {
		function arcTween(transition, angle) {
			transition.attrTween("d", function(d) {
				var endAngle = (angle===0) ? d.startAngle : d.endAngle;
				var interpolateStart = d3.interpolate(this._startAngle, d.startAngle);
				var interpolateEnd = d3.interpolate(this._endAngle, endAngle);
				this._startAngle = d.startAngle;
				this._endAngle = d.endAngle;
				return function(t) {
					d.startAngle = interpolateStart(t);
					d.endAngle = interpolateEnd(t);
					return arc(d);
				};
			});
		};
		function chordTween(transition, angle) {
			transition.attrTween("d", function(d) {
				var s_endAngle = (angle===0) ? d.source.startAngle : d.source.endAngle;
				var t_endAngle = (angle===0) ? d.target.startAngle : d.target.endAngle;
				var s_interpolateStart = d3.interpolate(this._source.startAngle, d.source.startAngle);
				var s_interpolateEnd = d3.interpolate(this._source.endAngle, s_endAngle);
				var t_interpolateStart = d3.interpolate(this._target.startAngle, d.target.startAngle);
				var t_interpolateEnd = d3.interpolate(this._target.endAngle, t_endAngle);
				this._source = {startAngle: d.source.startAngle, endAngle: s_endAngle};
				this._target = {startAngle: d.target.startAngle, endAngle: t_endAngle};
				return function(t) {
					d.source.startAngle = s_interpolateStart(t);
					d.source.endAngle = s_interpolateEnd(t);
					d.target.startAngle = t_interpolateStart(t);
					d.target.endAngle = t_interpolateEnd(t);
					return fChord(d);
				};
			});
		};
		// filtrado de los mensajes relacionados con un usuario
		function filterUser(d,i) {
			chartInteraction.selectAll(".chord").classed("fade", function(p) {
				return 	p.source.index != i && p.target.index != i;
			});
			chartInteraction.selectAll(".user").classed("fade", function(p) {
				var j = p.index;
				return (i==j) ? false : ((matrix[i][j]==0) && (matrix[j][i]==0));
			});
		};
		function unfilterUser(d,i) {
			chartInteraction.selectAll("path.chord").classed("fade", false);
		};
		function createUserTooltip(d,i) {
			var groups = CHORD.groups();
			function nm(i) {return Math.round(groups[i].value);};					// mensajes enviados por un usuario
			function pm(i) {return (100*nm(i)/nMessages).toFixed(1);};				// porcentaje de mensajes enviados
			function nmr(i) {return Math.round(d3.sum(matrix[i]));};						// número de mensajes recibidos
			function pmr(i) {return (100*nmr(i)/nMessages).toFixed(1);};			// porcentaje de mensajes recibidos
			var nickname = users[i].nickname;
			var $ulSent = $("<ul>");
			var $ulReceived = $("<ul>");
			matrix[i].forEach(function(c,t) {
				if (c!=0) $ulSent.append($("<li>").text("@" + users[t].nickname + ": " + c));
			});
			matrix.forEach(function(r,s) {
				if (r[i]!=0) $ulReceived.append($("<li>").text("@" + users[s].nickname + ": " + r[i]));
			});
			var $tooltip = $("<div>").addClass("interaction-tooltip")
					.append("<h2>@" + nickname + " ha enviado " + nm(i) + " mensajes ("+ pm(i) + "%) a:")
					.append($ulSent);
			if ($ulReceived.length) {
				$tooltip
					.append("<h2>@" + nickname + " ha recibido " + nmr(i) + " mensajes ("+ pmr(i) + "%) de:")
					.append($ulReceived);
			};
			return $tooltip;
		};
		var interaction = processor.getInteraction();
		var users = interaction.users;
		var matrix = interaction.matrix;
		var nMessages = sumArray(matrix);
		if (!chord_index_array) {
			chord_index_array = initArray(users.length, users.length, null);
		};
		CHORD.matrix(matrix);
		var outerRadius = Math.min(width, height)/2 - margin;
		var innerRadius = outerRadius*.8;
		var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
		var fChord = d3.svg.chord().radius(innerRadius);
		// Agregamos un grupo por usuario
		var groups = chartInteraction.selectAll("g.user")
			.data(CHORD.groups);
		var groupsEnter = groups.enter().append("g")
			.attr("class", "user")
			.on("mouseenter", function(d,i) {
				filterUser(d,i);
				// var configTooltip = {autoClose: "no"};
				new ChartTooltip(this, d3.event.offsetX, d3.event.offsetY, createUserTooltip(d,i));
			});
		// groupsEnter.append("title").text(function(d,i) {
		// 	return users[i].nickname;
		// });
		var groupText = groupsEnter.append("text")
			.each(function(d) { d.degAngle = RAD2DEG * (d.startAngle + d.endAngle) / 2 - 90; })
			.attr("dy", ".35em")
			.attr("font-size", "10px")
			.attr("text-anchor", function(d) { return d.degAngle > 90 ? "end" : null; })
			.attr("transform", function(d) {
				return d3Rotate(d.degAngle) + d3Translate(outerRadius+10)
				+ ((d.degAngle>90) ? " rotate(180)" : "")
				+ ((d.value==0) ? " scale(0)" : "");
			})
        	.text(function(d,i) { return "@" + users[i].nickname; });
		// queda por agregar el nombre de cada usuario

		// Agregamos/actualizamos los grupos:
		groupsEnter.append("path")
			.each(function(d) {this._startAngle = d.startAngle; this._endAngle = d.startAngle;})
			.attr("d", function(d) {
				return d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius).startAngle(this._startAngle).endAngle(this._startAngle)(d);
			})
			.style("stroke", "#fff")
			.style("fill", function(d,i) { return users[i].color; });

		groups.select("path")
			.transition().duration(DURATION)
			.style("fill", function(d,i) { return users[i].color; })
			.call(arcTween);
		groups.select("text")
			.each(function(d) { d.degAngle = RAD2DEG * (d.startAngle + d.endAngle) / 2 - 90; })
			.attr("text-anchor", function(d) { return d.degAngle > 90 ? "end" : null; })
			.transition().duration(DURATION)
			.style("opacity", function(d) { return (d.value==0) ? 0 : 1;})
			.attr("transform", function(d) {
				return d3Rotate(d.degAngle) + d3Translate(outerRadius+10)
				+ ((d.degAngle>90) ? " rotate(180)" : "")
				+ ((d.value==0) ? " scale(0)" : "");
			});

		// Agregamos/actualizamos las cuerdas:
		var chords = chartInteraction.selectAll("path.chord")
			.data(CHORD.chords, function(d) { 
				var i = d.source.index;
				var j = d.source.subindex;
				return chord_index_array[i][j] || (chord_index_array[i][j] = ++chord_index); 
			});
		var chordsEnter = chords.enter().append("path")
			.each(function(d) {
				this._source = {startAngle: d.source.startAngle, endAngle: d.source.startAngle};
				this._target = {startAngle: d.target.startAngle, endAngle: d.target.startAngle};
			})
			.attr("class", "chord")
			.style("fill", function(d) { return users[d.source.index].color; })
			.attr("d", function(d) {
				return d3.svg.chord().radius(innerRadius).source(this._source).target(this._target)();
			})
			.style("opacity", .8)
			.attr("stroke", "#ccc");
		
		chords.transition().duration(DURATION)
			.call(chordTween);

		chords.exit()
			.transition().duration(DURATION)
			.call(chordTween, 0)
			.remove();
	};
	/* Principal función de actualización */
	function update(source) {
		TIC();
		if (typeof source == "undefined") source = root;
		/* Cálculo de las posiciones de cada nodo, layouts de árbol y timeline */
		function computeTreePositions(nodes) {
			nodes.forEach(function(node) {
				var ang = node.ang = node.x;
				var r = node.r = node.y;
				node.x = Math.cos(ang)*r;
				node.y = Math.sin(ang)*r;
			});
		};
		function computeTimelinePositions(nodes) {
			nodes.forEach(function(node) {
				node.y = height*node.x/100;
				node.x = width*node.tsX;
			});
		};
		// configuración inicial del grafo, para evitar saltos bruscos del layout anterior
		function computeForceInitial(node) {
			var result = [];
			function computeNode(n) {
				n.px = n.x;// || node.parent.x;
				n.py = n.y; // || node.parent.y;
				result.push(n);
				if (n.children) n.children.forEach(computeNode);
			};
			computeNode(node);
			return result;
		};
		if (LAYOUT_TYPE=="graph") {
			nodes = computeForceInitial(root);
			links = LAYOUT.links(nodes);
			forceLinks = (authorFocus.length || repliedFocus.length) ? [] : links;
			FORCE.nodes(nodes)
				.links(forceLinks)
				.start();
			updateFocus();
			// force.nodes(nodes).links(LAYOUT.links(nodes));
		} else if (LAYOUT_TYPE=="interaction") {
			updateInteraction();
		} else {
			nodes = LAYOUT.nodes(root);
			(LAYOUT_TYPE=="tree") ? computeTreePositions(nodes) : computeTimelinePositions(nodes);
			// computeTreePositions(root);	// cálculo de las posiciones de los nodos para el layout
			// links = nodes;
			links = LAYOUT.links(nodes);
			updateNodes();
			updateTreeLinks();
		};
		TOC(true);
	};
	function resetZoom() { zoom.translate([0,0]); zoom.scale(1); zoom.event(svg); };
	this.config = function(configuration) {
		configureLayout(configuration);
		update();
		resetZoom();
	};
	this.updateGraph = function() { update(); };
	this.highlightUsers = function (users, highlight) {
		var selector = users.map(function(u) {return ".user-"+u+" circle";}).join(",");
		var radius = highlight ? RADIUS*3 : RADIUS;
		// d3.selectAll("#d3-chart g.node circle");
		d3.selectAll(selector)
			.transition().duration(DURATION)
			.attr("r", radius);
	};
	configureLayout();	// para que haya un layout inicial de árbol
	update();
};

/* Controladores de selección de usuarios, palabras, imágenes y vídeos */
function populateController(processor) {
	function insertMessage(id, clean) {
		var $ouput = $('#chart-ouput');
		if (typeof clean == "undefined") clean=true;
		if (clean) $ouput.empty();
		if (isArray(id)) id.forEach(function(i) {insertMessage(i, false);});
		else {
			$ouput.append(createMessage(THAT.messages[id]));
		};
	};
	function populateUsers(users) {
		var theUsers = sortArray(makeArray(users, "nickname"), "nickname");
		$("#n-users").text(theUsers.length);
		var $list = $("#chart-control .users-list ul");
		theUsers.forEach(function(user) {
			var $row = $("<li>").addClass("item").data(user)
				.on("mouseover", function() {
					var nickname = $(this).closest("li").data().nickname;
					VISUALIZER.highlightUsers([nickname], true);
				})
				.on("mouseout", function() {
					var nickname = $(this).closest("li").data().nickname;
					VISUALIZER.highlightUsers([nickname], false);
				})
				.append($("<span>").addClass("nickname check").text("@"+user.nickname)
					.on("click", function() {
						var user = $(this).closest("li").data();
						dispatchSelect("user", [user.nickname], $(this).toggleClass('on').hasClass('on'));
						$(this).closest("li").find(".color-picker").css("background-color", user.color).find("input").val(user.color);
					}))
				.append($("<span>").addClass("color-picker").css("background-color", getUserColor(user))
					.append($("<input>").attr("type", "color").val(getUserColor(user))
						.on("change", function(e) {
							var $this = $(this);
							var newColor = $this.val();
							$this.closest('.color-picker').css("background-color", newColor);
							// Actualización del color en visualizaciones
							var user = $this.closest('li').data();
							user.color = newColor;
							d3.selectAll("g.node.user-"+user.nickname+" circle").attr("fill", newColor);
							$("#chart-messages .msg-container[data-user="+user.nickname+"] .handle").css("background-color", newColor);
						})))
				.append($("<span>").addClass("nmessages").text(user.nMessages))
				.append($("<span>").addClass("ndeleted").text(user.nDeleted))
				.append($("<span>").addClass("nwords").text(user.nWords))
				.append($("<span>").addClass("nreplies").text(user.nReplies));
			$list.append($row);	// guardamos también el usuario correspondientes
		});
	};
	function populateImages(images) {
		var theImages = makeArray(images, "src");
		var li = d3.select("#chart-control .images-list ul").selectAll("li").data(theImages);
		li.enter().append("img")
			.attr("src", function(d){return d.src})
			.on("mouseover", function(d) {
				d3.selectAll("g.node")
					.attr("opacity", function(n) {
						return (n.cont_adicional == d.src) ? 1 : .1;
					});
			})
			.on("click", function(d) {
				d.messages.forEach(function(id) {
					
				});
			});
	};
	function populateVideos(theVideos) {

	};
	function populateWords(words) {
		var theWords = sortNumArray(makeArray(words, "word"), "n", true).slice(0,65);	// 65 primeras palabras
		var $list = $("#chart-control .words-list .list");
		theWords.forEach(function(w) {
			$list.append($("<li>").addClass("word").text(w.word + " (" + w.n + ")")
				.data(w)
				.on("click", function() {
					var $this = $(this);
					dispatchSelect("word", [$this.data().word], $(this).toggleClass('on').hasClass('on'));
				}));
		});			
	};
	populateUsers(processor.users);
	populateImages(processor.images);
	populateVideos(processor.videos);
	populateWords(processor.words);
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
	this.updateGraph = function() {
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

/* Para mostrar información contextual sobre lso elementos */
function ChartTooltip(whereMouseMoved,x,y,content,config) {
	if (typeof config == "undefined") config = {};
	var delay = config.delay || 800;
	var autoClose = config.autoClose || "yes";
	if (!typeof delay ==="undefined") delay=800;
	$(whereMouseMoved).on("mouseleave",function() {
		clearTimeout(timeout);
		if (autoClose=="yes") close();
		$(this).off("mouseleave");
	});
	var $element = $("<div>");
	var timeout = setTimeout(initTooltip, delay);
	function initTooltip() {
		$element.addClass("message-detail")
			.css({"left": x, "top": y})
			.append("<div class='tooltip-header'><div class='close fa fa-times'></div></div>")
			.append(content)
			.draggable()
			.appendTo('#d3-chart-container');
		$element.find(".close").on("click", close);
	};
	function close() {
		$element.remove();
	};
};


