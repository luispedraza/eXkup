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
		if (callback) callback();
		$("#board").find(".loading").remove();
	});
};

function appendMsg(msg, board, themes) {
	var m_id = msg.idMsg;
	var user = msg.usuarioOrigen;
	var tsMessage = msg.tsMensaje * 1000;	// timestamp del mensaje
	// Creación del nuevo mensaje:
	var div_msg = document.createElement("div");
	div_msg.className = "message";
	div_msg.id = m_id;
	// El contenido del mensaje:
	var div_cont = document.createElement("div");
	div_cont.className = "msg_content";
	div_cont.innerHTML = msg.contenido;
	processVideos(div_cont);
	if (msg.cont_adicional) {
		var img_cont = document.createElement("img");
		img_cont.src = msg.cont_adicional;
		div_cont.appendChild(img_cont);
	}
	// La cabecera:
	var dHead = document.createElement("div");
	dHead.className = "msg_header";
	var img_user = document.createElement("img");
	img_user.src = msg.pathfoto;
	dHead.appendChild(img_user);	// user image

	var a_user = document.createElement("a");
	a_user.href = "http://eskup.elpais.com/" + user;
	a_user.textContent = "@" + user;
	if (msg.usuarioOrigenNombre) a_user.textContent += " (" + msg.usuarioOrigenNombre + ")";
	dHead.appendChild(a_user);		// user link
	var date_element = document.createElement("a");
	date_element.className = "time fa fa-clock-o";
	date_element.textContent = getTimeAgo(new Date(tsMessage), new Date());
	date_element.setAttribute("data-ts", tsMessage);
	date_element.addEventListener("mouseover", function() {
		var timeAgoElement = this;
		TIME_TOOLTIP_TIMER = setTimeout(function() {
			var ts = parseInt(timeAgoElement.getAttribute("data-ts"));
			var date = new Date(ts);
			var tooltip = document.createElement("span");
			tooltip.className = "time-tooltip";
			tooltip.innerHTML = "<span>"
				+formatDate(date, true)
				+"</span><span>"
				+date.toLocaleTimeString()
				+"</span>";
			timeAgoElement.appendChild(tooltip);
		}, 500);
	});
	date_element.addEventListener("mouseout", function() {
		clearTimeout(TIME_TOOLTIP_TIMER);
		$(this).find(".time-tooltip").remove();
	});
	date_element.href = "http://eskup.elpais.com/" + m_id;
	date_element.target = "_blank";
	dHead.appendChild(date_element);

	// Elementos de control:
	var dCtrl = document.createElement("div");
	dCtrl.className = "msg_control fa fa-plus-square";
	// Guardar vavorito
	var dFav = document.createElement("div");
	dFav.className = checkFavorite(m_id) ? "btn fav on" : "btn fav";
	dFav.innerHTML = "<i class='fa fa-star'></i> favorito";
	dFav.title = "favorito";
	dFav.setAttribute("m_id", m_id);
	dFav.addEventListener("click", setFavorite);
	// Respuesta
	var dReply = document.createElement("div");
	dReply.className = "btn reply";
	dReply.innerHTML = "<i class='fa fa-mail-reply'></i> responder";
	dReply.title = "responder";
	dReply.setAttribute("m_id", m_id);
	dReply.addEventListener("click", msgReply);
	// Forward
	var dFwd = document.createElement("div");
	dFwd.className = "btn fwd";
	dFwd.innerHTML = "<i class='fa fa-mail-forward'></i> reenviar";
	dFwd.title = "reenviar";
	dFwd.addEventListener("click", msgForward);
	dCtrl.appendChild(dFav);
	dCtrl.appendChild(dReply);
	dCtrl.appendChild(dFwd);

	// Hilos de mensajes
	if (msg.idMsgRespuesta && (msg.idMsgRespuesta != m_id)) {
		var div_reply = document.createElement("a");
		div_reply.className = "reply2link fa fa-mail-reply";
		div_reply.textContent = msg.autorMsgRespuesta;
		if (msg.usuarioRespuestaNombre) div_reply.textContent += " (" + msg.usuarioRespuestaNombre + ")";
		div_reply.title = "Respuesta a";
		div_reply.setAttribute("data-reply", msg.idMsgRespuesta);
		div_reply.addEventListener("click", function() {
			var THAT = this;
			eskupGetMessage(this.getAttribute("data-reply"), function(r) {
				var data = eskupParseResponse(r);
				var repliedMsg = data.mensajes[0];
				buildMessage(repliedMsg, data.perfilesUsuarios);
				// agrego el mensaje respondido como hijo del mensaje actual
				appendMsg(repliedMsg, $(THAT).closest(".message").addClass("conversation").get(0), data.perfilesEventos);
			});
		});
		dHead.innerHTML += "<br />"
		dHead.appendChild(div_reply);
		var div_thread = document.createElement("div");
		div_thread.className = "btn thlink";
		div_thread.innerHTML = "<i class='fa fa-comments'></i> charla";
		div_thread.title = "sigue el hilo";
		div_thread.setAttribute("thread", msg.hilo);
		div_thread.addEventListener("click", loadThread);
		dCtrl.appendChild(div_thread);
	}
	if (user == USER_ID) {
		var dDel = document.createElement("div");
		dDel.className = "btn";
		dDel.innerHTML = "<i class='fa fa-times-circle'></i> borrar";
		dDel.setAttribute("m_id", m_id);
		dDel.addEventListener("click", msgDelete);
		dCtrl.appendChild(dDel);
	}
	dHead.appendChild(dCtrl);
	// Temas del mensaje
	var themesFound = false;
	if (themes) {
		var $divThemes = $("<ul class='themes'></ul>");
		var msgThemes = msg.CopiaEnTablones.split( "," );	// temas del mensaje
		for (var t=0, len = msgThemes.length; t < len; t++) {
			var themeData = msgThemes[t].split("-");
			if (themeData[0] == "ev") {
				themesFound = true;
				var themeID = themeData[1];
				var themeInfo = themes[themeID];	// información sobre el tema, de la API
				// BLOQUEDO DE TEMAS:
				// if ((locationid == "todo") && (CheckBlockTema(temaid) != -1)) continue;
				// else msgbloqueado = false;
				var themeName = themeInfo.nombre;
				var $themeElement = $("<li>" + themeName + "</li>");
				// if (CheckSigoTema(temaid) == 1) temali.className = "seguido";					
				// else temali.className = "noseguido";
				$divThemes.append($themeElement);
			};
		};
	};
	// Construcción final y agregación
	div_msg.appendChild(dHead);
	div_msg.appendChild(div_cont);
	if (themesFound) $(div_msg).append($divThemes);
	board.appendChild(div_msg);
}

