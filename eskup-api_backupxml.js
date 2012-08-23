// Mi código para Eskup
// nota: http://www.w3schools.com/dom/dom_nodes_get.asp
// nota: http://www.w3schools.com/DOM/dom_nodelist.asp
// nota: http://www.barelyfitz.com/projects/tabber/
// nota: https://developer.mozilla.org/En/Using_XMLHttpRequest
// nota: http://bassistance.de/jquery-plugins/jquery-plugin-treeview/
// nota: http://www.nsftools.com/misc/SearchAndHighlight.htm
// nota: https://developer.mozilla.org/En/DragDrop/Drag_Operations

var my_id = null;
var xmlsigo;
var xmlmios;
var xmlmyinfo;
var xmlprivado;
var xmltodos;
var nummsg = 12;
var nummsgCargados = 0;	// esto es necesario en caso de que al no cargar mensajes de temas bloqueados, se muestren demasiado pocos

var numpagsigo = 1; // página actual de los mensajes de usuarios y temas que sigo
var numpagprvd = 1;	// página actual de mensajes privados
var numpagtodo = 1;
var numpagmios = 1;
var numpagtema = 1;
var temaactual = "";
var listatemas = new Array();	// lista de temas que sigo en Eskup
var listamsgfav = new Array();	// lista de temas favoritos que se almacena en localStorage
var listatemasblock = new Array();	// lista de temas bloqueados en la pestaña "todo"
var listatemasblockN = new Array();	// nombres de temas bloqueados en la pestaña "todo"

if (typeof(localStorage["msg_fav"]) != "undefined") listamsgfav = JSON.parse(localStorage["msg_fav"]);

var maxchar = 280;
var twitter = 0;
var facebook = 0;

var publickey = localStorage["eskupkey"];
window.onload = function() {	
	divmios = document.getElementById("mios");
	divmios.onscroll = function() {
		if (divmios.scrollTop+400 >= divmios.scrollHeight)
		{
			numpagmios++;
			LoadXmlData("mios");
		}
	}
	divsigo = document.getElementById("sigo");
	divsigo.onscroll = function() {
		if (divsigo.scrollTop+400 >= divsigo.scrollHeight)
		{
			numpagsigo++;
			LoadXmlData("sigo");
		}
	}
	divprv = document.getElementById("privado");
	divprv.onscroll = function() {
		if (divprv.scrollTop+400 >= divprv.scrollHeight)
		{
			numpagprvd++;
			LoadXmlData("privado");
		}
	}
	divtodo = document.getElementById("todo");
	divtodo.onscroll = function() {
		if (divtodo.scrollTop+400 >= divtodo.scrollHeight)
		{
			numpagtodo++;
			LoadXmlData("todo");
		}
	}	
	divtema = document.getElementById("tema");
	divtema.onscroll = function() {
		if (divtema.scrollTop+400 >= divtema.scrollHeight)
		{		
			numpagtema++;
			LoadXmlData("tema", "ev-" + temaactual);
		}
	}	
	LoadTemasBlock();
}

////////////////////////////////////////////////////////////////////////////////////////
// Obtengo mi propia información de usuario
////////////////////////////////////////////////////////////////////////////////////////
var profileAPI = "http://eskup.elpais.com/Profileeskup";
var eskuprequser =  new XMLHttpRequest();
eskuprequser.open("GET", profileAPI + 
	"?action=info_usuarios&f=xml&id=" + publickey, 
	true);
eskuprequser.onreadystatechange = function getMyInfo()
{
	xmlmyinfo = eskuprequser.responseXML;
	if (xmlmyinfo == null)
	{
		// mostrar mensaje de petición de login
		document.getElementById("login_message").style.display = "block";
		document.getElementById("main").style.display = "none";
	}
	else
	{
		// ocultar mensaje de petición de login
		document.getElementById("login_message").style.display = "none";
		document.getElementById("main").style.display = "block";
		var nodousuario = xmlmyinfo.getElementsByTagName("perfilesUsuarios")[0].childNodes[0];
		my_id = nodousuario.nodeName;
		var pathphoto = nodousuario.getElementsByTagName("pathfoto")[0].childNodes[0].nodeValue;
		var nombre = nodousuario.getElementsByTagName("nombre")[0].childNodes[0].nodeValue;
		var apellidos = nodousuario.getElementsByTagName("apellidos")[0].childNodes[0].nodeValue;
		var descripcion = nodousuario.getElementsByTagName("descripcion")[0].childNodes[0].nodeValue;
		var urlwebpersonal = nodousuario.getElementsByTagName("urlwebpersonal")[0].childNodes[0].nodeValue;
		document.getElementById("nombre").innerHTML = "Nombre: "+ nombre;
		document.getElementById("apellidos").innerHTML = "Apellidos: "+ apellidos;		
		document.getElementById("urlpersonal").innerHTML = "P&aacute;gina web: " + "<a href='" + urlwebpersonal + "' target='_blank'>" + urlwebpersonal + "</a>";
		document.getElementById("descripcion").innerHTML = "Sobre m&iacute;: "+ descripcion;
		document.getElementById("mifoto").innerHTML = "<img src='" + pathphoto + "' />";
		LoadFollowTo();
		LoadFollowMe();
		LoadTemas();
		// Una vez obtenida mi info de usuario puedo cargar el resto de datos :)
		LoadXmlData("completo");
		LoadFavs();
	}
};
eskuprequser.send(null);

