var currentBoard = null;
var loading = false;

var API = new EskupApi();	// La API de Eskup
var CURRENT_THEME = null;
var CURRENT_PAGE = 1;

window.addEventListener("load", initPopup);

function initPopup() {
	/* Obtención de la clave pública de usuario, e inicialización del perfil */
	API.init(function(userID) {
		TABLONES["mios"] = "t1-" + userID;
		fillThemes();
		// eskupLoadBlockedThemes();
		// Eventos
		document.getElementById("search").addEventListener("click", Search);
		document.getElementById("board").addEventListener("scroll", function() {
			if ((currentBoard == "favs") || loading) return;
			if (this.scrollTop+this.offsetHeight >= this.scrollHeight) {
				loading = true;
				loadBoardMessages(null, function() {
					loading = false;
				});
			};
		});
		$(".board-selector").on("click", function() {
			loadBoard(this.id);
		})
		
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
				$("#profile-container").toggleClass('on');
			});
		});

		// $.fn.appearElement("#board");
		// $(document.body).on('appear', '.message', function(e, $affected) {
		// 	// add class called “appeared” for each appeared element
		// 	$(this).addClass("appeared");
		// });

		// cargar tablón de eventos seguidos
		(function() {
			var evObj = document.createEvent('MouseEvents');
		    evObj.initEvent("click", true, false);
		    document.getElementById("sigo").dispatchEvent(evObj);
		})();

		/* Información sobre el tablón actual */
		$("#board-title").on("click", function() {
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
			};
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
		var boardInfo = API.loadThemeInfo(board.split("-")[1]);
		title = boardInfo.nombre;
		$("<img>").attr("src", boardInfo.pathfoto).appendTo($description);
		$("<p>").html(boardInfo.descripcion).appendTo($description);
		var $themeControl = $("<div>").attr("class", "theme-control").appendTo(($description));
		var followed = (boardInfo.estado_seguimiento == 1);
		var writable = (boardInfo.estado_escritura == 1);
		var blocked = false;
		$themeControl.append(
			$("<div>").attr("class", "control-item " + ((followed) ? "follow on" : "follow"))
				.on("click", function() {
					$this = $(this);
					var followed = $this.hasClass('on');
					new ModalDialog((followed ? "Dejar de" : "Comenzar a") + " seguir este tema", 
						"Si continúas, " + (followed ? "dejarás de seguir" : "comenzarás a seguir") + " este tema en Eskup", 
						[(followed ? "Dejar de " : "Comenzar a ") + "seguirlo", "Cancelar"],
						function(result) {
							if (result == "Cancelar") return;
							API.followThemes([boardInfo.__key],
								result == "Comenzar a seguirlo",
								function(r) {
									if (r == "OK") {
										$this.toggleClass('on');
										API.clearFollowedThemes();	// limpiar caché de temas seguidos
										fillThemes();	// se recarga la lista de temas seguidos
									} else {
										new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
									};
								});
						});
				}));
		$themeControl.append(
			$("<div>").attr("class", "control-item " + ((writable) ? "writable on" : "writable"))
				.on("click", function() {
					$this = $(this);
					var writable = $this.hasClass('on');
					new ModalDialog((writable ? "Dejar de" : "Comenzar a") + " escribir en este tema", 
						"Si continúas, " + (writable ? "dejarás de escribir" : "comenzarás a escribir") + " en este tema en Eskup", 
						[(writable ? "Dejar de " : "Comenzar a ") + "escribir", "Cancelar"],
						function(result) {
							if (result == "Cancelar") return;
							API.writeThemes([boardInfo.__key],
								result == "Comenzar a escribir",
								function(r) {
									console.log(r);
									if (r == "OK") {
										$this.toggleClass('on');
										API.clearWritableThemes();	// limpiar caché de temas en que escribo
									} else {
										new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
									};
								});
						});
				}));
		$themeControl.append(
			$("<div>").attr("class", "control-item " + ((blocked) ? "block on" : "block"))
				.on("click", function() {
					console.log("block");
				}));
		$description.append($themeControl);
	};
	$boardTitle.html(title);
	$boardDescription.append($description);
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
	};
	// Mensaje reenviado 
	if (msg.reenvio) {
		var div_forward = document.createElement("a");
		div_forward.className = "reply2link fa fa-retweet";
		div_forward.textContent = "mensaje reenviado";
		div_forward.setAttribute("data-forward", msg.reenvio);
		div_forward.addEventListener("click", function() {
			var THAT = this;
			API.getMessage(this.getAttribute("data-forward"), function(data) {
				var forwardedMsg = data.mensajes[0];
				if (forwardedMsg) {
					API.buildMessage(forwardedMsg, data.perfilesUsuarios);
					// agrego el mensaje respondido como hijo del mensaje actual
					appendMsg(forwardedMsg, $(THAT).closest(".message").addClass("conversation").get(0), data.perfilesEventos);
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
	$("#replying-message").remove();
	var msg = $(this).closest('.message').get(0);
	var user = this.getAttribute("data-user");
	var msgID = this.getAttribute("data-id");
	showEditor(true, "forward", msgID);
	var messageContent = "fwd @" + user + ": " + $(msg).find(".msg_content").get(0).innerHTML;
	$("#newmessage").html(messageContent);
};

