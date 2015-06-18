(function() {
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
						result =  {
							type: "thread",
							id: match[1]
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
			var reminder = document.createElement("div");
			reminder.className = "eskup-reminder";
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
		});
	};

	return result;
})();