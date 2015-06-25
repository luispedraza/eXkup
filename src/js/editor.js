
/* Clase especial para realizar búsquedas con selector 
	@param options = {
		title: Título del popup de búsqueda
		container: contenedor del widget
		provider: proveedor de datos
		onSelChange: función a ejecutar cada vez que cambia la selección
		}
	empleado en selección de temas y de usuarios para enviar mensaje
*/
function Finder(options) {
	var title = options.title,
		$container = options.container,
		provider = options.provider,
		onSelChange = options.onSelChange, 
		selection = [],					// lista de elementos seleccionados
		popupClicked = false,
		value = null,					// valor de búsqueda tecleado por el usuario
		$input = null,					// el campo de búsqueda
		$found = null,					// muestra la lista de sugerencias del servidor
		loadedHTML = false;				// indica si se ha cargado el html del widget
	// carga dinámica del html del widget:
	$container.load(chrome.extension.getURL("finder_widget.html"), function() {
		$container.find(".finder-title .close").on("click", hidePopupList);	// cerrar el popup de búsqueda
		$container.find(".finder-title strong").text(title);
		// Para evitar que se cierre la lista al hace click en un element
		// a causa del oblur del input de texto:
		$container.find(".finder-list").on("mousedown", function(){
			popupClicked = true;
		});
		$found = $container.find(".finder .finder-list ul");
		$input = $container.find(".finder input")
			.on("focus", function() {
				showPopupList();
				searchValue();
			})
			.on("blur", function() {
				popupClicked ? (popupClicked = false) : hidePopupList();
			})					
			.on("keyup", searchValue)			// buscar datos en el servidor
			.on("keydown", onKeySelector);		// seleccionar de la lista encontrada con cursores

		loadedHTML = true;
	});
	// Muestra el listado de resultados
	function showPopupList() {
		$container.find(".finder-list").fadeIn();
	};
	// Oculta el listado de resultados
	function hidePopupList() {
		value = null;
		$input.val("");
		$container.find(".finder-list").fadeOut();
	};
	// Función que devuelve la selección actual del widget
	this.getSelection = function() {
		return selection;
	};
	/* Buscador de usuarios para enviar privados */
	function searchValue(e) {
		var newValue = $input.val();
		if (newValue==value) return;
		value = newValue;		// guardamos el nuevo valor de búsqueda
		provider(value, function(results) {
			var answer = [];
			$found.empty();
			if (results) {
				if (results.answer.length) {
					// filtrado de elementos ya agregados:
					answer = results.answer.filter(function(e) {
						return selection.indexOf(e.nick) == -1;
					});
				};
				$found.append(answer.map(function(u, i) {
					var nickname = u.nick,
						prettyname = u.nombrebonito.replace(/^ +?\(|\)$/g, "");
					var $li = $("<li>")
						.attr("data-info", nickname)
						.attr("data-pretty", prettyname)
						.addClass((i==0) ? "on" : "")
						.append($("<img>").attr("src", checkUserPhoto(u.pathfoto)))
						.append($("<span>").addClass("nickname").text(nickname))
						.append($("<span>").text(prettyname))
						.hover(function() {
							$found.find("li").removeClass("on");
							$(this).addClass("on");
						})
						.click(function() {
							selectItem($(this));
						});
					return $li;
				}));
			};
			if (answer.length == 0) {
				$found.append($("<li>").addClass("no-result").text("sin resultados"));
			}
			showPopupList();
		});
	};
	/* Eventos del teclado sobre el widget: 
		- selección arriba/abajo
		- enter
		- escape
	*/
	function onKeySelector(e) {
		function moveSelection(move) {
			e.preventDefault();
			$list = $found.find("li");
			var theIndex = $list.index($found.find("li.on"));
			var newIndex = theIndex+move;
			if ((newIndex<0)||(newIndex==$list.length)) return false;
			$list.each(function(i) {
				if (i==theIndex) $(this).removeClass("on");
				else if (i==newIndex) $(this).addClass("on").get(0).scrollIntoView(false);
			});
		};
		var move = 0;
		switch (e.which) {
			case 40: 		// down arrow
				moveSelection(1);
				break;
			case 38: 		// up arrow
				moveSelection(-1);
				break;
			case 27: 		// escape
				$input.blur();
				hidePopupList();
				break;
			case 13: 		// enter
				selectItem($found.find("li.on"));
				break;
			default:
				return true;
		}
		return false;

		// if (e.which == 27) {	// escape
		// 	//$input.val("").trigger("keyup").blur();
		// 	return false;
		// };
		// return true;
	};
	/* Selección de un item de la lista */
	function selectItem($item) {
		var key = $item.attr("data-info");			// clave del elemento seleccionado
		if (!key) return;
		var prettyname = $item.attr("data-pretty");
		addItem(key, prettyname.length ? prettyname : null);
		// reseteo del widget:
		value = null;
		$input.val("").trigger("keyup").focus();	// se vacía el campo de búsqueda
	};
	/* Agregación de un nuevo elemento al widget 
		@param key: clave del elemento
		@param prettyname: nombre bonito del elemento
	*/
	function addItem(key, prettyname) {
		if (selection.indexOf(key) == -1) {	// elemento no seleccionado
			var name = (typeof prettyname === "undefined" || prettyname === null) ? key : prettyname;	// nombre de la etiqueta 
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
				.append($("<span>").text(name).attr("title", name))
				.insertBefore($container.find(".finder"));	// se agrega la nueva selección al widget	
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
					msg: JSON del mensaje respondido o reenviado
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
		USER_FINDER = null,				// widget de búsqueda de destino de usuarios (mensajes privados)
		THEME_FINDER = null,			// widget de búsqueda de destino de temas
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
				// configureMaxChar();
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
			// Inicialización de widgets de búsqueda: destino de usuarios y temas
			// buscador de usuarios
			USER_FINDER = new Finder({
				title: "USUARIOS",
				container: $("#send2user .finder-widget-container"), 
				provider: API.findUsers, 
				onSelChange: onDestinationChange
				});	
			// buscador de temas			
			THEME_FINDER = new Finder({
				title: "TEMAS",
				container: $("#send2theme .finder-widget-container"), 
				provider: API.findWritableThemes, 
				onSelChange: onDestinationChange
				});
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

	/* Selección de la clase .is-public para el editor */
	function togglePublic(isPublic) {
		container.find("#editor").toggleClass("is-public", isPublic);
	}
	/* Selección de la clase .is-private para el editor */
	function togglePrivate(isPrivate) {
		container.find("#editor").toggleClass("is-private", isPrivate);
	}

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
		togglePrivate(USER_FINDER.getSelection().length != 0);
		togglePublic(THEME_FINDER.getSelection().length != 0);
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
			.replace(/\bhttps?:\/\/[^\s]+\b/g, "http://cort.as/AAAAA")
			.replace(/\&nbsp;/g, " ");
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
						modal.close();
					})
					.appendTo(t.active ? $linkCurrent : $linkOther);
			});
			var modal = new ModalDialog({
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
		var message = $("#newmessage").html().replace(/\&nbsp;/g, " ");
		console.log(message);
		var API_CONFIG = {
			command: command,
			mID: mID,
			users: USER_FINDER.getSelection(),		// destinatarios seleccionados
			themes: THEME_FINDER.getSelection(),	// temas seleccionados
			message: message						// contenido del mensaje que será enviado
		};
		if (social.length) API_CONFIG.social = social;
		// imagen del mensaje
		if (newimg && newimg.width) 
			API_CONFIG.image = dataURItoBlob(newimg.toDataURL("image/jpeg", 0.8));
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
				buttons: ["Insertar", "Cancelar"/*, "Abrir el Editor"*/],
				callback: function(r, data) {
					if (r == "Insertar") {					// agrega la imagen al editor
						configureImage(data[0]);	
					} else if (r == "Abrir el Editor") { 	// lanzar el editor de imágenes
						chrome.tabs.create({url:"image_editor.html"});
					};}
				});
			loadImages(result, $selector, function($div) {
				$selector.append($div);
				$selector.find("img").on("click", function() {
					// a ejecutar cuando se hace click sobre una imagen:
					$selector.find("img.on").removeClass('on');
					$(this).addClass('on');
					$selector.attr("data-return", this.src);	// la imagen seleccionada
				});
			});
		});	
	};
	/* recibe la lista de imágenes capturadas, para insertar 
		@param result: array de resutlados de captura de imágenes
		@param $container: el lugar en el que insertar las imágenes capturadas
		@param onClickImage: callback a ejecutar cuando se hace click en una imagen
	*/
	function loadImages(result, $container, callback) {
		var $imagesList = $("<div>").addClass('images-list');
		$container.append($("<h2>").text("Imágenes encontradas en: " + result[0].title))
				.append($imagesList);
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
				callback($container);
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