/* Respuesta a un usuario */
function msgReply() {
	$("#replying-message").remove();
	showEditor(true, "respuesta a ");
	var mId = this.getAttribute("m_id");
	var msgDiv = $("#"+mId)[0];
	$("#editor").before($("<div id='replying-message'></div>").html(msgDiv.outerHTML));
};

function msgForward() {

}

/* Eliminación de un mensaje */
function msgDelete() {
	var m_id = this.getAttribute("m_id");
	new ModalDialog("¿Seguro que desea borrar este mensaje?", "", ["Sí", "No"],
		function(result) {
			if (result=="Sí") {
				INPARAMS.c = "del";
				INPARAMS.x = m_id;
				apiCall("GET", INESKUP, INPARAMS, function(r) {
					var info = eskupParseResponse(r);
					if (info.status=="ok") {
						new ModalDialog("Eliminación correcta",
							"El mensaje ha sido eliminado con éxito, aunque el cambio puede tardar en verse reflejado en los servidores de Eskup.",
							["OK"],
							null,
							2000);
						$("#"+m_id).remove();
					} else {
						new ModalDialog("Se ha producido un error",
							"No ha sido posible eliminar el mensaje. Vuelve a intentarlo de nuevo más tarde.",
							["OK"],
							null,
							2000);	
					}
				});
				INPARAMS.c = "";
				INPARAMS.x = "";
			};
		});
}


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

