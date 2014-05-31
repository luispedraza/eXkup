var currentBoard = null;
var loading = false;

var API = new EskupApi();	// La API de Eskup

window.addEventListener("load", initPopup);

function initPopup() {
	/* Obtención de la clave pública de usuario, e inicialización del perfil */
	API.init(function(userID) {
		console.log(userID);
		TABLONES["mios"] = "t1-" + userID;
		// eskupLoadBlockedThemes();
		// Eventos
		document.getElementById("search").addEventListener("click", Search);
		document.getElementById("board").addEventListener("scroll", function() {
			if ((currentBoard == "favs") || loading) return;
			if (this.scrollTop+this.offsetHeight >= this.scrollHeight) {
				loading = true;
				loadData(null, function() {
					loading = false;
				});
			};
		});
		document.getElementById("todo").addEventListener("click", function(){
			loadBoard(this.id);
		});
		document.getElementById("sigo").addEventListener("click", function() {
			loadBoard(this.id);
		});
		document.getElementById("mios").addEventListener("click", function() {
			loadBoard(this.id);
		});
		document.getElementById("priv").addEventListener("click", function() {
			loadBoard(this.id);
		});
		document.getElementById("favs").addEventListener("click", function() {
			currentBoard = getBoard(this.id);
			loadFavorites();
			uiSelectBoard(this.id);
		});
		$("#logout").on("click", function() {
			API.logOut()
		});
		document.getElementById("closetree").addEventListener("click", function() {
			document.getElementById("board").style.left = 0;
			document.getElementById("tree-board").style.left = "450px";
		});
		$("#edit-section-h1").on("click", function() {
			showEditor();
		});
		$("#cancel").on("click", function() {
			showEditor(false);
		});
		/* Mostrar el perfil */
		$("#profile-item").on("click", function() {
			$(this).toggleClass('on');
			API.loadProfile(function(user) {
				fillHeader(user);
				fillProfile(user);
				LoadFollowTo();
				LoadFollowMe();
				API.loadFollowedThemes(function(data) {
					fillThemes(data);
				});
				$("#profile-container").toggleClass('on');
			});
		});
		// cargar tablón de eventos seguidos
		(function() {
			var evObj = document.createEvent('MouseEvents');
		    evObj.initEvent("click", true, false);
		    document.getElementById("sigo").dispatchEvent(evObj);
		})();

		/* Información sobre el tablón actual */
		$("#board-info .see-more").on("click", function() {
			$("#board-info").toggleClass("on");
		});
	});
};

