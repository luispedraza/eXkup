var canvasEditor;
var LEFT, TOP, WIDTH, HEIGHT, OBJCOLOR="#ff0000", OBJOPACITY=1.0;

window.onload = function() {
	canvasEditor = new fabric.Canvas("canvas-editor");
	canvasEditor.selection = false;		// Desactivada selección de grupo
	WIDTH = canvasEditor.getWidth();
	LEFT = WIDTH/2;
	HEIGHT = canvasEditor.getHeight();
	TOP = HEIGHT/2;
	initImageEditor();
	// Buscador de clips
	document.getElementById("clips-search").onclick = getOpenClips;

	document.addEventListener("click", canvasClicked);
	document.addEventListener("keydown", function(e) {
		if (e.keyCode == 46) canvasRemoveElement();
	})
	document.getElementById("back-color").addEventListener("change", function(ev){
		canvasEditor.backgroundColor = ev.target.value;
		canvasEditor.renderAll();
	})
	document.getElementById("insert-cancel").addEventListener("click", insertCancel);
	document.getElementById("insert-confirm").addEventListener("click", insertConfirm);
	document.getElementById("hd").addEventListener("change", loadHDImage, false);
	document.getElementById("show-small").addEventListener("change", showSmall);
	// Editor 
	document.getElementById("canvas-rect").onclick = canvasInsertRect;
	document.getElementById("canvas-circle").onclick = canvasInsertCircle;
	document.getElementById("canvas-triangle").onclick = canvasInsertTriangle;
	document.getElementById("obj-opacity").addEventListener("change", canvasObjOpacity);
	document.getElementById("obj-color").addEventListener("change", canvasObjColor);
	document.getElementById("canvas-text").onclick = canvasInsertText;
	document.getElementById("canvas-text-value").onkeyup = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			active.text = e.target.value;
			canvasEditor.renderAll();
		}
	}
	document.getElementById("canvas-text-bold").onclick = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			active.fontWeight = (active.fontWeight == 'bold' ? '' : 'bold');
        	this.className = active.fontWeight ? 'btnon' : 'btn';
        	canvasEditor.renderAll();
		}
	}
	document.getElementById("canvas-text-italic").onclick = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			active.fontStyle = (active.fontStyle == 'italic' ? '' : 'italic');
        	this.className = active.fontStyle ? 'btnon' : 'btn';
        	canvasEditor.renderAll();
		}
	}
	document.getElementById("canvas-text-under").onclick = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			var td = active.textDecoration;
			active.textDecoration = (td.match('underline') ? td.replace('underline', '') : td+'underline');
        	this.className = active.textDecoration.match('underline') ? 'btnon' : 'btn';
        	canvasEditor.renderAll();
		}
	}
	document.getElementById("canvas-text-stroke").onclick = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			var td = active.textDecoration;
			active.textDecoration = (td.match('line-through') ? td.replace('line-through', '') : td+'line-through');
        	this.className = active.textDecoration.match('line-through') ? 'btnon' : 'btn';
        	canvasEditor.renderAll();
		}
	}
	document.getElementById("canvas-text-over").onclick = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			var td = active.textDecoration;
			active.textDecoration = (td.match('overline') ? td.replace('overline', '') : td+'overline');
        	this.className = active.textDecoration.match('overline') ? 'btnon' : 'btn';
        	canvasEditor.renderAll();
		}
	}
	document.getElementById("canvas-text-shadow").onclick = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			active.textShadow = (active.textShadow? '' : 'rgba(0,0,0,0.2) 2px 2px 10px');
        	this.className = active.textShadow ? 'btnon' : 'btn';
        	canvasEditor.renderAll();
		}
	}
	document.getElementById("canvas-remove").onclick = canvasRemoveElement;
	document.getElementById("canvas-clear").onclick = function() {canvasEditor.clear()};
	document.getElementById("canvas-draw-on").addEventListener("change", function(ev) {
		var cname = (ev.target.checked) ? "on" : "off";
		document.getElementById("draw-options").className = cname;
		canvasEditor.isDrawingMode = ev.target.checked;
		canvasEditor.freeDrawingLineWidth = document.getElementById("draw-width").value;
		canvasEditor.freeDrawingColor = document.getElementById("draw-color").value;
	});
	document.getElementById("draw-width").addEventListener("change", function(ev) {
		canvasEditor.freeDrawingLineWidth = ev.target.value;
	});
	document.getElementById("draw-color").addEventListener("change", function(ev) {
		canvasEditor.freeDrawingColor = ev.target.value;
	});
	document.getElementById("canvas-layout").onclick = canvasLayout;
}

