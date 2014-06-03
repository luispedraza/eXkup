function EskupApi() {
	var THAT = this;
	var PUBLIC_KEY = "";
	var NICKNAME = "";
	var USER_ID = "";
	var WRITABLE_THEMES = null;
	var FOLLOWED_THEMES = null;
	var THEMES_INFO = {}; 	// información sobre eventos
	var USER_PROFILE = null;
	var INESKUP = "http://eskup.elpais.com/Ineskup";
	var COMMANDS = {send: "add",
					forward: "add",
					reply: "reply",
					edit: "edit"};
	var INPARAMS = {
		m: "",			// Contenido del mensaje (c=add|reply|edit, ignorado con c=del)
						// obligatorio, excepto cuando se elimina un mensaje (c=del)
						// admite etiquetas <a> y <i>
		c: "",			// Comando: add (envío o forward), del, edit, reply
		t: "",			// Destino: tablones o privados a usuarios *tema1|*tema2|nickname1|nickname2
						// cuando el comando no es add sólo se puede indicar un destino
						// para eliminar un mensaje privado (c=del) debe ser t=p
						// nota: se requirer autorización para escribir en un tema
						// no se puede enviar a privados y a temas a la vez
		x: "",			// Extra. (c=add)reenvío?(id fwd), (c=del)?(id del), (c=edit)?(id edit), (c=reply)?(id reply)
		p: "", 			// Imagen adjunta al mensaje
		f: "json",		// Formato de la respuesta
		d: "",			// Destino Twitter (1), Facebook (2) o Ambos (1|2)
		id: ""			// Clave pública
	};

	function InEskup(c) {
		this.url = INESKUP;
		this.dat = INPARAMS;
		this.m = "GET";
	};

	var OUTESKUP = "http://eskup.elpais.com/Outeskup";
	var OUTPARAMS = {
		t: "",			// qué tablon
		nummsg: 20,		// cuántos mensajes
		p: 1,			// qué página
		f: "json",		// formato de respuesta
		th: 1,
		msg: "",
		id: ""
	};

	var PROFILEESKUP = "http://eskup.elpais.com/Profileeskup";
	var PROFILEPARAMS = {
		id: "",
		action: "",
		f: "json",
		pag: ""
	};

	/* Función que parasea los JSON recibidos de Eskup */
	function eskupParseResponse(response) {
		if (response) {
			if (response.match(/\{\'/)) response = response.replace(/\'/g, "\"");
			return JSON.parse(response);	
		};
	};
	
	/* Obtiene el nickname del usuario */
	this.getUserNickname = function() {
		return USER_ID;
	};

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
				INPARAMS.id = OUTPARAMS.id = PROFILEPARAMS.id = PUBLIC_KEY;
				callback(USER_ID);
			};
		});
	};

	/* get a single message */
	this.getMessage = function(msg_id, callback) {
		var params = {
			id: PUBLIC_KEY,
			f: "json",
			msg: msg_id
		};
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
	this.loadBoard = function(board, callback) {
		if (board) {
			if (board == OUTPARAMS.t)		// tablón actual, nada que hacer
				return;
			OUTPARAMS.t = board;			// selección de tablón
			OUTPARAMS.p = 1;				// primera página
			OUTPARAMS.th = "";				// no thread
			OUTPARAMS.msg = "";				// no mensaje
			document.getElementById("board").innerHTML = "";	// limpieza
		} else { OUTPARAMS.p++; };			// nueva página
		apiCall("GET", OUTESKUP, OUTPARAMS, function (r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	this.msgForward = function() {

	};

	/* Borrar un mensaje de dEskup */
	this.deleteMessage = function(msgID, callback) {
		INPARAMS.c = "del";
		INPARAMS.x = msgID;
		apiCall("GET", INESKUP, INPARAMS, function(r) {
			var info = eskupParseResponse(r);
			if (callback) callback(info);
		});
		INPARAMS.c = "";
		INPARAMS.x = "";
	};

	/* 	Información de perfil de usuario
		http://eskup.elpais.com/Profileeskup?action=info_usuarios&f=xml&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadProfile = function(callback) {
		if (USER_PROFILE != null) {
			callback(USER_PROFILE);
		} else {
			PROFILEPARAMS.action = "info_usuarios";
			apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function(r) {
				perfiles = eskupParseResponse(r).perfilesUsuarios;
				for (var u in perfiles) {
					USER_PROFILE = perfiles[u];
				};
				callback(USER_PROFILE);
			});
		};
	};

	/* carga información sobre un tema */
	this.loadThemeInfo = function(theme, callback) {
		function getInfo(d) {if (d) return eskupParseResponse(d).perfilesEventos[theme]};
		PROFILEPARAMS.action = "info_eventos";
		PROFILEPARAMS.event = theme;
		return THEMES_INFO[theme] || (THEMES_INFO[theme] = getInfo(
			apiCall("GET", PROFILEESKUP, PROFILEPARAMS,
					(callback ? function(r) { callback(THEMES_INFO[theme] = getInfo(r)); } : null)
					)));
	};

	/* Limpia de caché la lista de temas seguidos */
	this.clearFollowedThemes = function() {
		FOLLOWED_THEMES = null;
	};
	/* 	Los temas que sigo
		http://eskup.elpais.com/Profileeskup?action=list_eventos&f=json&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadFollowedThemes = function(callback) {
		function getInfo(d) {if (d) return eskupParseResponse(d).perfilesEventos};
		PROFILEPARAMS.action = "list_eventos";
		return FOLLOWED_THEMES || (FOLLOWED_THEMES = getInfo(
			apiCall("GET", PROFILEESKUP, PROFILEPARAMS,
				(callback ? function(r) { callback(FOLLOWED_THEMES = getInfo(r)); } : null)
			)));
	};
	/* Comenzar a seguir una lista de temas
		http://eskup.elpais.com/Profileeskup?action=add_eventos&f=json&data=ev1,ev2&id=7gTvFkSaO-pa0342AjhqMg
		@param themes: lista de temas
		@param follow: true (seguir) o false (no seguir)
	*/
	this.followThemes = function(themes, follow, callback) {
		PROFILEPARAMS.action = follow ? "add_eventos" : "del_eventos";
		PROFILEPARAMS.data = themes.join(",");
		apiCall("GET", PROFILEESKUP, PROFILEPARAMS,
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
		function getInfo(d) { if (d) return eskupParseResponse(d).perfilesEventos };
		PROFILEPARAMS.action = "list_writers";
		PROFILEPARAMS.event = "";
		return WRITABLE_THEMES || (WRITABLE_THEMES = getInfo(
			apiCall("GET", PROFILEESKUP, PROFILEPARAMS,
				(callback ? function(r) { callback(WRITABLE_THEMES = getInfo(r)); } : null)
			)));
	};
	/* Comenzar a escribir en una lista de temas
		http://eskup.elpais.com/Profileeskup?action=add_eventos&f=json&data=ev1,ev2&id=7gTvFkSaO-pa0342AjhqMg
		@param themes: lista de temas
		@param follow: true (seguir) o false (no seguir)
	*/
	this.writeThemes = function(themes, write, callback) {
		PROFILEPARAMS.action = write ? "add_writers" : "del_writers";
		PROFILEPARAMS.data = themes.join(",");
		apiCall("GET", PROFILEESKUP, PROFILEPARAMS,
			function(r) {
				callback(r);
			});
	};

	/*	Usuarios que sigo
		ej: http://eskup.elpais.com/Profileeskup?action=list_usuarios&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadFollowTo = function(pag, callback) {
		PROFILEPARAMS.action = "list_usuarios";
		PROFILEPARAMS.pag = pag;
		PROFILEPARAMS.max = 100;
		apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function (r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/*	Usuarios que me siguen
		ej: http://eskup.elpais.com/Profileeskup?action=list_seguidores&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
	*/
	this.loadFollowMe = function(pag, callback) {
		PROFILEPARAMS.action="list_seguidores";
		PROFILEPARAMS.pag = pag;
		PROFILEPARAMS.max = 100;
		apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function (r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* Carga de mensajes favoritos, por compatibilidad con otras APIs */
	this.loadFavorites = function(callback) { if (callback) callback(listamsgfav); };

	/* Función para enviar un mensaje a través de la API */
	this.update = function(data, callback) {
		var api = new InEskup();
		// el mensaje
		api.dat.m = data.message;
		// comando
		api.dat.c = COMMANDS[data.command];
		// ID de mensaje a reenviar o contestar:
		if (data.msgID) api.dat.x = data.msgID;
		// temas destino
		if (data.themes) {
			api.dat.t = data.themes.map(function(d){
				return "*"+d;
			}).join("|");
		};
		// destinos sociales
		if (data.social.fb) {
			if (data.social.tt) api.dat.d = "1|2";
			else api.dat.d = "2";
		}
		else if (data.social.tt) api.dat.d = "1";
		// imagen
		if (data.image) {
			api.dat.p = image;
			api.m = "MULTI";
		} else {
			api.m = "POST";
		};
		apiCall(api.m, api.url, api.dat, function(r) {
			if (callback) callback(eskupParseResponse(r));
		});
	};

	/* Comprueba si sigo un tema */
	this.CheckSigoTema = function(temaid) {
		for (cont = 0; cont < listatemas.length; cont++)
			if (temaid == listatemas[cont])
				return 1;	
		return 0;
	};
	// Comprueba si he bloqueado un tema
	this.checkThemeBlocked = function(temaid) { return (listatemasblock.indexOf(msgid) >= 0); };

	// Comprueba si un mensaje está en mis favoritos
	this.checkFavorite = function(msgid) { return (listamsgfav.indexOf(msgid) >= 0); };

	/* Agegar mensake a favoritos */
	this.addFavorite = function(msgID, callback) {
		// obtenemos el mensaje de la API
		THAT.getMessage(msgID, function(data) {
			if (data.errorCode == 0) {
				var msg = data.mensajes[0];
				THAT.buildMessage(msg, data.perfilesUsuarios);
				localStorage[msgID] = JSON.stringify(msg);
				listamsgfav.push(msgID);
				localStorage["msg_fav"] = JSON.stringify(listamsgfav);
				callback(0);
			} else {
				callback(-1, "Error en la API de Eskup.");
			};
		});
	};

	/* Eliminar mensake de favoritos */
	this.removeFavorite = function(msgID, callback) {
		listamsgfav.splice(listamsgfav.indexOf(msgID), 1);
		localStorage.removeItem(msgID);
		localStorage["msg_fav"] = JSON.stringify(listamsgfav);
		callback();
	};

	/* 	Carga de una conversación completa 
		http://eskup.elpais.com/Outeskup?t=&nummsg=12&p=&f=json&th=1&msg=1356611973-8fe6c2d09824c9e5523f9931a834a641&id=7gTvFkSaO-pa0342AjhqMg&
	*/
	this.loadThread = function(threadID, callback) {
		OUTPARAMS.msg = threadID;
		OUTPARAMS.th = 1;
		OUTPARAMS.t = "";
		OUTPARAMS.p = "";
		apiCall("GET", OUTESKUP, OUTPARAMS, function (r) {
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
