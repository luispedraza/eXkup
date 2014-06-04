var MESES = new Array("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre");
var TIME_TOOLTIP_TIMER = null;	// tooltip para la fecha del mensaje

var TABLONES = {
	mios: "t1-",
	sigo: "2",
	priv: "3",
	todo: "t1-ULTIMOSMENSAJES"
};

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
function makeLink(text, href, target) {
	if (typeof target === "undefined") target = "_blank";
	return "<a href='"+ href + "' target='" + target + "'>" + text + "</a>";
}

/* Devuelve el tablón correspondiente a un identificador */
function getBoard(id) { return TABLONES[id] || id; };

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
function apiCall(method, url, data, callback) {
	var callbackDefined = !((typeof callback == "undefined") || (callback == null));
	if (method == "GET")
		url = url + "?" + encodeParams(data);
	var req = new XMLHttpRequest();
	req.open((method=="GET") ? "GET" : "POST", url, callbackDefined);
	if(method == "POST") {
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
		data = encodeParams(data);
	} else if (method == "MULTI") {
		req.setRequestHeader("Content-Type", "multipart/form-data;");
		formData = new FormData();
		for (i in data)
			formData.append(i, data[i]);
		data = formData;
	}
	if (callbackDefined) {
		req.onreadystatechange = function() {
			if(req.readyState == 4 && req.status == 200) {
				callback(req.response);
			};
		};
	};
	req.send(data);
	if (!callbackDefined) return req.response;
};

/* Comprueba si hay foto de usuario, o devuelve una por defecto */
function checkUserPhoto(path) {
	return path || "img/noimage.jpg";
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
function fillThemes() {
	API.loadFollowedThemes(function(themes) {
		$divThemes = $("#themes-follow").html("");
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
	});
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


