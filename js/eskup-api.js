var PUBLIC_KEY = "";
var USER_ID = "";

function redirectConfig() {
	window.close();
	chrome.tabs.create({url:"options.html"});
}

function initEskup() {
	PUBLIC_KEY = localStorage["eskupkey"];
	if (!PUBLIC_KEY) redirectConfig();
}

function logOut() {
	localStorage.removeItem("eskupkey");
	window.close();
}

initEskup();


var TABLONES = {
	mios: "t1-",
	sigo: "2",
	priv: "3",
	todo: "t1-ULTIMOSMENSAJES"
}
function getBoard(id) {
	return (TABLONES.hasOwnProperty(id)) ? (TABLONES[id]) : (id);
}

var INESKUP = "http://eskup.elpais.com/Ineskup";
var INPARAMS = {
	c: "",
	x: "",
	f: "json",
	d: "",
	id: PUBLIC_KEY
}
var OUTESKUP = "http://eskup.elpais.com/Outeskup";
var OUTPARAMS = {
	t: "",			// qué tablon
	nummsg: 12,		// cuántos mensajes
	p: 1,			// qué página
	f: "json",		// formato de respuesta
	th: 1,
	msg: "",
	id: PUBLIC_KEY
}
var PROFILEESKUP = "http://eskup.elpais.com/Profileeskup";
var PROFILEPARAMS = {
	id: PUBLIC_KEY,
	action: "",
	f: "json",
	pag: ""
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
			document.getElementById("board").innerHTML = "";
		}
		else if (ev.type == "scroll") {
			OUTPARAMS.p++;
		}
	}
	apiCall("GET", OUTESKUP, OUTPARAMS, getData);
	function getData(req) {
		info = JSON.parse(req.responseText.replace(/'/g, "\""));
		users = info.perfilesUsuarios;
		messages = info.mensajes;
		div_board = document.getElementById("board");
		for (i in messages) {
			var msg = info.mensajes[i];
			if (msg.borrado) continue;
			var m_id = msg.idMsg;	// ID del mensaje
			var cont = msg.contenido;
			var user = msg.usuarioOrigen;
			var date = msg.tsMensaje;
			// Creación del nuevo mensaje:
			var div_msg = document.createElement("div");
			div_msg.className = "message";
			div_msg.id = m_id;
			// El contenido del mensaje:
			var div_cont = document.createElement("div");
			div_cont.className = "msg_content";
			div_cont.innerHTML = cont;
			processVideos(div_cont);
			if (msg.cont_adicional) {
				var img_cont = document.createElement("img");
				img_cont.src = msg.cont_adicional;
				div_cont.appendChild(img_cont);
			}
			// La cabecera:
			var div_head = document.createElement("div");
			div_head.className = "msg_header";
			div_head.innerHTML = "<b><a target='_blank' href='http://eskup.elpais.com/" + 
				m_id +
				"'>" + 
				user +
				"</a> " + 
				formatDate(date) +
				":</b>";
			div_fav = document.createElement("img");
			div_fav.src = "/icon/star.png";
			div_fav.className = (checkFavorite(m_id)) ? ("favon") : ("favoff");
			div_fav.setAttribute("m_id", m_id);
			div_fav.onclick = setFavorite;
			div_head.appendChild(div_fav);
			// Elementos de control:
			var div_ctrl = document.createElement("div");
			div_ctrl.className = "msg_control";
			var img_user = document.createElement("img");
			img_user.src = users[user].pathfoto;
			var a_reply = document.createElement("a");
			a_reply.innerText = "responder";
			a_reply.addEventListener("click", msgReply);
			var a_fwd = document.createElement("a");
			a_fwd.innerText = "reenviar";
			a_fwd.addEventListener("click", msgForward);
			var a_del = document.createElement("a");
			a_del.innerText = "borrar";
			a_del.setAttribute("m_id", m_id);
			a_del.addEventListener("click", msgDelete);
			div_ctrl.appendChild(img_user);
			div_ctrl.appendChild(a_reply);
			div_ctrl.appendChild(a_fwd);
			div_ctrl.appendChild(a_del);
			// Hilos de mensajes
			if (msg.idMsgRespuesta) {
				var div_reply = document.createElement("div");
				div_reply.className = "reply2link";
				div_reply.innerText = "respuesta a " + msg.autorMsgRespuesta;
				div_cont.appendChild(div_reply);

				var div_thread = document.createElement("div");
				div_thread.className = "thlink";
				div_thread.innerText = "sigue el hilo";
				div_thread.setAttribute("thread", msg.hilo);
				div_thread.onclick = showThread;
				div_cont.appendChild(div_thread);
			}
			// Construcción final y agregación
			div_msg.appendChild(div_head);
			div_msg.appendChild(div_cont);
			div_msg.appendChild(div_ctrl);
			div_board.appendChild(div_msg);
		}
	}
}

function msgReply() {

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
		if (!info) {
			redirectConfig();
			return;
		}
		perfiles = JSON.parse(req.responseText.replace(/'/g, "\"")).perfilesUsuarios;
		for (var u in perfiles) {
			USER_ID = u;
			TABLONES["mios"] = "t1-" + USER_ID;
			var usuario = perfiles[u];
		}
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
	INPARAMS.c = "add";
	INPARAMS.m = NEWMESSAGE.innerHTML;
	INPARAMS.t = "";
	method = "";
	var tt_check = document.getElementById("send2tt");
	var fb_check = document.getElementById("send2fb");
	if (tt_check.checked) {
		if (fb_check.checked) {
			INPARAMS.d = "1|2";
			console.log("tt y fb");
		}
		else {
			INPARAMS.d = "1";
			console.log("tt");
		}
	}
	else if (fb_check.checked) {
		INPARAMS.d = "2";
		console.log("tt");
	}
	newimg = document.getElementById("canvasimage");
	if (newimg.width) {
		INPARAMS.p = dataURItoBlob(newimg.toDataURL("image/jpeg", 0.8));
		method = "MULTI";
	}
	else {
		method = "POST";
	}
	apiCall(method, INESKUP, INPARAMS, function(result) {
		console.log(result);
	});
	NEWMESSAGE.innerHTML="";
	INPARAMS.c = "";
	INPARAMS.m = "";
	INPARAMS.d = "";
	INPARAMS.t = "";
	INPARAMS.p = "";
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

function setFavorite(ev) {
	var target = ev.target;
	m_id = target.getAttribute("m_id");
	if (target.className == "favon") {
		target.className = "favoff";
		localStorage.removeItem(m_id);
		listamsgfav.splice(listamsgfav.indexOf(m_id), 1);
		
	} else {
		target.className = "favon";
		listamsgfav.push(m_id);
		localStorage[m_id] = document.getElementById(m_id).innerHTML;
	}
	localStorage["msg_fav"] = JSON.stringify(listamsgfav);
}

function showThread(ev) {
	threadId = ev.target.getAttribute("thread");
	OUTPARAMS.msg = threadId;
	apiCall("GET", OUTESKUP, OUTPARAMS, getThread);
	function getThread(req) {
		document.getElementById("board").innerHTML = "";
		info = JSON.parse(req.responseText.replace(/'/g, "\""));
		console.log(info);
		var infoTree = new Object();
		infoTree.id = threadId;
		infoTree.children = [];
		function addNode(node, parent, tree) {
			if (tree.id == parent) tree.children.push(node)
			else for (var n=0; n<tree.children.length; n++)
				addNode(node, parent, tree.children[n]);
		}
		for (var m=0; m<info.mensajes.length; m++) {
			var node = new Object();
			node.id = info.mensajes[m].idMsg;
			node.children = [];
			parentId = info.mensajes[m].idMsgRespuesta;
			addNode(node, parentId, infoTree);
		}
		console.log(infoTree);
		//var tree = d3.layout.tree().size(500, 100);
		var diameter = 960;
		
		var tree = d3.layout.tree()
		.size([360, diameter / 2 - 120])
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

		var diagonal = d3.svg.diagonal.radial()
		.projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

		var svg = d3.select("body").append("svg")
		.attr("width", diameter)
		.attr("height", diameter - 150)
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
}







