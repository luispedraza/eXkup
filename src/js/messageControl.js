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
/* Función que se ejecuta al mostrar el thread al que pertenece un mensaje */
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
	$("body").trigger("loadBoard", "t1-" + this.getAttribute("data-user"));
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
						// además lo eliminamos del tablón de favoritos
						if (CURRENT_THEME.id == "favs") {
							$msg.fadeOut(function() {
								$(this).remove();
							});
						};
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
