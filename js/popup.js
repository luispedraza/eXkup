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
		// Eventos
		// document.getElementById("search").addEventListener("click", Search);
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
		// cargar tablón de eventos seguidos
		(function() {
			var evObj = document.createEvent('MouseEvents');
		    evObj.initEvent("click", true, false);
		    document.getElementById("sigo").dispatchEvent(evObj);
		})();

		/* Información sobre el tablón actual */
		$("#board-title").on("click", function() {
			$("#messages-header").toggleClass("on");
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
	if ((config=="reply") && (typeof themes != "undefined")) {
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
				.on("click", function() {
					$this = $(this);
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
										API.clearFollowedThemes();	// limpiar caché de temas seguidos
										API.clearThemeInfo(theme);			// borrar la inforamción del tema
										fillThemes();	// se recarga la lista de temas seguidos
									} else {
										new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
									};
								});
						});
				})
				);
		// control de escritura
		var writable = (themeInfo.estado_escritura == 1);
		if (themeInfo.tipo_suscripcion == 1) {
			$themeControl.append(
				$("<div>").attr("class", "control-item " + ((writable) ? "writable on" : "writable"))
					.attr("data-tiposuscripcion", themeInfo.tipo_suscripcion)
					.attr("data-tipoevento", themeInfo.tipo_evento)
					.attr("data-writable", themeInfo.estado_escritura)
					.on("click", function() {
						$this = $(this);
						var typesuscription = $this.attr('data-tiposuscripcion');
						var typeevent = $this.attr('data-tipoevento');
						var writable = $this.attr('data-writable');
						if (typesuscription == "1") {
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
												API.clearWritableThemes();			// limpiar caché de temas en que escribo
												API.clearThemeInfo(theme);			// borrar la inforamción del tema
											} else {
												new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
											};
										});
								});
						} else if (typesuscription == "2") {
							// se precisa autorización
							// TODO: hay que hacerlo, pero no sé si quedan eventos de este tipo 
						};
					}));			
		};
		$description.append($themeControl);
	};
	$boardTitle.html(title);
	$boardDescription.append($description);
};

/* Carga de una conversación completa */
function showThread() {
	var threadID = this.getAttribute("data-thread");
	API.loadThread(threadID, function(info) {
		var infoTree = new Object();
		infoTree.id = null;
		function addNode(node, parent, tree) {
			if (!tree.idMsg) return node;
			else if (tree.idMsg == parent) {
				tree.children.push(node);
				tree.nRep = tree.children.length;
				tree.children.forEach(function(c) {
					tree.nRep += c.nRep;
				});
			}
			else tree.children.forEach(function(c) {
				addNode(node, parent, c);
			});
		};
		info.mensajes.forEach(function(m) {
			API.buildThreadMessage(m, info.perfilesUsuarios);
			m.children = [];
			m.nRep = 0;
			infoTree = addNode(m, m.idMsgRespuesta, infoTree) || infoTree;
		});
		var $divtree = $("#tree").html("");
		document.getElementById("tree-board").style.left = "0px";
		document.getElementById("board").style.left = "-450px";
		console.log(infoTree);
		showMsgTree(infoTree, document.getElementById("tree"), true);
	});
};

/* Muestra el árbol de mensajes de una conversación */
function showMsgTree(infoTree, board, last) {
	var divNode = document.createElement("div");
	divNode.className = (last ? "node last" : "node"); 
	var divItem = document.createElement("div");
	divItem.className = "item";
	var divContent = document.createElement("div")
	divContent.className = "content";
	appendMsg(infoTree, divContent);
	divItem.appendChild(divContent);
	divNode.appendChild(divItem);
	if (infoTree.children.length) {
		var divChildren = document.createElement("div");
		divChildren.className = "children";
		var divNrep = document.createElement("div");
		divNrep.className = "more";
		divNrep.innerText = infoTree.nRep + " respuestas";
		divNrep.onclick = function(e) {
			this.className = (this.className.match("on") ? "more" : "more on");
			this.parentNode.className = (this.parentNode.className.match("on") ? "children" : "children on");
		};
		divChildren.appendChild(divNrep);
		for (var m=0; m<infoTree.children.length; m++) {
			showMsgTree(infoTree.children[m], divChildren, (m==infoTree.children.length-1));
		}
		divNode.appendChild(divChildren);
	};
	board.appendChild(divNode);
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
		div_thread.addEventListener("click", showThread);
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
					.attr("data-board", themeKey)
					.text(themeName)
					.on("click", function() {
						loadBoard($(this).attr("data-board"));
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
	showEditor(true, "reply", msg.id, msg.getAttribute("data-themes"));
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

