// Cargar imagen en canvas http://www.phpied.com/photo-canvas-tag-flip/

//////////////////////////////////////////////////////////
// recibida lista de imágenes capturadas para insertar
//////////////////////////////////////////////////////////
function onImages(result) 
{ 
	divnormal = document.getElementById("selector-content-normal");
	divsmall = document.getElementById("selector-content-small");
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
		newimg = new Image();
		newimg.src = list[i];
		newimg.onload = function() {
			if (this.width > 150) {
				this.style.maxWidth = "150px";
				this.style.height = "auto";	
				divnormal.appendChild(this);
			}
			else if (this.width > 20) {
				divsmall.appendChild(this);
			}
		}
		newimg.addEventListener("click", function() {
			// var img = new Image();
			// img.onload = function() {
			// 	var canvas = document.getElementById("canvasimage");
			// 	var ctx = canvas.getContext("2d");
			// 	canvas.width = img.width;
			// 	canvas.height = img.height;
			// 	ctx.drawImage(img, 0, 0, img.width, img.height);
			// }
			// img.src = this.src;
			// canvasEditor.add(new fabric.Rect({
			// 	left: 5,
			// 	top: 5,
			// 	fill: "#ff5",
			// 	width: 100, 
			// 	height: 100
			// }));
			fabric.Image.fromURL(this.src, function(image) {
				image.set({
					left: 0,
					top: 0,
					angle: 0,
					padding: 2,
					cornersize: 10
				});
				canvasEditor.add(image);
			});
		});		
		
	}
	document.getElementById("selector").className = "on";
}
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

function insertText(txt)
{
	NEWMESSAGE.innerText += " " + txt + " ";
	replaceCursor();
}

function insertLink()
{
	chrome.tabs.query({'currentWindow': true, 'active': true}, function(t) {
		insertText(t[0].url);
	});	
}

function insertVideo() {
	chrome.tabs.executeScript({file: 'js/getvideos.js', allFrames: true}, 
		onVideos);
}

function insertImage() {
	chrome.tabs.executeScript({file: 'js/getimages.js', allFrames: true}, 
		onImages);
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
}

function replaceCursor() {
	NEWMESSAGE.focus();
	// colocar el cursor al final
	var range = document.createRange();
	var lastNode = NEWMESSAGE;
	while (lastNode.nodeName != "#text") {
		lastNode = lastNode.childNodes[lastNode.childNodes.length-1];
		if (!lastNode.childNodes) break;
	}
	range.setStart(lastNode,lastNode.length);
	range.collapse(true);
	sel = document.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
}