var MAXCHAR = 280;	// máximo de caracteres para el mensaje

window.addEventListener("load", function() {
	$("#send").on("click", sendMessage);
	$("#cancel").on("click", cancel);
	$("#setitalic").on("click", function() {
		document.execCommand('italic',false,null);
	});
	$("#setbold").on("click", function() {
		document.execCommand('bold',false,null);
	});
	$("#newmessage").on("keyup", Counter);
	$("#insertvideo").on("click", insertVideo);
	$("#insertimage").on("click", insertImage);
	$("#insertlink").on("click", insertLink);
	// Destinos de mensaje:
	$("#send2theme").on("click", function() {
		showThemesSelector();
	});
});

/* Contador de caracteres del mensaje */
function Counter() {
	var message = $("#newmessage").text();
	message = message.replace(/\bhttps?:\/\/[^\s]+\b/g, "http://cort.as/AFMzx");
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
	$newmessage.html($newmessage.html() + " " + txt + " ");
};

/* Inserta un link a la pestaña actual u otra pestaña abierta */
function insertLink() {
	// obtener la pestaña actual
	chrome.tabs.query({'currentWindow': true, 'active': true}, function(result) {
		var currentTab = result[0];
		// obtener todas las pestañas
		chrome.tabs.query({}, function(result) {
			var allTabs = result;
			var $links = $("<div class='links-list'></div>");
			$links.append("<h1>Enlace a la pestaña actual</h1>")
				.append("<div class='link-item close-on-click' data-link='"+currentTab.url+"'><span class='link-title'>"+currentTab.title+"</span><span class='link-url fa fa-link'>"+currentTab.url+"</span></div>")
				.append("<h1>Enlaces a otras pestañas abiertas en Chrome:</h1>");
			for (var l=0, len=allTabs.length; l<len; l++) {
				tab = allTabs[l];
				$links.append("<div class='link-item close-on-click' data-link='"+tab.url+"'><span class='link-title'>"+tab.title+"</span><span class='link-url fa fa-link'>"+tab.url+"</span></div>")
			};
			$links.find(".link-item").on("click", function() {
					insertText($(this).attr("data-link"));
			});
			new ModalDialog("Selecciona la URL que quieres insertar:", $links, ["Cancelar"], null);
		});
	});
};

/* Muestra el selector de temas a que se quiere enviar un mensaje */
function showThemesSelector() {
	API.loadWritableThemes(function(themes) {
		function onClickWritableTheme($li) {
			if ($li.hasClass('closed')) return;	// el tema está cerrado
			$li.toggleClass('fa-square-o').toggleClass('fa-check-square-o');
			if ($li.hasClass('fa-check-square-o')) {
				$li.attr("data-return", $li.attr("data-item"));	
			} else {
				$li.removeAttr('data-return');
			};
		};
		var $listThemes = $("<ul class='themes-list'></ul>");
		var themes = sortArray(makeArray(themes), "nombre");	// temas ordenados alfabéticamente
		for (var t=0, len=themes.length; t<len; t++) {
			var theme = themes[t];
			var key = theme.__key;
			$("<li class='theme-item fa fa-square-o'></li>")
				.attr("data-item", key)
				.attr("class", theme.activo ? "theme-item fa fa-square-o" : "theme-item closed fa fa-ban")
				.append("<span class='theme-name'>" + theme.nombre + "</span>")
				.append("<img class='theme-image' src='" + theme.pathfoto + "'/>")
				.append("<span class='theme-description'>" + theme.descripcion)
				.on("click", function() {
					onClickWritableTheme($(this));
				})
				.appendTo($listThemes);
		};
		// marcar elementos ya seleccionados
		var selected = getSelectedThemes();
		if (selected.length) {
			$listThemes.find(".theme-item").each(function() {
				$li = $(this);
				if (selected.indexOf($li.attr("data-item")) >= 0) {
					onClickWritableTheme($li);
				};
			});
		};
		new ModalDialog("¿A qué temas enviarás tu mensaje?", $listThemes, ["OK", "Cancelar"], function(button, data) {
			if (button == "OK") {
				editorAddThemes(data);
			};
		});
	});	
};

/* Añadir temas para enviar al mensaje al selector */
function editorAddThemes(data) {
	API.loadWritableThemes(function(writable) {
		$("#send2theme")
			.attr("data-send2theme", JSON.stringify(data))
			.find(".count").text(data.length);
		$list = $("#send2theme ul").html("");	// limpieza de selecciones anteriores
		data.forEach(function(d) {
			var theme = writable[d];
			$list.append($("<li>").text(theme.nombre));
		});
	});
};
/* Temas seleccionados para enviar el mensaje */
function getSelectedThemes() {
	var selected = $("#send2theme").attr("data-send2theme");
	return (selected ? JSON.parse(selected) : []);
};
/* Añadir destinatarios privados de un mensaje */
function editorAddUsers(data) {
	$list = $("#send2user").attr("data-send2user", JSON.stringify(data))
		.find("ul");
	data.forEach(function(d) {
		$list.append($("<li>").text("@"+d));
	});
	$("#send2theme").css("display","none");
	$("#send2social").css("display","none");
};
/* Usuarios seleccionados para enviar privado */
function getSelectedUsers() {
	var selected = $("#send2user").attr("data-send2user");
	return (selected ? JSON.parse(selected) : []);
};


/* Envía un nuevo mensaje */
function sendMessage() {
	var data = {};
	data.message = $("#newmessage").html();
	data.themes = getSelectedThemes();	// tablones destinatarios
	data.users = getSelectedUsers();	// destinatarios de privado
	data.social = {	fb: $("#send2fb").prop("checked"),
					tt: $("#send2tt").prop("checked")};
	var newimg = $("#newimage.loaded canvas").get(0);
	data.image = (newimg && newimg.width) ? dataURItoBlob(newimg.toDataURL("image/jpeg", 0.8)) : null;
	var command = data.command = this.getAttribute("data-command");
	if ((command == "reply") || (command == "forward")) data.msgID = this.getAttribute("data-id");
	console.log(data);
	API.update(data, function (result) {
		if (result.status == "error") {
			new ModalDialog("Error a enviar el mensaje", result.info);
		} else {
			ModalDialog("Mensaje enviado correctamente", null, ["Aceptar"], function() {
				$("#newmessage").html("");
			}, 1000);
		};
	});
};

/* Cancela el envío de un mensaje */
function cancel() {
	showEditor(false);
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
					    	console.log("borrando");
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

