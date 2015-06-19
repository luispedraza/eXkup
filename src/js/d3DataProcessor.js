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
				(result[nickname] = users[nickname]).children = [m];
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
				var u = resultArray[i],
				fullInteraction_I = fullInteraction[i];
				u.newPosition.push({"v": u.position, "w": 0.5});	// posición actual
				for (var j=0; j<nUsers; j++) {
					var v = resultArray[j];
					var w = fullInteraction_I[j];
					// w = w*w;
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
		// for (var i=0; i<0; i++) { optimStep(); };
		return {"authors": sortNumArray(resultArray, "position"),
				"interaction": fullInteraction};
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
			} else if (selector.type=="image") {
				messages = selector.value;
			};
			messages.forEach(function(m) {
				if (!m) return;
				console.log(m);
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
	/* Obtiene los mensajes que son interacciones entre dos usuarios dados */
	this.getUsersInteraction = function(user1, user2) {
		var messagesIDs = {};
		messages.forEach(function(m) {
			if ((m.usuarioOrigen==user1 && m.autorMsgRespuesta==user2) || (m.usuarioOrigen==user2 && m.autorMsgRespuesta==user1)) {
				messagesIDs[m.idMsg] = true;
				messagesIDs[m.idMsgRespuesta] = true;
			};
		});
		return messages.filter(function(m) {
			return messagesIDs[m.idMsg];
		});
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