// Los temas que sigo 
function LoadTemas(pag)
{
	if (pag == null) pag = 1;
	var eskupreqtemas =  new XMLHttpRequest();
	eskupreqtemas.open("GET",
						 "http://eskup.elpais.com/Profileeskup?action=list_eventos&f=xml&pag=" + pag + "&id=" + publickey, 
						 true);
	eskupreqtemas.onreadystatechange = function getTemasInfo()
	{		
		var xmltemas = eskupreqtemas.responseXML;
		if (xmltemas == null) return;
		//if (xmltemas.getElementsByTagName("pagina")[0].firstChild.nodeValue != pag)	return;
		divtemas = document.getElementById("temas_lista");	
		var temas = xmltemas.getElementsByTagName("perfilesEventos")[0];
		var nombre = xmltemas.getElementsByTagName("nombre");
		var descripcion = xmltemas.getElementsByTagName("descripcion");		
		for (var cont=0; cont in nombre; cont++)
		{
			var temaid = temas.childNodes[cont].nodeName;
			listatemas.push(temaid);
			temaid = "ev-" + temaid;
 			var temaitem = document.createElement("li");
			var temalink = document.createElement("a");
			temalink.href = "javascript:LoadXmlData('tema', '" + temaid + "', '" + nombre[cont].textContent + "')";
			temalink.innerHTML = nombre[cont].textContent;
			temaitem.appendChild(temalink);
			divtemas.appendChild(temaitem);			
		}
		LoadFollowTo(pag+1);
	}
	eskupreqtemas.send(null);
}
// Comprueba si sigo un tema
function CheckSigoTema(temaid)
{
	for (cont = 0; cont < listatemas.length; cont++)
	{
		if (temaid == listatemas[cont])
		{
			return 1;		
		}
	}
	return 0;
}
// Comprueba si he bloqueado un tema
function CheckBlockTema(temaid)
{
	for (cont = 0; cont < listatemasblock.length; cont++)
	{
		if (temaid == listatemasblock[cont])
		{
			return cont;		
		}
	}
	return -1;
}

// Comprueba si un mensaje está en mis favoritos
function CheckMsgFav(msgid)
{
	for (cont = 0; cont < listamsgfav.length; cont++)
	{
		if (msgid == listamsgfav[cont])
		{
			return cont;		
		}
	}
	return -1;
}


////////////////////////////////////////////////////////////////////////////////////////
// ¿A quiénes sigo?
////////////////////////////////////////////////////////////////////////////////////////
function LoadFollowTo(pag)
{
	if (pag == null) pag = 1;
	var eskupreqfollowto =  new XMLHttpRequest();
	eskupreqfollowto.open("GET",
						 "http://eskup.elpais.com/Profileeskup?action=list_usuarios&f=xml&pag=" + pag + "&id=" + publickey, 
						 true);
	eskupreqfollowto.onreadystatechange = function getFTInfo()
	{		
		var xmlfollowto = eskupreqfollowto.responseXML;
		if (xmlfollowto == null) return;
		if (xmlfollowto.getElementsByTagName("pagina")[0].firstChild.nodeValue != pag) return;
		var divfollowto = document.getElementById("followto");
		var perfiles = xmlfollowto.getElementsByTagName("perfilesUsuarios")[0];
		var pathphotos = xmlfollowto.getElementsByTagName("pathfoto");
		var activos = xmlfollowto.getElementsByTagName("activo");
		var nusers = xmlfollowto.getElementsByTagName("numeroUsuarios")[0].textContent;
		document.getElementById("followto_n").innerHTML = nusers;
		for (var cont=0; cont in perfiles.childNodes; cont++)
		{
			var nodousuario = perfiles.childNodes[cont];
			userid = nodousuario.nodeName;							
			var useritem = document.createElement("div");
			if (activos[cont].childNodes[0].nodeValue == 1)
			{
				useritem.className = "followitem1";
			}
			else
			{
				useritem.className = "followitem2";
			}
			var usera = document.createElement("a");
			var userimg = document.createElement("img");
			userimg.src = CheckUserPhoto(pathphotos[cont].childNodes[0].nodeValue);				
			useritem.title = userid;
			useritem.alt = userid;
			usera.href = "http://eskup.elpais.com/" + userid;
			usera.target = "_blank";
			usera.draggable = "false";
			usera.appendChild(userimg);
			useritem.appendChild(usera);
			userimg.draggable = "true";
			userimg.ondragstart="event.dataTransfer.setData('text/plain', 'informacion transmitida')";
			divfollowto.appendChild(useritem);
		}
		LoadFollowTo(pag+1);
	}
	eskupreqfollowto.send(null);
}


////////////////////////////////////////////////////////////////////////////////////////
// ¿Quiénes me siguen?
////////////////////////////////////////////////////////////////////////////////////////
function LoadFollowMe(pag)
{
	if (pag == null) pag = 1;
	var eskupreqfollowme =  new XMLHttpRequest();
	eskupreqfollowme.open("GET",
						 "http://eskup.elpais.com/Profileeskup?action=list_seguidores&f=xml&pag=" + pag + "&id=" + publickey, 
						 true);
	eskupreqfollowme.onreadystatechange = function getFMInfo()
	{
		var xmlfollowme = eskupreqfollowme.responseXML;
		if (xmlfollowme == null) return;
		if (xmlfollowme.getElementsByTagName("pagina")[0].firstChild.nodeValue != pag) return;
		var divfollowme = document.getElementById("followme");
		var perfiles = xmlfollowme.getElementsByTagName("perfilesUsuarios")[0];
		var activos = xmlfollowme.getElementsByTagName("activo");
		var nusers = xmlfollowme.getElementsByTagName("numeroUsuarios")[0].textContent;
		document.getElementById("followme_n").innerHTML = nusers;
		for (var cont=0; cont in perfiles.childNodes; cont++)
		{
			var nodousuario = perfiles.childNodes[cont];
			userid = nodousuario.nodeName;
			var pathphoto = nodousuario.getElementsByTagName("pathfoto")[0].childNodes[0].nodeValue;
			var useritem = document.createElement("div");
			if (activos[cont].childNodes[0].nodeValue == 1)
			{
				useritem.className = "followitem1";
			}
			else
			{
				useritem.className = "followitem2";
			}
			var usera = document.createElement("a");
			var userimg = document.createElement("img");
			userimg.src = CheckUserPhoto(pathphoto);		
			useritem.title = userid;
			useritem.alt = userid;
			usera.href = "http://eskup.elpais.com/" + userid;
			usera.target = "_blank";
			usera.appendChild(userimg);
			useritem.appendChild(usera);
			divfollowme.appendChild(useritem);
		}
		LoadFollowMe(pag+1);
	}
	eskupreqfollowme.send(null);
}
	
	
function LoadFavs()
{
	var location = document.getElementById("favs");
	location.innerHTML = "";
	for (cont=0; cont < listamsgfav.length; cont++)
	{
		var divmsgfav = document.createElement("div");
		divmsgfav.className = "message";
		if (typeof(localStorage[listamsgfav[cont]]) != "undefined") 
		{
			divmsgfav.innerHTML = localStorage[listamsgfav[cont]];
			location.appendChild(divmsgfav);
		}
	}
	var favicons = location.getElementsByClassName("msg_fav_on");
	for (cont=0; cont<favicons.length; cont++) favicons[cont].onclick = SetMsgFav;
}

