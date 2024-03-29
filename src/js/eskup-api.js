function EskupApi() {
	var THAT = this,
		PUBLIC_KEY = "",
		USER_ID = "",
		WRITABLE_THEMES = null,	// temas en los que puedo escribir
		FOLLOWED_THEMES = null,	// temas que sigo
		THEMES_INFO = {}, 	// información sobre eventos
		USER_PROFILE = {},	// información de perfil de usuarios
		LAST_THREAD = {id: null, info: null},		// guarda el último thread leído
		FAVORITES = null, // lista de temas favoritos, almacenada em chrome.storage
		INESKUP = "http://eskup.elpais.com/Ineskup";

	// Carga inicial de mensajes favoritos:
	if (chrome.storage) {
		chrome.storage.local.get("msg_fav", function(result) {
			FAVORITES = result["msg_fav"] || [];	// lista de mensajes favoritos
		});
	}
	

	this.NUMMSG = 50;		// número de mensajes que se pedirán cada vez

	/* Limpia la información sobre un perfil de usuario */
	function clearUsersInfo (users) {
		if (typeof users === "undefined") users = [THAT.getUserNickname()];	// el usuario actual
		users.forEach(function(t) {
			USER_PROFILE[t] = null;
		});
	};
	/* Limpia la información sobre un array de nombres de temas */
	function clearThemesInfo (themes) {
		themes.forEach(function(t) {
			THEMES_INFO[t] = null;
		});
	};

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

	var SEARCH_USERS = "http://eskup.elpais.com/Scripts/buscaUsuarios.pl";	// buscador de usuarios

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

	/* Buscador de usuarios */
	this.findUsers = function(name, callback) {
		if (name.length < 3) {
			callback(null);
			return;
		};
		apiCall("GET", SEARCH_USERS, {q: name}, function(r) {
			callback(eskupParseResponse(r));
		});
	};

	/* Buscador de temas para escribir, por comptibilidad con el findUsers para el editor */
	this.findWritableThemes = function(name, callback) {
		var nameRegexp = makeRegexp(name);
		THAT.loadWritableThemes(function(themes) {
			var result = {answer: [], num: 0, query: name};
			for (k in themes) {
				var theme = themes[k];
				var auxText = [k, theme.nombre].join(" ");
				if (auxText.match(nameRegexp) && theme.activo==1) {
					// se filtran también los temas inactivos
					result.answer.push({
						nick: k,
						nombrebonito: theme.nombre,
						pathfoto: theme.pathfoto
					});
					result.num++;
				};
			};
			result.answer = sortArray(result.answer, "nombrebonito");	// ordenación
			callback(result);
		});
	};
	
	/* Obtiene el nickname del usuario */
	this.getUserNickname = function() { return USER_ID; };

	/* Inicializa las variables de Eskup */
	this.init = function(callback) {
		// apiCall("GET", "http://eskup.elpais.com/Auth/getuserpk.pl", null, function(r) {
		// 	var info = eskupParseResponse(r);
		// 	if (info.status == "error") {
		// 		callback(null);
		// 		return;
		// 	} else {
		// 		PUBLIC_KEY = info.id;
		// 		USER_ID = info.nickname;
		// 		callback(USER_ID);
		// 	};
		// });
		callback("luispedraza");
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

	/* Completa la información de un mensaje 
		@param msg: mensaje
		@param usersInfo: información de usuarios
	*/
	this.buildMessage = function(msg, usersInfo) {
		var user = usersInfo[msg.usuarioOrigen];
		msg.pathfoto = checkUserPhoto(user.pathfoto);
		msg.usuarioOrigenNombre = (user.nombre + " " + user.apellidos).trim();
		if (msg.idMsgRespuesta) {
			user = usersInfo[msg.autorMsgRespuesta];
			msg.usuarioRespuestaNombre = (user.nombre + " " + user.apellidos).trim();
		};
		user = null;
		return msg;
	};
	/* Completa la información de un mensaje  para un thread (omitida información de respuesta */
	this.buildThreadMessage = function(msg, usersInfo) {
		var user = usersInfo[msg.usuarioOrigen];
		msg.pathfoto = checkUserPhoto(user.pathfoto);
		msg.usuarioOrigenNombre = (user.nombre + " " + user.apellidos).trim();
		return msg;
	};
	/* 	Carga un tablón de mensajes
		ej.: http://eskup.elpais.com/Outeskup?t=2&f=json&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadMessages = function(board, page, callback) {
		var params = eskupParams({t: board, p: page, nummsg: THAT.NUMMSG});
		apiCall("GET", OUTESKUP, params, function (r) {
			callback(eskupParseResponse(r));
		});
	};

	/* Borrar un mensaje de dEskup 
		@param mID: id del mensaje que se deea borrar
		@param callback: función a ejecutar al terminar la operación, sobre la respuesta obtenida
	*/
	this.deleteMessage = function(mID, callback) {
		var params = eskupParams({c: "del", x: mID});
		apiCall("GET", INESKUP, params, function(r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* 	Información de perfil de usuario
		http://eskup.elpais.com/Profileeskup?action=info_usuarios&f=xml&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadProfile = function(userID, callback) {
		if (!userID) userID = THAT.getUserNickname();
		if (USER_PROFILE[userID] != null) {
			callback(USER_PROFILE[userID]);
		} else {
			var params = eskupParams({action: "info_usuarios", user: userID});
			apiCall("GET", PROFILEESKUP, params, function(r) {
				callback(USER_PROFILE[userID] = eskupParseResponse(r).perfilesUsuarios[userID]);
			});
		};
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
				// limpieza
				FOLLOWED_THEMES = null;
				clearUsersInfo();
				clearThemesInfo(themes);
				callback(r);
			});
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
				// limpieza
				WRITABLE_THEMES = null;
				clearUsersInfo();
				clearThemesInfo(themes);
				callback(r);
			});
	};

	/*	Usuarios que sigo (una página)
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

	/* Todos los usuarios que sigo (option==1) o me siguen (option==2) */
	this.loadFollowUsers = function(option, callback) {
		var result = [];
		var f = (option==1) ? THAT.loadFollowTo : THAT.loadFollowMe;
		(function addBatch (page) {
			f(page, function(data) {
				var N = data.numeroUsuarios;
				var profiles = data.perfilesUsuarios;
				var batch = Object.keys(profiles).map(function(k){
					var item = profiles[k];
					item.nickname = k;
					return item;
				});
				result = result.concat(batch);
				if (result.length < N) addBatch(++page);
				else callback(result);
			});
		})(1);
	};
	/* Comenzar a seguir o dejar de seguir a usuarios */
	this.followUsers = function (users, follow, callback) {
		var params = eskupParams({action: (follow ? "add_usuarios" : "del_usuarios"), data: users.join(",")});
		apiCall("GET", PROFILEESKUP, params,
			function(r) {
				// limpieza: todos los users, y también quien hace la petición
				clearUsersInfo(users.concat([API.getUserNickname()]));
				callback(r);
			});
	};

		/* Comenzar a seguir o dejar de seguir a usuarios */
	this.blockUsers = function (users, block, callback) {
		var params = eskupParams({action: (block ? "add_denegaciones" : "del_denegaciones"), data: users.join(",")});
		apiCall("GET", PROFILEESKUP, params,
			function(r) {
				// limpieza: todos los users, y también quien hace la petición
				clearUsersInfo(users.concat([API.getUserNickname()]));
				callback(r);
			});
	};

	/* Carga de mensajes favoritos, por compatibilidad con otras APIs */
	this.loadFavorites = function(callback) {
		if (callback) callback(FAVORITES);
	};

	/* Obtiene un mensaje favorito por su ID */
	this.getFavorite = function(msgID, callback) {
		chrome.storage.local.get(msgID, function(o) {
			callback(o[msgID]);
		});
	};

	/* Función para enviar un mensaje a través de la API 
		@param config {
			command: comando a ejecutar (send, forward, reply, replyPrivate, edit)
		}
	*/
	this.update = function(data, callback) {
		var commands = {send: "add",
						forward: "add",
						replyPrivate: "add",
						reply: "reply",
						edit: "edit"};
		var params = eskupParams();
		var method = "POST";
		// el mensaje
		params.m = data.message;
		// comando
		params.c = commands[data.command];
		// ID de mensaje a reenviar o contestar:
		if (data.mID) params.x = data.mID;
		// destinatarios de privado
		if (data.users && data.users.length) {
			params.t = data.users.join("|");
		} else {
			// temas destino
			if (data.themes && data.themes.length) {
				params.t = data.themes.map(function(d) {
					return "*"+d;
				}).join("|");
			};
			// destinos sociales
			if (data.social) {
				params.d = data.social.map(function(s) {
					if (s=="twitter") return "1";
					if (s=="facebook") return "2";
				}).join("|");
			};
		};
		// imagen
		if (data.image) {
			params.p = data.image;
			method = "MULTI";
		};
		apiCall(method, INESKUP, params, function(r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* Comprueba si sigo un tema */
	this.checkThemeFollowed = function(theme) { return theme in FOLLOWED_THEMES; };

	/* Comprueba si un mensaje está en mis favoritos */
	this.checkFavorite = function(msgid) { return (FAVORITES.indexOf(msgid) >= 0); };

	/* Agegar mensake a favoritos */
	this.addFavorite = function(msgID, callback) {
		// obtenemos el mensaje de la API
		THAT.getMessage(msgID, function(data) {
			if (data.errorCode == 0) {
				var msg = data.mensajes[0];	// este es el mensaje en JSON
				var msgInfo = {};
				msgInfo[msgID] = msg;
				chrome.storage.local.set(msgInfo, function() {
					if (chrome.runtime.lastError) callback(-1, "No se pudo guardar el mensaje: " + chrome.runtime.lastError.message);
					else {
						FAVORITES.push(msgID);
						var favInfo = {};
						favInfo["msg_fav"] = FAVORITES;
						chrome.storage.local.set(favInfo);
						callback(0);
					};
				});
			} else {
				callback(-1, "Error en la API de Eskup.");
			};
		});
	};

	/* Eliminar mensake de favoritos */
	this.removeFavorite = function(msgID, callback) {
		chrome.storage.local.remove(msgID, function() {
			FAVORITES.splice(FAVORITES.indexOf(msgID), 1);
			chrome.storage.local.set({"msg_fav": FAVORITES}, function() {
				callback();		
			});
		});
	};

	/* 	Carga de una conversación completa 
		http://eskup.elpais.com/Outeskup?t=&nummsg=12&p=&f=json&th=1&msg=1356611973-8fe6c2d09824c9e5523f9931a834a641&id=7gTvFkSaO-pa0342AjhqMg&
	*/
	this.loadThread = function(threadID, callback) {
		if (LAST_THREAD.id == threadID) {
			// console.log(JSON.stringify(LAST_THREAD.info));
			callback(LAST_THREAD.info);
			return;
		};
		// TIC();
		var params = eskupParams({msg: threadID, th: 1});
		apiCall("GET", OUTESKUP, params, function (r) {
			var info = eskupParseResponse(r);
			LAST_THREAD.id = threadID;
			LAST_THREAD.info = info;
			// console.log(JSON.stringify(info));
			// console.log("tiempo adquisición: ", TOC());
			if (callback) callback(info);
		});
	};
};
