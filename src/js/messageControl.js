/* Función que se ejecuta al hacer click en un elemento de la lista de temas */
function onThemeClick() {
	loadBoard($(this).attr("data-theme"));
};

/* Función que se ejecuta al hacer click en el autor de un mensaje */
function onAuthorClick() {
	loadBoard("t1-" + this.getAttribute("data-user"));
};
/* Función que se ejecuta al pasar el cursor sobre la fecha de publicación */
function onTimeMouseover() {
	var $this = $(this);
	TIME_TOOLTIP_TIMER = setTimeout(function() {
		var date = new Date(parseInt($this.attr("data-ts")));
		$this.append($("<span>").addClass('time-tooltip')
			.append($("<span>").text(formatDate(date, true)))
			.append($("<span>").text(date.toLocaleTimeString())));
	}, 500);
};
function onTimeMouseout() {
	clearTimeout(TIME_TOOLTIP_TIMER);
	$(this).find(".time-tooltip").remove();
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
function onAddFavoriteClick() {
	var $favBtn = $(this),
		$msg = $favBtn.closest('.message'),
		m_id = $msg.attr("data-id");	// id del mensaje
	if (!$msg.hasClass("favorite")) {		// marvar favorito
		API.addFavorite(m_id, function(status, statusInfo) {
			if (status == 0) {
				new ModalDialog("El mensaje se ha agregado a tus favoritos.", null, [], null, 2000);
				$msg.toggleClass('favorite');
			} else {
				new ModalDialog("Error: No se pudo agregar el mensaje a favoritos.", statusInfo, [], null, 2000);
			};
		});
	} else {						// desmarcar favorito
		new ModalDialog("¿Seguro que desea eliminar este mensaje de sus favoritos?",
			$msg[0].outerHTML,
			["Sí", "Cancelar"], function(result) {
				if (result == "Sí") {
					API.removeFavorite(m_id, function(status, statusInfo) {
						new ModalDialog("El mensaje se ha eliminado de tus favoritos.", null, [], null, 2000);
						$msg.toggleClass('favorite');
						// además lo eliminamos del tablón de favoritos
						if (CURRENT_THEME.id == "favs") {
							$msg.fadeOut(function() {
								$(this).remove();
							});
						};
					});
				};
			});
	};
};

/* Respuesta a un mensaje */
function onReplyMessageClick() {
	var $msg = $(this).closest('.message');
	var mID = $msg.attr("data-id");
	$("#editor").before($("<div>")
		.attr("id", "replying-message")
		.html($msg.get(0).outerHTML));
	if (CURRENT_THEME.id=="3") {	// respuesta a un privado
		showEditor({command: "replyPrivate", mID: mID, user: $msg.attr("data-author")});
	} else {						// respuesta normal
		showEditor({command: "reply", mID: mID});
	};
};
/* Reenvío de un mensaje */
function onForwardMessageClick() {
	var mID = $(this).closest('.message').attr("data-id");
	showEditor({command: "forward", mID: mID});
};
/* Función que se ejecuta al mostrar el thread al que pertenece un mensaje */
function onShowThreadClick() {
	loadBoard(null, this.getAttribute("data-thread"), $(this).closest(".message").attr("data-id"));
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
			new ModalDialog("El mensaje original ha sido eliminado", null, ["Aceptar"], null, 2000);
		};
	});
};
/* Eliminación de un mensaje */
function onDeleteMessageClick() {
	var $message = $(this).closest('.message');
	var msgID = $message.attr("data-id");
	new ModalDialog("¿Seguro que desea borrar este mensaje?", "", ["Sí", "No"],
		function(result) {
			if (result=="No") return;
			API.deleteMessage(msgID, function(info) {
				if (info.status=="ok") {
					new ModalDialog("Eliminación correcta",
						"El mensaje ha sido eliminado con éxito, aunque el cambio puede tardar en verse reflejado en los servidores de Eskup.",
						["OK"], null, 2000);
					$message.remove();
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