function LoadXmlData(iddata, temaid, temanombre)
{
	if (iddata == "completo")
	{
		LoadXmlData("sigo");
		LoadXmlData("privado");
		LoadXmlData("todo");
		LoadXmlData("mios");
		return;
	}
	var tablon;
	var numpag;	
	switch (iddata)
	{
		case "sigo":
			tablon = "2";
			numpag = numpagsigo;
			break;
		case "privado":
			tablon = "3";
			numpag = numpagprvd;
			break;
		case "todo":
			tablon = "t1-ULTIMOSMENSAJES";
			numpag = numpagtodo;
			break;
		case "mios":
			tablon = "t1-" + my_id;
			numpag = numpagmios;
			break;
		case "tema":
		tablon = temaid;
		temaid = temaid.replace("ev-", "");
			if (temaid != temaactual)
			{
				numpagtema = 1;
				temaactual = temaid;
				document.getElementById("tema").innerHTML = "";
			}
			if (temanombre != null)
			{
				document.getElementById("tema_actual").innerHTML = temanombre;
				document.getElementById("tema_actual").href= "http://eskup.elpais.com/*" + temaid;
				var seguiropcion = document.getElementById("seguiropcion");
				if (CheckSigoTema(temaid) == 1)
				{
					seguiropcion.innerHTML = "<img src='img/seguido.png' />";					
					seguiropcion.title = "Dejar de seguirlo";
					seguiropcion.href = "javascript:SeguirOff('" + temaid + "')";
				}
				else
				{
					seguiropcion.innerHTML = "<img src='img/noseguido.png' />";					
					seguiropcion.title = "Quiero seguirlo";
					seguiropcion.href = "javascript:SeguirOn('" + temaid + "')";
				}
				var blockopcion = document.getElementById("blockopcion");
				if (CheckBlockTema(temaid) != -1)
				{
					blockopcion.innerHTML = "<img src='img/block_on.png' />";
					blockopcion.title = "Desbloquear tema";
					blockopcion.href = "javascript:BlockOff('" + temaid + "', '" + temanombre + "')";			
				}
				else
				{				
					blockopcion.innerHTML = "<img src='img/block_off.png' />";
					blockopcion.title = "Bloquear tema";
					blockopcion.href = "javascript:BlockOn('" + temaid + "', '" + temanombre + "')";					
				}
			}
			numpag = numpagtema;
			document.getElementById("temas_lista").style.display = "none";
			document.getElementById("temas_block_lista").style.display = "none";
			document.getElementById('tabber').tabber.tabShow(4);
			break;			
		default:
			alert('El tablón solicitado no existe');
	}
	var eskupreq = new XMLHttpRequest();
	eskupreq.open("GET",
		"http://eskup.elpais.com/Outeskup?t=" + tablon + "&nummsg=" + nummsg +  "&p=" + numpag + "&f=xml" + "&id=" + publickey, 
		true);
	eskupreq.onreadystatechange = function getOutEskupXMLdata()
	{
		var xmldata = eskupreq.responseXML;
		if (xmldata)
			showOutEskup(xmldata, iddata);
	};	
	eskupreq.send(null);	
};


function SeguirOn (id)
{
	if (!confirm('¿Está seguro de querer seguir este tema?')) return;
	var req =  new XMLHttpRequest();
	req.open("GET",
			 "http://eskup.elpais.com/Profileeskup?action=add_eventos&data=" + id + "&id=" + publickey, 
						 true);
	req.onreadystatechange = function SeguirOnResult()
	{	
		var seguiropcion = document.getElementById("seguiropcion");
		seguiropcion.innerHTML = "<img src='img/seguido.png' />";
		seguiropcion.title = "Dejar de seguirlo";
		seguiropcion.href = "javascript:SeguirOff('" + id + "')";
	}
	req.send(null);
}

function SeguirOff (id)
{
	if (!confirm('¿Está seguro de querer dejar de seguir este tema?')) return;
	var req =  new XMLHttpRequest();
	req.open("GET",
			 "http://eskup.elpais.com/Profileeskup?action=del_eventos&data=" + id + "&id=" + publickey, 
						 true);
	req.onreadystatechange = function SeguirOffResult()
	{	
		var seguiropcion = document.getElementById("seguiropcion");
		seguiropcion.innerHTML = "<img src='img/noseguido.png' />";
		seguiropcion.title = "Quiero seguirlo";
		seguiropcion.href = "javascript:SeguirOn('" + id + "')";
	}
	req.send(null);
}

function BlockOn (id, name)
{
	if (!confirm('¿Está seguro de querer bloquear este tema? Sus mensajes no se mostrarán más en la pestaña TODO')) return;
	if (CheckBlockTema(id) == -1)
	{
		listatemasblock.push(id);
		listatemasblockN.push(name);
		var blockopcion = document.getElementById("blockopcion");
		blockopcion.href = "javascript:BlockOff('" + id + "', '" + name + "')";			
		blockopcion.innerHTML = "<img src='img/block_on.png' />";
		blockopcion.title = "Desbloquear tema";
		localStorage["temas_block"] = JSON.stringify(listatemasblock);
		localStorage["temas_blockN"] = JSON.stringify(listatemasblockN);
		LoadTemasBlock();
	}
}

