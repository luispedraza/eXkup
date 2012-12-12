// Junta los valores de un objeto para producir una url
function encodeParams(dict) {
	params = ""
	for (var k in dict) {
		params += k+"="+dict[k]+"&";
	}
	return params;
}

// Función general de comunicación con el servidor
function apiCall(method, url, data, func) {
	var req = new XMLHttpRequest();
	req.open(method, (method == "POST") ? (url) : (url + "?" + data), (func) ? (true) : (false));
	if(method == "POST") 
		req.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
	if(func) {
		req.onreadystatechange = function() {
			if(req.readyState == 4 && req.status == 200) {
				func(req);
			};
		};
	};
	req.send(data);
	if (!func) 
		return req.responseText;
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

function fillFollows(div, users) {
	counter = document.createElement("div");
	counter.innerText = users.numeroUsuarios;
	div.appendChild(counter);
	for (var u in users.perfilesUsuarios) {
		var user = users.perfilesUsuarios[u];
		userid = u;							
		var usera = document.createElement("a");
		usera.href = "http://eskup.elpais.com/" + userid;
		usera.target = "_blank";
		var userimg = document.createElement("img");
		userimg.src = checkUserPhoto(user.pathfoto);
		userimg.title = userid;
		userimg.alt = userid;
		if (user.activo) userimg.className = "online";
		usera.appendChild(userimg);
		div.appendChild(usera);
	}
}

function fillThemes(themes) {
	div_themes = document.getElementById("temas_lista");
	for (var t in themes.perfilesEventos) {
		temaid = "ev-" + t;
		var item = document.createElement("li");
		var link = document.createElement("a");
		//temalink.href = "javascript:LoadXmlData('tema', '" + temaid + "', '" + nombre[cont].textContent + "')";
		link.innerText = themes.perfilesEventos[u].nombre;
		item.appendChild(link);
		div_themes.appendChild(item);			
	}
}