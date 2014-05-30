var MESES = new Array("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre");

Array.prototype.shuffle = function() {
 	var len = this.length;
	var i = len;
	 while (i--) {
	 	var p = parseInt(Math.random()*len);
		var t = this[i];
  	this[i] = this[p];
  	this[p] = t;
 	};
};

function randomColor() {
	return '#'+Math.floor(Math.random()*16777215).toString(16);
};

function encodeParams(dict) {
	params = "";
	for (var k in dict) {
		params += k + "=" + encodeURI(dict[k]) +"&";
	};
	return params;
};

function dataURItoBlob(dataURI) {
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: mimeString});
};

/* Cuánto tiempo hace que el mensaje fue enviado
	@param date: Date del mensaje
	@param now: Date actual
*/
function getTimeAgo(date, now) {
	var elapsed = (now - date) / 1000;
	if (elapsed<60) {			// menos de 1 minuto
		return Math.round(elapsed) + " s.";
	}
	else if (elapsed<3600) {	// menos de 1 horra
		return Math.round(elapsed/60) + " min.";
	}
	else if (elapsed<86400) {	// menos de 1 día
		return Math.round(elapsed/3600) + " h.";
	}
	return formatDate(date, false);
};

/* Formateo de una fecha */
function formatDate(date, withYear) {
	return date.getDate() + " de " + MESES[date.getMonth()] + (withYear ? (" de " + date.getFullYear()) : "");
};

// Función general de comunicación con el servidor
function apiCall(method, url, data, func) {
	if (method == "GET")
		url = url + "?" + encodeParams(data);
	var req = new XMLHttpRequest();
	req.open((method=="GET") ? "GET" : "POST", url);
	if(method == "POST") {
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
		data = encodeParams(INPARAMS);
	} else if (method == "MULTI") {
		req.setRequestHeader("Content-Type", "multipart/form-data;");
		formData = new FormData();
		for (i in data)
			formData.append(i, data[i]);
		data = formData;
	}
	if (func) {
		req.onreadystatechange = function() {
			if(req.readyState == 4 && req.status == 200) {
				func(req.response);
			};
		};
	};
	req.send(data);
	if (!func) return req.response;
};

/* Comprueba si hay foto de usuario, o devuelve una por defecto */
function checkUserPhoto(path) {
	return path || "img/noimage.png";
};

function fillProfile(user) {
	var urlwebpersonal = user.urlwebpersonal;
	var urlblog = user.urlblog;
	$("#nombre .value").html(user.nombre);
	$("#apellidos .value").html(user.apellidos);
	$("#descripcion .value").html(user.descripcion);
	$("#urlpersonal .value").html(urlwebpersonal.link(urlwebpersonal));
	$("#urlblog .value").html(urlblog.link(urlblog));
};

function fillHeader(user) {
	document.getElementById("user-avatar").setAttribute("src", user.pathfoto);
};

/* Rellenar la lista de usuarios seguidos en el perfil */
function fillFollows(div, users) {
	$(div).find(".follow-counter").text(users.numeroUsuarios);
	for (var u_id in users.perfilesUsuarios) {
		var user = users.perfilesUsuarios[u_id];
		var usera = document.createElement("a");
		usera.href = "http://eskup.elpais.com/" + u_id;
		usera.target = "_blank";
		var userimg = document.createElement("img");
		userimg.src = checkUserPhoto(user.pathfoto);
		userimg.title = u_id;
		userimg.alt = u_id;
		if (user.activo) userimg.className = "online";
		usera.appendChild(userimg);
		div.appendChild(usera);
	};
};

/* Rellenar la lista de temas seguidos en el perfil */
function fillThemes(themes) {
	$divThemes = $("#themes-follow");
	themes = themes.perfilesEventos;
	for (var t in themes) {
		themeID = "ev-"+t;
		var $item = $("<li>")
			.attr("class", "board-selector")
			.attr("id", themeID)
			.text(themes[t].nombre)
			.on("click", function() {
				loadBoard(this.id);
			})
			.appendTo($divThemes);
	};
};