function BlockOff (id, name)
{
	if (!confirm('¿Está seguro de querer dejar de bloquear este tema? Sus mensajes volverán a mostrarse en la pestaña TODO')) return;
	listatemasblock.splice(CheckBlockTema(id), 1);
	listatemasblockN.splice(CheckBlockTema(id), 1);
	var blockopcion = document.getElementById("blockopcion");
	blockopcion.href = "javascript:BlockOn('" + id + "', '" + name + "')";			
	blockopcion.innerHTML = "<img src='img/block_off.png' />";
	blockopcion.title = "Bloquear tema";
	localStorage["temas_block"] = JSON.stringify(listatemasblock);
	localStorage["temas_blockN"] = JSON.stringify(listatemasblockN);
	LoadTemasBlock();
}

// Carga de localStorage mis temas blockeados
function LoadTemasBlock ()
{
	if (typeof(localStorage["temas_block"]) != "undefined")
	{
		listatemasblock = JSON.parse(localStorage["temas_block"]);
		listatemasblockN = JSON.parse(localStorage["temas_blockN"]);
		divtemasblock = document.getElementById("temas_block_lista");
		divtemasblock.innerHTML = "";
		for (var cont=0; cont < listatemasblock.length; cont++)
		{
			var temaitem = document.createElement("li");			
			var temalink = document.createElement("a");
			var temaid = listatemasblock[cont];
			var evento = "ev-" + temaid;
			temalink.href = "javascript:LoadXmlData('tema', '" + evento + "', '" + temaid + "')";
			temalink.innerHTML = listatemasblockN[cont];
			temaitem.appendChild(temalink);
			divtemasblock.appendChild(temaitem);			
		}
	}
}
/////////////////////////////////////////////////////////////////
// Reenvío de un mensaje
/////////////////////////////////////////////////////////////////
function Resend(user, idmsg, content)
{
	var resendtxt = document.getElementById("new_text");
	resendtxt.value = "fwd @" + user + " " + content
		.replace(/(<([^>]+)>)/ig,"")
		.replace(/&aacute;/ig, 'á')
		.replace(/&eacute;/ig, 'é')
		.replace(/&iacute;/ig, 'í')
		.replace(/&oacute;/ig, 'ó')
		.replace(/&uacute;/ig, 'ú') + " ";
	extra = idmsg;
	command = "add";
	replytext.focus();
};

// Respuesta a un mensaje
function Reply(user, idmsg, prv)
{
	var replytxt = document.getElementById("new_text");
	replytxt.value = "@" + user + " ";
	extra = idmsg;
	command = "reply";
	if (prv) tablon = user;
	replytext.focus();
};

// Eliminar un mensaje
// Se muestran opciones de confirmación/cancelación
function DeleteTry(divid)
{
	document.getElementById(divid).style.display = "block";
}

function Delete(idmsg)
{
	var eskupreqdelete = new XMLHttpRequest();
	eskupreqdelete.open("GET",
		"http://eskup.elpais.com/Ineskup?c=del&x=" + idmsg + "&id=" + publickey,
		true);	
	eskupreqdelete.send(null);
	var node2remove = document.getElementById(idmsg);
	var nodeparent = node2remove.parentNode;
	nodeparent.removeChild(node2remove);
//	DeleteCancel(idmsg);
}
function DeleteCancel(divid)
{
	document.getElementById(divid).style.display = "none";
}

/** Cancelación de la actualización **/
function CancelUpdate ()
{
	extra = "";
	command = "add";
	tablon = "";
	document.new_message.new_text.value = "";
}

