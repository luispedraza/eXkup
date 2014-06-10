var API = new EskupApi();	// La API de Eskup
var loading = false;
var CURRENT_THEME = null;
var CURRENT_PAGE = 1;

window.addEventListener("load", initPopup);

function initPopup() {
	/* Obtención de la clave pública de usuario, e inicialización del perfil */
	API.init(function(userID) {
		if (!userID) {
			chrome.tabs.create({url:"http://eskup.elpais.com/index.html"});
			return;
		};
		TABLONES["mios"] = "t1-" + userID;
		fillHeader();
		fillThemes();
		// Eventos
		// document.getElementById("search").addEventListener("click", Search);
		document.getElementById("board").addEventListener("scroll", function() {
			if ((CURRENT_THEME == "favs") || loading) return;
			if (this.scrollTop+this.offsetHeight >= this.scrollHeight) {
				loading = true;
				loadBoardMessages(null, function() {
					loading = false;
				});
			};
		});

		$(".board-selector").on("click", function() { loadBoard(this.id); });
		$("#logout").on("click", function() { 
			new ModalDialog("Cerrar sesión", 
				"¿Deseas cerrar tu sesión en Eskup?", 
				["Aceptar", "Cancelar"], function(r) {
					if (r=="Aceptar") API.logOut();
				});
		});
		$("#closetree").on("click", function() { showTreeBoard(false); });
		$("#noindent").on("click", function() {
			$(this).toggleClass('on');
			$("#tree").toggleClass('no-indent');
		});
		$("#mouse-follow").on("click", function() {
			$(this).toggleClass('on');
		});
		$("#edit-section-h1").on("click", function() { showEditor(); });
		$("#cancel").on("click", function() { showEditor(false); });
		/* Mostrar el perfil */
		$("#profile-item").on("click", function() {
			showProfile();
			fillProfile();
		});
		// Mostrar secciones del perfil
		$("#profile-section .selector-item h4").on("click", function() {
			$("#profile-section .selector-item").removeClass('on');
			$(this).closest(".selector-item").addClass('on');
		});
		$("#follow-to h4").on("click", fillFollowTo);
		$("#follow-me h4").on("click", fillFollowMe);
		$("#themes-follow h4").on("click", fillFollowThemes);
		$("#themes-write h4").on("click", fillWritableThemes);
		/* Información sobre el tablón actual */
		$("#board-title").on("click", function() {
			$("#messages-header").toggleClass("on");
		});
		/* Muestra la visualiación de un thread */
		$("#show-d3").on("click", function() {
			var threadID = $("#tree-board").attr("data-thread");
			API.loadThread(threadID, function(info) {
				chrome.tabs.create({url:"d3Thread.html", active:false}, function(tab) {
					var theTabID = tab.id;
					chrome.tabs.onUpdated.addListener(function(tabId , changedInfo) {
						if ((tabId == theTabID) && (changedInfo.status == "complete")) {
							chrome.tabs.sendMessage(theTabID, {info: info});
							chrome.tabs.update(theTabID, {active: true});	// activamos la nueva pestaña
						};
					});
				});
			});
		});

		// Inicialización de contenidos
		chrome.tabs.query({'currentWindow': true, 'active': true}, function(t) {
			var currentTab = t[0];
			var elpaisPattern = RegExp("https?://.*?\.?elpais\.com");
			if (elpaisPattern.exec(currentTab.url)) {
				chrome.tabs.executeScript(currentTab.id, { file: "js/elpais.js" }, function(result) {
					var location = result[0];
					if (location) {
						var data = location.match(/eskup.elpais.com\/C(.+)'/);
						if (data && data[1]) {
							// cargar conversación de la noticia
							var theCode = data[1];
							showThread(theCode, theCode);
						} else {
							// cargar tablón de eventos seguidos
							var evObj = document.createEvent('MouseEvents');
						    evObj.initEvent("click", true, false);
						    document.getElementById("sigo").dispatchEvent(evObj);
						};
					};
				});	
			};
		});
	});
};

/* Gestión de la ventana de edición 
	@param show: controla si se muestra o no el editor
	@param config: reply, forward
	@param msgID: id del mensaje a contestar o reenviar
	@param themes: temas a los que se enviará el mensaje
*/
function showEditor(show, config, msgID, themes) {
	if (typeof config === "undefined") config = "reset";
	// los temas a los que se envía el mensaje (forward o repy):
	$edit = $("#edit-section");
	(show == null) ? $edit.toggleClass("on") : $edit.toggleClass("on", show);
	switch (config) {
		case "reply":
			if (themes) {
				themes = themes.split(",");
				API.loadWritableThemes(function(wthemes) {
					var goodThemes = [], badThemes = [];
					themes.forEach(function(d) {
						(d in wthemes) ? goodThemes.push(d) : badThemes.push(d);
					});
					editorAddThemes(goodThemes);	// temas a los que se puede enviar el mensaje
					$ulThemes = $("<ul>");
					goodThemes.forEach(function(d) {
						$ulThemes.append($("<li>").text(wthemes[d].nombre));
					});
					$modalContent = $("<div>").append($("<p>").text(
						"Tu respuesta aparecerá en los siguientes temas, en los que tienes permiso de escritura:"))
						.append($ulThemes);
					new ModalDialog("Información sobre tu respuesta", 
						$modalContent, ["OK"], null);
				});			
			};
			$("#edit-section-h1 .edit-title").html("respondiendo al mensaje:");
			$("#send").text("RESPONDER")
				.attr("data-command", "reply")
				.attr("data-id", msgID);
			break;
		case "replyPrivate":
			console.log(themes);
			editorAddUsers(themes);
			$("#edit-section-h1 .edit-title").html("respondiendo al privado:");
			$("#send").text("RESPONDER")
				.attr("data-command", "reply")
				.attr("data-id", msgID);
			break;
		case "forward":
			$("#edit-section-h1 .edit-title").html("reenviando el mensaje:");
			$("#send").text("REENVIAR")
				.attr("data-command", "forward")
				.attr("data-id", msgID);
			break;
		default:
			$("#edit-section-h1 .edit-title").html("escribir nuevo mensaje");
			$("#send").text("ENVIAR")
				.attr("data-command", "send")
				.removeAttr("data-id");
	};
};

/* Carga de un tablón en la ventana de mensajes */
function loadBoard(id) {
	CURRENT_THEME = getBoard(id);
	if (id=="favs") {	// los mensajes favoritos los guarda la extensión
		loadFavorites();
		uiSelectBoard(id);
	} else {
		loadBoardMessages(CURRENT_THEME, function (data) {
			uiSelectBoard(id);
		});
	};
};

/* Carga de mensajes de un tablón */
function loadBoardMessages(theme, callback) {
	$("#board").append("<div class='loading'><i class='fa fa-refresh fa-spin'></i>cargando datos...</div>");
	if (theme) {
		CURRENT_PAGE = 1;
		document.getElementById("board").innerHTML = "";	// limpieza
	} else CURRENT_PAGE++;		// nueva página
	API.loadMessages(CURRENT_THEME, CURRENT_PAGE, function(info) {
		if (info) {
			var messages = info.mensajes;
			var usersInfo = info.perfilesUsuarios;
			var themesInfo = info.perfilesEventos;
			var board = document.getElementById("board");
			if (messages.length == 0) {
				$(board).append("<div class='no-messages'>No hay mensajes que mostrar.</div>");
			} else {
				for (var i=0; i<messages.length; i++) {
					var msg = info.mensajes[i];
					if (msg.borrado) continue;
					API.buildMessage(msg, usersInfo);
					appendMsg(msg, board, themesInfo);
				};
			};
			showTreeBoard(false);
			if (callback) callback(info);
		}
		$("#board").find(".loading").remove();
	});
};

/* Selecciona el board actual en la interfaz */
function uiSelectBoard(board) {
	// selección del tablón actual en el menú lateral
	$(".board-selector.on").removeClass("on");
	$("#"+board).addClass("on");
	// información sobre el tablero actual:
	$boardTitle = $("#board-title").html("");
	$boardDescription = $("#board-description").html("");
	var title = "", $description = $("<div>");
	if (board == "sigo") {
		title = "Mensajes de usuarios y temas que sigo";
		$description
			.append($("<p>").text("Aquí encontrarás todos los mensajes publicados por los usuarios a los que sigues, y en los temas que sigues."));
	} else if (board == "todo") {
		title = "Todos los mensajes de Eskup";
	} else if (board == "mios") {
		title = "Mensajes enviados por mí";
	} else if (board == "priv") {
		title = "Mis mensajes privados";
	} else if (board == "favs") {
		title = "Mis mensajes favoritos";
	} else {
		var theme = board.split("-")[1];
		var themeInfo = API.loadThemeInfo(theme);
		title = themeInfo.nombre;
		$("<img>").attr("src", themeInfo.pathfoto).appendTo($description);
		$("<p>").html(themeInfo.descripcion).appendTo($description);
		var $themeControl = $("<div>").attr("class", "theme-control").appendTo(($description));
		var $apoyos = null;
		for (var a in themeInfo.apoyos) {
			var apoyo = themeInfo.apoyos[a];
			var apoyo_title = apoyo.titulo_apoyo;
			var apoyo_link = apoyo.enlace_apoyo;
			if (apoyo_title) {
				$apoyos = ($apoyos || $("<ul>").attr("class", "links"));
				$apoyos.append($("<li>").html( apoyo_link ? makeLink(apoyo_title, apoyo_link) : apoyo_title));
			};
		};
		if ($apoyos) $description.append($apoyos);
		// control de seguimiento
		var followed = (themeInfo.estado_seguimiento == 1);
		$themeControl.append(
			$("<div>").attr("class", "control-item " + ((followed) ? "follow on" : "follow"))
				.attr("data-theme", theme)
				.on("click", function() {
					onFollowTheme(this);
				})
				);
		// control de escritura
		var writable = (themeInfo.estado_escritura == 1);
		if (themeInfo.tipo_suscripcion == 1) {
			$themeControl.append(
				$("<div>").attr("class", "control-item " + ((writable) ? "writable on" : "writable"))
					.attr("data-theme", theme)
					.attr("data-tiposuscripcion", themeInfo.tipo_suscripcion)
					.attr("data-tipoevento", themeInfo.tipo_evento)
					.attr("data-writable", themeInfo.estado_escritura)
					.on("click", function() {
						onWriteTheme(this);
					}));			
		};
		$description.append($themeControl);
	};
	$boardTitle.html(title);
	$boardDescription.append($description);
};

/* Dejar de seguir o comenzar a seguir un tema */
function onFollowUser(button, callback) {
	$this = $(button);
	var user = $this.attr("data-user");
	var followed = $this.hasClass('on');
	new ModalDialog((followed ? "Dejar de" : "Comenzar a") + " seguir a este usuario", 
		"Si continúas, " + (followed ? "dejarás de seguir" : "comenzarás a seguir") + " a este usuario en Eskup", 
		[(followed ? "Dejar de " : "Comenzar a ") + "seguirlo", "Cancelar"],
		function(result) {
			if (result == "Cancelar") return;
			API.followUsers([user],
				result == "Comenzar a seguirlo",
				function(r) {
					if (r == "OK") {
						$this.toggleClass('on');
						fillFollowTo();
					} else {
						new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
					};
					if (callback) callback();
				});
		});
};

/* Dejar de seguir o comenzar a seguir un tema */
function onFollowTheme(button, callback) {
	$this = $(button);
	var theme = $this.attr("data-theme");
	var followed = $this.hasClass('on');
	new ModalDialog((followed ? "Dejar de" : "Comenzar a") + " seguir este tema", 
		"Si continúas, " + (followed ? "dejarás de seguir" : "comenzarás a seguir") + " este tema en Eskup", 
		[(followed ? "Dejar de " : "Comenzar a ") + "seguirlo", "Cancelar"],
		function(result) {
			if (result == "Cancelar") return;
			API.followThemes([theme],
				result == "Comenzar a seguirlo",
				function(r) {
					if (r == "OK") {
						$this.toggleClass('on');
						fillThemes();	// se recarga la lista de temas seguidos
					} else {
						new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
					};
					if (callback) callback();
				});
		});
};

function onWriteTheme(button, callback) {
	$this = $(button);
	var theme = $this.attr("data-theme");
	var typesuscription = $this.attr('data-tiposuscripcion');
	// var typeevent = $this.attr('data-tipoevento');
	var writable = $this.attr('data-writable');
	if ((typeof typesuscription === "undefined")||(typesuscription == "1")) {
		// no se precisa autorización
		new ModalDialog(((writable=="1") ? "Dejar de" : "Comenzar a") + " escribir en este tema",
			"Si continúas, " + ((writable=="1") ? "dejarás de escribir" : "comenzarás a escribir") + " en este tema en Eskup", 
			[((writable=="1") ? "Dejar de " : "Comenzar a ") + "escribir", "Cancelar"],
			function(result) {
				if (result == "Cancelar") return;
				API.writeThemes([theme],
					result == "Comenzar a escribir",
					function(r) {
						if (!r.match(/^error/)) {
							$this.toggleClass('on');
							$this.attr("data-writable", ((writable == "1") ? "0" : "1" ));	// cambio estado escritura
						} else {
							new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
						};
						if (callback) callback();
					});
			});
	} else if (typesuscription == "2") {
		// se precisa autorización
		// TODO: hay que hacerlo, pero no sé si quedan eventos de este tipo
	};
};

// function Positioner() {
// 			// Este objeto guardará estado de la posición del scroll del árbol
// 			var lastFound = 0;
// 			var messages = [];
// 			var treeBoard = null;
// 			var finished = false;
// 			var checkPos = function(e) {
// 				var pos = $(messages[e]).offset().top - treeBoard.offset().top;
// 				return ((pos>0) && (pos<100));
// 			};
// 			this.find = function() {
// 				if (!finished) {
// 					console.log("buscando");
// 					var newMessages = $("#tree .message");
// 					if (newMessages.length != messages.length) {
// 						messages = newMessages;
// 					} else {
// 						finished = true;
// 					};
// 				};
// 				treeBoard = (treeBoard || $("#tree-board"));
// 				if (!messages) return -1;
// 				for (var i=lastFound, j=lastFound-1, len=messages.length; ((i<len) || (j>=0)); ((i++)&&(j--)) ) {
// 					console.log(i,i);
// 					if ((i<len) && checkPos(i)) {
// 						lastFound = i; break;
// 					};
// 					if ((j>=0) && checkPos(j)) {
// 						lastFound = j; break;
// 					};
// 				};
// 				console.log("finished");
// 				return $(messages[lastFound]).offset().left - treeBoard.offset().left;
// 			};
// 			this.reset = function() {lastFound=0;};
// 		};
// var POSITIONER = new Positioner();	// para posicionar el scroll

/* Carga de una conversación completa */
function showThread(threadID, originalMsgID) {
	var modal = new ModalDialog("Cargando datos", 
		"<div class='loading'><i class='fa fa-refresh fa-spin'></i> Por favor, espera mientras se carga la conversación</div>", 
		[]);
	API.loadThread(threadID, function(info) {
		var treeDiv = document.getElementById("tree");
		treeDiv.innerHTML = "";
		var aux = {};
		/* agregar un nuevo nodo: item + children */
		var newNode, newItem, newContent, newMore;
		var $highlightedMsg = null;
		function addNode(msg, parentID) {
			newNode = document.createElement("div");
			newNode.className = "node";
			newItem = document.createElement("div");
			newItem.className = "item";
			newNode.appendChild(newItem);
			var $newMsg = appendMsg(msg, newItem);
			var msgID = msg.idMsg;
			if (msgID == originalMsgID)
				$highlightedMsg = $newMsg.addClass('highlighted');	// resaltamos el mensaje de entrada al hilo
			aux[msgID] = {node: newNode};
			if (parentID == null) {
				treeDiv.appendChild(newNode);
				return;
			};
			var parent = aux[parentID];
			if (!parent.children) {
				var childrenDiv = (parent.children = document.createElement("div"));
				childrenDiv.className = "children on";
				newMore = document.createElement("div");
				newMore.className = "more fa fa-minus-square";
				newMore.addEventListener("click", function() {
					$(this)
						.toggleClass('fa-minus-square')
						.toggleClass('fa-plus-square')
						.closest('.children').toggleClass('on');
				});
				childrenDiv.appendChild(newMore);
				parent.node.appendChild(childrenDiv);
			};
			parent.children.appendChild(newNode);
		};
		var messages = info.mensajes;
		addNode(API.buildThreadMessage(messages[0], info.perfilesUsuarios), null);
		var replies = messages.slice(1);	// cojo todas las respuestas al nodo raíz
		replies.forEach(function(m) {
			addNode(API.buildThreadMessage(m, info.perfilesUsuarios), m.idMsgRespuesta);
		});
		showTreeBoard(true);	// mostramos el resultado
		// POSITIONER.reset();
		$treeBoard = $("#tree-board").attr("data-thread", threadID)	// lo guardamos en el board, para visualización
			// .off("scroll").on("scroll", function() {
			// 	var v = POSITIONER.find();
			// 	if ((v<20)||(v>40)) {
			// 		$treeBoard.scrollLeft($treeBoard.scrollLeft() + v - 30);
			// 	};
			// })
			.off("mousemove").on("mousemove", function(e) {
				if ($("#mouse-follow").hasClass('on')) {
					var treeBoardRect = this.getBoundingClientRect(),
						treeRect = document.getElementById("tree").getBoundingClientRect();
					var alfa = (e.clientX - treeBoardRect.left) / treeBoardRect.width;
					var scroll = Math.floor(alfa*(treeRect.width - treeBoardRect.width));
					$treeBoard.scrollLeft(scroll);
				};
			})
			;
		setTimeout(function() {
			// scroll hasta el mensaje de punto de entrada
			$treeBoard.scrollTop($highlightedMsg.offset().top-$treeBoard.offset().top);
			modal.close();	// ocultamos el diálogo informativo de carga
		}, 1500);
	});
};

function showTreeBoard(show) {
	$(".board").toggleClass('switch', show);
};

/* Agrega o elimina un mensaje de la lista de favoritos */
function setFavorite() {
	var $favBtn = $(this);
	var m_id = $favBtn.closest('.message').attr("id");	// id del mensaje
	if (!$favBtn.hasClass("on")) {		// marvar favorito
		API.addFavorite(m_id, function(status, statusInfo) {
			if (status == 0) {
				new ModalDialog("El mensaje se ha agregado a tus favoritos.", null, [], null, 2000);
				$favBtn.toggleClass('on');
			} else {
				new ModalDialog("Error: No se pudo agregar el mensaje a favoritos.", statusInfo, [], null, 2000);
			};
		});
	} else {						// desmarcar favorito
		new ModalDialog("¿Seguro que desea eliminar este mensaje de sus favoritos?",
			$favBtn.closest(".message")[0].outerHTML,
			["Sí", "Cancelar"], function(result) {
				if (result == "Sí") {
					API.removeFavorite(m_id, function(status, statusInfo) {
						new ModalDialog("El mensaje se ha eliminado de tus favoritos.", null, [], null, 2000);
						$favBtn.toggleClass('on');
						// además lo eliminamos del tablón de favoritos
						if (CURRENT_THEME == "favs") {
							$favBtn.closest('.message').fadeOut(function() {
								$(this).remove();
							});
						};
					});
				};
			});
	};
};

/* Función que agrega un mensaje a un tablón 
	@param msg: mensaje a agregar
	@param board: tablón que contendrá el mensaje
	@themes: información complementaria (temas)
	@before: elemento antes del cual se va a insertar el mensaje

	@return: nuevo mensaje agregado
*/
function appendMsg(msg, board, themes, before) {
	if (typeof board === "string") board = document.getElementById(board);
	var userNickname = API.getUserNickname();
	var m_id = msg.idMsg;
	var user = msg.usuarioOrigen;
	var tsMessage = msg.tsMensaje * 1000;	// timestamp del mensaje
	// Creación del nuevo mensaje:
	var div_msg = document.createElement("div");
	div_msg.className = "message";
	div_msg.setAttribute("data-author", userNickname);	// el autor del mensaje
	// div_msg.className = "message card";
	// $(div_msg).appear({force_process: true});
	div_msg.id = m_id;
	// El contenido del mensaje:
	var div_cont = document.createElement("div");
	div_cont.className = "msg_content";
	div_cont.innerHTML = msg.contenido;
	processVideos(div_cont);
	if (msg.cont_adicional) {
		var img_cont = document.createElement("img");
		img_cont.src = msg.cont_adicional;
		div_cont.appendChild(img_cont);
	}
	// La cabecera:
	var dHead = document.createElement("div");
	dHead.className = "msg_header";
	var img_user = document.createElement("img");
	img_user.src = msg.pathfoto;
	dHead.appendChild(img_user);	// user image

	var a_user = document.createElement("a");
	a_user.href = "http://eskup.elpais.com/" + user;
	a_user.textContent = "@" + user;
	if (msg.usuarioOrigenNombre) a_user.textContent += " (" + msg.usuarioOrigenNombre + ")";
	dHead.appendChild(a_user);		// user link
	var date_element = document.createElement("a");
	date_element.className = "time fa fa-clock-o";
	date_element.textContent = getTimeAgo(new Date(tsMessage), new Date());
	date_element.setAttribute("data-ts", tsMessage);
	date_element.addEventListener("mouseover", function() {
		var timeAgoElement = this;
		TIME_TOOLTIP_TIMER = setTimeout(function() {
			var ts = parseInt(timeAgoElement.getAttribute("data-ts"));
			var date = new Date(ts);
			var tooltip = document.createElement("span");
			tooltip.className = "time-tooltip";
			tooltip.innerHTML = "<span>"
				+formatDate(date, true)
				+"</span><span>"
				+date.toLocaleTimeString()
				+"</span>";
			timeAgoElement.appendChild(tooltip);
		}, 500);
	});
	date_element.addEventListener("mouseout", function() {
		clearTimeout(TIME_TOOLTIP_TIMER);
		$(this).find(".time-tooltip").remove();
	});
	date_element.href = "http://eskup.elpais.com/" + m_id;
	date_element.target = "_blank";
	dHead.appendChild(date_element);

	// Elementos de control:
	var dCtrl = document.createElement("div");
	dCtrl.className = "msg_control fa fa-plus-square";
	// Guardar vavorito
	var dFav = document.createElement("div");
	dFav.className = API.checkFavorite(m_id) ? "btn fav on" : "btn fav";
	dFav.innerHTML = "<i class='fa fa-star'></i> favorito";
	dFav.title = "favorito";
	dFav.setAttribute("m_id", m_id);
	dFav.addEventListener("click", setFavorite);
	// Respuesta
	var dReply = document.createElement("div");
	dReply.className = "btn reply";
	dReply.innerHTML = "<i class='fa fa-mail-reply'></i> responder";
	dReply.title = "responder";
	dReply.setAttribute("data-id", m_id);
	dReply.setAttribute("data-user", user);
	dReply.addEventListener("click", replyMessage);
	// Forward
	var dFwd = document.createElement("div");
	dFwd.className = "btn fwd";
	dFwd.innerHTML = "<i class='fa fa-retweet'></i> reenviar";
	dFwd.title = "reenviar";
	dFwd.setAttribute("data-id", m_id);
	dFwd.setAttribute("data-user", user);
	dFwd.addEventListener("click", forwardMessage);
	dCtrl.appendChild(dFav);
	dCtrl.appendChild(dReply);
	dCtrl.appendChild(dFwd);

	// Hilos de mensajes
	if (msg.idMsgRespuesta && (msg.idMsgRespuesta != m_id)) {
		var div_reply = document.createElement("a");
		div_reply.className = "reply2link fa fa-mail-reply";
		div_reply.textContent = msg.autorMsgRespuesta;
		if (msg.usuarioRespuestaNombre) div_reply.textContent += " (" + msg.usuarioRespuestaNombre + ")";
		div_reply.title = "Respuesta a";
		div_reply.setAttribute("data-reply", msg.idMsgRespuesta);
		div_reply.addEventListener("click", function() {
			var $THAT = $(this);
			API.getMessage($THAT.attr("data-reply"), function(data) {
				var repliedMsg = data.mensajes[0];
				API.buildMessage(repliedMsg, data.perfilesUsuarios);
				// agrego el mensaje respondido
				var $message = $THAT.closest('.message');
				$message.addClass('conversation');
				$newmsg = $(appendMsg(repliedMsg, "board", data.perfilesEventos, $message)).addClass('conversation mark');
				setTimeout(function() {
					$newmsg.addClass('show');	
				}, 500);
			});
		});
		dHead.innerHTML += "<br />"
		dHead.appendChild(div_reply);
		var div_thread = document.createElement("div");
		div_thread.className = "btn thlink";
		div_thread.innerHTML = "<i class='fa fa-comments'></i> charla";
		div_thread.title = "sigue el hilo";
		div_thread.setAttribute("data-thread", msg.hilo);
		div_thread.addEventListener("click", function() {
			showThread(
				this.getAttribute("data-thread"),
				$(this).closest(".message").attr("id"));
		});
		dCtrl.appendChild(div_thread);
	};
	// Mensaje reenviado
	if (msg.reenvio) {
		var div_forward = document.createElement("a");
		div_forward.className = "reply2link fa fa-retweet";
		div_forward.textContent = "mensaje reenviado";
		div_forward.setAttribute("data-forward", msg.reenvio);
		div_forward.addEventListener("click", function() {
			var $THAT = $(this);
			API.getMessage(this.getAttribute("data-forward"), function(data) {
				var forwardedMsg = data.mensajes[0];
				if (forwardedMsg) {
					API.buildMessage(forwardedMsg, data.perfilesUsuarios);
					// agrego el mensaje reenviado
					var $message = $THAT.closest('.message');
					$message.addClass('conversation');
					$newmsg = $(appendMsg(forwardedMsg, "board", data.perfilesEventos, $message)).addClass('conversation mark forwarded');
					setTimeout(function() {
						$newmsg.addClass('show');
					}, 500);
				} else {	// el mensaje original puede estar elminado
					new ModalDialog("El mensaje original ha sido eliminado", null, ["Aceptar"], null, 2000);
				};
			});
		});
		dHead.innerHTML += "<br />"
		dHead.appendChild(div_forward);
	};
	// Mensaje propio
	if (user == userNickname) {
		var dDel = document.createElement("div");
		dDel.className = "btn fa fa-trash-o";
		dDel.textContent = " borrar";
		dDel.setAttribute("m_id", m_id);
		dDel.addEventListener("click", msgDelete);
		dCtrl.appendChild(dDel);
	}
	dHead.appendChild(dCtrl);
	// Temas del mensaje
	if (themes) {
		var $divThemes = null;
		var msgThemes = msg.CopiaEnTablones.split( "," ).filter(function(d) {return d.split("-")[0] == "ev"});	// temas del mensaje
		if (msgThemes.length) {
			$divThemes = $("<ul class='themes'></ul>");
			for (var t=0, len = msgThemes.length; t < len; t++) {
				var themeKey = msgThemes[t];
				var themeID = themeKey.split("-")[1];
				var themeInfo = themes[themeID];	// información sobre el tema, de la API
				var themeName = themeInfo.nombre;
				var $themeElement = $("<li>")
					.attr("data-theme", themeKey)
					.text(themeName)
					.on("click", function() {
						loadBoard($(this).attr("data-theme"));
					})
					.appendTo($divThemes);
			};
			div_msg.setAttribute("data-themes", msgThemes.map(function(d){return d.split("-")[1];}).toString());
		};
	};
	// Construcción final y agregación
	div_msg.appendChild(dHead);
	div_msg.appendChild(div_cont);
	if ($divThemes) $(div_msg).append($divThemes);
	// agregación final del mensaje:
	if (before) $(div_msg).insertBefore(before);
	else board.appendChild(div_msg);
	return $(div_msg);
};

/* Carga de mdensajes favoritos */
function loadFavorites() {
	API.loadFavorites(function(data) {
		var favs = document.getElementById("board");
		favs.innerHTML = "";
		for (var cont=0, len=data.length; cont<len; cont++) {
			var msg = localStorage.getItem(data[cont]);
			if (msg) appendMsg(JSON.parse(msg), favs);
		};
	});
};

/* Rellena la información de usuario en la página de perfil */
function fillProfile() {
	API.loadProfile(function(user) {
		$("#profile-avatar").attr("src", checkUserPhoto(user.pathfoto));
		$("#profile-nickname").text("@" + API.getUserNickname());
		$("#profile-fullname").text((user.nombre + user.apellidos).trim());
		$("#profile-description").text(user.descripcion);
		$("#follow-to .number").text(user.numero_usuarios);
		$("#follow-me .number").text(user.numero_seguidores);
		$("#themes-follow .number").text(user.numero_eventos);
		$("#themes-write .number").text(user.numero_eventos_escribe);
	});
};

/* Muestra u oculta el perfile */
function showProfile() {
	$(this).toggleClass('on');
	$("#profile-container").toggleClass('on');
	$("#profile-container .selector-item").removeClass('on');	// para obligar recarga en click
};

/* Carga en el perfil la lista de usuarios a quienes sigo */
function fillFollowTo() {
	API.loadFollowUsers(1, function(users) {
		var $ul = $("#follow-to ul").html("");
		users.forEach(function(user) {
			var nickname = user.nickname;
			$ul.append(
				$("<li>")
					.append($("<div>").addClass('theme-control').append($("<div>").addClass("control-item follow on")
						.attr("data-user", nickname)
						.on("click", function() {
							onFollowUser(this, function() {
								fillProfile();
								fillFollowTo();	// se recargan los usuarios seguidos
							});
					})))
					.append($("<img>").attr("src", checkUserPhoto(user.pathfoto)).addClass(user.activo ? "online" : ""))
					.append($("<div>").addClass("puser-info")
						.append($("<div>").addClass("puser-nickname").text("@" + nickname))
						.append($("<div>").addClass("puser-fullname").text(user.nombre + " " + user.apellidos))
						)
				);
		});
	});
};

/* Carga en el perfil la lista de usuarios que me siguen */
function fillFollowMe() {
	API.loadFollowUsers(2, function(users) {
		var $ul = $("#follow-me ul").html("");
		users.forEach(function(user) {
			var nickname = user.nickname;
			$ul.append(
				$("<li>")
					.append($("<img>").attr("src", checkUserPhoto(user.pathfoto)).addClass(user.activo ? "online" : ""))
					.append($("<div>").addClass("puser-info")
						.append($("<div>").addClass("puser-nickname").text("@" + nickname))
						.append($("<div>").addClass("puser-fullname").text(user.nombre + " " + user.apellidos))
						)
				);
		});
	});
};

/* Carga en el perfil la lista de temas seguidos */
function fillFollowThemes() {
	API.loadFollowedThemes(function(themes) {
		var $ul = $("#themes-follow ul").html("");
		for (var t in themes) {
			var theme = themes[t];
			$ul.append(
				$("<li>")
					.append($("<div>").addClass('theme-control').append($("<div>").addClass("control-item follow on")
						.attr("data-theme", t)
						.on("click", function() {
							onFollowTheme(this, function() {
								fillProfile();
								fillFollowThemes();	// se recargan los temas seguidos
							});
					})))
					.append($("<img>").attr("src", theme.pathfoto).addClass("big"))
					.append($("<div>").addClass("theme-info")
						.append($("<div>").addClass("ptheme-name").attr("data-theme", "ev-"+t).text(theme.nombre).on("click", function() {
							loadBoard($(this).attr("data-theme"));
							showProfile();
						}))
						.append($("<div>").addClass("ptheme-description").html(theme.descripcion))
						)
				);
		};
	});
};

/* Carga en el perfil la lista de temas en los que puedo escribir */
function fillWritableThemes() {
	API.loadWritableThemes(function(themes) {
		var $ul = $("#themes-write ul").html("");
		for (var t in themes) {
			var theme = themes[t];
			$ul.append(
				$("<li>")
					.append($("<div>").addClass('theme-control').append($("<div>").addClass("control-item writable on")
						.attr("data-theme", t)
						.attr("data-writable", "1")
						.on("click", function() {
							onWriteTheme(this, function() {
								fillProfile();
								fillWritableThemes();	// se recargan los temas en que escribo
							});
					})))
					.append($("<img>").attr("src", theme.pathfoto).addClass("big"))
					.append($("<div>").addClass("theme-info")
						.append($("<div>").addClass("ptheme-name").attr("data-theme", "ev-"+t).text(theme.nombre).on("click", function() {
							loadBoard($(this).attr("data-theme"));
							showProfile();
						}))
						.append($("<div>").addClass("ptheme-description").html(theme.descripcion))
						)
				);
		};
	});
};

/* Eliminación de un mensaje */
function msgDelete() {
	var msgID = this.getAttribute("m_id");
	new ModalDialog("¿Seguro que desea borrar este mensaje?", "", ["Sí", "No"],
		function(result) {
			if (result=="No") return;
			API.deleteMessage(msgID, function(info) {
				if (info.status=="ok") {
					new ModalDialog("Eliminación correcta",
						"El mensaje ha sido eliminado con éxito, aunque el cambio puede tardar en verse reflejado en los servidores de Eskup.",
						["OK"], null, 2000);
					$("#"+msgID).remove();
				} else {
					new ModalDialog("Se ha producido un error",
						"No ha sido posible eliminar el mensaje. Vuelve a intentarlo de nuevo más tarde.",
						["OK"],
						null,
						2000);
				};
			});
		});
};


/* Respuesta a un mensaje */
function replyMessage() {
	var msg = $(this).closest('.message').get(0);
	$("#replying-message").remove();
	$("#editor").before($("<div>")
		.attr("id", "replying-message")
		.html(msg.outerHTML));
	if (CURRENT_THEME=="3") {	// respuesta a un privado
		showEditor(true, "replyPrivate", msg.id, msg.getAttribute("data-author"));		
	} else {					// respuesta normal
		showEditor(true, "reply", msg.id, msg.getAttribute("data-themes"));
	};
};

/* Reenvío de un mensaje */
function forwardMessage() {
	$("#replying-message").remove();
	var msg = $(this).closest('.message').get(0);
	var user = this.getAttribute("data-user");
	var msgID = this.getAttribute("data-id");
	showEditor(true, "forward", msgID, msg.getAttribute("data-themes"));
	var messageContent = "fwd @" + user + ": " + $(msg).find(".msg_content").get(0).innerHTML;
	$("#newmessage").html(messageContent);
};

/* Rellena la cabecera del popup con información del usuario */
function fillHeader() {
	API.loadProfile(function(user) {
		$("#user-avatar").attr("src", user.pathfoto);
		$("#user-nickname").text("@" + API.getUserNickname());
		$("#user-fullname").text("(" + user.nombre + " " + user.apellidos + ")");
	});
};

/* Rellenar la lista de temas seguidos en el el menú de navegación */
function fillThemes() {
	API.loadFollowedThemes(function(themes) {
		$divThemes = $("#themes-follow").html("");
		themes = makeArray(themes).sort(function(a,b) {
			// ordenamos alfabéticamente la lista de temas
			return (a.nombre.toLowerCase() < b.nombre.toLowerCase()) ? -1 : 1;
		});
		themes.forEach(function(theme) {
			themeID = "ev-"+theme.__key;
			var $item = $("<li>")
				.attr("class", "board-selector")
				.attr("data-theme", themeID)
				.attr("id", themeID)
				.text(theme.nombre)
				.on("click", function() { loadBoard($(this).attr("data-theme")); })
				.appendTo($divThemes);
		});
	});
};