/* Procesamiendo de enlaces a vídeos contenidos en un mensaje */
function processVideos(msg_content) {
// <iframe src="http://player.vimeo.com/video/55351695" width="WIDTH" height="HEIGHT" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>
// <iframe class="youtube-player" type="text/html" width="300" height="auto" src="http://www.youtube.com/embed/JW5meKfy3fY" frameborder="0">
// </iframe>
// <iframe src="http://www.dailymotion.com/embed/video/xl4oyv_sean-paul-feat-alexis-jordan-got-2-luv-u-clip-officiel_music" width="300" height="auto" frameborder="0"></iframe>
	linktext = msg_content.getElementsByTagName("a");
	for (var i=0; i in linktext ; i++)
	{ 
		var rawtext = linktext[i].href;
		viddiv = document.createElement("div");
		viddiv.className = "video";
		if (rawtext.search("www.youtube.com") != -1)
		{
			vidid = rawtext.split("v=")[1].split("&")[0];
			viddiv.innerHTML ='<iframe class="youtube-player" type="text/html" width="345" height="300" src="http://www.youtube.com/embed/' +
				vidid + '" frameborder="0">';
			msg_content.replaceChild(viddiv, linktext[i]);
		}
		if (rawtext.search("vimeo.com") != -1)
		{
			var vimeoreq =  new XMLHttpRequest();
			vimeoreq.open("POST",
				"http://vimeo.com/api/oembed.xml?width=345&url=" + rawtext, 
				false);
			vimeoreq.onreadystatechange = function()
			{
				var vimeoxml = vimeoreq.responseXML;	
				viddiv.innerHTML = vimeoxml.getElementsByTagName("html")[0].childNodes[0].nodeValue;
			};
			vimeoreq.send(null);

			msg_content.replaceChild(viddiv, linktext[i]);
			break;
		}	
		// if (rawtext.search("dailymotion.com/video") != -1)
		// {
		// 	vidid = rawtext.split("dailymotion.com/video/")[1].split("&")[0];
		// 	viddiv = document.createElement("div");
		// 	viddiv.className = "video";
		// 	viddiv.innerHTML ="<object width='345' height='320'><param name='movie' value='http://www.dailymotion.com/swf/video/" + vidid + "'></param><param name='allowFullScreen' value='true'></param></param><embed type='application/x-shockwave-flash' src='http://www.dailymotion.com/swf/video/" + vidid + "' width='345' height='320' allowfullscreen='true' ></embed></object>";		
		// 	msg_content.replaceChild(viddiv, linktext[i]);
		// 	break;
		// }
		// if (rawtext.search("dailymotion.com/swf") != -1)
		// {
		// 	vidid = rawtext.split("dailymotion.com/swf/video")[1].split("#")[0];
		// 	viddiv = document.createElement("div");
		// 	viddiv.className = "video";
		// 	viddiv.innerHTML ="<object width='345' height='320'><param name='movie' value='http://www.dailymotion.com/swf/video/" + vidid + "'></param><param name='allowFullScreen' value='true'></param></param><embed type='application/x-shockwave-flash' src='http://www.dailymotion.com/swf/video/" + vidid + "' width='345' height='320' allowfullscreen='true' ></embed></object>";		
		// 	msg_content.replaceChild(viddiv, linktext[i]);
		// 	break;
		// }		
	}
	//message.replaceChild(linktext, null);	
	//http://www.w3schools.com/Dom/dom_nodes_remove.asp	
};

/* Convertir un objeto en una array, por ejemplo para ordenar luego sus elementos */
function makeArray(obj) {
	var result = [];
	for (k in obj) {
		var val = obj[k];
		val.__key = k;
		result.push(val);
	};
	return result;
};

/* Función que agrega un mensaje a un tablón 
	@param msg: mensaje a agregar
	@param board: tablón que contendrá el mensaje
	@themes: información complementaria (temas)
*/
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
		div_thread.setAttribute("data-thread", msg.hilo);
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
			var themeKey = msgThemes[t];
			var themeData = themeKey.split("-");
			if (themeData[0] == "ev") {
				themesFound = true;
				var themeID = themeData[1];
				var themeInfo = themes[themeID];	// información sobre el tema, de la API
				// BLOQUEDO DE TEMAS:
				// if ((locationid == "todo") && (CheckBlockTema(temaid) != -1)) continue;
				// else msgbloqueado = false;
				// if (CheckSigoTema(temaid) == 1) temali.className = "seguido";					
				// else temali.className = "noseguido";
				var themeName = themeInfo.nombre;
				var $themeElement = $("<li>")
					.attr("data-board", themeKey)
					.text(themeName)
					.on("click", function() {
						loadBoard($(this).attr("data-board"));
					})
					.appendTo($divThemes);
			};
		};
	};
	// Construcción final y agregación
	div_msg.appendChild(dHead);
	div_msg.appendChild(div_cont);
	if (themesFound) $(div_msg).append($divThemes);
	board.appendChild(div_msg);
};

