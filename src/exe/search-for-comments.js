(function() {
	// Reseteo del contador de comentarios
	chrome.runtime.sendMessage({type: "nMessages", num: ""});
	// Búsqueda de comentarios
	var host = window.location.host;
	var result = null;
	var site = null;
	if (host === "eskup.elpais.com") {
		site = "eskup";
		// es una página de eskup
		var currentLocation = window.location.href;
		var found = currentLocation.match(/eskup\.elpais\.com\/C([\w-]+)\/?.*$/);	// conversación
		if (found) {
			result = {type: "thread", id: found[1]};
		} else {
			found = currentLocation.match(/eskup\.elpais\.com\/\*([\w-]+)$/);	// tema
			if (found) {
				result = {type: "theme", id: found[1]};		
			} else {
				found = currentLocation.match(/eskup\.elpais\.com\/([\w]+)\/?$/);		// usuario
				if (found && (found.length<40)) {
					result = {type: "user", id: found[1]};
				}
			};
		};
	} else {
		var siteMatch = host.match(/(^|\.)(elpais|cincodias|as|cadenaser|los40)\.com$/);
		if (siteMatch) {
			site = siteMatch[2];
			// es una noticia en un medio
			var iframes = document.querySelectorAll("iframe");
			for (var i=0; i<iframes.length; i++) {
				var iframeID = iframes[i].id;
				if (iframeID) {
					var match = iframeID.match("comentarios_noticia_(.+)");
					if (match) {
						var numCom = "";	// número de comentarios de esta noticia
						var threadID = match[1];
						setTimeout(function() {
							// Esperamos un poco para buscar el número de comentarios.... porque cambia al cargar la página (usuarios destacados)
							var numComDiv = document.querySelector("#num_comentarios_noticia_" + threadID + " .numero") ||
									document.querySelector("#num_comentarios_noticia_" + threadID + " .contador") || 
									document.querySelector("#num_cabecera_comentarios_noticia_" + threadID + " .numero");
							if (numComDiv) {
								numCom = numComDiv ? numComDiv.textContent : null;
								// Número de comentarios en el badge:
								chrome.runtime.sendMessage({type: "nMessages", num: numCom});
							};
						}, 3000);
						result =  {
							type: "thread",
							id: match[1],
						};
						break;
					};
				}
			}
		};
	} 
	if (result) {
		chrome.storage.local.get("eskupReminder", function(o) {
			var reminderInfo = o["eskupReminder"];
			if (reminderInfo && reminderInfo[site]) return;

			// Mostrar una llamada para recordar que se pueden ver los comentarios en la extensión:
			if (!document.querySelector(".eskup-reminder")) {
				// Cargar font-awesome:
				var fontAwesomeCSS = document.createElement("link");
				fontAwesomeCSS.setAttribute("rel", "stylesheet");
				fontAwesomeCSS.setAttribute("href", "//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css");
				document.head.appendChild(fontAwesomeCSS);
				// el popup de recordatorio:
				var reminder = document.createElement("div");
				reminder.className = "eskup-reminder";
				// el icono: 
				var icon = document.createElement("i");
				icon.className = "fa fa-info-circle";
				reminder.appendChild(icon);
				// el texto:
				var p = document.createElement("p");
				p.textContent = "Recuerda que puedes ver los comentarios de esta página con la extensión eXkup";
				reminder.appendChild(p);
				// Los botones:
				var buttons = document.createElement("div");
				buttons.className = "eskup-reminder-buttons";
				// Botón de cerrar:
				var buttonClose = document.createElement("div");
				buttonClose.textContent = "ENTENDIDO";
				buttonClose.addEventListener("click", removeReminder);
				buttons.appendChild(buttonClose);
				// Botón de no volver a mostrar:
				var buttonNoremind = document.createElement("div");
				buttonNoremind.textContent = "NO MOSTRAR DE NUEVO";
				buttonNoremind.addEventListener("click", function() {
					removeReminder();
					reminderInfo = reminderInfo || {};
					reminderInfo[site] = 1;
					chrome.storage.local.set({"eskupReminder": reminderInfo});
				});
				buttons.appendChild(buttonNoremind);
				
				reminder.appendChild(buttons);
				document.body.appendChild(reminder);

				function removeReminder() {
					document.body.removeChild(reminder);
				};	
			};
		});
	};

	return result;
})();