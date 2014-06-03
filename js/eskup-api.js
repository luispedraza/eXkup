function EskupApi() {
	var THAT = this;
	var PUBLIC_KEY = "";
	var NICKNAME = "";
	var USER_ID = "";
	var WRITABLE_THEMES = null;	// temas en los que puedo escribir
	var FOLLOWED_THEMES = null;	// temas que sigo
	var BLOCKED_THEMES = null;	// temas que he bloqueado
	var THEMES_INFO = {}; 	// información sobre eventos
	var USER_PROFILE = null;
	var FAVORITES = (localStorage["msg_fav"] != "undefined") ? JSON.parse(localStorage["msg_fav"]) : new Array();	// lista de temas favoritos que se almacena en localStorage
	var INESKUP = "http://eskup.elpais.com/Ineskup";
	// var INPARAMS = {
	// 	m: "",			// Contenido del mensaje (c=add|reply|edit, ignorado con c=del)
	// 					// obligatorio, excepto cuando se elimina un mensaje (c=del)
	// 					// admite etiquetas <a> y <i>
	// 	c: "",			// Comando: add (envío o forward), del, edit, reply
	// 	t: "",			// Destino: tablones o privados a usuarios *tema1|*tema2|nickname1|nickname2
	// 					// cuando el comando no es add sólo se puede indicar un destino
	// 					// para eliminar un mensaje privado (c=del) debe ser t=p
	// 					// nota: se requirer autorización para escribir en un tema
	// 					// no se puede enviar a privados y a temas a la vez
	// 	x: "",			// Extra. (c=add)reenvío?(id fwd), (c=del)?(id del), (c=edit)?(id edit), (c=reply)?(id reply)
	// 	p: "", 			// Imagen adjunta al mensaje
	// 	f: "json",		// Formato de la respuesta
	// 	d: "",			// Destino Twitter (1), Facebook (2) o Ambos (1|2)
	// 	id: ""			// Clave pública
	// };

	// function InEskup(c) {
	// 	this.url = INESKUP;
	// 	this.dat = INPARAMS;
	// 	this.m = "GET";
	// };

	var OUTESKUP = "http://eskup.elpais.com/Outeskup";
	// var OUTPARAMS = {
	// 	t: "",			// qué tablon
	// 	nummsg: 20,		// cuántos mensajes
	// 	p: 1,			// qué página
	// 	f: "json",		// formato de respuesta
	// 	th: 1,
	// 	msg: "",
	// 	id: ""
	// };

	var PROFILEESKUP = "http://eskup.elpais.com/Profileeskup";
	// var PROFILEPARAMS = {
	// 	id: "",
	// 	action: "",
	// 	f: "json",
	// 	pag: ""
	// };

	/* Stub de parámetros para una petición de Eskup */
	function eskupParams(data) {
		var result = {id: PUBLIC_KEY, f: "json"};
		for (var k in data) 
			result[k] = data[k];
		return result;
	};

	/* Función que parasea los JSON recibidos de Eskup */
	function eskupParseResponse(response) {
		if (response) {
			if (response.match(/\{\'/)) response = response.replace(/\'/g, "\"");
			return JSON.parse(response);	
		};
	};
	
	/* Obtiene el nickname del usuario */
	this.getUserNickname = function() { return USER_ID; };

	/* Inicializa las variables de Eskup */
	this.init = function(callback) {
		apiCall("GET", "http://eskup.elpais.com/Auth/getuserpk.pl", null, function(r) {
			var info = eskupParseResponse(r);
			if (info.status == "error") {
				chrome.tabs.create({url:"http://eskup.elpais.com/index.html"});
				window.close();
				return;
			} else {
				PUBLIC_KEY = info.id;
				USER_ID = info.nickname;
				callback(USER_ID);
			};
		});
	};

	/* get a single message */
	this.getMessage = function(msg_id, callback) {
		var params = eskupParams({msg: msg_id});
		apiCall("GET", OUTESKUP, params, function(r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* Desconectar el usuario actual */
	this.logOut = function() {
		apiCall("GET", "http://www.elpais.com/clientes2/desconectar.html", null, function() {
			window.close();	
		});
	};

	/* Completa la información de un mensaje */
	this.buildMessage = function(msg, usersInfo) {
		var user = usersInfo[msg.usuarioOrigen];
		msg.pathfoto = checkUserPhoto(user.pathfoto);
		msg.usuarioOrigenNombre = (user.nombre + " " + user.apellidos).trim();
		if (msg.idMsgRespuesta) {
			user = usersInfo[msg.autorMsgRespuesta];
			msg.pathfotoRespuesta = checkUserPhoto(user.pathfoto);
			msg.usuarioRespuestaNombre = (user.nombre + " " + user.apellidos).trim();
		};
	};

	/* 	Carga un tablón de mensajes
		ej.: http://eskup.elpais.com/Outeskup?t=2&f=json&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadMessages = function(board, page, callback) {
		var params = eskupParams({t: board, p: page});
		apiCall("GET", OUTESKUP, params, function (r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* Borrar un mensaje de dEskup */
	this.deleteMessage = function(msgID, callback) {
		var params = eskupParams({c: "del", x: msgID});
		apiCall("GET", INESKUP, params, function(r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* 	Información de perfil de usuario
		http://eskup.elpais.com/Profileeskup?action=info_usuarios&f=xml&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadProfile = function(callback) {
		if (USER_PROFILE != null) {
			callback(USER_PROFILE);
		} else {
			var params = eskupParams({c: "info_usuarios"});
			apiCall("GET", PROFILEESKUP, params, function(r) {
				perfiles = eskupParseResponse(r).perfilesUsuarios;
				for (var u in perfiles) {
					USER_PROFILE = perfiles[u];
				};
				callback(USER_PROFILE);
			});
		};
	};

	/* Limpia la información sobre un tema */
	this.clearThemeInfo = function(theme) {

	};

	/* carga información sobre un tema */
	this.loadThemeInfo = function(theme, callback) {
		function getInfo(r) {
			return eskupParseResponse(r).perfilesEventos[theme];
		};
		var params = eskupParams({action: "info_eventos", event: theme});
		if (!callback) 
			return (THEMES_INFO[theme] || (THEMES_INFO[theme] = getInfo(apiCall("GET", PROFILEESKUP, params))));
		if (THEMES_INFO[theme] != null) {
			callback(THEMES_INFO[theme]); return;	
		};
		apiCall("GET", PROFILEESKUP, params, function(r) {
			THEMES_INFO[theme] = getInfo(r);
			callback(THEMES_INFO[theme]);
		});
	};

	/* Limpia de caché la lista de temas seguidos */
	this.clearFollowedThemes = function() {
		FOLLOWED_THEMES = null;
	};
	/* 	Los temas que sigo
		http://eskup.elpais.com/Profileeskup?action=list_eventos&f=json&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadFollowedThemes = function(callback) {
		if (FOLLOWED_THEMES != null) {
			callback(FOLLOWED_THEMES); return;	
		};
		var params = eskupParams({action: "list_eventos"});
		apiCall("GET", PROFILEESKUP, params, function(r) {
			FOLLOWED_THEMES = eskupParseResponse(r).perfilesEventos;
			callback(FOLLOWED_THEMES);
		});
	};
	/* Comenzar a seguir una lista de temas
		http://eskup.elpais.com/Profileeskup?action=add_eventos&f=json&data=ev1,ev2&id=7gTvFkSaO-pa0342AjhqMg
		@param themes: lista de temas
		@param follow: true (seguir) o false (no seguir)
	*/
	this.followThemes = function(themes, follow, callback) {
		var params = eskupParams({action: (follow ? "add_eventos" : "del_eventos"), data: themes.join(",")});
		apiCall("GET", PROFILEESKUP, params,
			function(r) {
				callback(r);
			});
	};
	/* Limpia de caché la lista de temas en que se puede escribir */
	this.clearWritableThemes = function() {
		WRITABLE_THEMES = null;
	};
	/* 	Los temas en los que puedo escribir 
		http://eskup.elpais.com/Profileeskup?action=list_writers&f=json&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadWritableThemes = function(callback) {
		if (WRITABLE_THEMES != null) {
			callback(WRITABLE_THEMES); return;	
		};
		var params = eskupParams({action: "list_writers"});
		apiCall("GET", PROFILEESKUP, params, function(r) {
			WRITABLE_THEMES = eskupParseResponse(r).perfilesEventos;
			callback(WRITABLE_THEMES);
		});
	};
	/* Comenzar a escribir en una lista de temas
		http://eskup.elpais.com/Profileeskup?action=add_eventos&f=json&data=ev1,ev2&id=7gTvFkSaO-pa0342AjhqMg
		@param themes: lista de temas
		@param follow: true (seguir) o false (no seguir)
	*/
	this.writeThemes = function(themes, write, callback) {
		var params = eskupParams({action: (write ? "add_writers" : "del_writers"), data: themes.join(",")});
		apiCall("GET", PROFILEESKUP, params,
			function(r) {
				callback(r);
			});
	};

	/*	Usuarios que sigo
		ej: http://eskup.elpais.com/Profileeskup?action=list_usuarios&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadFollowTo = function(pag, callback) {
		var params = eskupParams({action: "list_usuarios", pag: pag, max: 100});
		apiCall("GET", PROFILEESKUP, params, function (r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/*	Usuarios que me siguen
		ej: http://eskup.elpais.com/Profileeskup?action=list_seguidores&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadFollowMe = function(pag, callback) {
		var params = eskupParams({action: "list_seguidores", pag: pag, max: 100});
		apiCall("GET", PROFILEESKUP, params, function (r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* Carga de mensajes favoritos, por compatibilidad con otras APIs */
	this.loadFavorites = function(callback) { if (callback) callback(FAVORITES); };

	/* Función para enviar un mensaje a través de la API */
	this.update = function(data, callback) {
		var commands = {send: "add",
						forward: "add",
						reply: "reply",
						edit: "edit"};
		var params = eskupParams();
		var method = "POST";
		// el mensaje
		params.m = data.message;
		// comando
		params.c = commands[data.command];
		// ID de mensaje a reenviar o contestar:
		if (data.msgID) params.x = data.msgID;
		// temas destino
		if (data.themes) {
			params.t = data.themes.map(function(d){
				return "*"+d;
			}).join("|");
		};
		// destinos sociales
		if (data.social.fb) {
			if (data.social.tt) params.d = "1|2";
			else params.d = "2";
		}
		else if (data.social.tt) params.d = "1";
		// imagen
		if (data.image) {
			params.p = image;
			method = "MULTI";
		};
		apiCall(method, INESKUP, params, function(r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* Comprueba si sigo un tema */
	this.checkThemeFollowed = function(theme) { return theme in FOLLOWED_THEMES; };
	// Comprueba si he bloqueado un tema
	this.checkThemeBlocked = function(theme) { return theme in BLOCKED_THEMES; };

	// Comprueba si un mensaje está en mis favoritos
	this.checkFavorite = function(msgid) { return (FAVORITES.indexOf(msgid) >= 0); };

	/* Agegar mensake a favoritos */
	this.addFavorite = function(msgID, callback) {
		// obtenemos el mensaje de la API
		THAT.getMessage(msgID, function(data) {
			if (data.errorCode == 0) {
				var msg = data.mensajes[0];
				THAT.buildMessage(msg, data.perfilesUsuarios);
				localStorage[msgID] = JSON.stringify(msg);
				FAVORITES.push(msgID);
				localStorage["msg_fav"] = JSON.stringify(FAVORITES);
				callback(0);
			} else {
				callback(-1, "Error en la API de Eskup.");
			};
		});
	};

	/* Eliminar mensake de favoritos */
	this.removeFavorite = function(msgID, callback) {
		FAVORITES.splice(FAVORITES.indexOf(msgID), 1);
		localStorage.removeItem(msgID);
		localStorage["msg_fav"] = JSON.stringify(FAVORITES);
		callback();
	};

	/* 	Carga de una conversación completa 
		http://eskup.elpais.com/Outeskup?t=&nummsg=12&p=&f=json&th=1&msg=1356611973-8fe6c2d09824c9e5523f9931a834a641&id=7gTvFkSaO-pa0342AjhqMg&
	*/
	this.loadThread = function(threadID, callback) {
		var params = eskupParams({msg: threadID, th: 1});
		apiCall("GET", OUTESKUP, params, function (r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* 	Carga los temas bloqueados */
	this.eskupLoadBlockedThemes = function() {
		if (typeof(localStorage["temas_block"]) != "undefined") {
			listatemasblock = JSON.parse(localStorage["temas_block"]);
			listatemasblockN = JSON.parse(localStorage["temas_blockN"]);
			divtemasblock = document.getElementById("temas_block_lista");
			divtemasblock.innerHTML = "";
			for (var cont=0; cont < listatemasblock.length; cont++) {
				var temaitem = document.createElement("li");			
				var temalink = document.createElement("a");
				var temaid = listatemasblock[cont];
				var evento = "ev-" + temaid;
				temalink.href = "javascript:LoadXmlData('tema', '" + evento + "', '" + temaid + "')";
				temalink.innerHTML = listatemasblockN[cont];
				temaitem.appendChild(temalink);
				divtemasblock.appendChild(temaitem);			
			};
		};
	};
};