function showSmall(ev) {
	var normal = document.getElementsByClassName("content-normal");
	var small = document.getElementsByClassName("content-small");
	var normalClass = (ev.target.checked) ? ("none") : ("block");
	var smallClass = (ev.target.checked) ? ("block") : ("none");
	for (var i=0; i<normal.length; i++) normal[i].style.display = normalClass;
	for (var i=0; i<small.length; i++) small[i].style.display = smallClass;
}

function loadHDImage(ev1) {
	var filename = ev1.target.files[0];
	var fr = new FileReader();
	fr.onload = function(ev2) {
		var img = new Image();
		img.src = ev2.target.result;
		img.onclick = canvasInsertImage;
		document.getElementById("hd-images").appendChild(img);
	}
	fr.readAsDataURL(filename);
}
//////////////////////////////////////////////////////////
// recibida lista de imágenes capturadas para insertar
//////////////////////////////////////////////////////////
function onImages(result) {
	var divSelector = document.getElementById("selector-items");
	var divItem = document.createElement("div");
	divItem.className = "item";
	var divTitle = document.createElement("h2");
	divTitle.innerText = "… desde " + result[0].title;
	var divNormal = document.createElement("div");
	divNormal.className = "content-normal";
	var divSmall = document.createElement("div");
	divSmall.className = "content-small";
	var list = [];
	for (var f=0; f<result.length; f++) list = list.concat(result[f].images);	// resultados de todos los frames
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
		newimg.onclick = canvasInsertImage;
		newimg.onload = function() {
			if (this.width > 150) {	
				divNormal.appendChild(this);
			}
			else if (this.width > 20) {
				divSmall.appendChild(this);
			}
		}
	}
	// if (divNormal.childNodes.length || divSmall.childNodes.length) {
		divItem.appendChild(divTitle);
		divItem.appendChild(divNormal);
		divItem.appendChild(divSmall);
		divSelector.appendChild(divItem);	
	// }
}

function initImageEditor() { 
	chrome.tabs.query({'currentWindow': true}, function(tabs){
		for (var i=0; i<tabs.length; i++) {
			if (tabs[i].url.match(/https?:/)) {
				chrome.tabs.executeScript(
				tabs[i].id,
				{file: 'js/getimages.js', allFrames: false},
				onImages);
			};
			
		};
	});
}

function canvasRemoveElement() {
	var activeObject = canvasEditor.getActiveObject(),
	activeGroup = canvasEditor.getActiveGroup();
	if (activeObject) {
		canvasEditor.remove(activeObject);
	}
	else if (activeGroup) {
		var objectsInGroup = activeGroup.getObjects();
		canvasEditor.discardActiveGroup();
		objectsInGroup.forEach(function(object) {
			canvasEditor.remove(object);
		});
	}
}

function canvasInsertImage(ev) {
	fabric.Image.fromURL(ev.target.src, function(image) {
		image.set({
			left: LEFT,
			top: TOP,
			angle: 0,
			padding: 2,
			cornersize: 8,
		});
		canvasEditor.add(image);
		var im_width = image.currentWidth;
		if (im_width > WIDTH) image.scaleToWidth(WIDTH);
		var im_height = image.currentHeight;
		if (im_height > HEIGHT) image.scaleToWidth(HEIGHT);
		canvasEditor.renderAll();
	});
}
function canvasInsertRect() {
	canvasEditor.add(new fabric.Rect({
        left: LEFT,
		top: TOP,
        fill: OBJCOLOR,
        width: 70,
        height: 40,
        opacity: OBJOPACITY
        }));
}

function canvasInsertCircle() {
canvasEditor.add(new fabric.Circle({
        left: LEFT,
		top: TOP,
        fill: OBJCOLOR,
        radius: 50,
        opacity: OBJOPACITY
        }));
}

function canvasInsertTriangle() {
	canvasEditor.add(new fabric.Triangle({
        left: LEFT,
		top: TOP,
        fill: OBJCOLOR,
        width: 50,
        height: 50,
        opacity: OBJOPACITY
        }));
}

function canvasInsertText(e) {
	if (e.target.className == "on") {
		e.target.className = "off";
		canvasEditor.deactivateAll();
		canvasEditor.renderAll();
		return;
	}
	var text = new fabric.Text(
		"", {
			left: LEFT,
			top: TOP,
			fontFamily: 'helvetica'
		});
	canvasEditor.add(text);
	canvasEditor.setActiveObject(text);
	e.target.className = "on";
}

