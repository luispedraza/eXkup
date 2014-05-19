var PUBLIC_KEY = "";
var USER_ID = "";
var INESKUP = "http://eskup.elpais.com/Ineskup";
var INPARAMS = {
	m: "",			// Contenido del mensaje (c=add|reply|edit, ignorado con c=del)
	c: "",			// add, del, edit, reply
	t: "",			// Destino *tema1|*tema2|nick1|nick2 
	x: "",			// Extra. (c=add)?(id fwd), (c=del)?(id del), (c=edit)?(id edit), (c=reply)?(id reply)
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
	nummsg: 12,		// cuántos mensajes
	p: 1,			// qué página
	f: "json",		// formato de respuesta
	th: 1,
	msg: "",
	id: ""
}
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
		doc.documentElement.innerHTML = r.responseText;
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
}

function logOut() {
	apiCall("GET", "http://www.elpais.com/clientes2/desconectar.html", null);
	window.close();
}

var TABLONES = {
	mios: "t1-",
	sigo: "2",
	priv: "3",
	todo: "t1-ULTIMOSMENSAJES"
}
function getBoard(id) {
	return (TABLONES.hasOwnProperty(id)) ? (TABLONES[id]) : (id);
}

/////////////////////////////////////////////////////////////////////////////
// Tablón de mensajes ///////////////////////////////////////////////////////
// ej.: http://eskup.elpais.com/Outeskup?t=2&f=json&id=7gTvFkSaO-pa0342AjhqMg
function loadData(ev) {
	if (ev) {
		if (ev.type == "click") {
			board = getBoard(ev.target.id);
			if (board == OUTPARAMS.t)
				return;
			OUTPARAMS.t = board;
			OUTPARAMS.p = 1;
			OUTPARAMS.th = "";
			OUTPARAMS.msg = "";
			document.getElementById("board").innerHTML = "";
		}
		else if (ev.type == "scroll") {
			OUTPARAMS.p++;
		}
	}
	apiCall("GET", OUTESKUP, OUTPARAMS, getData);
	function getData(req) {
		var info = JSON.parse(req.responseText.replace(/'/g, "\""));
		var users = info.perfilesUsuarios;
		var messages = info.mensajes;
		var board = document.getElementById("board");
		board.style.left = 0;
		document.getElementById("tree-board").style.left = "450px";
		for (var i=0; i<messages.length; i++) {
			var msg = info.mensajes[i];
			msg.pathfoto = checkUserPhoto(users[msg.usuarioOrigen].pathfoto);
			if (msg.borrado) continue;
			appendMsg(msg, board);
		}
	}
}

function appendMsg(msg, board) {
	var m_id = msg.idMsg;	
	var user = msg.usuarioOrigen;
	var date = msg.tsMensaje;
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
	var a_user = document.createElement("a");
	a_user.href = "http://eskup.elpais.com/"+user;
	a_user.target="_blank";
	a_user.appendChild(img_user);
	dHead.appendChild(a_user);
	var from = document.createElement("a");
	from.href = "http://eskup.elpais.com/" + user;
	from.innerText = user;
	dHead.innerHTML += "Por " + from.outerHTML;
	dHead.innerHTML += formatDate(date).bold();
	// Elementos de control:
	var dCtrl = document.createElement("div");
	dCtrl.className = "msg_control";
	// Guardar vavorito
	var dFav = document.createElement("div");
	dFav.className = (checkFavorite(m_id) ? "btn favoff" : "btn favon");
	dFav.title = (checkFavorite(m_id) ? "-fav" : "+fav");
	dFav.setAttribute("m_id", m_id);
	dFav.addEventListener("click", setFavorite);
	// Respuesta
	var dReply = document.createElement("div");
	dReply.className = "btn reply";
	dReply.title = "responder";
	dReply.setAttribute("m_id", m_id);
	dReply.addEventListener("click", msgReply);
	// Forward
	var dFwd = document.createElement("div");
	dFwd.className = "btn fwd";
	dFwd.title = "reenviar";
	dFwd.addEventListener("click", msgForward);
	dCtrl.appendChild(dFav);
	dCtrl.appendChild(dReply);
	dCtrl.appendChild(dFwd);

	// Hilos de mensajes
	if (msg.idMsgRespuesta) {
		var div_reply = document.createElement("div");
		div_reply.className = "reply2link";
		div_reply.innerText = "Respondiendo a " + msg.autorMsgRespuesta + " ";
		dHead.innerHTML += div_reply.outerHTML;
		var div_thread = document.createElement("div");
		div_thread.className = "btn thlink";
		div_thread.title = "sigue el hilo";
		div_thread.setAttribute("thread", msg.hilo);
		div_thread.addEventListener("click", loadThread);
		dCtrl.appendChild(div_thread);
	}
	if (user == USER_ID) {
		var dDel = document.createElement("div");
		dDel.className = "btn";
		dDel.innerText = "borrar";
		dDel.setAttribute("m_id", m_id);
		dDel.addEventListener("click", msgDelete);
		dCtrl.appendChild(dDel);
	}
	dHead.appendChild(dCtrl);
	// Construcción final y agregación
	div_msg.appendChild(dHead);
	div_msg.appendChild(div_cont);
	board.appendChild(div_msg);
}

function msgReply(e) {
	showEditor();
	var mId = e.target.getAttribute("m_id");
	var msgDiv = document.getElementById(mId);
	msgDiv.scrollIntoView();
	msgDiv.className += " on";
}
function msgForward() {

}
function msgDelete() {
	var m_id = this.getAttribute("m_id");
	INPARAMS.c = "del";
	INPARAMS.x = m_id;
	showDialog("¿Seguro que desea borrar el mensaje?",
		m_id,
		function(ok) {
			if (ok) {
				apiCall("GET", INESKUP, INPARAMS, function(req){
					var info = JSON.parse(req.responseText.replace(/'/g, "\""));
					if (info.status=="ok") {
						showDialog("Éxito en la operación",
							"El mensaje ha sido eliminado con éxito, aunque el cambio puede tardar en verse reflejado en los servidores de Eskup.");
						var node2remove = document.getElementById(m_id);
						var nodeparent = node2remove.parentNode;
						nodeparent.removeChild(node2remove);
					} else showDialog("Error en la operación",
							"No ha sido posible eliminar el mensaje. Vuelve a intentarlo de nuevo más tarde.");
				});
			}
			else {
				INPARAMS.c = "";
				INPARAMS.x = "";
			}
		})
}
//////////////////////////
// Información de usuario
// ej: http://eskup.elpais.com/Profileeskup?action=info_usuarios&f=xml&id=7gTvFkSaO-pa0342AjhqMg
//////////////////////////
function loadProfile() {
	PROFILEPARAMS.action = "info_usuarios";
	apiCall("GET", PROFILEESKUP, PROFILEPARAMS, getProfile);
	function getProfile(req)
	{
		var info = req.responseText;
		perfiles = JSON.parse(req.responseText.replace(/'/g, "\"")).perfilesUsuarios;
		for (var u in perfiles) {
			USER_ID = u;
			TABLONES["mios"] = "t1-" + USER_ID;
			var usuario = perfiles[u];
		}
		fillHeader(usuario);
		fillProfile(usuario);
		LoadFollowTo();
		LoadFollowMe();
		LoadThemes();
	};
}

/////////////////////////
// Los temas que sigo 
// ej.: http://eskup.elpais.com/Profileeskup?action=list_eventos&f=json&id=7gTvFkSaO-pa0342AjhqMg
/////////////////////////
function LoadThemes()
{
	PROFILEPARAMS.action = "list_eventos";
	apiCall("GET", PROFILEESKUP, PROFILEPARAMS, getThemesInfo);
	function getThemesInfo(req)
	{
		var themes = JSON.parse(req.responseText.replace(/\\/g, ""));
		if (!themes) return;
		fillThemes(themes);
	}
}

///////////////////////
// ¿A quiénes sigo?
// ej: http://eskup.elpais.com/Profileeskup?action=list_usuarios&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
///////////////////////
function LoadFollowTo(pag)
{
	if (!pag) pag = 1;
	PROFILEPARAMS.action="list_usuarios";
	PROFILEPARAMS.pag = pag;
	apiCall("GET", PROFILEESKUP, PROFILEPARAMS, getFTInfo);
	function getFTInfo(req)
	{
		var users = JSON.parse(req.responseText);
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-to-users"), users);
		LoadFollowTo(pag+1);
	}
}

////////////////////////////
// ¿Quiénes me siguen?
// // ej: http://eskup.elpais.com/Profileeskup?action=list_seguidores&f=xml&pag=1&id=7gTvFkSaO-pa0342AjhqMg
////////////////////////////
function LoadFollowMe(pag)
{
	if (!pag) pag = 1;
	PROFILEPARAMS.action="list_seguidores";
	PROFILEPARAMS.pag = pag;
	apiCall("GET", PROFILEESKUP, PROFILEPARAMS, getFMInfo);
	function getFMInfo(req)
	{
		var users = JSON.parse(req.responseText);
		if (!users) return;
		if (users.pagina != pag) return;
		fillFollows(document.getElementById("follow-me-users"), users);
		LoadFollowMe(pag+1);
	}
}

//////////////////////////////
// Carga mensajes favoritos
//////////////////////////////
function loadFavs()
{
	var favs = document.getElementById("board");
	favs.innerHTML = "";
	for (cont=0; cont < listamsgfav.length; cont++)
	{
		var newfav = document.createElement("div");
		newfav.className = "message";
		if (localStorage[listamsgfav[cont]]) {
			newfav.innerHTML = localStorage[listamsgfav[cont]];
			favs.appendChild(newfav);
		}
	}
	var favicons = favs.getElementsByClassName("favon");
	for (cont=0; cont<favicons.length; cont++) favicons[cont].onclick = setFavorite;
}


function Update()
{
	var api = new InEskup();
	api.dat.c = "add";
	api.dat.m = NEWMESSAGE.innerHTML;
	var tt_check = document.getElementById("send2tt");
	var fb_check = document.getElementById("send2fb");
	if (tt_check.checked) {
		if (fb_check.checked) api.dat.d = "1|2";
		else api.dat.d = "1";
	}
	else if (fb_check.checked) api.dat.d = "2";
	newimg = document.getElementById("canvasimage");
	if (newimg && newimg.width) {
		api.dat.p = dataURItoBlob(newimg.toDataURL("image/jpeg", 0.8));
		api.m = "MULTI";
	}
	else {
		api.m = "POST";
	}
	apiCall(api.m, api.url, api.dat, function(result) {
		console.log(result);
	});
	NEWMESSAGE.innerHTML="";
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
function checkFavorite(msgid)
{
	return (listamsgfav.indexOf(msgid) >= 0);
}

/* Agrega o elimina un mensaje de la lista de favoritos */
function setFavorite(ev) {
	var target = ev.target;
	m_id = target.getAttribute("m_id");
	console.log(m_id);
	if (target.className.match("favon")) {
		target.className.replace("favon", "favoff");
		target.title = "+fav"
		localStorage.removeItem(m_id);
		listamsgfav.splice(listamsgfav.indexOf(m_id), 1);
		
	} else {
		target.className.replace("favoff", "favon");
		target.title = "-fav";
		listamsgfav.push(m_id);
		localStorage[m_id] = document.getElementById(m_id).innerHTML;
	}
	localStorage["msg_fav"] = JSON.stringify(listamsgfav);
}

// http://eskup.elpais.com/Outeskup?t=&nummsg=12&p=&f=json&th=1&msg=1356611973-8fe6c2d09824c9e5523f9931a834a641&id=7gTvFkSaO-pa0342AjhqMg&
function loadThread(ev) {
	console.log("cargando thread");
	var threadId = ev.target.getAttribute("thread");
	OUTPARAMS.msg = threadId;
	OUTPARAMS.th = 1;
	OUTPARAMS.t = "";
	OUTPARAMS.p = "";
	apiCall("GET", OUTESKUP, OUTPARAMS, getThread);
	function getThread(req) {
		info = JSON.parse(req.responseText.replace(/'/g, "\""));
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
			node.pathfoto = checkUserPhoto(info.perfilesUsuarios[node.usuarioOrigen].pathfoto);
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
	}
}

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






