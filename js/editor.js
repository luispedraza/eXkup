/* Clase para gestionar el editor */
function Editor(container, api, callback) {
	var THAT = this;
	var API = api;		// el objeto de la api que se emplea para enviar mensaje
	var MAXCHAR;		// máximo de caracteres para el mensaje
	var CONFIG;			// configuración que almacena el editor 

	// http://stackoverflow.com/questions/5643263/loading-html-into-page-element-chrome-extension
	$(container).load(chrome.extension.getURL("editor.html"), function() {
		$("#send").on("click", send);
		//$("#cancel").on("click", reset);
		$("#setitalic").on("click", function() { document.execCommand('italic',false,null); });
		$("#setbold").on("click", function() { document.execCommand('bold',false,null); });
		$("#newmessage").on("keyup", count)					// Contador de caracteres
			.on("paste", onPaste);							// Interceptar pegadp
		$("#insertvideo").on("click", insertVideo);			// Inserción de vídeos
		$("#insertimage").on("click", insertImage);			// Inserción de imágenes
		$("#insertlink").on("click", insertLink);			// Inserción de enlaces
		$("#add-themes").on("click", showThemesSelector);	// Destinos de mensaje
		reset();
		if (callback) callback();
	});

	/* Esta función intercepta el comando de pegado para eliminar las etiquetas 
		//http://stackoverflow.com/questions/12027137/javascript-trick-for-paste-as-plain-text-in-execcommand
	*/
	function onPaste(e) {
		e.preventDefault();
		var content = e.originalEvent.clipboardData.getData('text/plain');
		document.execCommand('insertText', false, content);
		count();
	};
	
	/* Configurar los tablones destinatarios de un mensaje */
	function configureThemes(themes, config) {
		if (!themes) return;
		API.loadWritableThemes(function(wthemes) {
			var goodThemes = [], badThemes = [];
			for (t in themes) {
				(t in wthemes) ? goodThemes.push(t) : badThemes.push(t);
			};
			$("#send2theme ul").empty().append(goodThemes.map(function(t) {
				return $("<li>").attr("data-theme", t)
					.append($("<span>").addClass('del fa fa-times').on("click", function(e) {
						var thisTheme = $(this).closest("li")
							.fadeOut(function(){$(this).remove();}).attr("data-theme");
						config.themes.splice(config.themes.indexOf(thisTheme),1);
					}))
					.append($("<span>").text(themes[t].nombre));
			}));
			if (badThemes.length) {
				$("#NOsend2theme").show()
					.find("ul").empty()
					.append(badThemes.map(function(t) {
						return $("<li>").text(themes[t].nombre);
					}));	
			} else {
				$("#NOsend2theme").hide();
			};
			
			config.themes = goodThemes;	// temas a los que se enviará el mensaje
		});
	};

	/* Añadir destinatarios privados de un mensaje */
	function configureUsers(users, config) {
		$list = $("#send2user ul").empty().append(users.map(function(u) {
			return $("<li>").text("@"+u);
		}));
		config.users = users;
	};

	/* Configuración del editor.
		Si el objeto de configuración es null, se resetea
	*/
	this.configure = function(config) {
		reset();
		if (config == null) {
			reset();
			return;
		};
		var command = config.command;
		// Temas del mensaje
		if ((command=="reply") || (command=="forward")) {
			API.getMessage(config.mID, function(data) {
				console.log(data);
				configureThemes(data.perfilesEventos, CONFIG);
					if (command=="reply") {
					CONFIG.mID = config.mID;
					configureSendButton("RESPONDER");
				} else if (command=="forward") {
					var msg = data.mensajes[0];
					var fwdText = "fwd @" + msg.usuarioOrigen + ": ";
					var $newMsg = $("#newmessage");
					$newMsg.html(msg.contenido).html(fwdText + $newMsg.text());
					configureSendButton("REENVIAR");
					count();
				};
			});
			
		};
		if (command=="replyPrivate") {
			CONFIG.mID = config.mID;
			configureUsers(config.users, CONFIG);// destinatario del privado
			configureSendButton("RESPONDER");
		} else {
			configureSendButton("ENVIAR");
		};
		CONFIG.command = command;
	};

	function configureSendButton(text) {
		$("#send").text(text);
	};

	/* Contador de caracteres del mensaje */
	function count() {
		var message = $("#newmessage").text();
		message = message.replace(/\bhttps?:\/\/[^\s]+\b/g, "http://cort.as/AAAAA");
		var remaining = MAXCHAR - message.length;
		var $counter = $("#counter");
		$counter.text(remaining.toString());
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
			new ModalDialog("Selecciona la URL que quieres insertar:", $links, ["Cancelar"], null);
		});
	};

	/* Muestra el selector de temas a que se quiere enviar un mensaje */
	function showThemesSelector() {
		API.loadWritableThemes(function(wthemes) {
			function onClickWritableTheme() {
				var $this = $(this);
				if ($this.hasClass('closed')) return;	// el tema está cerrado
				$this.toggleClass('fa-square-o').toggleClass('fa-check-square-o');
				if ($this.hasClass('fa-check-square-o')) {
					$this.attr("data-return", $this.attr("data-item"));	
				} else {
					$this.removeAttr('data-return');
				};
			};
			var themes = sortArray(makeArray(wthemes), "nombre");	// temas ordenados alfabéticamente
			var $listThemes = $("<ul class='themes-list'></ul>")
				.append(themes.map(function(theme) {
					var key = theme.__key;
					return $("<li class='theme-item fa fa-square-o'></li>")
						.attr("data-item", key)
						.attr("class", theme.activo ? "theme-item fa fa-square-o" : "theme-item closed fa fa-ban")
						.append("<span class='theme-name'>" + theme.nombre + "</span>")
						.append("<img class='theme-image' src='" + theme.pathfoto + "'/>")
						.append("<span class='theme-description'>" + theme.descripcion)
						.on("click", onClickWritableTheme);
				}));
			// marcar elementos ya seleccionados
			var selected = CONFIG.themes;
			if (selected && selected.length) {
				$listThemes.find(".theme-item").each(function() {
					var $this = $(this);
					if (selected.indexOf($this.attr("data-item")) >= 0) {
						$this.trigger('click');
					};
				});
			};
			new ModalDialog("¿A qué temas enviarás tu mensaje?", $listThemes, ["OK", "Cancelar"], function(button, data) {
				if (button == "OK") {
					var newThemes = {};
					data.forEach(function(t) {
						newThemes[t] = wthemes[t];
					});
					configureThemes(newThemes, CONFIG);
				};
			});
		});	
	};

	/* Envía un nuevo mensaje */
	function send() {
		CONFIG.message = $("#newmessage").text();
		// destinos sociales:
		var social = [];
		if ($("#send2fb").prop("checked")) social.push("facebook");
		if ($("#send2tt").prop("checked")) social.push("twitter");
		if (social.length) CONFIG.social = social;
		// imagen del mensaje
		var newimg = $("#newimage.loaded canvas").get(0);
		if (newimg && newimg.width) 
			CONFIG.image = dataURItoBlob(newimg.toDataURL("image/jpeg", 0.8));
		API.update(CONFIG, function (result) {
			if (result.status == "error") {
				new ModalDialog("Error al enviar el mensaje", result.info);
			} else {
				ModalDialog("Mensaje enviado correctamente", null, ["Aceptar"], function() {
					$("#cancel").trigger("click");
				}, 1000);
			};
		});
	};
	/* Se resetea el editor */
	function reset() {
		$("#newmessage").empty();
		configureSendButton("ENVIAR");
		CONFIG = {command: "send"};
		MAXCHAR = 280;
		count();
	};
	/* Inserta una imagen en el mensaje */
	function insertImage() {
		chrome.tabs.executeScript({ file: "js/getimages.js", allFrames: true }, function(result) {
			var $selector = $("<div>").addClass('images-selector');
			var dlg = new ModalDialog("Selecciona la imagen que quieras insertar", 
				$selector,
				["Insertar", "Cancelar", "Abrir el Editor"], 
				function(r, data) {
					if (r=="Insertar") {
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
						img.src = data[0];
					} else if (r == "Abrir el Editor") {
						// lanzar el editor de imágenes
						chrome.tabs.create({url:"image_editor.html"});
					};
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

