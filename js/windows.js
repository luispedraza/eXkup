// Cargar imagen en canvas http://www.phpied.com/photo-canvas-tag-flip/


//////////////////////////////////////////////////////////
// recibida lista de videos capturados para insertar
//////////////////////////////////////////////////////////
function onVideos(result)
{ 
	var list = []
	for (f in result) list = list.concat(result[f]);
	document.getElementById("imageselector").style.display = "block";
	divimages = document.getElementById("images");
	for (i=0; i in list; i++)
	{		
		var isnew = true;
		for (j=0; j<i; j++)
		{
			if (list[i] == list[j])
			{
				isnew = false;
				continue;
			}
		}
		if (!isnew) continue;
		viddiv = document.createElement("div");
		viddiv.className = "video";
		viddiv.innerHTML ="<object width='200' height='auto'><param name='movie' value='" + 
			list[i] +
			"'></param><param name='wmode' value='transparent'></param><embed src='" +
			list[i] + 
			"' type='application/x-shockwave-flash' wmode='transparent' width='200' height='auto'></embed></object>";	
		divimages.appendChild(viddiv);
	}
}

/* Obtiene la url de la pestaña actual */
function getCurrentURLs(callback) {
	chrome.tabs.query({'currentWindow': true, 'active': true}, function(result) {
		callback(result);
	});
};

function insertVideo() {
	chrome.tabs.executeScript({file: 'js/getvideos.js', allFrames: true}, 
		onVideos);
}

function insertImage() {
	window.close();
	chrome.tabs.create({url:"image_editor.html"});
}

function insertCancel() {
	document.getElementById("selector").className = "";
	//document.getElementById("selector-content").innerHTML = "";
}

function insertConfirm() {
	var ctx = document.getElementById("canvasimage").getContext("2d");
	var element = canvasEditor.getElement();
	ctx.drawImage(element, 0, 0, 420, 500);
	insertCancel();
};
