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

function updatePath() {
	chartLinks.selectAll("path")
		.attr("d", diagonal);
};

/* Clase controlador para los mensajes de la conversación */
function Conversation(tree) {
	var root = tree;
	var $rootMsgContainer = null;	// contenedor del mensaje raíz
	/* Activa un contenedor de mensajes, insertando el mensaje correspondiente */
	function toggleElement(e) {
		e.stopPropagation();
		var $this = $(this);
		if ($this.hasClass('on')) {	// colapsar
			var $containers = $this.add($this.find(".msg-container.on"))
				.removeClass('on')
				.css("width", "")
				.each(function() {
					$(this).find(".message").remove();
				})
				.siblings().css("width", "");
		} else {	// expandir
			$this
				.add($this.parents(".msg-container:not(.on)"))
				.addClass("on")
				.css("width", "100%")
				.each(function() {
					var $this = $(this);
					$this.find("> .handle").append(createMessage($this.data()));
				})
				.siblings().css( "width", "0px" );
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
		var m = _MIN(nChildren, 30);		// número de elementos que sufren transformación
		var virtualSpan = width/m;			// span virtual, considerando solo elementos transformables
		var xScale = virtualSpan/span;
		$children.each(function(i) {
			var xPos = ((i*span+span/2)-x) * xScale;
			if (_ABS(xPos)<=(width/2)) {
				var xTheta = xPos*(2*_PI/width);
				sum += (_COS(xTheta)+1)/2;
			};
		});
		var k = 100/sum;
		$children.each(function(i) {
			var xPos = ((i*span+span/2)-x) * xScale;
			if (_ABS(xPos)<=(width/2)) {
				var xTheta = xPos*(2*_PI/width);
				$(this).css("width", (k*(_COS(xTheta)+1)/2) + "%");
			} else {
				$(this).css("width", "0px");
			};
		});
		return false;
	};
	function accordionReset() {$(this).find(".msg-container:not(.on)").css("width","");};
	function appendMessageContainer(msg, $container) {
		var $msgContainer = $("<div>")
				.addClass('msg-container')
				.attr("data-user", msg.usuarioOrigen)
				.append($("<div>").addClass('handle').css("background-color", getMsgColor(msg)))
				.on("click", toggleElement)	// muestra u oculta la conversación
				.data(msg)					// guardamos el mensaje con el elemento
				.appendTo($container);
		msg.container = $msgContainer;		// el mensaje guarda su contenedor correspondiente
		if (msg.children) {
			var children = msg.children;
			var $childrenContainer = $("<div>").addClass('children-container')
				.on("mousemove", accordion)
				.on("mouseleave", accordionReset)
				.appendTo($msgContainer);
			children.forEach(function(m) {
				appendMessageContainer(m, $childrenContainer).addClass(m.selected ? "sel" : "nosel");
			});
		};
		return $msgContainer;
	};
	/* Expandir la conversación a un mensaje arbitrario */
	this.expand = function(m) {
		$rootMsgContainer.find(".msg-container.on")
			.removeClass('on')
			.css("width", "")
			.each(function() { $(this).find(".message").remove(); })
			.siblings().css("width", "");
		$(m.container).trigger("click");
	};
	var update = this.update = function() {
		$mainContainer = $("#chart-output").empty();
		$rootMsgContainer = appendMessageContainer(root, $mainContainer)
			.trigger("click")
			.off();		// conversación de mensajes
	};
	update();
};
/* Función principal de procesamiento de datos
	@param data: datos obtenidos de la api para una conversación
	@ param hidden: inicialmente todas las respuestas están ocultas
*/
function DataProcessor(data) {
	/* Obtiene los nodos correspondientes a una conversación */
	this.getConversation = function(node) {
		var result = [node];
		function addBefore(node) {
			var parent = node.parent;
			if (parent) {
				result.push(parent);
				addBefore(parent);	
			};
		};
		function addAfter(node) {
			var children = node.children;
			if (children) {
				result = result.concat(children);
				children.forEach(addAfter);
			};
		};
		addBefore(node);
		addAfter(node);
		return result;
	};
	/* Generación del árbol agrupando por autor del mensaje o del mensaje respondido
		@param M: número de interaciones del algoritmo de optimización
		además se intenta hacer de manera que los timelines queden "bonitos", con pocos cruces de líneas
	 */
	this.groupByAuthor = function(M) {
		////////////////////////////////////////////
		// Estructura de datos inicial: dict {nickname: user.children}
		/* función para calcular una media ponderada de elementos {v: valir, w: peso} */
		function weightedMean (vector) {
			var sum = 0, N = 0;
			vector.forEach(function(e) {
				sum += e.v * e.w;
				N += e.w;
			});
			return sum/N;
		};
		if (typeof M === "undefined") M=100;
		var result = {};
		var users = THAT.users;
		function evaluateMesage(m) {
			var nickname = m.usuarioOrigen;
			if (nickname in result) {
				result[nickname].children.push(m);	// mensajes enviados a/por este usuario
			} else {
				users[nickname].children = [m];
				result[nickname] = users[nickname];
			};
			if (m.children) m.children.forEach(evaluateMesage);
		};
		evaluateMesage(THAT.tree);	// aquí se construye el diccionario de usuarios, con sus children
		// vector de usuarios, resultado:
		var resultArray = makeArray(result, "nickname");
		// El usuario raíz en la primera posición:
		insertFile(resultArray, 0, resultArray.indexOf(THAT.tree.author));
		var nUsers = resultArray.length;
		////////////////////////////////////////////
		// Construcción de la matriz de interacciones
		function evaluateFullInteraction(m) {
			var i = resultArray.indexOf(m.author);
			var j = resultArray.indexOf(users[m.autorMsgRespuesta]);
			fullInteraction[i][j]++;
			// fullInteraction[j][i]++;
		};
		var fullInteraction = initArray(nUsers, nUsers, 0);
		resultArray.forEach(function (u,i) {
			// inicialización del algoritmo iterativo que viene despues:
			u.position = i;
			u.newPosition = [];
			u.children.forEach(evaluateFullInteraction);
		});

		// algoritmo iterativo para optimizar las posiciones:
		function optimStep() {
			for (var i=0; i<nUsers; i++) {
				var u = resultArray[i];
				u.newPosition.push({"v": u.position, "w": 0.5});	// posición actual
				for (var j=0; j<nUsers; j++) {
					var v = resultArray[j];
					var w = fullInteraction[i][j];
					w = w*w;
					if (w!=0) {
						u.newPosition.push({"v": v.position, "w": w, "j": j});
						v.newPosition.push({"v": u.position, "w": w, "j": j});
					};
				};
			};
			resultArray.forEach(function(u, i) {
				var newPos = u.newPosition;
				if (i!=0) {
					// las respuestas a registrador sin respuesta, quedan antes
					u.position = ((newPos.length==2)&&(newPos[1].j==0)) ? -1 : weightedMean(newPos);
				};
				u.newPosition = [];
			});
		};
		for (var i=0; i<M; i++) { optimStep(); };
		return sortNumArray(resultArray, "position");
	};
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
			u.color = d3.hsl(i*360/nUsers, .5+_RANDOM()*.2, .5+_RANDOM()*.1).toString();
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
		var spanTS = lastTS - firstTS;	// duración total en segundos
		var frequency = {};
		// Inicialización de histograma
		for (var t=firstTS; t<=lastTS; t+=3600) {
			frequency[t] = {y:0};
		};
		// var maxFreq = 0;
		function addMessage(m) {
			var ts = m.tsMensaje;	// timestamp del mensaje SEGUNDOS
			var msgTS = floorTimeHour(ts*1000)/1000;	// timestamp del mensaje redondeado en horas
			(frequency[msgTS] || (frequency[msgTS] = {y:0})).y++;
			// maxFreq = Math.max(maxFreq, ts.y);
			if (m.children) m.children.forEach(addMessage);
		};
		addMessage(THAT.tree);
		return (THAT.frequencies = {"data": sortNumArray(makeIntArray(frequency, "x"), "x"),
									"tsRange": [firstTS, lastTS]});
	};
	/* Función de ayuda para obtener las frecuencias computadas */
	this.getFrequencies = function() { return (this.frequencies || computeFrequencies()); };
	/* Establece el modo de selección de los mensajes: o-y lógico de condiciones */
	this.selectMode = function(mode) {
		selectorMode = mode;
		THAT.select(null);	// actualización de la selección completa
	};
	/* Cálculo de la matriz de interacciones entre usuarios */
	function computeInteraction() {
		/* evalúa las interacciones de un mensaje */
		function evaluateInteraction(m) {
			var i = usersArray.indexOf(m.author);
			var j = usersArray.indexOf(users[m.autorMsgRespuesta]);
			interaction[i][j]++;
			if (m.children) m.children.forEach(evaluateInteraction);
		};
		var users = THAT.users;
		var usersArray = THAT.usersArray;
		var nUsers = usersArray.length;
		var interaction = initArray(nUsers, nUsers, 0);
		evaluateInteraction(THAT.tree);
		return (THAT.interaction = {"users": usersArray, "matrix": interaction});
	};
	/* Obtiene la información de interacciones para la selección actual */
	this.getInteraction = function() { return (THAT.interaction || computeInteraction()); };

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
		THAT.interaction = null;	// se limpia la matriz de interacciones por haber cambiado el filtro
		THAT.frequencies = null;	// se limpia la info de frecuencias
		computeFrequencies();	// recalcular frecuencias para el nuevo conjunto de mensajes
	};

	// Procesamiento de los datos:
	var THAT = this;
	this.words = {};
	this.images = {};
	this.videos = {};	
	this.users = data.perfilesUsuarios;	
	this.usersArray = sortArray(makeArray(this.users, "nickname"), "nickname");
	this.interaction = null;	// almacenará la información de interacciones
	this.frequencies = null; 	// almacenará info de frecuencias para la selección actual
	var selectorMode = "OR"; 	// modo de selección de mensajes: and (y lógico de criterios), or (o lógico de criterios)
	var selectorCounter = 0;	// número de selectores/filtros aplicados
	var index = this.index = {};				// Diccionario de todos los mensajes
	var rootMsg = data.mensajes[0];
	messageProcessor(rootMsg);
	rootMsg.selected = true;			// el raíz nunca es filtrado
	// index[rootMsg.idMsg] = rootMsg;			// No se procesa el mensaje raíz
	var messages = this.messages = data.mensajes;
	var replies = messages.slice(1); // Array de mensajes, excluido el raiz
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
	initUsers(this.users);
};

