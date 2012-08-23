// http://src.chromium.org/viewvc/chrome/trunk/src/chrome/common/extensions/docs/examples/api/windows/
/*var targetWindow = null;
var targetTab = null;

chrome.windows.getCurrent(function(w)
	{
		targetWindow = w;
	})

chrome.tabs.getSelected(null, function(t)
{
	targetTab = t;
})
*/

var imsel = "";


// Menus desplegables: http://css-tricks.com/designing-the-digg-header-how-to-download/
function onPageQuote(text)
{
	if (text == "") alert ("No hay texto seleccionado. Haz tu selección antes de abrir la extensión.");
	else InsertText(text);
}

function onPageImagesLink(list) 
{ 
	document.getElementById("tabber").style.display = "none";
	document.getElementById("imageselector").style.display = "block";
	divimages = document.getElementById("images");	
	for (i=0; i in list.url; i++)
	{
		var isnew = true;
		for (j=0; j<i; j++)
		{
			if (list.url[i] == list.url[j])
			{
				isnew = false;
				continue;
			}
		}
		if (!isnew) continue;
		newlink = document.createElement("a");
		newimg = document.createElement("img");
		newimg.src = list.url[i];
		newimg.style.maxWidth = "150px";
		newimg.style.height = "auto";
		newlink.href="javascript:InsertText('" + list.url[i] + "');";		

		newlink.appendChild(newimg);
		divimages.appendChild(newlink);	
	}
}
function onPageImages(list) 
{ 
	document.getElementById("tabber").style.display = "none";
	document.getElementById("imageselector").style.display = "block";
	divimages = document.getElementById("images");	
	for (i=0; i in list.url; i++)
	{
		var isnew = true;
		for (j=0; j<i; j++)
		{
			if (list.url[i] == list.url[j])
			{
				isnew = false;
				continue;
			}
		}
		if (!isnew) continue;
				
		var canvas = document.createElement('canvas');
		divimages.appendChild(canvas);	
		var ctx = canvas.getContext('2d');
		var img = new Image();
		img.src = list.url[i];
		ctx.drawImage(img,0,0);	
		var base64 = canvas.toDataURL("image/png", "");
		//canvas.onclick = function(){alert(this.toDataURL("image/png", ""))};
		canvas.onclick = function(){imsel = this.toDataURL("image/png", "")};
	}
}
function onPageVideos(list) 
{ 
	document.getElementById("tabber").style.display = "none";
	document.getElementById("imageselector").style.display = "block";
	divimages = document.getElementById("images");	
	for (i=0; i in list.url; i++)
	{		
		var isnew = true;
		for (j=0; j<i; j++)
		{
			if (list.url[i] == list.url[j])
			{
				isnew = false;
				continue;
			}
		}
		if (!isnew) continue;
		viddiv = document.createElement("div");
		viddiv.className = "video";
		viddiv.innerHTML ="<object width='200' height='auto'><param name='movie' value='" + 
			list.url[i] +
			"'></param><param name='wmode' value='transparent'></param><embed src='" +
			list.url[i] + 
			"' type='application/x-shockwave-flash' wmode='transparent' width='200' height='auto'></embed></object>";	
		divimages.appendChild(viddiv);	
		
		vidlink = document.createElement("a");
		vidlink.href="javascript:InsertText('" + list.url[i].split("&")[0] + "');";		
		vidlink.innerHTML = "Insertar este vídeo";
		divimages.appendChild(vidlink);			
	}
}

function onGReader(info)
{
	InsertText(info);
}

function InsertText(txt)
{
	var textomensaje = document.getElementById("new_text");
	textomensaje.value = textomensaje.value + " " + txt + " ";	
}

function InsertLink()
{
	var url;
	var title;
/*	chrome.windows.getCurrent(getWindow);
	chrome.tabs.getSelected(targetWindow.id, getTab);
*/
	// http://twitter.com/ELV1S/status/9653311428
/*	chrome.windows.getCurrent(function(w)
		{
			chrome.tabs.getSelected(w.id, function(t)
				{
					targetTab = t;
				})
		});
*/
//	getTab(targetTab);

//	url = targetTab.url;
//	title = targetTab.title;
	
//	document.new_message.new_text.value += " <a href=" + url + ">" + title + "</a> ";
//	document.new_message.new_text.value += url += title;
	chrome.tabs.getSelected(null, function(t)
	{
		document.new_message.new_text.value += " " + t.url + " ";
	});	
}

function InsertImageLink()
{
 	var bg = chrome.extension.getBackgroundPage();
	bg.getImages(onPageImagesLink);	
 	//	document.getElementById("imgtest").src = bg.pageimages[0].src;
}
function InsertImage()
{
 	var bg = chrome.extension.getBackgroundPage();
	bg.getImages(onPageImages);	
}
function InsertVideo()
{
 	var bg = chrome.extension.getBackgroundPage();
	bg.getVideos(onPageVideos);
}

function InsertReader()
{
	var bg = chrome.extension.getBackgroundPage();
	bg.getGReader(onGReader);
}
function Quote()
{
	var bg = chrome.extension.getBackgroundPage();
	bg.getQuote(onPageQuote);
}

function InsertImageConfirm()
{
	document.getElementById("tabber").style.display = "block";	document.getElementById("imageselector").style.display = "none";
	document.getElementById("images").innerHTML = "";
}

function InsertImageCancel() 
{
	document.getElementById("tabber").style.display = "block";	document.getElementById("imageselector").style.display = "none";
	document.getElementById("images").innerHTML = "";
}

// Menu para lista de temas seguidos


