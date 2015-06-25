/* Función que crea un nuevo mensaje
	@param msg: mensaje a agregar
	@param themes: información complementaria (temas)
	@param isPrivate: el mensaje es privado? true/false
	@return: nuevo mensaje agregado
*/
function createMessage(msg, themes, isPrivate) {	
	var m_id = msg.idMsg;
	var user = msg.usuarioOrigen;
	var tsMessage = msg.tsMensaje * 1000;	// timestamp del mensaje
	// Creación del nuevo mensaje:
	var msgClass = 'message ' + (API.checkFavorite(m_id) ? " favorite " : "") + (isPrivate ? " private " : "") + (msg.borrado == 1 ? " deleted" : "");
	$msg = $("<div>").addClass(msgClass)
		.attr("data-author", user)
		.attr("data-id", m_id)
		.on("mouseenter", onMessageEnter);	// los eventos se inicializan cuando entra el ratón, por rendimiento
	// La cabecera:
	var $head = $("<div>").addClass('msg_header')
		.append($("<img>").attr("src", msg.pathfoto))
		.append($("<a>").attr("href", "#").addClass("author")
			.text("@" + user + (msg.usuarioOrigenNombre ? (" (" + msg.usuarioOrigenNombre + ")") : ""))
			.attr("data-user", user))
		.append(
			makeLink(getTimeAgo(new Date(tsMessage)),"http://eskup.elpais.com/" + m_id)
				.addClass("time fa fa-clock-o").attr("data-ts", tsMessage));
	// Mensaje reenviado
	if (msg.reenvio) {
		$head.append($("<span>").addClass('btn reply2link fa fa-retweet')
			.text("mensaje reenviado")
			.attr("data-forward", msg.reenvio)
			.on("click", onForwardedMessageClick));
	};
	// El contenido del mensaje:
	var $content = $("<div>").addClass('msg_content').html(msg.contenido);
	processContent($content, true);				// PROCESAMIENTO DE LOS CONTENIDOS: ENLACES, VÍDEOS...
	if (msg.cont_adicional) {
		$content.append($("<img>").attr("src", msg.cont_adicional));
	};
	// Temas del mensaje
	var $themes = $("<ul>").addClass("themes nodisplay");
	if (themes) {
		var msgThemes = msg.CopiaEnTablones.split( "," ).filter(function(d) {return d.split("-")[0] == "ev"});	// temas del mensajes
		if (msgThemes.length) {
			$themes.removeClass('nodisplay');
			msgThemes.forEach(function(themeKey) {
				var themeID = themeKey.split("-")[1];
				$themes.append($("<li>")
					.attr("data-theme", themeKey)
					.text(themes[themeID].nombre));
			});
			$msg.attr("data-themes", JSON.stringify(msgThemes.map(function(d){return d.split("-")[1];})));
		};
	};
	// Elementos de control:
	var $control = $("<div>").addClass('msg_control')
		.append($("<div>").addClass('btn fav fa fa-star')
			.text(" favorito"))
		.append($("<div>").addClass('btn reply fa fa-mail-reply')
			.text(" responder"))
		.append($("<div>").addClass('btn fwd fa fa-retweet')
			.text(" reenviar"));
	// Hilos de mensajes
	if (msg.idMsgRespuesta && (msg.idMsgRespuesta != m_id)) {
		$head.append($("<span>").addClass('btn reply2link fa fa-mail-reply')
			.text(msg.autorMsgRespuesta + ((msg.usuarioRespuestaNombre) ? (" (" + msg.usuarioRespuestaNombre + ")") : ""))
			.attr("data-reply", msg.idMsgRespuesta)
			.on("click", onReplyClick));
		$control.append($("<div>").addClass('btn thlink fa fa-comments')
			.text(" charla")
			.attr("data-thread", msg.hilo)
			.on("click", onShowThreadClick));
	};
	// Mensaje propio
	if (user == API.getUserNickname()) {
		$control.append($("<div>").addClass('btn delete fa fa-trash-o')
			.text(" borrar"));
	};
	return $msg.append([$head, $content, $themes, $control]);
};

/* Inicializa los eventos de un mensaje */
function onMessageEnter() {
	$this = $(this);
	$this.find(".author")
		.on("click", onAuthorClick);
	$this.find(".time")
		.on("mouseenter", onTimeMouseEnter);
	$this.find(".themes li")
		.on("click", onThemeClick);
	$control = $this.find(".msg_control");
	$control.find(".fav")
		.on("click", onAddFavoriteClick);
	$control.find(".reply")
		.on("click", onReplyMessageClick);
	$control.find(".fwd")
		.on("click", onForwardMessageClick);
	$control.find(".delete")
		.on("click", onDeleteMessageClick);
	$this.on("mouseleave", function() {
		$thiz = $(this);
		$thiz.find(".author")
			.off("click");
		$thiz.find(".time")
			.off("mouseenter");
		$thiz.find(".themes li")
			.off("click");
		$control = $thiz.find(".msg_control");
		$control.find(".fav")
			.off("click");
		$control.find(".reply")
			.off("click");
		$control.find(".fwd")
			.off("click");
		$control.find(".delete")
			.off("click");
		$thiz.off("mouseleave");
	});
};

/* Función que se ejecuta al hacer click en un elemento de la lista de temas */
function onThemeClick(e) {
	e.stopPropagation();
	$("body").trigger("loadBoard", {id:this.getAttribute("data-theme")});
};
/* Función que se ejecuta al hacer click en el enlace al thread al que pertenece un mensaje */
function onShowThreadClick(e) {
	e.stopPropagation();
	$("body").trigger("loadBoard", {
		threadID: this.getAttribute("data-thread"), 
		originalMsgID: $(this).closest(".message").attr("data-id")
	});
};