// VISUALIZACIÓN DE MENSAJES:
function TalkVisualizer(containerID, processor, margin) {
	// console.log(data);
	// console.log(JSON.stringify(data));
	var LINK_WIDTH_DEFAULT = 0.5,
		LINK_WIDTH = LINK_WIDTH_DEFAULT;
	var root = processor.tree;
	var CONTAINER = d3.select(containerID);
	function getBoundingRect() {
		return CONTAINER.node().getBoundingClientRect();
	};
	var margin = margin;
	var node_index = 0,
		author_index = 0,	// focos de autores (grafo)
		chord_index = 0,
		chord_index_array = null;	// almacena los índices de las cuerdas, ha de ser inicializado
		DEFAULT_DURATION = 500,
	    DURATION = DEFAULT_DURATION;
	var diagonal = null;	// función de pintado de los links
	var diagonalTree = d3.svg.diagonal.radial()
		.source(function(d) {return {x: d.source.ang, y: d.source.r}})
		.target(function(d) {return {x: d.target.ang, y: d.target.r}})
		.projection(function(d) {return [d.y, d.x+_PI_2]; });
	var line = d3.svg.line()
		.x(function(d) { return d.x; })
		.y(function(d) { return d.y; });
	var LAYOUT_TYPE, LAYOUT_OPTIONS;	// opciones de configuración: agrupaciones, etc
	var LAYOUT = d3.layout.tree()
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
	var FORCE = d3.layout.force()
		.charge(-100)
		.linkDistance(40)
		.gravity(0.1)
		.friction(.9)
		.on("tick", tickUpdate);
	var CHORD = d3.layout.chord()
		.padding(0);
		// .sortGroups(d3.ascending)
		// .sortSubgroups(d3.ascending);
	var TIMELINE_SCROLL = 0;
	var TS_RANGE = processor.getFrequencies().tsRange;	// rango de tiempos de mensajes en timeline

	/* Inicialización del fondo de los contenedores, para eventos en grupo e imagen de fondo */
	function initBackground(selection) {
		selection.append("rect")
			.attr("class", "background")
			.attr("x", -10000)
			.attr("y", -10000)
			.attr("width", 20000)
			.attr("height", 20000);
	};

	/* zoom behavior: */
	function zoomAction() {
		var vector = d3.event.translate;
		var scale = d3.event.scale;
		// svg.attr("transform", d3Translate(vector) + d3Scale(scale));
		svg.style("-webkit-transform", d3Translate3D(vector) + d3Scale(scale));
	};
	function zoomActionTimeline() {
		var vector = d3.event.translate;
		var scale = d3.event.scale;
		var translation = 0;
		if (scale<1) translation = (TIMELINE_SCROLL-=10);
		else if (scale>1) translation = (TIMELINE_SCROLL+=10);
		else translation = vector[1]+TIMELINE_SCROLL;
		svg.style("-webkit-transform", d3Translate3D([0,translation]));
		ZOOM.scale(1);
	};
	/* para activar o desactivar temporalmente el zoom cuando se hace algo con una selección */
	function overrideZoom(selection) {
		selection.on("mousedown", function() {
			d3.select("#svg")
				.call(d3.behavior.zoom());
		});
		selection.on("mouseup", function() {
			d3.select("#svg")
				.call(ZOOM)
				.on("dblclick.zoom", null)
		});
	};

	function onZoomEnd() {
		var scale = ZOOM.scale();
		LINK_WIDTH = LINK_WIDTH_DEFAULT/scale;
		var newScale = d3Scale(1/scale);
		chartNodes.selectAll(".node")
			.style("-webkit-transform", function(d) {return d3TranslateNode3D(d) + newScale;});
		chartFocus.selectAll("g")
			.style("-webkit-transform", function(d) {return d3TranslateNode3D(d) + newScale;});
		chartLinks.selectAll("path")
			.style("stroke-width", LINK_WIDTH);
	};
	// var ___COUNT___ = 0;
	var ZOOM = d3.behavior.zoom()
		.scaleExtent([.25,8])
		.on("zoom", zoomAction)
		.on("zoomend", onZoomEnd);
	var svg = d3.select(containerID)
		.insert("svg", ":first-child")
			.attr("id", "svg")
			.on("dblclick", resetZoom)
			.call(ZOOM)
			.on("dblclick.zoom", null)
			.append("g");
	var chart = svg.append("g").attr("id", "chart")
				.call(initBackground);	// inicialización del fondo del elemento
	var chartLinks = chart.append("g").attr("id", "chart-links");	// grupo para los links
	var chartFocus = chart.append("g").attr("id", "chart-focus");	// grupo para los focos 
	var chartNodes = chart.append("g").attr("id", "chart-nodes");	// grupo para los nodos 

	var chartInteraction = svg.append("g").attr("id", "d3-chart-interaction");

	var nodes, links, authorFocus;

	/* Configuración del layout de la visualización 
	{	layout: tree, timeline, graph, interaction,
		options: group-user
	}
	*/
	function configureLayout (configuration) {
		/* Configuración de los focos del grafo */
		function configureFocus(options) {
			authorFocus = [];
			FORCE.size([width, height]);
			if (options.length==0) return;	// no hay configuración de focos 
			selectedAuthors = processor.usersArray.filter(function(u) {
				return u.selected;
			});
			// autor para "resto de autores"
			if (selectedAuthors.length != processor.usersArray.length) {
				selectedAuthors.push({ nickname: "OTROS" });
			};
			if (options.length == 2) {
				var focusPadding = 80;		// espacio entre elementos
				var _size = 2*margin + selectedAuthors.length * focusPadding;
				FORCE.size([_size, _size]);
				authorFocus = repliedFocus = selectedAuthors;
				selectedAuthors.forEach(function(a,i) {
					a.x = a.y = a.xa = a.yr = i * focusPadding;
					a.ya = a.xr = 0;
				});
			} else {
				var focusPadding = 100;		// espacio entre elementos
				var N = _FLOOR((width-2*margin) / focusPadding);		// elementos por cada fila
				if (options[0]=="group-author") {
					authorFocus = selectedAuthors;
				} else if (options[0]=="group-replied") {
					repliedFocus = selectedAuthors;
				};
				selectedAuthors.forEach(function(a,i) {
					var i_row = _FLOOR(i/N);
					var i_col = _FLOOR(i%N);
					a.x = a.xa = a.xr = margin + i_col * focusPadding;
					a.y = a.ya = a.yr = margin + i_row * focusPadding;
				});
			};
		};
		if (typeof configuration=="undefined") configuration = {"layout": LAYOUT_TYPE, 
																"options": LAYOUT_OPTIONS};
		LAYOUT_TYPE = configuration.layout || "tree";
		LAYOUT_OPTIONS = configuration.options || {"group-author": false};
		FORCE.stop();
		var rect = getBoundingRect();
		var center = [rect.width/2, rect.height/2];
		var chartPosition = [center.x,center.y];

		if (LAYOUT_TYPE=="interaction") {
			chartInteraction.style("-webkit-transform", d3Translate3D(center) + d3Scale(1));
			chart.style("-webkit-transform", d3Translate3D(center) + d3Scale(0));
			ZOOM.on("zoom", zoomAction);
		} else {
			chartInteraction.style("-webkit-transform", d3Translate3D(center) + d3Scale(0));
			if (LAYOUT_TYPE=="tree") {
				LAYOUT.size([_2_PI, _MIN(rect.width, rect.height)/2-margin]);
				chart.style("-webkit-transform", d3Translate3D(center) + d3Scale(1));
				ZOOM.on("zoom", zoomAction);
			} else if (LAYOUT_TYPE=="timeline") {
				LAYOUT.size([100, 100]);
				chart.style("-webkit-transform", d3Translate3D([0,0]) + d3Scale(1));
				ZOOM.on("zoom", zoomActionTimeline);
			} else if (LAYOUT_TYPE=="graph") {
				FORCE.size([rect.width, rect.height]);
				chart.style("-webkit-transform", d3Translate3D([0,0]) + d3Scale(1));
				ZOOM.on("zoom", zoomAction);
			};
		};
		// Clase para el contenedor de svg
		CONTAINER.attr("class", LAYOUT_TYPE);
		update();	// se actualiza para reflejar los cambios
	};

	// colapsar/expandir hijos
	function clickOnNode(d) {
		if (d.children) { d._children = d.children; d.children = null; } 
		else { d.children = d._children; d._children = null;};
		update(d);
		return false;
	};
	// Resaltado de las interacciones de un usuario, cuadno los mensajes están aagrupados
	function filterUserInteraction(d) {
		d3.selectAll("#chart-links path").classed("fade", function(l) {
			return ((l.source.author != d) && (l.target.author != d));
		});
	};
	// Resaltado de los links de un hilo de conversación:
	function filterConversation(d) {
		var conversation = processor.getConversation(d.target);
		d3.selectAll("#chart-links path")
			.each(function(l) {
				var thiz = d3.select(this);
				if ((conversation.indexOf(l.target)>=0) && (conversation.indexOf(l.source)>=0)) {
					thiz.style("stroke-width", LINK_WIDTH*5)
						.style("stroke", "#f30");
				};
			});
		// Al salir, se deselecciona la conversación
		d3.select(this)
			.on("click", function(d) {
				dispatchConversation(d.target);			// se muestra la conversación completa
			})
			.on("mouseleave", function(p) {
				d3.selectAll("#chart-links path")
					.transition().delay(500).duration(DEFAULT_DURATION)
					.style("stroke-width", LINK_WIDTH)
					.style("stroke", null);
			});
	};
	/* Colapsa los nodos de la estructura de datos de árbol */
	function collapse(d) { if (d.children.length) { d._children = d.children; d._children.forEach(collapse); d.children = null; }; };

	/* actualización del grafo en cada tic */
	function tickUpdate(e) {
		/* foco de autores */
		// if (authorFocus.length) {
		// 	var k = 1 * e.alpha;
		// 	nodes.forEach(function(m, i) {
		// 		var author = authorFocus[authorFocus.indexOf(m.author)] || fakeUser;
		// 		m.x += (author.x - m.x) * k;
		// 		m.y += (author.y - m.y) * k;
		// 	});
		// };
		updateNodes();
		updateTreeLinks();
	};
	/* Visualización de los focos del grafo, cuandod hay agrupación */
	function updateFocus() {
		/* Focos de autores */
		var f_author = chartFocus.selectAll("g")
		  	.data(authorFocus, function(d) { return d.graph_id || (d.graph_id = ++author_index); });
		var f_authorEnter = f_author.enter().append("g")
			.style("-webkit-transform", d3TranslateNode3D)
			.on("mouseenter", filterUserInteraction)	// filtrado de interacciones
			.call(overrideZoom);	// para desactivar el zoom cuando se clickea, draggea un nodo
		f_authorEnter.append("image")
			.attr("xlink:href", function(d) {return checkUserPhoto(d.pathfoto);})
			.attr("x", -10)
			.attr("y", -10)
			.attr("width", 20)
			.attr("height", 20)
			.on("mouseenter", function (d) {
				new ChartTooltip(this, d3.event.offsetX, d3.event.offsetY,
					$("<div>").text("@" + d.nickname));
			});
		// update:
		f_author.style("-webkit-transform", d3TranslateNode3D)
		// exit:
		f_author.exit()
			.style("opacity", 0)
			.transition().delay(DEFAULT_DURATION)
			.remove();
	};
	/* Actualización de los nodos: mensajes */
	function updateNodes() {
		var node = chartNodes.selectAll("g")
		  	.data(nodes, function(d) { return d.id || (d.id = ++node_index); });
		var nodeEnter = node.enter().append("g")
			.attr("class", function(d) { return "user-" + d.usuarioOrigen; })
			.style("-webkit-transform", d3TranslateNode3D)
			.style("opacity", 0);
			// .call(overrideZoom)	// para desactivar el zoom cuando se clickea, draggea un nodo
			// .on("click", clickOnNode)
			// .on("mouseenter", function(d, e) {
			// 	// var tooltipConfig = {autoClose: "no"};
			// 	// new ChartTooltip(this, d3.event.offsetX, d3.event.offsetY, createMessage(d), tooltipConfig);
			// });
			// .call(FORCE.drag);

		nodeEnter.append("rect")
			.attr("x",-5)
			.attr("y",-5)
			.attr("width",10)
			.attr("height",10)
			.style("fill", getMsgColor);
		// update:
		node.style("-webkit-transform", d3TranslateNode3D)
			.transition().delay(1)
			.style("opacity", 1)
			.select("rect").attr("fill", getMsgColor);
		// exit:
		node.exit()
			.style("opacity", 0)
			.transition().delay(DEFAULT_DURATION)
			.remove();
	};
	/* Actualización de links: enlaces entre mensajes */
	function updateTreeLinks() {
		// Muy interesante: http://stackoverflow.com/questions/10942013/smil-animations-fail-on-dynamically-loaded-external-svg
		var link = chartLinks.selectAll("path")
			.data(links, function(d) { return d.target.id; });
		// Los nuevos nodos entran en la posición previa del padre
		link.enter().append("path")
			.attr("d", diagonal)
			.style("stroke-width", LINK_WIDTH)
			.style("opacity", 0)
			.on("mouseenter", filterConversation)
			.append("animate")
				.attr("dur", "0.5s")
				.attr("attributeName", "d")
				.attr("fill", "freeze")
				.on("endEvent", function(d) {
					this.parentNode.setAttribute("d", diagonal(d));
				});
		// Transición a nueva posición
		link.transition().delay(1)
			.style("opacity", null)
			.style("stroke-width", LINK_WIDTH)
			.select("animate")
				.attr("to", diagonal);
		// Transition exiting nodes to the parent's new position.
		link.exit()
			.style("opacity", 0)
			.transition().delay(DEFAULT_DURATION)
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
			function nm(i) {return _ROUND(groups[i].value);};					// mensajes enviados por un usuario
			function pm(i) {return (100*nm(i)/nMessages).toFixed(1);};				// porcentaje de mensajes enviados
			function nmr(i) {return _ROUND(d3.sum(matrix[i]));};						// número de mensajes recibidos
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
		var rect = getBoundingRect();
		if (!chord_index_array) {
			chord_index_array = initArray(users.length, users.length, null);
		};
		CHORD.matrix(matrix);
		var outerRadius = _MIN(rect.width, rect.height)/2 - margin;
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
				node.x = _COS(ang)*r;
				node.y = _SIN(ang)*r;
			});
		};
		function computeTreePositionsGrouped(groups) {
			var rect = getBoundingRect(),
				width = rect.width,
				height = rect.height;
			var nodes = [];
			var N = groups.length;
			var angStep = _2_PI/N;
			var R0 = _MIN(width, height)/2 - margin;
			var R = R0 - 25;
			groups.forEach(function(g,i) {
				var rStep = _MIN(15, (R-100)/g.children.length);
				var ang = i*angStep;
				g.x = R0 * _COS(ang);
				g.y = R0 * _SIN(ang);
				// posiciones de los mensajes 
				g.children.forEach(function(c,i) {
					c.ang = ang;
					var r = c.r = R - i*rStep
					c.y = r * _SIN(ang);
					c.x = r * _COS(ang);
				});
				nodes = nodes.concat(g.children);
			});
			return nodes;
		};
		function computeTimelinePositions(nodes) {
			
			var rect = getBoundingRect(),
				width = rect.width,
				height = rect.height;
			var ts = d3.scale.linear().domain(TS_RANGE).range([margin,width-margin]);
			nodes.forEach(function(node) {
				node.y = margin + height*node.x/100;
				node.x = ts(node.tsMensaje);
			});
		};
		function computeTimelinePositionsGrouped(groups) {
			var rect = getBoundingRect(),
				width = rect.width,
				height = rect.height;
			var nodes = [];
			var vStep = 20;
			var ts = d3.scale.linear().domain(TS_RANGE).range([margin,width-margin]);
			groups.forEach(function(g,i) {
				var y = margin + i*vStep;
				g.x = 15;
				g.y = y;
				// posiciones de los mensajes 
				g.children.forEach(function(c) {
					c.y = y;
					c.x = ts(c.tsMensaje);
				});
				nodes = nodes.concat(g.children);
			});
			return nodes;
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
			diagonal = function(d) { return line([d.source, d.target]); };
			nodes = computeForceInitial(root);
			links = LAYOUT.links(nodes);
			if (LAYOUT_OPTIONS["group-author"]) {
				forceLinks = [];
			} else {
				forceLinks = links;
			};
			FORCE.nodes(nodes)
				.links(forceLinks)
				.start();
			updateFocus();
			// force.nodes(nodes).links(LAYOUT.links(nodes));
		} else if (LAYOUT_TYPE=="interaction") {
			updateInteraction();
		} else if (LAYOUT_TYPE=="tree") {
			if (LAYOUT_OPTIONS["group-author"]) {
				diagonal = hiveLink;
				authorFocus = processor.groupByAuthor();
				nodes = computeTreePositionsGrouped(authorFocus);

			} else {
				diagonal = diagonalTree;
				nodes = LAYOUT.nodes(root);
				authorFocus = [];
				computeTreePositions(nodes);
			};
			links = LAYOUT.links(nodes);
			updateFocus();
			updateNodes();
			updateTreeLinks();
		} else if (LAYOUT_TYPE=="timeline") {
			diagonal = d3TimelinePath;
			if (LAYOUT_OPTIONS["group-author"]) {
				// DURATION = 0;
				// setInterval(function() {
				// 	authorFocus = processor.groupByAuthor(___COUNT___);
				// 	___COUNT___++;
				// 	nodes = computeTimelinePositionsGrouped(authorFocus);
				// 	updateNodes();
				// 	updateTreeLinks();
				// }, 2000);
				authorFocus = processor.groupByAuthor();
				nodes = computeTimelinePositionsGrouped(authorFocus);
			} else {
				nodes = LAYOUT.nodes(root);
				authorFocus = [];
				computeTimelinePositions(nodes);
			};
			links = LAYOUT.links(nodes);
			updateFocus();
			updateNodes();
			updateTreeLinks();
		};
		document.getElementById("svg").setCurrentTime(0);
		TOC(true);
	};
	function resetZoom() { 
		TIMELINE_SCROLL=0; 
		ZOOM.translate([0,0]); 
		ZOOM.scale(1); 
		ZOOM.event(svg); 
	};
	this.config = function(configuration) {
		configureLayout(configuration);
		resetZoom();
	};
	this.updateGraph = function() { update(); };
	this.highlightUsers = function (users, highlight) {
		var selector = users.map(function(u) {return ".user-"+u;}).join(",");
		var scale = d3Scale((highlight ? 2 : 1)/(ZOOM.scale()));
		d3.selectAll(selector)
			.style("-webkit-transform", function(d) {return d3TranslateNode3D(d) + scale; });
	};
	this.selectTimeRange = function(range) {
		TS_RANGE = range;
		if (LAYOUT_TYPE=="timeline") update();
	};
	configureLayout();	// Establecimiento del layout inicial
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
							d3.selectAll("g.node.user-"+user.nickname+" .shape").attr("fill", newColor);
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
		var theWords = sortNumArray(makeArray(words, "word"), "n", true).slice(0,56);	// 65 primeras palabras
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
function FrequencyVisualizer(element, processor, margin) {
	/* datos de histograma */
	function getData() {
		return processor.getFrequencies().data;
	};
	/* rango de tiempos */
	function getRange() {
		return processor.getFrequencies().tsRange;	
	};
	var container = document.querySelector(element);
	d3.select(container).style({"left": margin+"px", "right": margin+"px"});

	var graph = new Rickshaw.Graph({
		element: container,
		series: [{
			color: "rgba(112, 230, 214, 0.5)",
			data: getData(),
			name: "Mensajes/h"
		}]
	});
	var range = new RangeSelector(element, getRange());
	var x_axis = new Rickshaw.Graph.Axis.Time({graph: graph});
	var time = new Rickshaw.Fixtures.Time();
	var y_axis = new Rickshaw.Graph.Axis.Y({
		graph: graph,
		orientation: 'left',
		timeUnit: time.unit["hour"],
		tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
		element: container,
	});
	graph.render();
	this.updateGraph = function() {
		graph.series[0].data = getData();
		var rect = container.getBoundingClientRect(),
			width = rect.width,
			height = rect.height;
		graph.configure({
			width: width, height: height
		});
		graph.render();
		range.update();		// actualización del selector de rango
	};
};