///////////////////////
// ¿A quiénes sigo?
// ej: http://eskup.elpais.com/Profileeskup?action=list_usuarios&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
///////////////////////
function LoadFollowTo(pag)
{
	if (!pag) pag = 1;
	PROFILEPARAMS.action="list_usuarios";
	PROFILEPARAMS.pag = pag;
	apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function (r) {
		var users = eskupParseResponse(r);
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-to-users"), users);
		LoadFollowTo(pag+1);
	});
};

////////////////////////////
// ¿Quiénes me siguen?
// // ej: http://eskup.elpais.com/Profileeskup?action=list_seguidores&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
////////////////////////////
function LoadFollowMe(pag)
{
	if (!pag) pag = 1;
	PROFILEPARAMS.action="list_seguidores";
	PROFILEPARAMS.pag = pag;
	apiCall("GET", PROFILEESKUP, PROFILEPARAMS, function (r) {
		var users = eskupParseResponse(r);
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-me-users"), users);
		LoadFollowMe(pag+1);
	});
};

/* Carga de mdensajes favoritos */
function loadFavs() {
	var favs = document.getElementById("board");
	favs.innerHTML = "";
	for (var cont=0, len=listamsgfav.length; cont<len; cont++) {
		var message = localStorage.getItem(listamsgfav[cont]);
		if (message) appendMsg(JSON.parse(message), favs);
	};
}

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
	// if (image) {
	// 	api.dat.p = image;
	// 	api.m = "MULTI";
	// } else {
	// 	api.m = "POST";
	// };
	api.m = "MULTI";
	console.log(api);
	apiCall(api.m, api.url, api.dat, function(r) {
		if (callback) callback(eskupParseResponse(r));
	});
};

// Comprueba si sigo un tema
function CheckSigoTema(temaid)
{
	for (cont = 0; cont < listatemas.length; cont++)
		if (temaid == listatemas[cont])
			return 1;	
	return 0;
}
// Comprueba si he bloqueado un tema
function checkBlocked(temaid)
{
	return (listatemasblock.indexOf(msgid) >= 0);
}

// Comprueba si un mensaje está en mis favoritos
function checkFavorite(msgid) {
	return (listamsgfav.indexOf(msgid) >= 0);
}

/* Agrega o elimina un mensaje de la lista de favoritos */
function setFavorite() {
	var $favBtn = $(this);
	var m_id = $favBtn.closest('.message').attr("id");	// id del mensaje
	if (!$favBtn.hasClass("on")) {		// mensaje marcado como favorito
		listamsgfav.push(m_id);
		// obtenfo el mensaje de la api:
		eskupGetMessage(m_id, function(r) {
			var data = eskupParseResponse(r);
			if (data.errorCode == 0) {
				var msg = data.mensajes[0];
				buildMessage(msg, data.perfilesUsuarios);
				localStorage[m_id] = JSON.stringify(msg);
				localStorage["msg_fav"] = JSON.stringify(listamsgfav);
				new ModalDialog("El mensaje se ha agregado a tus favoritos.", null, [], null, 2000);
				$favBtn.toggleClass('on');
			};
		});
	} else {						// mensaje desmarcado como favorito
		new ModalDialog("¿Seguro que desea eliminar este mensaje de sus favoritos?",
			$favBtn.closest(".message")[0].outerHTML,
			["Sí", "Cancelar"], function(result) {
				if (result == "Sí") {
					listamsgfav.splice(listamsgfav.indexOf(m_id), 1);
					localStorage.removeItem(m_id);
					localStorage["msg_fav"] = JSON.stringify(listamsgfav);
					new ModalDialog("El mensaje se ha eliminado de tus favoritos.", null, [], null, 2000);
					$favBtn.toggleClass('on');
					// además lo eliminamos del tablón de favoritos
					if (currentBoard == "favs") {
						$favBtn.closest('.message').fadeOut(function() {
							$(this).remove();
						});
					};
				};
			});
	};
}

