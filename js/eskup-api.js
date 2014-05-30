var TIME_TOOLTIP_TIMER = null;
var PUBLIC_KEY = "";
var USER_ID = "";
var WRITABLE_THEMES = null;
var FOLLOWED_THEMES = null;
var USER_PROFILE = null;

var INESKUP = "http://eskup.elpais.com/Ineskup";
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
}
function InEskup(c) {
	this.url = INESKUP;
	this.dat = INPARAMS;
	this.m = "GET";
}

var OUTESKUP = "http://eskup.elpais.com/Outeskup";
var OUTPARAMS = {
	t: "",			// qué tablon
	nummsg: 20,		// cuántos mensajes
	p: 1,			// qué página
	f: "json",		// formato de respuesta
	th: 1,
	msg: "",
	id: ""
}

/* get a single message */
function eskupGetMessage(msg_id, callback) {
	var params = {
		id: PUBLIC_KEY,
		f: "json",
		msg: msg_id
	};
	apiCall("GET", OUTESKUP, params, callback);
};

var PROFILEESKUP = "http://eskup.elpais.com/Profileeskup";
var PROFILEPARAMS = {
	id: "",
	action: "",
	f: "json",
	pag: ""
}

function initEskup(callback) {
	apiCall("GET", "http://eskup.elpais.com/Auth/modusereskup.pl", null, function(r) {
		var doc = document.implementation.createHTMLDocument('');
		doc.documentElement.innerHTML = r;
		if (doc.getElementsByClassName("error").length) {
			window.close();
			chrome.tabs.create({url:"http://eskup.elpais.com/index.html"});
			return;
		}
		PUBLIC_KEY = doc.getElementById("campo_api")
						.getElementsByTagName("p")[0]
						.getElementsByClassName("valor")[0]
						.innerText;
		INPARAMS.id = OUTPARAMS.id = PROFILEPARAMS.id = PUBLIC_KEY;
		callback();
	});
};

function logOut() {
	apiCall("GET", "http://www.elpais.com/clientes2/desconectar.html", null);
	window.close();
};

var TABLONES = {
	mios: "t1-",
	sigo: "2",
	priv: "3",
	todo: "t1-ULTIMOSMENSAJES"
};

function getBoard(id) {
	return (TABLONES.hasOwnProperty(id)) ? (TABLONES[id]) : (id);
};

