
/* Clase especial para reealizar búsquedas con selector 
	@param $container: contenedor del widget
	@param provider: proveedor de datos
	@param onSelChange: función a ejecutar cada vez que cambia la selección
	empleado en selección de temas y de usuarios para enviar mensaje
*/
function Finder(container, provider, onSelChange) {
	var $container = container,		// contenedor del widget
		dataProvider = provider,	// proveedor de datos de búsqueda
		selection = [],				// lista de elementos seleccionados
		value = null,				// valor de búsqueda tecleado por el usuario
		$input = null,				// el campo de búsqueda
		$found = null,				// muestra la lista de sugerencias del servidor
		loadedHTML = false;				// indica si se ha cargado el html del widget
	// carga dinámica del html del widget:
	var $widget = $("<div>");
	$widget.load(chrome.extension.getURL("finder_widget.html"), function() {
		$input = $widget.find(".finder input")
			.on("focus", searchValue)						
			.on("keyup", searchValue)			// buscar datos en el servidor
			.on("keydown", onKeySelector)		// seleccionar de la lista encontrada con cursores
			.on("blur", function() {
				value = null;					// se borra el valor de búsqueda
				$found.fadeOut();				// se ocultan los resultados
			});
		$found = $widget.find(".finder ul");
		$container.append($widget);
		loadedHTML = true;
	});
	// Función que devuelve la selección actual del widget
	this.getSelection = function() {return selection;};
	/* Desactivación(activación) del widget */
	this.disable = function() { $container.fadeOut(); };
	this.enable = function() { $container.fadeIn(); };
	/* Buscador de usuarios para enviar privados */
	function searchValue(e) {
		var newValue = $input.val();
		if (newValue==value) return;
		value = newValue;		// guardamos el nuevo valor de búsqueda
		dataProvider(value, function(results) {
			$found.empty();
			if (results) {
				$found.fadeIn();
				if (results.answer.length) {
					// filtrado de elementos ya agregados:
					var answer = results.answer.filter(function(e) {
						return selection.indexOf(e.nick) == -1;
					});
					$found.append(answer.map(function(u, i) {
						var $li = $("<li>")
							.attr("data-info", u.nick)
							.addClass((i==0) ? "on" : "")
							.append($("<img>").attr("src", checkUserPhoto(u.pathfoto)))
							.append($("<span>").addClass("nickname").text(u.nick))
							.append($("<span>").text(u.nombrebonito))
							.on("click", function() {selectItem($(this));});
						return $li;
					}));
				} else {
					$found.append($("<li>").addClass("no-result").text("sin resultados"));
				};
			} else {
				$found.fadeOut();
			};
		});
	};
	/* Eventos del teclado sobre el widget: 
		- selección arriba/abajo
		- enter
		- escape
	*/
	function onKeySelector(e) {
		var move = 0;
		if (e.which == 40) { 		// keydown
			move = 1;
		} else if (e.which == 38) {	// keyup
			move = -1;
		};
		if (move != 0) {
			e.preventDefault();
			$list = $found.find("li");
			var theIndex = $list.index($found.find("li.on"));
			var newIndex = theIndex+move;
			if ((newIndex<0)||(newIndex==$list.length)) return false;
			$list.each(function(i) {
				if (i==theIndex) $(this).removeClass("on");
				else if (i==newIndex) $(this).addClass("on").get(0).scrollIntoView(false);
			});
			return false;
		};
		if (e.which == 13) {	// enter
			selectItem($found.find("li.on"));
			return false;
		};
		if (e.which == 27) {	// escape
			$input.val("").trigger("keyup").blur();
			return false;
		};
		return true;
	};
	/* Selección de un item de la lista */
	function selectItem($item) {
		var key = $item.attr("data-info");	// clave del elemento seleccionado
		addItem(key);
		// reseteo del widget:
		value = null;
		$input.val("").trigger("keyup");	// se vacía el campo de búsqueda
	};
	/* Agregación de un nuevo elemento al widget */
	function addItem(key) {
		if (selection.indexOf(key) == -1) {	// elemento no seleccionado
			selection.push(key);	// se agrega la nueva clave
			$("<li>")
				.attr("data-key", key)
				.append($("<span>").addClass('del fa fa-times')
					// eliminación de un elemento:
					.on("click", function(e) {
						var $theLi = $(this).closest("li").remove();
						var thisKey = $theLi.attr("data-key");
						selection.splice(selection.indexOf(thisKey),1); // se elimina el elemento
						if (onSelChange) onSelChange();
					}))
				.append($("<span>").text(key))
				.insertBefore($widget.find(".finder"));	// se agrega la nueva selección al widget	
		};
		// ejecución de callback de cambio de selección
		if (onSelChange) onSelChange();
	};
	/* agrega un conjunto de items al widget 
		@param items: lista de identificadores de items
		Esta función sirve de interfaz de la clase de widget para añadir
		tablones destino o usuarios destino desde el exterior,
		por ejemplo al reponder a un mensaje que aparce en tablones, o que es privado
	*/
	this.addItemList = function(items) {
		function helper() {
			setTimeout(function() {
				if (loadedHTML) items.forEach(function(item) {addItem(item);});
				else helper();
			}, 10);
		};
		// hay que esperar a que el html del wdiget esté cargado
		helper();
	};
};

