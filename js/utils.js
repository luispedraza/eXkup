var MESES = new Array("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre");
// Junta los valores de un objeto para producir una url
Array.prototype.shuffle = function() {
 	var len = this.length;
	var i = len;
	 while (i--) {
	 	var p = parseInt(Math.random()*len);
		var t = this[i];
  	this[i] = this[p];
  	this[p] = t;
 	}
};

function randomColor() {
	return '#'+Math.floor(Math.random()*16777215).toString(16);
}

function encodeParams(dict) {
	params = ""
	for (var k in dict) {
		params += k+"="+dict[k]+"&";
	}
	return params;
}

function dataURItoBlob(dataURI) {
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: mimeString});
}

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
}

// Función general de comunicación con el servidor
function apiCall(method, url, data, func) {
	if (method == "GET") 
		url = url + "?" + encodeParams(data);
	var req = new XMLHttpRequest();
	req.open((method=="GET") ? "GET" : "POST", url, (func) ? (true) : (false));
	if(method == "POST") {
		req.setRequestHeader("content-type", "application/x-www-form-urlencoded; charset=utf-8");
		data = encodeParams(INPARAMS);
	} else if (method == "MULTI") {
		req.setRequestHeader("enctype", "multipart/form-data;");
		formData = new FormData();
		for (i in data)
			formData.append(i, data[i]);
		data = formData;
	}
	if (func) {
		req.onreadystatechange = function() {
			if(req.readyState == 4 && req.status == 200) {
				func(req);
			};
		};
	};
	req.send(data);
	if (!func) return req.responseText;
}

function checkUserPhoto(path)
{
	return (path) ? (path) : ("img/noimage.png");
}

function fillProfile(user) {
	var foto = user.pathfoto;
	var nombre = user.nombre;
	var apellidos = user.apellidos;
	var descripcion = user.descripcion;
	var urlwebpersonal = user.urlwebpersonal;
	var urlblog = user.urlblog;
	document.getElementById("nombre").innerText = "Nombre: " + nombre;
	document.getElementById("apellidos").innerText = "Apellidos: " + apellidos;
	document.getElementById("urlpersonal").innerHTML = "Página web: " + urlwebpersonal.link(urlwebpersonal);
	document.getElementById("blog").innerHTML = "Blog: " + urlblog.link(urlblog);
	document.getElementById("descripcion").innerText = "Sobre mí: "+ descripcion;
	document.getElementById("mifoto").innerHTML = "<img src='" + foto + "' />";
}

function fillHeader(user) {
	console.log(user);
	document.getElementById("user-avatar").setAttribute("src", user.pathfoto);
}

function fillFollows(div, users) {
	counter = document.createElement("div");
	counter.innerText = users.numeroUsuarios;
	div.appendChild(counter);
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
	}
}

function fillThemes(themes) {
	div_themes = document.getElementById("themes-follow");
	for (var t in themes.perfilesEventos) {
		temaid = "ev-"+t;
		var item = document.createElement("li");
		item.className = "board-selector";
		item.id = temaid;
		item.addEventListener("click", function() {
			loadData(this.id);
		});
		item.textContent = themes.perfilesEventos[t].nombre;
		div_themes.appendChild(item);			
	};
};

function processVideos(msg_content)
{
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
}