/* Gestión de la ventana de edición */
function showEditor(show, config, msgID) {
	if (typeof config == "undefined") config = "reset";
	$edit = $("#edit-section");
	(show == null) ? $edit.toggleClass("on") : $edit.toggleClass("on", show);
	switch (config) {
		case "reply":
			$("#edit-section-h1 .edit-title").html("respondiendo al mensaje:");
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

function dispatchProgress(p) {
	var event = document.createEvent("Event");
	event.initEvent("change", true, true);
	event.customData = p;
	document.getElementById("progress").dispatchEvent(event);
};

/* Carga de un tablón en la ventana de mensajes */
function loadBoard(id) {
	currentBoard = getBoard(id);
	loadData(currentBoard, function (data) {
		uiSelectBoard(id, data);
	});
};

/* Selecciona el board actual en la interfaz */
function uiSelectBoard(board, data) {
	// selección del tablón actual en el menú lateral
	$(".board-selector.on").removeClass("on");
	$("#"+board).addClass("on");
	// información sobre el tablero actual:
	console.log("datos", board, data);
	$boardTitle = $("#board-title");
	$boardDescription = $("#board-description");
	var title, description;
	if (board == "sigo") {
		title = "Mensajes de usuarios y temas que sigo";
	} else if (board == "todo") {
		title = "Todos los mensajes de Eskup";
	} else if (board == "mios") {
		title = "Mensajes enviados por mí";
	} else if (board == "priv") {
		title = "Mis mensajes privados";
	} else if (board == "favs") {
		title = "Mis mensajes favoritos";
	} else {

	};
	$boardTitle.text(title);
};

/* Carga de una conversación completa */
function loadThread() {
	var threadID = this.getAttribute("data-thread");
	API.loadThread(threadID, function(info) {
		var infoTree = new Object();
		infoTree.id = null;
		function addNode(node, parent, tree) {
			if (!tree.idMsg) return node;
			else if (tree.idMsg == parent) {
				tree.children.push(node);
				tree.nRep = tree.children.length;
				for (var n=0; n<tree.children.length; n++)
					tree.nRep += tree.children[n].nRep;
			}
			else for (var n=0; n<tree.children.length; n++)
				addNode(node, parent, tree.children[n]);
		}
		for (var m=0; m<info.mensajes.length; m++) {
			var node = info.mensajes[m];
			API.buildMessage(node, info.perfilesUsuarios);
			node.children = [];
			node.nRep = 0;
			parentId = node.idMsgRespuesta;
			infoTree = addNode(node, parentId, infoTree) || infoTree;
		}
		var divtree = document.getElementById("tree");
		divtree.innerHTML = "";
		document.getElementById("tree-board").style.left = "0px";
		document.getElementById("board").style.left = "-450px";
		// showNodeLinkTree(infoTree);
		showMsgTree(infoTree, document.getElementById("tree"), true);
	});
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
						if (currentBoard == "favs") {
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
*/
function appendMsg(msg, board, themes) {
	var userNickname = API.getUserNickname();
	var m_id = msg.idMsg;
	var user = msg.usuarioOrigen;
	var tsMessage = msg.tsMensaje * 1000;	// timestamp del mensaje
	// Creación del nuevo mensaje:
	var div_msg = document.createElement("div");
	div_msg.className = "message";
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
	dReply.addEventListener("click", replyMessage);
	// Forward
	var dFwd = document.createElement("div");
	dFwd.className = "btn fwd";
	dFwd.innerHTML = "<i class='fa fa-mail-forward'></i> reenviar";
	dFwd.title = "reenviar";
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
			var THAT = this;
			API.getMessage(this.getAttribute("data-reply"), function(data) {
				var repliedMsg = data.mensajes[0];
				API.buildMessage(repliedMsg, data.perfilesUsuarios);
				// agrego el mensaje respondido como hijo del mensaje actual
				appendMsg(repliedMsg, $(THAT).closest(".message").addClass("conversation").get(0), data.perfilesEventos);
			});
		});
		dHead.innerHTML += "<br />"
		dHead.appendChild(div_reply);
		var div_thread = document.createElement("div");
		div_thread.className = "btn thlink";
		div_thread.innerHTML = "<i class='fa fa-comments'></i> charla";
		div_thread.title = "sigue el hilo";
		div_thread.setAttribute("data-thread", msg.hilo);
		div_thread.addEventListener("click", loadThread);
		dCtrl.appendChild(div_thread);
	}
	if (user == userNickname) {		// el mensaje es del usuario actual
		var dDel = document.createElement("div");
		dDel.className = "btn";
		dDel.innerHTML = "<i class='fa fa-times-circle'></i> borrar";
		dDel.setAttribute("m_id", m_id);
		dDel.addEventListener("click", msgDelete);
		dCtrl.appendChild(dDel);
	}
	dHead.appendChild(dCtrl);
	// Temas del mensaje
	var themesFound = false;
	if (themes) {
		var $divThemes = $("<ul class='themes'></ul>");
		var msgThemes = msg.CopiaEnTablones.split( "," );	// temas del mensaje
		for (var t=0, len = msgThemes.length; t < len; t++) {
			var themeKey = msgThemes[t];
			var themeData = themeKey.split("-");
			if (themeData[0] == "ev") {
				themesFound = true;
				var themeID = themeData[1];
				var themeInfo = themes[themeID];	// información sobre el tema, de la API
				// BLOQUEDO DE TEMAS:
				// if ((locationid == "todo") && (CheckBlockTema(temaid) != -1)) continue;
				// else msgbloqueado = false;
				// if (CheckSigoTema(temaid) == 1) temali.className = "seguido";					
				// else temali.className = "noseguido";
				var themeName = themeInfo.nombre;
				var $themeElement = $("<li>")
					.attr("data-board", themeKey)
					.text(themeName)
					.on("click", function() {
						loadBoard($(this).attr("data-board"));
					})
					.appendTo($divThemes);
			};
		};
	};
	// Construcción final y agregación
	div_msg.appendChild(dHead);
	div_msg.appendChild(div_cont);
	if (themesFound) $(div_msg).append($divThemes);
	board.appendChild(div_msg);
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

/* Cargar usuarios que me siguen */
function LoadFollowMe(pag) {
	if (typeof pag == "undefined") pag = 1;
	API.loadFollowMe(pag, function(users) {
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-me-users"), users);
		LoadFollowMe(pag+1);
	});
};

/* Cargar usuarios a los que sigo */
function LoadFollowTo(pag) {
	if (typeof pag == "undefined") pag = 1;
	API.loadFollowTo(pag, function(users) {
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-to-users"), users);
		LoadFollowTo(pag+1);
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

/* Carga de un tablón de mensajes */
function loadData(board, callback) {
	$("#board").append("<div class='loading'><i class='fa fa-refresh fa-spin'></i>cargando datos...</div>");
	API.loadBoard(board, function(info) {
		var messages = info.mensajes;
		var usersInfo = info.perfilesUsuarios;
		var themesInfo = info.perfilesEventos;
		var board = document.getElementById("board");
		board.style.left = 0;
		document.getElementById("tree-board").style.left = "450px";
		if (messages.length == 0) {
			$(board).append("<div class='no-messages'>No hay mensajes que mostrar.</div>");
		} else {
			for (var i=0; i<messages.length; i++) {
				var msg = info.mensajes[i];
				if (msg.borrado) continue;
				API.buildMessage(msg, usersInfo);
				appendMsg(msg, board, themesInfo);
			};
		}
		if (callback) callback(info);
		$("#board").find(".loading").remove();
	});
};

/* Respuesta a un mensaje */
function replyMessage() {
	var msg = $(this).closest('.message').get(0);
	$("#replying-message").remove();
	$("#editor").before($("<div>")
		.attr("id", "replying-message")
		.html(msg.outerHTML));
	showEditor(true, "reply", msg.id);
};

/* Reenvío de un mensaje */
function forwardMessage() {
	var msg = $(this).closest('.message').get(0);
	$("#replying-message").remove();
	showEditor(true, "forward", msg.id);
	$("#newmessage").html($(msg).find(".msg_content").get(0).innerHTML);
};

