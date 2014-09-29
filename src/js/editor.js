
/* Clase especial para reealizar búsquedas con selector 
	@param $container: contenedor del widget
	@param provider: proveedor de datos
	@param callback: función a ejecutar cada vez que cambia la selección
	empleado en selección de temas y de usuarios para enviar mensaje
*/
function Finder(container, provider, callback) {
	var $container = container,		// contenedor del widget
		dataProvider = provider,	// proveedor de datos de búsqueda
		selection = [],				// lista de elementos seleccionados
		value = null,				// valor de búsqueda tecleado por el usuario
		$input = null,				// el campo de búsqueda
		$found = null;				// muestra la lista de sugerencias del servidor
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
						if (callback) callback();
					}))
				.append($("<span>").text(key))
				.insertBefore($widget.find(".finder"));	// se agrega la nueva selección al widget
		};
		// reseteo del widget:
		value = null;
		$input.val("").trigger("keyup");	// se vacía el campo de búsqueda
		// ejecución de callback
		if (callback) callback();
	};
};

/* Clase para gestionar el editor 
	@param config{ 	container: elemento contenedor del editor,
					api: api de Eskup
					title: título del editor
					command: comando para la api
					mID: Id del mensaje respondido
					user: usuario al que se responde en privado
					callback: callback opcional a ejecutar al cerrar el editor
				}
*/
function Editor(config) {
	console.log(config);
	var THAT = this,
		container = config.container || null;
		API = config.api,	// el objeto de la api que se emplea para enviar mensaje
		command = config.command || "send",	// por defecto, envío de  un nuevo mensaje
		mID = config.mID,
		user = config.user,
		callback = config.callback,
		MAXCHAR_DEFAULT = 280,
		MAXCHAR = MAXCHAR_DEFAULT,		// máximo de caracteres para el mensaje
		USER_FINDER = null,
		THEME_FINDER = null,
		modal = null,
		API_CONFIG = {"command": command};	// Configuración del mensaje para la API
	if (!container) {
		// Si no hay definido contenedor, se muestra el editor en una ventana modal
		container = $("<div>");
		modal = new ModalDialog({content: container});
	};
	// http://stackoverflow.com/questions/5643263/loading-html-into-page-element-chrome-extension
	$(container).load(chrome.extension.getURL("editor.html"), function() {
		var title = "ESCRIBIENDO UN NUEVO MENSAJE",	// título por defecto
			sendButtonText = "ENVIAR";				// texto por defecto del boton de enviar
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
		USER_FINDER = new Finder($("#send2user"), API.findUsers, onDestinationChange);				// buscador de usuarios
		THEME_FINDER = new Finder($("#send2theme"), API.findWritableThemes, onDestinationChange);	// buscador de temas
		// Configuración adicional:
		if ((command=="reply") || (command=="forward")) {
			// Obtención del mensaje original, respondido o reenviado
			API.getMessage(config.mID, function(data) {
				var msg = data.mensajes[0];
				// temas a los que pertenece el mensaje original:
				configureThemes(Object.keys(data.perfilesEventos), data.perfilesEventos);
				if (command=="reply") {
					title = "RESPONDIENDO AL MENSAJE:";
					// Investigación del hilo:
					var hilo = msg.hilo;
					if (hilo && (data.perfilesHilos["_"+hilo].tipo === "comentarios"))
						configureMaxChar("comments");
				} else if (command=="forward") {
					title = "REENVIANDO EL MENSAJE:";
					var fwdText = "fwd @" + msg.usuarioOrigen + ": ";
					var $newMsg = $("#newmessage");
					$newMsg.html(msg.contenido).html(fwdText + $newMsg.text());
					sendButtonText = "REENVIAR";
					if (msg.cont_adicional) { configureImage(msg.cont_adicional); };
				};
			});
		} else if (command=="replyPrivate") {
			title = "RESPONDIENDO AL MENSAJE PRIVADO:";
			configureUsers([config.user]);		// destinatario del privado
			configureSendButton("RESPONDER");
		};
		$("#editor-title").text(title);
		$("#send").text(sendButtonText);
	});
	
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


	/* Elimina temas destino
		@param themes: array de nicknames
	*/
	function removeThemes(themes) {
		if (!API_CONFIG.themes) return;
		var current = API_CONFIG.themes.slice(0);	// copia de la configuración actual
		themes.forEach(function(t) {
			var position = current.indexOf(t);
			if (position>=0) current.splice(position,1);
		});
		configureThemes(current);
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
			themes.forEach(function(t) {
				(t in wthemes) ? goodThemes.push(t) : badThemes.push(t);
				var nChar = themesInfo[t].numero_caracteres_mensaje;
				maxChar = (maxChar===null) ? nChar : Math.min(maxChar, nChar);
			});
			$("#send2theme ul.linear").empty().append(goodThemes.map(function(t) {
				return $("<li>").attr("data-theme", t)
					.append($("<span>").addClass('del fa fa-times').on("click", function(e) {
						var thisTheme = $(this).closest("li").attr("data-theme");
						removeThemes([thisTheme]);
					}))
					.append($("<span>").text(themesInfo[t].nombre));
			}));
			if (badThemes.length) {
				$("#NOsend2theme").show()
					.find("ul").empty()
					.append(badThemes.map(function(t) {
						return $("<li>").text("\""+themesInfo[t].nombre+"\"");
					}));	
			} else {
				$("#NOsend2theme").hide();
			};
			API_CONFIG.themes = goodThemes;	// temas a los que se enviará el mensaje
			configureMaxChar(maxChar);
		});
	};

	/* Agrega destinatarios privados a la configuración
		@param users: array de nicknames
	*/
	function addUsers(users) {
		API_CONFIG.users = removeDuplicates((API_CONFIG.users || []).concat(users));
		configureUsers(users);
	};
	/* Agrega temas destino
		@param themes: array de nicknames
	*/
	function addThemes(themes) {
		API_CONFIG.themes = removeDuplicates((API_CONFIG.themes || []).concat(themes));
		configureThemes(themes);
	};


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
		console.log("configuracion", API_CONFIG);
		API_CONFIG.users = USER_FINDER.getSelection();		// destinatarios seleccionados
		API_CONFIG.themes = THEME_FINDER.getSelection();	// temas seleccionados
		API_CONFIG.message = $("#newmessage").text();		// el mensaje que será enviado
		// destinos sociales:
		var social = [];
		if ($("#send2fb").prop("checked")) social.push("facebook");
		if ($("#send2tt").prop("checked")) social.push("twitter");
		if (social.length) API_CONFIG.social = social;
		// imagen del mensaje
		var newimg = $("#newimage.loaded canvas").get(0);
		if (newimg && newimg.width) 
			API_CONFIG.image = dataURItoBlob(newimg.toDataURL("image/jpeg", 0.8));
		console.log("nueva configuracion",API_CONFIG);
		API.update(API_CONFIG, function (result) {
			console.log(result);
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

