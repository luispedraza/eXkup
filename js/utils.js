// Junta los valores de un objeto para producir una url
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

// Formateo de fechas
function formatDate(tsDate)
{
	var thedate = new Date(tsDate * 1000);
	return "<span class='time'>" + 
	padNumber(thedate.getHours().toString(),2) +
	":" + 
	padNumber(thedate.getMinutes(),2) +
	" " + 
	padNumber(thedate.getDate(),2) +
	"-" +
	padNumber(thedate.getMonth(),2) +
	"-" + 
	padNumber(thedate.getFullYear(),4) +
	"</span>";
	function padNumber(stdate, stlength)
	{
		while (stdate.toString().length < stlength) 
			stdate = "0" + stdate;
		return stdate;
	}
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