function showOutEskup(xmldata, locationid) {
	// En qué div se inserta la información:
	var location = document.getElementById(locationid);
	// Extracción de información del xmldata:
	var id_mensajes = xmldata.getElementsByTagName("idMsg");
	var mensajes = xmldata.getElementsByTagName("mensajes"); 
	var hilos = xmldata.getElementsByTagName("hilo"); 
	var contenidos = xmldata.getElementsByTagName("contenido"); 
	var usuarios = xmldata.getElementsByTagName("usuarioOrigen");
	var fechas = xmldata.getElementsByTagName("tsMensaje");
	var imagenes = xmldata.getElementsByTagName("cont_adicional");
	
	var reply2user = xmldata.getElementsByTagName("autorMsgRespuesta");
	var reply2id = xmldata.getElementsByTagName("idMsgRespuesta");
	var levels = xmldata.getElementsByTagName("level");
	var borrados = xmldata.getElementsByTagName("borrado");
	var tablones = xmldata.getElementsByTagName("CopiaEnTablones");
  	for (var i = 0; i in id_mensajes; i++) 
	{
		if (borrados[i].childNodes[0].nodeValue == 1) continue;
		var idmsg = id_mensajes[i].childNodes[0].nodeValue;
		var contenido =  contenidos[i].childNodes[0].nodeValue;		
		var usuarioOrigen  =  usuarios[i].childNodes[0].nodeValue;
//		var fechaMensaje = new Date(fechas[i].childNodes[0].nodeValue * 1000);
		var fechaMensaje = fechas[i].childNodes[0].nodeValue;
		var usuario = xmldata.getElementsByTagName(usuarioOrigen);
		var pathPhoto = usuario[0].getElementsByTagName("pathfoto")[0].childNodes[0].nodeValue;
		pathPhoto = CheckUserPhoto(pathPhoto);

		// Se crea div para nuevo mensaje
	    var divmessage = document.createElement("div");	
		divmessage.className = "message";
		divmessage.id = locationid + "_" + idmsg;	// identificador del div del mensaje
		// Ahora el div para el contenido
		var divcontent = document.createElement("div");
		divcontent.className = "msg_content";
		// El div para la cabecera
		var divheader = document.createElement("div");
		divheader.className = "msg_header";				
		divheader.innerHTML = "<b><a target='_blank' href='http://eskup.elpais.com/" + 
			//usuarioOrigen +
			idmsg +
			"'>" + 
			usuarioOrigen +
			"</a> " + 
			FormatDate(fechaMensaje) +
			":</b>";
		// Estrella para mensajes favoritos
		var divfav = document.createElement("img");
		if (CheckMsgFav(idmsg) == -1)
		{
			divfav.src="/img/star_off.png";
			divfav.className = "msg_fav_off";
		}
		else
		{
			divfav.src="/img/star_on.png";
			divfav.className = "msg_fav_on";
		}
		divfav.alt = divmessage.id;
		divfav.title = "Favorito";
//		divfav.addEventListener("click",SetMsgFav, false);
		divfav.onclick = SetMsgFav;
		divheader.appendChild(divfav);		
			
		var msgtext = document.createElement("p");
		msgtext.innerHTML = contenido;
		// Data object: toGMTString o toLocaleString
		Process(msgtext); // para extraer videos...		
		// Se inserta el contenido del mensaje			
		divcontent.appendChild(divheader);
		divcontent.appendChild(msgtext);
		divmessage.appendChild(divcontent);
		// se crea div de control
		var divcontrol = document.createElement("div");	
		divcontrol.className = "msg_control";
		// se crea imagen del emisor
		var imgsender = document.createElement("img");
		imgsender.src = pathPhoto;
		divcontrol.appendChild(imgsender);
		// botón de respuesta:
		if ((locationid != "privado") || (usuarioOrigen != my_id))
		{
			var replybtn = document.createElement("a");
			replybtn.className = "reply";
			replybtn.innerHTML = "responder";		
			replybtn.href = "javascript:Reply('" +
											  usuarioOrigen + "','" + 
											  idmsg + "'," + 
											  (locationid == "privado") + ")";
			divcontrol.appendChild(replybtn);
		}
		if (usuarioOrigen == my_id)	// soy yo
		{
			var deletebtn = document.createElement("a");
			deletebtn.className = "delete";
			deletebtn.innerHTML = "borrar";
			var deleteid = locationid + "_del_" + idmsg;
			var confirmid = locationid + "_conf_" + idmsg;
			deletebtn.id = deleteid;
			deletebtn.href ="javascript:DeleteTry('" + confirmid + "')";
			divcontrol.appendChild(deletebtn);
			
			var confirmbtn = document.createElement("div");
			confirmbtn.className = "confirm";
			confirmbtn.id = confirmid;
			var confyes = document.createElement("a");
			confyes.href= "javascript:Delete('" + idmsg + "')";
			confyes.innerHTML = "Sí";
			var confno = document.createElement("a");
			confno.href = "javascript:DeleteCancel('" + confirmid + "')";
			confno.innerHTML = "Ups!";		
			confirmbtn.appendChild(confyes);
			confirmbtn.appendChild(confno);			
			divcontrol.appendChild(confirmbtn);
		}
		else // es otro
		{
			var resendbtn = document.createElement("a");
			resendbtn.className = "resend";
			resendbtn.innerHTML = "reenviar";
			resendbtn.href = "javascript:Resend('" +
				usuarioOrigen + "','" + 
				idmsg +  "','" +
				contenido +
				"')";
			divcontrol.appendChild(resendbtn);			
		}
		divmessage.appendChild(divcontrol);		
		
		var imagen = imagenes[i].childNodes[0].nodeValue;
		if (imagen != 0)
		{
			//imagen = "http://eskup.elpais.com" + imagen;
			var divimage = document.createElement("img");
			divimage.src=imagen;
			divcontent.appendChild(divimage);
		}
				
	
		// Mensajes que son respuestas a otros:
		var reply2user_ = reply2user[i].childNodes[0].nodeValue;
		var reply2id_ = reply2id[i].childNodes[0].nodeValue;
		var divfooter = document.createElement("div");
		divfooter.className = "msg_footer";			
		if (reply2user_ != 0)
		{
			// Y el div para el pie

			if (idmsg != reply2id_)
			{
				var divreply2 = document.createElement("div");
				divreply2.className = "reply2link";
				divreply2.innerHTML = "Respuesta a " + reply2user_.bold();
				divreply2.setAttribute('onclick', "ShowReply2('" + reply2id_ + "','" + divmessage.id + "')");
				divfooter.appendChild(divreply2);	
			};
			
			var divhilo = document.createElement("div");
			divhilo.className = "thlink";
			divhilo.innerHTML = "Sigue el hilo";
			divhilo.setAttribute('onclick', "ShowThread('"+ hilos[i].childNodes[0].nodeValue + "')");
			divfooter.appendChild(divhilo);		
	
		}	
		if (locationid != "tema")
		{
			divtablones = document.createElement("ul");
			divtablones.className = "listatemas";		
			var temasTokens = tablones[i].childNodes[0].nodeValue.split( "," );
			var haytemas = 0;
			var temabloqueado = false;
			var msgbloqueado = true;
			for ( var tk = 0; tk < temasTokens.length; tk++ )
			{
				if (temasTokens[tk].substr(0,3) == "ev-")
				{
					haytemas = 1;
					var temaid = temasTokens[tk].substr(3);
					// BLOQUEDO DE TEMAS:
					if ((locationid == "todo") && (CheckBlockTema(temaid) != -1))
					{
						continue;				
					}
					else
					{
						msgbloqueado = false; 
					}
					var temaname = xmldata.getElementsByTagName(temaid)[0].getElementsByTagName("nombre")[0].childNodes[0].nodeValue;
				//	divtablones.innerHTML = divtablones.innerHTML + "<p>" + temasTokens[tk] + "</p>";
					var temali = document.createElement("li");
					var temalink = document.createElement("a");					
					temalink.href = "javascript:LoadXmlData('tema', 'ev-" + temaid + "', '" + temaname + "')";
//					temalink.href = "'http://eskup.elpais.com/*" + temaid + "'";
					temalink.target = "_blank";
					if (CheckSigoTema(temaid) == 1)
					{
						temali.className = "seguido";					
					}
					else
					{
						temali.className = "noseguido";					
					}					
					temalink.innerHTML = temaname;
					temali.appendChild(temalink);
					divtablones.appendChild(temali);
//					divtablones.innerHTML = divtablones.innerHTML + "<a target='_blank' href='http://eskup.elpais.com/*" + temaid + "'>" + 
	//				xmldata.getElementsByTagName(temaid)[0].getElementsByTagName("nombre")[0].childNodes[0].nodeValue + " >> </a>";
				}
			}		
			if ((haytemas == 1) && (msgbloqueado) && (locationid == "todo")) continue;
			if (haytemas)
			{
				divtemas = document.createElement("div");
				divtemas.className = "temas";
				divtemas.innerHTML = "Temas";
				divtemas.onmouseover = "this.style.backgroundColor='red'";
				divtemas.appendChild(divtablones);	
				divfooter.appendChild(divtemas);
			}			
		}
		divcontent.appendChild(divfooter);			
		location.appendChild(divmessage);
		// por si al haber bloqueado mensajes se muestran demasiado pocos:
		nummsgCargados++;		
	  }
	  if ((locationid == "todo") &&(nummsgCargados < nummsg))
	  {
		  numpagtodo++;
		  LoadXmlData(locationid);
	  }
	  else
	  {
		  nummsgCargados=0;
	  }
}

