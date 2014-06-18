
/* Clase especial para reealizar búsquedas con selector 
	@param container: contenedor del widget
	@param provider: proveedor de datos
	@param appender: función para agregar resultados al pulsar enter
*/
function Finder(container, provider, appender) {
	var $container = container,
		$input = $container.find("input"),	// valor de búsquedda
		$found = $container.find("ul");		// resultados de búsqueda
	var dataProvider = provider;
	var appenderFunction = appender;

	/* Buscador de usuarios para enviar privados */
	function searchValue(e) {
		var newValue = $input.val();
		var oldValue = $input.attr("data-value");
		if (newValue==oldValue) return;
		$input.attr("data-value", newValue);
		dataProvider(newValue, function(users) {
			$found.empty();
			if (users) {
				$found.fadeIn();
				if (users.answer.length) {
					$found.append(users.answer.map(function(u, i) {
						var $li = $("<li>")
							.attr("data-info", u.nick)
							.append($("<img>").attr("src", checkUserPhoto(u.pathfoto)))
							.append($("<span>").addClass("nickname").text("@" + u.nick))
							.append($("<span>").text(u.nombrebonito))
							.on("click", function() {selectItem($(this));});
						if (i==0) $li.addClass('on');
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

	/* Selección de usuarios de la lista encontrada */
	function onKeySelector(e) {
		var move = 0;
		if (e.which == 40) { // keydown
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

	function selectItem($item) {
		appenderFunction([$item.attr("data-info")]);	// se añade el nuevo resultado
		$input.val("").trigger("keyup");
	};

	$input		
		.on("focus", searchValue)						
		.on("keyup", searchValue)		// buscar datos en el servidor
		.on("keydown", onKeySelector)		// seleccionar de la lista encontrada con cursores
		.on("blur", function() {
			$found.fadeOut();		// se ocultan los resultados
		});
};

/* Clase para gestionar el editor */
function Editor(container, api, callback) {
	var THAT = this;
	var API = api;		// el objeto de la api que se emplea para enviar mensaje
	var MAXCHAR_DEFAULT = 280;
	var MAXCHAR = MAXCHAR_DEFAULT;		// máximo de caracteres para el mensaje
	var CONFIG;			// configuración que almacena el editor
	var USER_FINDER = null;
	var THEME_FINDER = null;

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
		USER_FINDER = new Finder($("#search-user"), API.findUsers, addUsers);				// buscador de usuarios
		THEME_FINDER = new Finder($("#search-theme"), API.findWritableThemes, addThemes);	// buscador de temas
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

	/* Agrega temas destino
		@param themes: array de nicknames
	*/
	function addThemes(themes) {
		if (CONFIG.themes) themes = CONFIG.themes.concat(themes);
		configureThemes(themes);
	};
	/* Elimina temas destino
		@param themes: array de nicknames
	*/
	function removeThemes(themes) {
		if (!CONFIG.themes) return;
		var current = CONFIG.themes.slice(0);	// copia de la configuración actual
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
			themes.forEach(function(t) {
				(t in wthemes) ? goodThemes.push(t) : badThemes.push(t);
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
			CONFIG.themes = goodThemes;	// temas a los que se enviará el mensaje
		});
	};

	/* Agrega destinatarios privados a la configuración
		@param users: array de nicknames
	*/
	function addUsers(users) {
		if (CONFIG.users) users = CONFIG.users.concat(users);
		configureUsers(users);
	};
	/* Elimina destinatarios privados a la configuración
		@param users: array de nicknames
	*/
	function removeUsers(users) {
		if (!CONFIG.users) return;
		var current = CONFIG.users.slice(0);	// copia de la configuración actual
		users.forEach(function(t) {
			var position = current.indexOf(t);
			if (position>=0) current.splice(position,1);
		});
		configureUsers(current);
	};

	/* Actualiza en el editor los destinatarios privados del mensaje
	*/
	function configureUsers(users) {
		console.log(users);
		CONFIG.users = users;
		$list = $("#send2user ul.linear").empty().append(users.map(function(u) {
			var $li = $("<li>").attr("data-user", u)
				.append($("<span>").addClass('del fa fa-times')
					.on("click", function(e) {
						var thisUser = $(this).closest("li").attr("data-user");
						removeUsers([thisUser]);
					}))
				.append($("<span>").text("@"+u));
			return $li;
		}));
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
				configureThemes(Object.keys(data.perfilesEventos), data.perfilesEventos);
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
					if (msg.cont_adicional) {
						configureImage(msg.cont_adicional);
					};
				};
			});
		};
		if (command=="replyPrivate") {
			CONFIG.mID = config.mID;
			configureUsers([config.user]);		// destinatario del privado
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
			new ModalDialog("Selecciona la URL que quieres insertar:", $links, ["Cancelar"], null);
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
					$("#cancel").trigger("click");	// resetea y oculta el editor
				}, 1000);
			};
		});
	};
	/* Se resetea el editor */
	function reset() {
		$("#newmessage").empty();
		configureSendButton("ENVIAR");
		CONFIG = {command: "send"};
		MAXCHAR = MAXCHAR_DEFAULT;
		configureThemes([]);
		configureUsers([]);
		$("#send2fb").prop("checked", false);
		$("#send2tt").prop("checked", false);
		count();
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
		chrome.tabs.executeScript({ file: "js/getimages.js", allFrames: true }, function(result) {
			var $selector = $("<div>").addClass('images-selector');
			var dlg = new ModalDialog("Selecciona la imagen que quieras insertar", 
				$selector,
				["Insertar", "Cancelar", "Abrir el Editor"], 
				function(r, data) {
					if (r=="Insertar") {
						configureImage(data[0]);	// agrega la imagen al editor
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