function RangeSelector(element, domain) {
	var extent = domain;
	var scale = d3.scale.linear();
	var container = document.querySelector(element)
		rect = container.getBoundingClientRect()
		width = rect.width,
		height = rect.height;
	var xScale = d3.scale.linear().range([0,width]).domain(domain);
	var brush = d3.svg.brush()
		.x(xScale)
		.extent(domain)
		// .on("brushstart", brushStart)
		.on("brush", brushMove)
		.on("brushend", brushEnd);
	var svg = d3.select(container)
		.append("svg").attr("class", "range");
	var brushg = svg.append("g")
		.attr("class", "brush")
		.call(brush);
	brushg.selectAll(".resize").append("rect")
		.attr("x", -2)
		.attr("y", 0)
		.attr("width", 4);
	brushg.selectAll("rect")
		.attr("height", height);
	this.update = function() {
		console.log("update");
		rect = container.getBoundingClientRect();
		width = rect.width;
		xScale.range([0,width]);
		var left = xScale(extent[0]);
		var right = xScale(extent[1]);
		brushg.select(".extent").attr({"x": left, "width": right-left});
		brushg.select(".resize.w").attr("transform", d3Translate([left,0]));
		brushg.select(".resize.e").attr("transform", d3Translate([right,0]));
	};
	// function brushStart() {
	// };
	function brushMove() {
		extent = brush.extent();
	};
	function brushEnd() {
		extent = brush.extent();
		dispatchTimeRange(extent);
	};
};