function showEskupThread(xmldata, locationid) {
	var lista = new Array();	
	var ulthread = document.createElement("ul");	
	var limessage;
	ulthread.id = "tree";
	var currul = ulthread;
	currlevel = 0;
	// En qué div se inserta la información:
	var location = document.getElementById(locationid);
	// Extracción de información del xmldata:
	var id_mensajes = xmldata.getElementsByTagName("idMsg");
	var mensajes = xmldata.getElementsByTagName("mensajes"); 
	var hilos = xmldata.getElementsByTagName("hilo"); 
	var contenidos = xmldata.getElementsByTagName("contenido"); 
	var usuarios = xmldata.getElementsByTagName("usuarioOrigen");
	var fechas = xmldata.getElementsByTagName("tsMensaje");
	var imagenes = xmldata.getElementsByTagName("cont_adicional");
	
	var reply2user = xmldata.getElementsByTagName("autorMsgRespuesta");
	var reply2id = xmldata.getElementsByTagName("idMsgRespuesta");
	var levels = xmldata.getElementsByTagName("level");
	var borrados = xmldata.getElementsByTagName("borrado");
  	for (var i = 0; i in id_mensajes; i++) 
	{
		if (borrados[i].childNodes[0].nodeValue == 1) continue;
		var idmsg = id_mensajes[i].childNodes[0].nodeValue;
		var contenido =  contenidos[i].childNodes[0].nodeValue;		
		var usuarioOrigen  =  usuarios[i].childNodes[0].nodeValue;
		var fechaMensaje = fechas[i].childNodes[0].nodeValue;
		var usuario = xmldata.getElementsByTagName(usuarioOrigen);
		var pathPhoto = usuario[0].getElementsByTagName("pathfoto")[0].childNodes[0].nodeValue;
		pathPhoto = CheckUserPhoto(pathPhoto);
		// Se crea div para nuevo mensaje
		thislevel = levels[i].childNodes[0].nodeValue;
		if (thislevel > currlevel)
		{		
			lista.push(currul);			
			newul = document.createElement("ul");
			limessage.appendChild(newul);
			currul = newul;
		}
		else if (thislevel < currlevel)
		{
			currul = lista.pop();
		}

		currlevel = thislevel;
		
		limessage = document.createElement("li");
	    var divmessage = document.createElement("div");		
		divmessage.className = "message";
		divmessage.id = locationid + idmsg;	// identificador del div del mensaje
		// Ahora el div para el contenido
		var divcontent = document.createElement("div");		
		divcontent.className = "msg_content";
		// El div para la cabecera
		var divheader = document.createElement("div");
		divheader.className = "msg_header";		
		
		divheader.innerHTML = "<b><a target='_blank' href='http://eskup.elpais.com/" + 
			usuarioOrigen +
			"'>" + 
			usuarioOrigen +
			"</a> " + 
			FormatDate(fechaMensaje) +
			":</b>";
		msgtext = document.createElement("p");
		msgtext.innerHTML = contenido;
		// Data object: toGMTString o toLocaleString
		Process(msgtext); // para extraer videos...		
		// Se inserta el contenido del mensaje			
		divcontent.appendChild(divheader);
		divcontent.appendChild(msgtext);
		divmessage.appendChild(divcontent);
		// se crea div de control
		var divcontrol = document.createElement("div");	
		divcontrol.className = "msg_control";
		// se crea imagen del emisor
		var imgsender = document.createElement("img");
		imgsender.src = pathPhoto;
		divcontrol.appendChild(imgsender);
		// botón de respuesta:
		var replybtn = document.createElement("a");
		replybtn.className = "reply";
		replybtn.innerHTML = "responder";
		replybtn.href = "javascript:Reply('" +
			usuarioOrigen + "','" + 
			idmsg + "')";
		divcontrol.appendChild(replybtn);
		if (usuarioOrigen == my_id)	// soy yo
		{
			var deletebtn = document.createElement("a");
			deletebtn.className = "delete";
			deletebtn.innerHTML = "borrar";
			var deleteid = locationid + "_del_" + idmsg;
			var confirmid = locationid + "_conf_" + idmsg;
			deletebtn.id = deleteid;
			deletebtn.href ="javascript:DeleteTry('" + confirmid + "')";
			divcontrol.appendChild(deletebtn);
			
			var confirmbtn = document.createElement("div");
			confirmbtn.className = "confirm";
			confirmbtn.id = confirmid;
			var confyes = document.createElement("a");
			confyes.href= "javascript:Delete('" + idmsg + "')";
			confyes.innerHTML = "Sí";
			var confno = document.createElement("a");
			confno.href = "javascript:DeleteCancel('" + confirmid + "')";
			confno.innerHTML = "Ups!";		
			confirmbtn.appendChild(confyes);
			confirmbtn.appendChild(confno);			
			divcontrol.appendChild(confirmbtn);
		}
		else // es otro
		{
			var resendbtn = document.createElement("a");
			resendbtn.className = "resend";
			resendbtn.innerHTML = "reenviar";
			resendbtn.href = "javascript:Resend('" +
				usuarioOrigen + "','" + 
				idmsg +  "','" +
				contenido +
				"')";
			divcontrol.appendChild(resendbtn);			
		}
		divmessage.appendChild(divcontrol);		
		
		var imagen = imagenes[i].childNodes[0].nodeValue;
		if (imagen != 0)
		{
			imagen = "http://eskup.elpais.com" + imagen;
			var divimage = document.createElement("img");
			divimage.src=imagen;
			divimage.style.maxWidth="250px !important;"
			divimage.style.height="auto";
			divcontent.appendChild(divimage);
		}		
		
		limessage.appendChild(divmessage);
		currul.appendChild(limessage);
		
	  }	  
	  location.appendChild(ulthread);
	  $(function() {
			$("#tree").treeview({
				collapsed: false,
				animated: "medium",
				persist: "location"
			});
		});
}