/* Función que parasea los JSON recibidos de Eskup */
function eskupParseResponse(response) {
	if (response.match(/\{\'/)) response = response.replace(/\'/g, "\"");
	return JSON.parse(response);
};

/* Completa la información de un mensaje */
function buildMessage(msg, usersInfo) {
	var user = usersInfo[msg.usuarioOrigen];
	msg.pathfoto = checkUserPhoto(user.pathfoto);
	msg.usuarioOrigenNombre = (user.nombre + " " + user.apellidos).trim();
	if (msg.idMsgRespuesta) {
		user = usersInfo[msg.autorMsgRespuesta];
		msg.pathfotoRespuesta = checkUserPhoto(user.pathfoto);
		msg.usuarioRespuestaNombre = (user.nombre + " " + user.apellidos).trim();
	};
};

/////////////////////////////////////////////////////////////////////////////
// Tablón de mensajes ///////////////////////////////////////////////////////
// ej.: http://eskup.elpais.com/Outeskup?t=2&f=json&id=7gTvFkSaO-pa0342AjhqMg
function loadData(board, callback) {
	if (board) {
		if (board == OUTPARAMS.t)		// tablón actual, nada que hacer
			return;
		OUTPARAMS.t = board;			// selección de tablón
		OUTPARAMS.p = 1;				// primera página
		OUTPARAMS.th = "";				// no thread
		OUTPARAMS.msg = "";				// no mensaje
		document.getElementById("board").innerHTML = "";	// limpieza
	} else { OUTPARAMS.p++; }			// nueva página
	$("#board").append("<div class='loading'><i class='fa fa-refresh fa-spin'></i>cargando datos...</div>");
	apiCall("GET", OUTESKUP, OUTPARAMS, function (r) {
		var info = eskupParseResponse(r);
		console.log(info);
		var messages = info.mensajes;
		var usersInfo = info.perfilesUsuarios;
		var themesInfo = info.perfilesEventos;
		var board = document.getElementById("board");
		board.style.left = 0;
		document.getElementById("tree-board").style.left = "450px";
		if (messages.length == 0) {
			$(board).append("<div class='no-messages'>No hay mensajes que mostrar.</div>");
		} else {
			for (var i=0; i<messages.length; i++) {
				var msg = info.mensajes[i];
				if (msg.borrado) continue;
				buildMessage(msg, usersInfo);
				appendMsg(msg, board, themesInfo);
			};
		}
		if (callback) callback(info);
		$("#board").find(".loading").remove();
	});
};





function msgForward() {

}



/* Borrar un mensaje de dEskup */
function eskupMsgDelete(msgID, callback) {
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
function eskupLoadProfile(callback) {
	if (USER_PROFILE != null) {
		callback(USER_PROFILE);
	} else {
		PROFILEPARAMS.action = "info_usuarios";
		apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function(r) {
			perfiles = eskupParseResponse(r).perfilesUsuarios;
			for (var u in perfiles) {
				USER_ID = u;
				TABLONES["mios"] = "t1-" + USER_ID;
				USER_PROFILE = perfiles[u];
			}
			callback(USER_PROFILE);
		});
	};
};

/* 	Los temas que sigo
	http://eskup.elpais.com/Profileeskup?action=list_eventos&f=json&id=7gTvFkSaO-pa0342AjhqMg
*/
function eskupLoadFollowedThemes(callback) {
	if (FOLLOWED_THEMES != null) {
		callback(FOLLOWED_THEMES);
	} else {
		PROFILEPARAMS.action = "list_eventos";
		apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function(r) {
			FOLLOWED_THEMES = eskupParseResponse(r);
			callback(FOLLOWED_THEMES);
		});
	};
};
/* 	Los temas en los que puedo escribir 
	http://eskup.elpais.com/Profileeskup?action=list_writers&f=json&id=7gTvFkSaO-pa0342AjhqMg
*/
function eskupLoadWritableThemes(callback) {
	if (WRITABLE_THEMES != null) {
		callback(WRITABLE_THEMES);
	} else {
		PROFILEPARAMS.action = "list_writers";
		apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function(r) {
			WRITABLE_THEMES = eskupParseResponse(r).perfilesEventos;
			callback(WRITABLE_THEMES);
		});
	};
};


/*	Usuarios que sigo
	ej: http://eskup.elpais.com/Profileeskup?action=list_usuarios&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
*/
function eskupLoadFollowTo(pag, callback) {
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
function eskupLoadFollowMe(pag, callback) {
	PROFILEPARAMS.action="list_seguidores";
	PROFILEPARAMS.pag = pag;
	PROFILEPARAMS.max = 100;
	apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function (r) {
		if (callback) callback(eskupParseResponse(r));
	});
};

/* Carga de mensajes favoritos, por compatibilidad con otras APIs */
function eskupLoadFavorites(callback) {
	if (callback) callback(listamsgfav);
};

/* Función para enviar un mensaje a través de la API */
function eskupUpdate(msg, themes, social, image, callback) {
	var api = new InEskup();
	api.dat.m = msg;
	// comando
	api.dat.c = "add";
	// temas destino
	if (themes) {
		api.dat.t = themes.map(function(d){
			return "*"+d;
		}).join("|");
	};
	// destinos sociales
	if (social.fb) {
		if (social.tt) api.dat.d = "1|2";
		else api.dat.d = "2";
	}
	else if (social.tt) api.dat.d = "1";
	// imagen
	if (image) {
		api.dat.p = image;
		api.m = "MULTI";
	} else {
		api.m = "POST";
	};
	console.log(api);
	apiCall(api.m, api.url, api.dat, function(r) {
		if (callback) callback(eskupParseResponse(r));
	});
};

// Comprueba si sigo un tema
function CheckSigoTema(temaid) {
	for (cont = 0; cont < listatemas.length; cont++)
		if (temaid == listatemas[cont])
			return 1;	
	return 0;
}
// Comprueba si he bloqueado un tema
function checkBlocked(temaid)
{
	return (listatemasblock.indexOf(msgid) >= 0);
};

// Comprueba si un mensaje está en mis favoritos
function checkFavorite(msgid) {
	return (listamsgfav.indexOf(msgid) >= 0);
};

/* Agegar mensake a favoritos */
function eskupSetFavorite(msgID, callback) {
	// obtenemos el mensaje de la API
	eskupGetMessage(msgID, function(r) {
		var data = eskupParseResponse(r);
		if (data.errorCode == 0) {
			var msg = data.mensajes[0];
			buildMessage(msg, data.perfilesUsuarios);
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
function eskupRemoveFavorite(msgID, callback) {
	listamsgfav.splice(listamsgfav.indexOf(msgID), 1);
	localStorage.removeItem(msgID);
	localStorage["msg_fav"] = JSON.stringify(listamsgfav);
	callback();
};


/* 	Carga de una vonversación completa 
	http://eskup.elpais.com/Outeskup?t=&nummsg=12&p=&f=json&th=1&msg=1356611973-8fe6c2d09824c9e5523f9931a834a641&id=7gTvFkSaO-pa0342AjhqMg&
*/
function eskupLoadThread(threadID, callback) {
	OUTPARAMS.msg = threadID;
	OUTPARAMS.th = 1;
	OUTPARAMS.t = "";
	OUTPARAMS.p = "";
	apiCall("GET", OUTESKUP, OUTPARAMS, function (r) {
		if (callback) callback(eskupParseResponse(r));
	});
};