function canvasObjOpacity(ev) {
	OBJOPACITY = parseInt(ev.target.value)/100;
	var activeObj = canvasEditor.getActiveObject();
	var activeGrp = canvasEditor.getActiveGroup();
	if (activeObj || activeGrp) {
		(activeObj || activeGrp).opacity = OBJOPACITY;
        canvasEditor.renderAll();
    }
}
function canvasObjColor(ev) {
	OBJCOLOR = ev.target.value;
	var activeObj = canvasEditor.getActiveObject();
	var activeGrp = canvasEditor.getActiveGroup();
	if (activeObj || activeGrp) {
		(activeObj || activeGrp).fill = OBJCOLOR;
        canvasEditor.renderAll();
    }
}

function canvasClicked() {
	var active = canvasEditor.getActiveObject();
	if (active) {
		if ((active.type=="rect") || (active.type=="triangle") || (active.type=="circle")) {
			document.getElementById("obj-color").value = active.fill;
			document.getElementById("obj-opacity").value = Math.round(active.opacity*100);
		}
		else if (active.type=="text") {


		}
	}
}

function canvasLayout() {
	/* Crea el contenedor con los divs que mapean el canvas */
	function setMasonry (container, group) {
		container.innerHTML = "";
		for (var i=0; i<group.length; i++) {
			var dElement = document.createElement("div");
			dElement.style.width = group[i].currentWidth+"px";
			dElement.style.height = group[i].currentHeight+"px";
			dElement.style.float = "left";
			container.appendChild(dElement);
		}
	}
	/* Adapata las dimensiones de los objetos al layout buscado */
	function adaptGroup(group, unit) {
		for (var i=0; i<group.length; i++) {
			var elemW = 0;
			if (group[i].type=="image")
				elemW = group[i].width;
			else 
				elemW = group[i].currentWidth;
			elemWnew = Math.round(elemW/unit)*unit;
			group[i].scaleToWidth(elemWnew);
		}
	}
	/* Comprueba que todos los elementos caben dentro del lienzo */
	function checkMasonry(container, maxH) {
		for (var i=0; i<container.childNodes.length; i++) {
			var bottom = parseInt(container.childNodes[i].style.top) + parseInt(container.childNodes[i].style.height);
			if (bottom>maxH) return false;
		}
		return true;
	}
	/* Hace más pequeño el más grande de los elementos en una unidad */
	function scaleGroup(group, unit) {
		var maxHW = 0;
		var iElement = 0;
		for (var i=0; i<group.length; i++) {
			if (group[i].currentWidth>maxHW) {
				maxHW = group[i].currentWidth;
				iElement = i;
			} else if (group[i].currentHeight>maxHW) {
				maxHW = group[i].currentHeight;
				iElement = i;
			}
		}
		var newWidth = group[iElement].currentWidth-unit;
		group[iElement].scaleToWidth(newWidth);
	}
	
	var unit = 50;
	var dContainer = document.getElementById("masonry-container");
	var group = canvasEditor.getObjects();
	group.shuffle();
	adaptGroup(group, unit);
	setMasonry(dContainer, group);
	var wall = new Masonry(dContainer, {columnWidth: unit});
	// Buscamos un layout que quepa en el lienzo
	while (!checkMasonry(dContainer, canvasEditor.height)) {
		scaleGroup(group, unit);
		setMasonry(dContainer, group);
		wall.reload();
	}
	for (var i=0; i<dContainer.childNodes.length; i++) {
		group[i].set({
			left: parseFloat(dContainer.childNodes[i].style.left) + group[i].currentWidth/2,
			top: parseFloat(dContainer.childNodes[i].style.top) + group[i].currentHeight/2,
			angle: 0
		})
	}
	canvasEditor.renderAll();
}

function canvasInsertSVG(ev) {
	fabric.loadSVGFromURL(ev.target.id, function(objects, options) {
		var loadedObject = fabric.util.groupSVGElements(objects, options);
        loadedObject.set({
        	left: LEFT,
        	top: TOP,
        	angle: 0
        });
        loadedObject.setCoords();
        canvasEditor.add(loadedObject);
	})
}

function getOpenClips() {
	document.getElementById("clips-loader").style.display = "block";
	var query = document.getElementById("clips-search-string").value;
	apiCall("GET", "http://openclipart.org/search/json/", {"query":query,"page":1}, function(result){
		var data = JSON.parse(result.response);
		document.getElementById("clips-loader").style.display = "none";
		if (data.msg == "success") {
			for (var i=0; i<data.payload.length; i++) {
				var img = new Image();
				img.title = data.payload[i].description;
				img.src = data.payload[i].svg.png_thumb;
				img.id = data.payload[i].svg.url;
				img.onclick = canvasInsertImage;
				// img.onclick = canvasInsertSVG;
				document.getElementById("clips").appendChild(img);
			}
		}
		else {

		}
	})
}
