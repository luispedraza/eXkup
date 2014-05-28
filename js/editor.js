var SELECTION = [];
var MAXCHAR = 280;

window.addEventListener("load", function() {
	$("#send").on("click", Update);
	$("#cancel").on("click", CancelUpdate);
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
	new ModalDialog("¿A qué temas enviarás tu mensaje?", null, ["OK", "Cancelar"], null);
}