// http://eskup.elpais.com/Outeskup?t=&nummsg=12&p=&f=json&th=1&msg=1356611973-8fe6c2d09824c9e5523f9931a834a641&id=7gTvFkSaO-pa0342AjhqMg&
function loadThread(ev) {
	var threadId = ev.target.getAttribute("thread");
	OUTPARAMS.msg = threadId;
	OUTPARAMS.th = 1;
	OUTPARAMS.t = "";
	OUTPARAMS.p = "";
	apiCall("GET", OUTESKUP, OUTPARAMS, function (r) {
		info = eskupParseResponse(r);
		var infoTree = new Object();
		infoTree.id = null;
		function addNode(node, parent, tree) {
			if (!tree.idMsg) return node;
			else if (tree.idMsg == parent) {
				tree.children.push(node);
				tree.nRep = tree.children.length;
				for (var n=0; n<tree.children.length; n++)
					tree.nRep += tree.children[n].nRep;
			}
			else for (var n=0; n<tree.children.length; n++)
				addNode(node, parent, tree.children[n]);
		}
		for (var m=0; m<info.mensajes.length; m++) {
			var node = info.mensajes[m];
			buildMessage(node, info.perfilesUsuarios);
			node.children = [];
			node.nRep = 0;
			parentId = node.idMsgRespuesta;
			infoTree = addNode(node, parentId, infoTree) || infoTree;
		}
		var divtree = document.getElementById("tree");
		divtree.innerHTML = "";
		document.getElementById("tree-board").style.left = "0px";
		document.getElementById("board").style.left = "-450px";
		// showNodeLinkTree(infoTree);
		showMsgTree(infoTree, document.getElementById("tree"), true);
	});
};

function showMsgTree(infoTree, board, last) {
	var divNode = document.createElement("div");
	divNode.className = (last ? "node last" : "node"); 
	var divItem = document.createElement("div");
	divItem.className = "item";
	var divContent = document.createElement("div")
	divContent.className = "content";
	appendMsg(infoTree, divContent);
	divItem.appendChild(divContent);
	divNode.appendChild(divItem);
	if (infoTree.children.length) {
		var divChildren = document.createElement("div");
		divChildren.className = "children";
		var divNrep = document.createElement("div");
		divNrep.className = "more";
		divNrep.innerText = infoTree.nRep + " respuestas";
		divNrep.onclick = function(e) {
			this.className = (this.className.match("on") ? "more" : "more on");
			this.parentNode.className = (this.parentNode.className.match("on") ? "children" : "children on");
		}
		divChildren.appendChild(divNrep);
		for (var m=0; m<infoTree.children.length; m++) {
			showMsgTree(infoTree.children[m], divChildren, (m==infoTree.children.length-1));
		}
		divNode.appendChild(divChildren);
	}
	board.appendChild(divNode);
}

function showNodeLinkTree(infoTree) {
	var diameter = 600;
	var tree = d3.layout.tree()
		.size([360, diameter/2])
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

	var diagonal = d3.svg.diagonal.radial()
		.projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

	var svg = d3.select("#graph").append("svg")
		.attr("width", diameter)
		.attr("height", diameter)
		.append("g")
		.attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

	var nodes = tree.nodes(infoTree),
		links = tree.links(nodes);

	var link = svg.selectAll(".link")
		.data(links)
		.enter().append("path")
		.attr("class", "link")
		.attr("d", diagonal);

	var node = svg.selectAll(".node")
		.data(nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

	node.append("circle")
		.attr("r", 4.5);

	node.append("text")
		.attr("dy", ".31em")
		.attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
		.attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
		.text(function(d) { return d.name; });
	d3.select(self.frameElement).style("height", diameter - 150 + "px");
}






