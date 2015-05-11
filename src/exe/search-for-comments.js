(function() {
	var currentLocation = window.location.href;
	var elpaisPattern = RegExp("https?://(.*?)\.?elpais\.com");
	var found = elpaisPattern.exec(currentLocation);
	var result = null;
	console.log(found);
	if (found) {
		if (found[1] == "eskup") {
			// es una página de eskup
			found = currentLocation.match(/eskup\.elpais\.com\/C([\w-]+)\/?.*$/);	// conversación
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
			// es una noticia de elpais.com
			var commentsWidget = document.querySelector(".bloque_comentarios iframe");
			if (commentsWidget) {
				var commentsWidgetID = commentsWidget.id;
				var threadID = commentsWidgetID.match("comentarios_noticia_(.+)")[1];
				if (threadID) {
					return {
						type: "thread",
						id: threadID
					};
				};
			};
		};
	};
	return result;
})();