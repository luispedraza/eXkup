var PUBLIC_KEY = "";
var USER_ID = "";

function redirectConfig() {
	window.close();
	chrome.tabs.create({url:"options.html"});
}

function initEskup() {
	PUBLIC_KEY = localStorage["eskupkey"];
	console.log(PUBLIC_KEY);
	if (!PUBLIC_KEY) {
		redirectConfig();
	}	
}
function logOut() {
	localStorage["eskupkey"] = "";
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
function LoadFavs()
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
	var favicons = favs.getElementsByClassName("msg_fav_on");
	for (cont=0; cont<favicons.length; cont++) favicons[cont].onclick = SetMsgFav;
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
function CheckBlockTema(temaid)
{
	for (cont = 0; cont < listatemasblock.length; cont++)
		if (temaid == listatemasblock[cont])
			return cont;
	return -1;
}

// Comprueba si un mensaje está en mis favoritos
function CheckMsgFav(msgid)
{
	for (cont = 0; cont < listamsgfav.length; cont++)
		if (msgid == listamsgfav[cont])
			return cont;
	return -1;
}