/* Respuesta a un usuario */
function msgReply() {
	$("#replying-message").remove();
	showEditor(true, "respuesta a ");
	var msgDiv = $("#"+this.getAttribute("m_id"))[0];
	$("#editor").before($("<div id='replying-message'></div>").html(msgDiv.outerHTML));
};

/* Eliminación de un mensaje */
function msgDelete() {
	var msgID = this.getAttribute("m_id");
	new ModalDialog("¿Seguro que desea borrar este mensaje?", "", ["Sí", "No"],
		function(result) {
			if (result=="No") return;
			eskupMsgDelete(msgID, function(info) {
				if (info.status=="ok") {
					new ModalDialog("Eliminación correcta",
						"El mensaje ha sido eliminado con éxito, aunque el cambio puede tardar en verse reflejado en los servidores de Eskup.",
						["OK"], null, 2000);
					$("#"+msgID).remove();
				} else {
					new ModalDialog("Se ha producido un error",
						"No ha sido posible eliminar el mensaje. Vuelve a intentarlo de nuevo más tarde.",
						["OK"],
						null,
						2000);
				};
			});
		});
};

/* Cargar usuarios a los que sigo */
function LoadFollowTo(pag) {
	if (typeof pag == "undefined") pag = 1;
	eskupLoadFollowTo(pag, function(users) {
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-to-users"), users);
		LoadFollowTo(pag+1);
	});
};

/* Cargar usuarios que me siguen */
function LoadFollowMe(pag) {
	if (typeof pag == "undefined") pag = 1;
	eskupLoadFollowMe(pag, function(users) {
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-me-users"), users);
		LoadFollowMe(pag+1);
	});
};

/* Carga de mdensajes favoritos */
function loadFavorites() {
	eskupLoadFavorites(function(data) {
		var favs = document.getElementById("board");
		favs.innerHTML = "";
		for (var cont=0, len=data.length; cont<len; cont++) {
			var msg = localStorage.getItem(data[cont]);
			if (msg) appendMsg(JSON.parse(msg), favs);
		};
	});
};

/* Agrega o elimina un mensaje de la lista de favoritos */
function setFavorite() {
	var $favBtn = $(this);
	var m_id = $favBtn.closest('.message').attr("id");	// id del mensaje
	if (!$favBtn.hasClass("on")) {		// marvar favorito
		eskupSetFavorite(m_id, function(status, statusInfo) {
			if (status == 0) {
				new ModalDialog("El mensaje se ha agregado a tus favoritos.", null, [], null, 2000);
				$favBtn.toggleClass('on');
			} else {
				new ModalDialog("Error: No se pudo agregar el mensaje a favoritos.", statusInfo, [], null, 2000);
			};
		});
	} else {						// desmarcar favorito
		new ModalDialog("¿Seguro que desea eliminar este mensaje de sus favoritos?",
			$favBtn.closest(".message")[0].outerHTML,
			["Sí", "Cancelar"], function(result) {
				if (result == "Sí") {
					eskupRemoveFavorite(m_id, function(status, statusInfo) {
						new ModalDialog("El mensaje se ha eliminado de tus favoritos.", null, [], null, 2000);
						$favBtn.toggleClass('on');
						// además lo eliminamos del tablón de favoritos
						if (currentBoard == "favs") {
							$favBtn.closest('.message').fadeOut(function() {
								$(this).remove();
							});
						};
					});
				};
			});
	};
};

/* Carga de una conversación completa */
function loadThread() {
	var threadID = this.getAttribute("data-thread");
	eskupLoadThread(threadID, function(info) {
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

/* Muestra el árbol de mensajes de una conversación */
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
};

/* Visualización de una conversación */
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
};

/* Carga de un tablón de mensajes */
function loadData(board, callback) {
	$("#board").append("<div class='loading'><i class='fa fa-refresh fa-spin'></i>cargando datos...</div>");
	eskupLoadBoard(board, function(info) {
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