/* Clase para gestionar el editor 
	@param config { container: elemento contenedor del editor,
					api: api de Eskup
					command: comando para la api
					msg: json del mensaje respondido o reenviado
					themes: temas del mensaje original
					callback: callback opcional a ejecutar al cerrar el editor
				}
*/
function Editor(config) {
	var THAT = this,
		container = config.container || null;
		API = config.api,	// el objeto de la api que se emplea para enviar mensaje
		command = config.command || "send",	// por defecto, envío de  un nuevo mensaje
		mID = config.mID,				// ID del mensaje, si es respondido o reenviado 
		callback = config.callback,
		MAXCHAR_DEFAULT = 280,			// número de caracteres por defecto para un mensaje
		MAXCHAR = MAXCHAR_DEFAULT,		// máximo de caracteres para el mensaje
		USER_FINDER = null,
		THEME_FINDER = null,
		modal = null;
	/* Inicialización del editor */
	(function initEditor() {
		if (!container) {
			// Si no hay definido contenedor, se muestra el editor en una ventana modal
			container = $("<div>");
			modal = new ModalDialog({content: container});
		};
		// http://stackoverflow.com/questions/5643263/loading-html-into-page-element-chrome-extension
		// carga dinámica del HTML del editor
		$(container).load(chrome.extension.getURL("editor.html"), function() {
			var title = "Escribiendo un nuevo mensaje",	// título por defecto
				sendButtonText = "ENVIAR";				// texto por defecto del boton de enviar
			/* Rellenar los campos del formulario de título y botón enviar */
			function fillTitleAndSendButton() {
				$("#editor-title").text(title);
				$("#send").text(sendButtonText);
				configureMaxChar();
			};
			// Inicialización de eventos
			$("#send").on("click", sendMessage);
			$("#cancel").on("click", closeEditor);
			// $("#cancel").on("click", function() {});
			$("#setitalic").on("click", function() { document.execCommand('italic',false,null); });
			$("#setbold").on("click", function() { document.execCommand('bold',false,null); });
			$("#newmessage").on("keyup", count)					// Contador de caracteres
				.on("paste", onPaste);							// Interceptar pegadp
			$("#insertvideo").on("click", insertVideo);			// Inserción de vídeos
			$("#insertimage").on("click", insertImage);			// Inserción de imágenes
			$("#insertlink").on("click", insertLink);			// Inserción de enlaces
			// Inicialización de widgets de búsqueda
			USER_FINDER = new Finder($("#send2user"), API.findUsers, onDestinationChange);				// buscador de usuarios
			THEME_FINDER = new Finder($("#send2theme"), API.findWritableThemes, onDestinationChange);	// buscador de temas
			// Configuración adicional
			if (mID) {
				// se trata de un mensaje respondido o reenviado. Obtenemos el mensaje original:
				API.getMessage(mID, function(data) {
					var msg = data.mensajes[0],				// json del mensaje original
						themes = data.perfilesEventos,		// temas destino del mensaje original
						thread = msg.hilo,					// hilo del mensaje
						user = msg.usuarioOrigen,			// usuario emisor del mensaje original
						$msg = createMessage(msg, themes),	// jQuery del mensaje original
						mHTML = $msg.get(0).outerHTML;		// HTML del mensaje original
					// temas a los que pertenece el mensaje original:
					// Investigación del hilo:
					if (thread && (data.perfilesHilos["_"+thread].tipo === "comentarios")) {
						configureMaxChar("comments");	// los comentarios admiten más caracteres
					} else {
						configureThemes(Object.keys(themes), themes);
					};
					if (command=="reply") {
						title = "Respondiendo al mensaje de @" + user + ":";
						sendButtonText = "RESPONDER";
						$("#replying-message").html(mHTML);
					} else if (command=="forward") {
						var fwdText = "fwd @" + user + ": ";
						// var $newMsg = $("#newmessage");
						// $newMsg.html(msg.contenido).html(fwdText + $newMsg.text());
						$("#newmessage").html(fwdText + msg.contenido);
						if (msg.cont_adicional) { configureImage(msg.cont_adicional); };
						title = "Reenviando el mensaje de @" + user + ":";
						sendButtonText = "REENVIAR";
					} else if (command == "replyPrivate") {
						title = "Respondiendo al privado de @:" + user + ":";
						USER_FINDER.addItemList([config.user]);		// configuración del destinatario del privado
						sendButtonText ="RESPONDER";
						$("#replying-message").html(mHTML);
					};
					fillTitleAndSendButton();
				});
			} else {
				fillTitleAndSendButton();
			};
		});
	})();
	
	// Cierre del diálogo de edición
	function closeEditor() {
		if (modal) modal.close();
		if (callback) callback();
	};

	/* Esta función intercepta el comando de pegado para eliminar las etiquetas 
		//http://stackoverflow.com/questions/12027137/javascript-trick-for-paste-as-plain-text-in-execcommand
	*/
	function onPaste(e) {
		e.preventDefault();
		var content = e.originalEvent.clipboardData.getData('text/plain');
		document.execCommand('insertText', false, content);
		count();
	};

	/* 	Gestión de la visibilidad de los widgets de selección 
		de destino de usuarios y de temas. No es compatible el envío de 
		un mensaje a un usuario de forma privada, con el envío del mismo 
		mensaje a un tema o tablón público
	*/
	function onDestinationChange() {
		var userDestination = USER_FINDER.getSelection();
		(userDestination.length)  ? THEME_FINDER.disable() : THEME_FINDER.enable();
		var themeDestination = THEME_FINDER.getSelection();
		(themeDestination.length)  ? USER_FINDER.disable() : USER_FINDER.enable();
	};
	
	/* Configurar los tablones destinatarios de un mensaje 
		@param themes: array de identificadores de temas para añadir
		@param themesInfo: opcional, información sobre los temas que se añaden
	*/
	function configureThemes(themes, themesInfo) {
		if (!themes) return;
		API.loadWritableThemes(function(wthemes) {
			if (typeof themesInfo==="undefined") themesInfo = wthemes;
			var goodThemes = [], badThemes = [];
			var maxChar = null;
			// filtrado de temas en que se puede escribir
			themes.forEach(function(t) {
				(t in wthemes) ? goodThemes.push(t) : badThemes.push(t);
				var nChar = themesInfo[t].numero_caracteres_mensaje;	// caracteres para este tema
				maxChar = (maxChar===null) ? nChar : Math.min(maxChar, nChar);
			});
			THEME_FINDER.addItemList(goodThemes);	// configuración de temas de destino
			if (badThemes.length) {
				$("#NOsend2theme").show()
					.find("ul").empty()
					.append(badThemes.map(function(t) {
						return $("<li>").text("\""+themesInfo[t].nombre+"\"");
					}));	
			} else {
				$("#NOsend2theme").hide();
			};
			// actualización del número máximo de caracteres
			MAXCHAR = maxChar;
		});
	};

	/* Configuración del máximo de caracteres del mensaje */
	function configureMaxChar(n) {
		if (typeof n === "undefined") MAXCHAR = MAXCHAR_DEFAULT;
		else if (n === "comments") MAXCHAR = 1120;
		else MAXCHAR = n;
		count();
	};
	/* Contador de caracteres del mensaje */
	function count() {
		var message = $("#newmessage").text()
			.replace(/\bhttps?:\/\/[^\s]+\b/g, "http://cort.as/AAAAA");
		var remaining = MAXCHAR - message.length;
		var $counter = $("#counter").text(remaining.toString());
		// coloreado del contador:
		if (remaining <= 10) $counter.attr('class', 'warning2');
		else if (remaining <= 50) $counter.attr('class', 'warning1');
		else $counter.attr('class', '');
	};
	/* Inserción de texto al final del nuevo mensaje */
	function insertText(txt) {
		$newmessage = $("#newmessage");
		$newmessage.html($newmessage.html() + " " + txt + " ").focus();
		// $newmessage.focus();
		// document.execCommand('insertText',false,txt);
		count();
	};

	/* Inserta un link a la pestaña actual u otra pestaña abierta */
	function insertLink() {
		// obtener todas las pestañas
		chrome.tabs.query({'currentWindow': true}, function(allTabs) {
			var $links = $("<div class='links-list'></div>");
			var $linkCurrent = $("<ul>").addClass("current").appendTo($links);
			var $linkOther = $("<ul>").addClass("other").appendTo($links);
			allTabs.forEach(function(t) {
				$("<li class='close-on-click' data-link='"+t.url+"'><span class='link-title'>"+t.title+"</span><span class='link-url fa fa-link'>"+t.url+"</span></div>")
					.on("click", function() {
						insertText($(this).attr("data-link"));		
					})
					.appendTo(t.active ? $linkCurrent : $linkOther);
			});
			new ModalDialog({
				title: "Selecciona la URL que quieres insertar:", 
				content: $links, 
				buttons: ["Cancelar"]
			});
		});
	};

	/* Envío de un nuevo mensaje */
	function sendMessage() {
		// destinos sociales:
		var social = [];
		if ($("#send2fb").prop("checked")) social.push("facebook");
		if ($("#send2tt").prop("checked")) social.push("twitter");
		var newimg = $("#newimage.loaded canvas").get(0);
		var API_CONFIG = {
			command: command,
			mID: mID,
			users: USER_FINDER.getSelection(),		// destinatarios seleccionados
			themes: THEME_FINDER.getSelection(),	// temas seleccionados
			message: $("#newmessage").text()		// mensaje que será enviado
		};
		if (social.length) API_CONFIG.social = social;
		// imagen del mensaje
		if (newimg && newimg.width) 
			API_CONFIG.image = dataURItoBlob(newimg.toDataURL("image/jpeg", 0.8));
		console.log("Configuración API: ",API_CONFIG);
		API.update(API_CONFIG, function (result) {
			if (result.status == "error") {
				new ModalDialog({
					title: "Error al enviar el mensaje", 
					content: result.info});
			} else {
				new ModalDialog({
					title: "Mensaje enviado correctamente", 
					buttons: ["Aceptar"],
					callback: function() {$("#cancel").trigger("click");}, 
					timeout: 1500});
			};
		});
	};

	function configureImage(imgURL) {
		var img = new Image();
		img.onload = function() {
			var canvas = document.getElementById("canvasimage");
		    canvas.width = this.width;
		    canvas.height = this.height;
		    // Copiamos la imagen en el canvas
		    var ctx = canvas.getContext("2d");
		    ctx.drawImage(this, 0, 0);
		    $("#newimage").addClass('loaded');
		    $("#removeimage").off().on("click", function() {
		    	$("#newimage").removeClass('loaded');
		    });
		};
		img.src = imgURL;
	};
	/* Inserta una imagen en el mensaje */
	function insertImage() {
		chrome.tabs.executeScript({ file: "exe/getimages.js", allFrames: true }, function(result) {
			var $selector = $("<div>").addClass('images-selector');
			var dlg = new ModalDialog({
				title: "Selecciona la imagen que quieras insertar", 
				content: $selector,
				buttons: ["Insertar", "Cancelar", "Abrir el Editor"], 
				callback: function(r, data) {
					if (r=="Insertar") {					// agrega la imagen al editor
						configureImage(data[0]);	
					} else if (r == "Abrir el Editor") { 	// lanzar el editor de imágenes
						chrome.tabs.create({url:"image_editor.html"});
					};}
				});
			loadImages(result, null, function($div) {
				$selector.append($div);
				$selector.find("img").on("click", function() {
					$selector.find("img").removeClass('on');
					$(this).addClass('on');
					$selector.attr("data-return", this.src);	// la imagen seleccionada
				});
			});
		});	
	};
	/* recibe la lista de imágenes capturadas, para insertar 
		@param result: array de resutlados de captura de imágenes
		@para divItem: el lugar en el que insertar las imágenes capturadas
		@param onClickImage: callback a ejecutar cuando se hace click en una imagen
	*/
	function loadImages(result, divItem, callback) {
		if (!divItem) {
			divItem = $("<div>").addClass('images')
				.append($("<h2>").text("Imágenes encontradas en: " + result[0].title))
				.append($("<div>").addClass('images-list'));
		};
		var $imagesList = divItem.find(".images-list");
		var urls = [];
		var images = [];
		result.forEach(function(d) {urls = urls.concat(d.images)});
		urls = urls.filter(function(e,i,a){return a.indexOf(e)==i});	// eliminar duplicadas
		var loadedImages = 0;
		function checkFinished() {
			if (loadedImages == urls.length) {
				// se han cargado todas las imágenes
				images.sort(function(a,b) {	// ordenación por tamaño
					return (((a.width*a.height)>(b.width*b.height)) ? -1 : 1);
				});
				$imagesList.append(images);
				callback(divItem);
			};
		};
		urls.forEach(function(url, index, array) {
			var newImage = new Image();
			newImage.onload = function() {
				// la imagen se ha cargado
				loadedImages++;
				this.className = ((this.width<20)||(this.height<20)) ? "small" : "normal";
				images.push(this);
				checkFinished();
			};
			newImage.onerror = function() {
				loadedImages++;
				checkFinished();
			};
			newImage.src = url;
		});
	};
};

