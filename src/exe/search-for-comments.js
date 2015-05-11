(function() {
	var host = window.location.host;
	var result = null;
	if (host === "eskup.elpais.com") {
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
	} else if (host.match(/(.+\.)?(elpais|cincodias|as|cadenaser|los40)\.com/)) {
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
	return result;
})();