/* Función que se ejecuta al hacer click en el autor de un mensaje */
function onAuthorClick(e) {
	e.stopPropagation();
	$("body").trigger("loadBoard", {
		id: "t1-" + this.getAttribute("data-user")
	});
};
/* Función que se ejecuta al pasar el cursor sobre la fecha de publicación */
function onTimeMouseEnter() {
	var $this = $(this);
	window._timeTooltipTimer = setTimeout(function() {
		var date = new Date(parseInt($this.attr("data-ts")));
		$this.append($("<span>").addClass('time-tooltip')
			.append($("<span>").text(formatDate(date, true)))
			.append($("<span>").text(date.toLocaleTimeString())));
	}, 500);
	$this.on("mouseout", function() {
		clearTimeout(window._timeTooltipTimer);
		$(this).find(".time-tooltip").remove();
	});
};

/* Functión que se ejecuta al hacer click en el nombre del autor al que se responde */
function onReplyClick() {
	var $this = $(this);
	API.getMessage($this.attr("data-reply"), function(data) {
		var repliedMsg = data.mensajes[0];
		API.buildMessage(repliedMsg, data.perfilesUsuarios);
		$this.off("click").closest('.message').addClass('conversation')
			.before(createMessage(repliedMsg, data.perfilesEventos)
				.addClass('conversation mark')
				.fadeIn(500));
	});
};
/* Agrega o elimina un mensaje de la lista de favoritos */
function onAddFavoriteClick(e) {
	e.stopPropagation();
	var $favBtn = $(this),
		$msg = $favBtn.closest('.message'),
		m_id = $msg.attr("data-id");	// id del mensaje
	if (!$msg.hasClass("favorite")) {		// marvar favorito
		API.addFavorite(m_id, function(status, statusInfo) {
			if (status == 0) {
				new ModalDialog({
					title: "El mensaje se ha agregado a tus favoritos.",
					content: "Puedes ver tus mensajes favoritos en la sección \"FAVORITOS\" de esta extensión",
					timeout: 2000
				});
				$msg.toggleClass('favorite');
			} else {
				new ModalDialog({
					title: "Error agregando favorito.",
					content: statusInfo,
					timeout: 2000
				});
			};
		});
	} else {						// desmarcar favorito
		new ModalDialog({
			title: "¿Deseas eliminar este mensaje favorito?",
			content: $("<div>").addClass("fav-2-delete").append($msg.first().clone()),
			buttons: ["Sí", "Cancelar"], 
			callback: function(result) {
				if (result == "Sí") {
					API.removeFavorite(m_id, function(status, statusInfo) {
						new ModalDialog({
							title: "El mensaje se ha eliminado de tus favoritos.",
							timeout: 2000
						});
						$msg.toggleClass('favorite');
						// Además lo eliminamos del tablón de favoritos
						getPopup(function(popup) {
							var currentTheme = popup.getCurrentTheme();
							if (currentTheme.id == "favs") {
								$msg.fadeOut(function() { $(this).remove(); });
							};
						});
					});
				};
			}
		});
	};
};

/* Escribir respuesta a un mensaje */
function onReplyMessageClick() {
	var $msg = $(this).closest('.message'),
		isPrivate = $msg.hasClass("private"),
		mID = $msg.attr("data-id");
	new Editor({
		"command": (isPrivate ? "replyPrivate" : "reply"),
		"mID": mID,
 		"api": API
	});
};

/* Reenvío de un mensaje */
function onForwardMessageClick() {
	var mID = $(this).closest('.message').attr("data-id");
	new Editor({
		"command": "forward",
 		"api": API,
 		"mID": mID
	});
};

/* Función que se ejecuta al hacer click en el enlace al mensaje reenviados */
function onForwardedMessageClick() {
	var $this = $(this);
	API.getMessage(this.getAttribute("data-forward"), function(data) {
		var forwardedMsg = data.mensajes[0];
		if (forwardedMsg) {
			API.buildMessage(forwardedMsg, data.perfilesUsuarios);
			// agrego el mensaje reenviado
			$this.off("click").closest('.message').addClass('conversation')
				.before(createMessage(forwardedMsg, data.perfilesEventos)
					.addClass('conversation mark forwarded')
					.fadeIn(500));
		} else {	// el mensaje original puede estar elminado
			new ModalDialog({
				title: "El mensaje original ha sido eliminado",
				buttons: ["Aceptar"],
				timeout: 2000
			});
		};
	});
};
/* Eliminación de un mensaje */
function onDeleteMessageClick() {
	var $message = $(this).closest('.message');
	var msgID = $message.attr("data-id");
	new ModalDialog({
		title: "Eliminación de un mensaje",
		content: "¿Seguro que desea borrar este mensaje?",
		buttons: ["Sí", "No"],
		callback: function(result) {
			if (result=="No") return;
			API.deleteMessage(msgID, function(info) {
				if (info.status=="ok") {
					new ModalDialog({
						title: "Eliminación correcta",
						content: "El mensaje ha sido eliminado con éxito, aunque el cambio puede tardar en verse reflejado en los servidores de Eskup.",
						buttons: ["OK"], 
						timeout: 2000
					});
					$message.remove();
				} else {
					new ModalDialog({
						title: "Se ha producido un error",
						content: "No ha sido posible eliminar el mensaje. Vuelve a intentarlo de nuevo más tarde.",
						buttons: ["OK"],
						timeout: 2000
					});
				};
			});
		}
	});
};
