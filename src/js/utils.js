var MESES = new Array("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre");
var TIME_TOOLTIP_TIMER = null;	// tooltip para la fecha del mensaje

var TABLONES = {
	mios: "t1-",
	sigo: "2",
	priv: "3",
	todo: "t1-ULTIMOSMENSAJES",
	favs: "favs"
};

var VIDEO_TEMPLATES = {
	"YOUTUBE": "<iframe class='video' type='text/html' src='http://www.youtube.com/embed/_____ID_____?autoplay=0' frameborder='0'/>",
	"VIMEO": "<iframe class='video' src='http://player.vimeo.com/video/_____ID_____' frameborder='0'></iframe>",
	"ZAPPINTERNET": "<iframe class='video' src='http://zappinternet.com/embed/_____ID_____' frameborder='0' scrolling='no'></iframe>",
	"DAILYMOTION": "<iframe class='video' frameborder='0' src='http://www.dailymotion.com/embed/video/_____ID_____'></iframe>"
};

var TIC_TOC_TIME = 0;
function TIC() {
	TIC_TOC_TIME = new Date();
};
function TOC(print) {
	var ellapsed = new Date() - TIC_TOC_TIME;
	if (print) console.log(ellapsed);
	return ellapsed;
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


/* Construye la expresión regular para búsquedas */
function makeRegexp(term) {
	return RegExp(term
		.replace(/[aáàä]/g, "[aáàä]")
		.replace(/[eéèë]/g, "[eéèë]")
		.replace(/[iíìï]/g, "[iíìï]")
		.replace(/[oóòö]/g, "[oóòö]")
		.replace(/[uúùü]/g, "[uúùü]")
		.replace(/[ ,\.:;]+/g, "[ ,\.:;]+")
		, "i");
};

/* Construcción de un link que se puede abrir desde la extensión, sin cerrarla 
	@parama text: texto del enlace
	@param href: dirección del enlace
	@param clamp: acortar el texto dejándolo en este número de caracteres (excluyendo http://www.)
*/
function makeLink(text, href, clamp) {
	return $("<a>")
		.attr("href", "#")
		.attr("data-url", href)
		.attr("title", href)
		.text((clamp) ? text.replace(/^http:\/\/[w\.]*/, "").slice(0,clamp)+"…" : text)
		.on("click", function() {
			chrome.tabs.update({url: this.getAttribute("data-url")
		});
	});
};

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
		req.setRequestHeader("enctype", "multipart/form-data;");
		//req.setRequestHeader("Content-Type", "multipart/form-data;");
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


/* Procesamiento del contenido de un mensaje:
	- adaptación de videos
	- adaptación de resto de links 
	A tener en cuenta.
	https://developer.chrome.com/apps/app_external
	https://developers.google.com/youtube/player_parameters
	http://developer.vimeo.com/player/embedding
*/
function findVideos($content) {
	var $links = $content.find("a");
	var found = [];
	$links.each(function() {
		var $this = $(this),
			href = ($this.attr("title") || $this.attr("href"));	// esto es porque los cort.as trae la url original en el title :)
		if (href.match(/https?:\/\/[w\.]*youtube.com\/watch/)) {
			var videoMatch = href.match(/[?&]v=([^&]+)/);
			if (videoMatch && videoMatch[1]) {
				found.push({$element: $this, service: "YOUTUBE", id: videoMatch[1]});
				return;
			};
		} else if (href.match(/https?:\/\/[w\.]*vimeo.com/)) {
			var videoMatch = href.match(/https?:\/\/[w\.]*vimeo.com\/(\d+)/);
			if (videoMatch && videoMatch[1]) {
				found.push({$element: $this, service: "VIMEO", id: videoMatch[1]});
				return;
			};
		} else if (href.match(/https?:\/\/[w\.]*zappinternet.com\/video\//)) {
			var videoMatch = href.match(/https?:\/\/[w\.]*zappinternet.com\/video\/(.+?)\//);
			if (videoMatch && videoMatch[1]) {
				found.push({$element: $this, service: "ZAPPINTERNET", id: videoMatch[1]});
				return;
			};
		} else if (href.match(/https?:\/\/[w\.]*dailymotion.com\/video\//)) {
			var videoMatch = href.match(/https?:\/\/[w\.]*dailymotion.com\/video\/([\w-]+)/);
			if (videoMatch && videoMatch[1]) {
				found.push({$element: $this, service: "DAILYMOTION", id: videoMatch[1]});
				return;
			};
		};
		found.push({$element: $this, service: null, href: href});	// tratado como simple enlace
	});
	return found;
};
/* Reemplaza los enlaxes y vídeos encontrados por findVideo */
function replaceLinks(info) {
	info.forEach(function(a) {
		if (a.service) a.$element.replaceWith($(VIDEO_TEMPLATES[a.service].replace("_____ID_____", a.id)));
		else a.$element.replaceWith(makeLink(a.href ,a.href, 20).addClass('a-link'));
	});
};
function processContent($content) {
	replaceLinks(findVideos($content));
};

/* Convertir un objeto en una array, por ejemplo para ordenar luego sus elementos */
function makeArray(obj, keyname) {
	if (typeof keyname=="undefined") keyname = "__key";
	var result = [];
	for (k in obj) {
		var val = obj[k];
		val[keyname] = k;
		result.push(val);
	};
	return result;
};

/* Convertir un objeto en una array, cuando las claves son enteros */
function makeIntArray(obj, keyname) {
	if (typeof keyname=="undefined") keyname = "__key";
	var result = [];
	for (k in obj) {
		var val = obj[k];
		val[keyname] = k >> 0;
		result.push(val);
	};
	return result;
};

/* Función para ordenar un array de objetos alfabéticamente según el campo indicado */
function sortArray(array, field) {
	return array.sort(function(a,b) {
		return (a[field].toLowerCase() < b[field].toLowerCase()) ? -1 : 1;
	});
};

/* Función para ordenar un array de objetos numéricamente según el campo indicado */
function sortNumArray(array, field) {
	return array.sort(function(a,b) {
		return (a[field] < b[field]) ? -1 : 1;
	});
};

/* Función que determina si un objecto es de tipo Array */
function isArray(object) {
	return object instanceof Array;
};

/* Redondeo de un instante a una resolución de días */
function roundTimeDays(ts) {
	var date = new Date(ts);
	date = new Date(date.getFullYear(), date.getMonth(),date.getDay());
	return date.getTime();
};

/* Redondeo de un instante a una resolución de horas */
function roundTimeHour(ts) {
	var date = new Date(ts);
	// var floor = new Date(date.getFullYear(), date.getMonth(),date.getDay(), date.getHours());
	date.setMinutes(0);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date.getTime();
};
/* Redondeo de un instante a una resolución de minutos */
function roundTimeMinutes(ts) {
	var date = new Date(ts);
	// var floor = new Date(date.getFullYear(), date.getMonth(),date.getDay(), date.getHours());
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date.getTime();
};

/* Redondeo de un instante a una resolución de segundos */
function roundTimeSeconds(ts) {
	var date = new Date(ts);
	// var floor = new Date(date.getFullYear(), date.getMonth(),date.getDay(), date.getHours());
	date.setMilliseconds(0);
	return date.getTime();
};