function FormatDate(strdate)
{
	var thedate = new Date(strdate * 1000);
	return "<span class='time'>" + PadNumber(thedate.getHours().toString(),2) +
		":" + 
		PadNumber(thedate.getMinutes(),2) +
		" " + 
		PadNumber(thedate.getDate(),2) +
		"-" +
		PadNumber(thedate.getMonth(),2) +
		"-" + 
		PadNumber(thedate.getFullYear(),4) +
		"</span>";
}

function PadNumber(stdate, stlength)
{
	while (stdate.toString().length < stlength) 
	{
		stdate = "0" + stdate;
	};
	return stdate;
}

function ShowReply2(idmsgA, idmsgBdiv)
{	
	var eskupreq =  new XMLHttpRequest();
	var xmlreply;
	eskupreq.open("POST",
				  "http://eskup.elpais.com/Outeskup?th=0&f=xml&msg=" + idmsgA + "&id=" + publickey,
				  false);
	eskupreq.onreadystatechange = function()
	{
		xmlreply = eskupreq.responseXML;
	};
	eskupreq.send(null);	
//	showOutEskup(xmlreply, idmsgBdiv);
//	divB = document.getElementById(idmsgBdiv);
//	divB.style.backgroundColor = "#FDD";
	document.getElementById("popupWndContent").innerHTML = "";
	showOutEskup(xmlreply, "popupWndContent");
	loadPopup();  
}

function ShowThread(idthread)
{
	disablePopup();
	divthread = document.getElementById("thread");
	divthrealist = document.getElementById("thread_message_list");
	var eskupreqth =  new XMLHttpRequest();
	eskupreqth.open("POST",
				"http://eskup.elpais.com/Outeskup?th=1&f=xml&msg=" + idthread + "&id=" + publickey,
				false);
	eskupreqth.onreadystatechange = function()
	{
		var xmlth = eskupreqth.responseXML;	
		showEskupThread(xmlth, "thread_message_list");
	};
	eskupreqth.send(null);
	divthread.style.display = "block";
	document.getElementById("tabber").style.display = "none";
}

function CloseThread()
{
	divthread = document.getElementById("thread");	
	divthreadlist = document.getElementById("thread_message_list");
	while (divthreadlist.hasChildNodes()) 
	{
		divthreadlist.removeChild(divthreadlist.lastChild);
	}
	divthread.style.display = "none";
	document.getElementById("tabber").style.display = "block";
}

function HTree()
{
}

var command = "add";
var extra = "";
var tablon = "";
function Update()
{
	var content = document.new_message.new_text.value;
	var eskuprequpdate = new XMLHttpRequest();
	var destino = "";
	if (twitter) destino = "1";
	if (facebook) destino = "2";
	if (twitter && facebook) destino = "1|2";
	eskuprequpdate.open("POST",
					   "http://eskup.elpais.com/Ineskup?c="+
					   command +
					   "&m=" + 
					   content +
					   "&x=" +
					   extra +
					   "&id=" + publickey +
					   "&d=" + destino +
					   "&pt=" + imsel +
					   "&t=" + tablon,
					   true);	
	eskuprequpdate.send(null);	
	// limpieza:
	document.new_message.new_text.value="";
	command = "add";
	tablon = "";
	extra = "";
	imsel = "";
};

function RGB(red, green, blue)
{
    var decColor = blue + 256 * green + 65536 * red;
    return decColor.toString(16);
}

function Counter()
{
	remaining = maxchar - document.new_message.new_text.value.length-1;
	document.getElementById("counter").innerHTML = String(remaining);
//	var factor = remaining/240;
//	document.getElementById("counter").style.backgroundColor = RGB(255,Math.round(255*factor),Math.round(255*factor));
	
};


function SetBold()
{
	textComponent = document.new_message.new_text;
	var startPos = textComponent.selectionStart;
    var endPos = textComponent.selectionEnd;
    selectedText = textComponent.value.substring(startPos, endPos);
	textComponent.value = textComponent.value.slice(0,startPos) +
			"<b>" + selectedText + "</b>" +
			textComponent.value.slice(endPos);
	
}

function SetItalic()
{
	textComponent = document.new_message.new_text;
	var startPos = textComponent.selectionStart;
    var endPos = textComponent.selectionEnd;
    selectedText = textComponent.value.substring(startPos, endPos);
	textComponent.value = textComponent.value.slice(0,startPos) +
			"<i>" + selectedText + "</i>" +
			textComponent.value.slice(endPos);
}

// http://www.codetoad.com/javascript_get_selected_text.asp
// Slecciona texto de la ventana principal
function getSelText()
{
	var txt = '';
	if (window.getSelection)
	{
		return window.getSelection();
	}
	else if (document.getSelection)
	{
		return document.getSelection();
	}
	else if (document.selection)
	{
		return document.selection.createRange().text;
	}
	else return "";
}

