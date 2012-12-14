// Cargar imagen en canvas http://www.phpied.com/photo-canvas-tag-flip/

//////////////////////////////////////////////////////////
// recibida lista de imágenes capturadas para insertar
//////////////////////////////////////////////////////////
function onImages(result) 
{ 
	document.getElementById("tabber").style.display = "none";
	document.getElementById("imageselector").style.display = "block";
	divimages = document.getElementById("images");
	var list = [];
	for (f in result) list = list.concat(result[f]);
	for (var i=0; i<list.length; i++) {
		var isnew = true;
		for (j=0; j<i; j++) {
			if (list[i] == list[j])
			{
				isnew = false;
				continue;
			}
		}
		if (!isnew) continue;
		newimg = document.createElement("img");
		newimg.src = list[i];
		newimg.style.maxWidth = "150px";
		newimg.style.height = "auto";
		newimg.addEventListener("click", function(){
			var img = new Image();
			img.onload = function() {
				var canvas = document.getElementById("canvasimage");
				var ctx = canvas.getContext("2d");
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0, img.width, img.height);
				console.log(canvas.toDataURL("image/jpeg", 0.8));
			}
			img.src = this.src;
		});		
		divimages.appendChild(newimg);
	}
}
//////////////////////////////////////////////////////////
// recibida lista de videos capturados para insertar
//////////////////////////////////////////////////////////
function onVideos(result) 
{ 
	var list = []
	for (f in result) list = list.concat(result[f]);
	document.getElementById("tabber").style.display = "none";
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

function insertText(txt)
{
	document.new_message.newtext.value += " " + txt + " ";
}

function insertLink()
{
	chrome.tabs.query({'currentWindow': true, 'active': true}, function(t) {
		insertText(t[0].url);
	});	
}

function insertVideo()
{
	chrome.tabs.executeScript({file: 'js/getvideos.js', allFrames: true}, 
		onVideos);
}

function insertImage() {
	chrome.tabs.executeScript({file: 'js/getimages.js', allFrames: true}, 
		onImages);
}

function insertImageCancel()
{
	document.getElementById("tabber").style.display = "block";	
	document.getElementById("imageselector").style.display = "none";
	document.getElementById("images").innerHTML = "";
}