function Process(msg_content)
{
	linktext = msg_content.getElementsByTagName("a");
	for (var i=0; i in linktext ; i++)
	{ 
		var rawtext = linktext[i].href;
		var vidid;
		var vidid;
		if (rawtext.search("http://www.youtube.com") != -1)
		{
			vidid = rawtext.split("v=")[1].split("&")[0];
			viddiv = document.createElement("div");
			viddiv.className = "video";
			viddiv.innerHTML ="<object width='345' height='320'><param name='movie' value='http://www.youtube.com/v/" +
					vidid +
					"'></param><param name='wmode' value='transparent'></param><embed src='http://www.youtube.com/v/" +
					vidid + 
					"' type='application/x-shockwave-flash' wmode='transparent' width='345' height='320'></embed></object>";		
			msg_content.replaceChild(viddiv, linktext[i]);
			break;
		}
		if (rawtext.search("vimeo.com") != -1)
		{
			viddiv = document.createElement("div");
			viddiv.className = "video";
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
		if (rawtext.search("dailymotion.com/video") != -1)
		{
			vidid = rawtext.split("dailymotion.com/video/")[1].split("&")[0];
			viddiv = document.createElement("div");
			viddiv.className = "video";
			viddiv.innerHTML ="<object width='345' height='320'><param name='movie' value='http://www.dailymotion.com/swf/video/" + vidid + "'></param><param name='allowFullScreen' value='true'></param></param><embed type='application/x-shockwave-flash' src='http://www.dailymotion.com/swf/video/" + vidid + "' width='345' height='320' allowfullscreen='true' ></embed></object>";		
			msg_content.replaceChild(viddiv, linktext[i]);
			break;
		}
		if (rawtext.search("dailymotion.com/swf") != -1)
		{
			vidid = rawtext.split("dailymotion.com/swf/video")[1].split("#")[0];
			viddiv = document.createElement("div");
			viddiv.className = "video";
			viddiv.innerHTML ="<object width='345' height='320'><param name='movie' value='http://www.dailymotion.com/swf/video/" + vidid + "'></param><param name='allowFullScreen' value='true'></param></param><embed type='application/x-shockwave-flash' src='http://www.dailymotion.com/swf/video/" + vidid + "' width='345' height='320' allowfullscreen='true' ></embed></object>";		
			msg_content.replaceChild(viddiv, linktext[i]);
			break;
		}		
	}
	//message.replaceChild(linktext, null);	
	//http://www.w3schools.com/Dom/dom_nodes_remove.asp	
}

function CheckUserPhoto(path)
{
	if (path == "")
		return "img/noimage.png";
	else
		return path;
}

function Send2Twitter()
{
	if (twitter == 1)
	{
		document.getElementById("tw").src = "img/twitter_off.png";
		twitter = 0;
	}
	else if (twitter == 0)
	{
		document.getElementById("tw").src = "img/twitter_on.png";
		twitter = 1;
	}
}

function Send2Facebook()
{
	if (facebook == 1)
	{
		document.getElementById("fb").src = "img/facebook_off.png";
		facebook = 0;
	}
	else if (facebook == 0)
	{
		document.getElementById("fb").src = "img/facebook_on.png";
		facebook = 1;
	}
}

var Nsearch = 0;	// Número de resultados de la búsqueda
var isearch = 0;	// Elemento actual de la búsqueda
var searchTerm = "";
var lastmsgsearch = 0;
function Search(div)
{
	var tempsearchTerm = document.getElementById("searchtxt_" + div).value;	
	if (tempsearchTerm != searchTerm)	// limpieza
	{		
		var oldres = document.getElementById(div).getElementsByClassName("search_res");
		for (ires=oldres.length-1; ires>=0; ires--)
		{
			alert(ires);
			oldres[ires].id = "";
			oldres[ires].className = "";			
		}
		searchTerm = tempsearchTerm;
		isearch = 0;
		Nsearch = 0;
		lastmsgsearch = 0;
	}	
	if (isearch < Nsearch)
	{
		isearch++;
		document.getElementById(div).scrollTop = document.getElementById("sr_" + isearch).offsetTop - 139;		
		return;
	}
	else if (Nsearch != 0)
	{	
	switch(div)
	{
		case "mios":
			numpagmios++;
			break;
		case "sigo":
			numpagsigo++;
			break;
		case "privado":
			numpagprvd++;
			break;
		case "todo":	
			numpagtodo++;
			break;			
		}
		Nsearch = 0;
		LoadXmlData(div);
		Search(div);
	}
	var spresult = document.createElement("span");
	spresult.className = "search_res";	
	var mensajes = document.getElementById(div).getElementsByClassName("msg_content");
	var im=0;
	for (im = lastmsgsearch; im < mensajes.length; im++)
	{	
		var bodyText = mensajes[im].innerHTML;
		var newText = "";
		var i = -1;
		var lcSearchTerm = searchTerm.toLowerCase();
		var lcBodyText = bodyText.toLowerCase();		
		while (bodyText.length > 0) {
			i = lcBodyText.indexOf(lcSearchTerm, i+1);
			if (i < 0) {
				newText += bodyText;
				bodyText = "";
				} else {
					// skip anything inside an HTML tag
					if (bodyText.lastIndexOf(">", i) >= bodyText.lastIndexOf("<", i)) {
						// skip anything inside a <script> block
						if (lcBodyText.lastIndexOf("/script>", i) >= lcBodyText.lastIndexOf("<script", i)) {
							var wrap = document.createElement("div");
							spresult.innerHTML = bodyText.substr(i, searchTerm.length);
							spresult.id = "sr_" + Nsearch;
							wrap.appendChild(spresult);
							newText += bodyText.substring(0, i) + wrap.innerHTML;
							bodyText = bodyText.substr(i + searchTerm.length);
							lcBodyText = bodyText.toLowerCase();
							i = -1;
							Nsearch++;
						}
					}
				}
				mensajes[im].innerHTML = newText;
			}
		}
		lastmsgsearch=Nsearch;		
}

function SetMsgFav(event)
{
	var target = event.target;
	msgid = target.alt.split("_")[1];
	switch (target.className)
	{
		case "msg_fav_on":
			delete localStorage[msgid];
			listamsgfav.splice(CheckMsgFav(msgid), 1);
			target.className = "msg_fav_off";
			target.src="/img/star_off.png";
			break;		
		case "msg_fav_off":
			if (CheckMsgFav(msgid) == -1)
			{
				listamsgfav.push(msgid);
				target.className = "msg_fav_on";
				target.src="/img/star_on.png";
				
				var divmsg = document.getElementById(target.alt);
				localStorage[msgid] = divmsg.innerHTML;				
			}
			break;
		}
		localStorage["msg_fav"] = JSON.stringify(listamsgfav);
		LoadFavs();
}
