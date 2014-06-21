var canvasEditor;
var LEFT, TOP, WIDTH, HEIGHT, OBJCOLOR="#ff0000", OBJOPACITY=1.0, PADDING=2;

fabric.Polygon.prototype.add = function(point) {
	this.points.push(point);
}

fabric.StaticCanvas.prototype.getObjectFromTS = function(ts) {
	for (var i=0; i<this._objects.length; i++){
		if (this._objects[i].ts == ts) return this._objects[i];
	}
}
var EDITOR = null;

window.onload = function() {
	EDITOR = new Editor("editor-container");

	canvasEditor = new fabric.Canvas("canvas-editor");
	canvasEditor.selection = false;		// Desactivada selección de grupo
	WIDTH = canvasEditor.getWidth();
	LEFT = WIDTH/2;
	HEIGHT = canvasEditor.getHeight();
	TOP = HEIGHT/2;
	initImageEditor();
	canvasEditor.on('object:selected', objectSelected);
	canvasEditor.on('object:modified', objectModified);
	canvasEditor.on('path:created', function(p) {
		insertLayer(p.path);
		insertHistory;
	})
	canvasEditor.on('object:moving', function(e){
		var o = e.target;
		console.log(o);
		o.lineL && o.lineL.set({'x1': o.left, 'y1': o.top});
		o.lineR && o.lineR.set({'x2': o.left, 'y2': o.top});
		if (o.pointL){
			o.set({'x1': o.left-o.width/2, 'y1': o.top-o.height/2});
			o.pointL.set({'left': o.x1, 'top': o.y1});
		}
		if (o.pointR) {
			o.set({'x2': o.left+o.width/2, 'y2': o.top+o.height/2});
			o.pointR.set({'left': o.x2, 'top': o.y2});
		}
		canvasEditor.renderAll();
	})
	canvasEditor.upperCanvasEl.oncontextmenu = function() {return false};
	var panels = document.getElementsByClassName('off');
	for (p in panels) panels[p].onclick = function(e) {
		e.target.className = (e.target.className =='on' ? 'off' : 'on');
	}
	populateSaved();
	// Buscador de clips
	document.getElementById("clips-search-form").onsubmit = function(){
		getOpenClips();
		return false;
	}
	// Buscador de Google
	document.getElementById("google-search-form").onsubmit = function(){
		getGoogleImages();
		return false;
	}

	document.addEventListener("keydown", function(e) {
		if (e.keyCode == 46) canvasRemoveElement();
		else {
			var o = canvasEditor.getActiveObject();
			var inc = (e.shiftKey ? 20 : 1);
			switch (e.keyCode) {
				case 37:
					o.left-=inc;
					break;
				case 38:
					o.top-=inc;
					break;
				case 39:
					o.left+=inc;
					break;
				case 40:
					o.top+=inc;
			}
			canvasEditor.renderAll();
		}
	})
	document.getElementById("back-color").addEventListener("change", function(ev){
		canvasEditor.backgroundColor = ev.target.value;
		canvasEditor.renderAll();
	})
	document.getElementById("insert-cancel").addEventListener("click", function() {
		document.getElementById("selector").className = "";
	});
	document.getElementById("insert-confirm").addEventListener("click", function() {
		var ctx = document.getElementById("canvasimage").getContext("2d");
		var element = canvasEditor.getElement();
		ctx.drawImage(element, 0, 0, 420, 500);
		document.getElementById("selector").className = "";
	});
	document.getElementById("hd").addEventListener("change", loadHDImage, false);
	document.getElementById("show-small").addEventListener("change", showSmall);
	// Editor 
	document.getElementById("canvas-rect").onclick = canvasInsertRect;
	document.getElementById("canvas-circle").onclick = canvasInsertCircle;
	document.getElementById("canvas-triangle").onclick = canvasInsertTriangle;
	document.getElementById("canvas-line").onclick = canvasInsertLine;
	document.getElementById("obj-opacity").addEventListener("change", canvasObjOpacity);
	document.getElementById("obj-color").addEventListener("change", canvasObjColor);
	document.getElementById("obj-crop").addEventListener("click", onCropImage);
	document.getElementById("obj-crop-poly").addEventListener("click", onCropPolyImage);

	document.getElementById("canvas-text").onclick = canvasInsertText;
	document.getElementById("canvas-text-value").onkeyup = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			active.text = e.target.value;
			canvasEditor.renderAll();
			active.fire('object:modified', {target: active});
		}
	}
	document.getElementById("canvas-text-font").onchange = function(e) {
		var active = canvasEditor.getActiveObject();
		if (active && active.type == "text") {
			active.fontFamily = document.getElementById("canvas-text-font").value;
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
		canvasEditor.isDrawingMode = ev.target.checked;
		// canvasEditor.freeDrawingLineWidth = parseInt(document.getElementById("draw-width").value) || 1;
		canvasEditor.freeDrawingColor = document.getElementById("draw-color").value;
	});
	document.getElementById("draw-width").addEventListener("change", function(ev) {
		canvasEditor.freeDrawingLineWidth = parseInt(document.getElementById("draw-width").value) || 1;
	});
	document.getElementById("draw-color").addEventListener("change", function(ev) {
		canvasEditor.freeDrawingColor = ev.target.value;
	});
	document.getElementById("canvas-layout").onclick = canvasLayout;
	document.getElementById("canvas-save").onclick = canvasSave;

	var filters = document.getElementsByClassName("filter");
	for (var f=0; f<filters.length; f++) {
		filters[f].addEventListener('mouseup', Filter);
		filters[f].addEventListener('change', function(e) {
			if (e.target.type == 'range') {
				document.getElementById(e.target.id + '-val').value = e.target.value;
			}
		});
	}
	filters = document.getElementsByClassName("preset");
	console.log(filters);
	for (var f=0; f<filters.length; f++) {
		console.log("filter");
		filters[f].addEventListener('click', Filter);
	}
}

function showSmall(ev) {
	var normal = document.getElementsByClassName("content-normal");
	var small = document.getElementsByClassName("content-small");
	var normalDisp = (ev.target.checked) ? ("none") : ("block");
	var smallDisp = (ev.target.checked) ? ("block") : ("none");
	for (var i=0; i<normal.length; i++) normal[i].style.display = normalDisp;
	for (var i=0; i<small.length; i++) small[i].style.display = smallDisp;
}

function loadHDImage(ev1) {
	var filename = ev1.target.files[0];
	var fr = new FileReader();
	fr.onload = function(ev2) {
		var img = new Image();
		img.src = ev2.target.result;
		img.onclick = canvasInsertImage;	// inserta la imagen en el lienzo
		document.getElementById("hd_images").appendChild(img);
	}
	fr.readAsDataURL(filename);
}
//////////////////////////////////////////////////////////
// recibida lista de imágenes capturadas para insertar
//////////////////////////////////////////////////////////
// function onImages(result, source) {
// 	var divItem;
// 	if (source) {
// 		divItem = document.getElementById(source);
// 		divItem.innerHTML = "";
// 	} else {
// 		divItem = document.createElement("div");
// 		divItem.className = "item";
// 		var divTitle = document.createElement("h2");
// 		divTitle.innerText = "… desde " + result[0].title;
// 		divItem.appendChild(divTitle);
// 		var divSelector = document.getElementById("selector-items");
// 		divSelector.appendChild(divItem);
// 	}
// 	var divNormal = document.createElement("div");
// 	divNormal.className = "content-normal";
// 	var divSmall = document.createElement("div");
// 	divSmall.className = "content-small";
// 	divSmall.style.display = "none";
	
// 	var list = [];
// 	for (var f=0; f<result.length; f++) list = list.concat(result[f].images);	// resultados de todos los frames
// 	for (var i=0; i<list.length; i++) {
// 		var isnew = true;
// 		for (j=0; j<i; j++) {
// 			if (list[i] == list[j])
// 			{
// 				isnew = false;
// 				continue;
// 			}
// 		}
// 		if (!isnew) continue;
		
// 		newimg = new Image();
// 		newimg.src = list[i];
// 		newimg.onclick = canvasInsertImage;
// 		newimg.onload = function() {
// 			if (this.width > 150) {
// 				divNormal.appendChild(this);
// 			}
// 			else if (this.width > 20) {
// 				divSmall.appendChild(this);
// 			}
// 		}
// 	}
// 	// if (divNormal.childNodes.length || divSmall.childNodes.length) {
// 	divItem.appendChild(divNormal);
// 	divItem.appendChild(divSmall);
// 	// }
// }

function initImageEditor() { 
	chrome.tabs.query({'currentWindow': true}, function(tabs){
		for (var i=0; i<tabs.length; i++) {
			if (tabs[i].url.match(/https?:/)) {
				chrome.tabs.executeScript(
				tabs[i].id,
				{file: 'exe/getimages.js', allFrames: false},
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
		removeLayer(activeObject.ts);
	}
	else if (activeGroup) {
		var objectsInGroup = activeGroup.getObjects();
		canvasEditor.discardActiveGroup();
		objectsInGroup.forEach(function(object) {
			canvasEditor.remove(object);
		});
	}
}

function insertLayer(element) {
	var item = document.createElement("div");
	item.className = "item";
	item.draggable = true;
	item.id = element.ts;
	var itemInfo = document.createElement("div");
	if (element.type == "text") {
		itemInfo.id = "txt-"+item.id;
		itemInfo.innerHTML = element.text;
	}
	else if (element.type == "path") {
		console.log(element)
		var c = document.createElement("canvas");
		c.width = element.width;
		c.height = element.height;
		var p = new fabric.Path.fromObject(element.toObject());
		p.left = p.width/2;
		p.top = p.height/2;
		var f = new fabric.Canvas(c);
		f.add(p);
		var img = new Image();
		img.src = f.toDataURLWithMultiplier('png', .2, 1);
		img.draggable = false;
		img.id = "thumb-"+item.id;
		item.appendChild(img);
	} else {
		element.toDataURL(function(data){
			var img = new Image();
			img.src = data;
			img.draggable = false;
			img.id = "thumb-"+item.id;
			item.appendChild(img);
		})
	}
	item.appendChild(itemInfo);
	item.ondragover = layerOnDragOver;
	function layerOnDragOver(e) {
		e.preventDefault();
	}
	item.ondragenter = layerOnDragEnter;
	function layerOnDragEnter(e) {
		e.preventDefault();
		e.target.className += " hover";
	}
	item.ondragleave = layerOnDragLeave;
	function layerOnDragLeave(e) {
		e.preventDefault();
		e.target.className = e.target.className.replace(" hover", "");
	}
	item.ondrop = layerOnDrop;
	function layerOnDrop(e) {
		e.preventDefault();
		var parent = document.getElementById("canvas-layers");
		var ts = e.dataTransfer.getData("Text");
		parent.insertBefore(document.getElementById(ts), e.target.nextSibling);
		e.target.className = e.target.className.replace(" hover", "");
		var o = (canvasEditor.getObjectFromTS(ts));
		canvasEditor.bringToFront(o);
		if (e.target.id) {
			for (var i=canvasEditor._objects.length-1; i>0; i--) {
				console.log(i);
				canvasEditor.sendBackwards(o);
				if (canvasEditor.item(i).ts == e.target.id) break; 
			}
		}
		canvasEditor.setActiveObject(o);
	}
	item.ondragstart = function(e) {
		e.dataTransfer.setData("Text", e.target.id);
	}

	item.addEventListener("click", function(e) {
		var objs = canvasEditor.getObjects();
		for (var i=0; i<objs.length; i++) {
			if (objs[i].ts == this.id) {
				canvasEditor.deactivateAll();
				canvasEditor.setActiveObject(objs[i]);
			}
		}
	});
	var parent = document.getElementById("canvas-layers");
	if (!parent.firstChild) parent.appendChild(document.createElement("div"));
	parent.insertBefore(item, parent.firstChild.nextSibling);
	if (!parent.firstChild.className) {
		parent.firstChild.className = "item";
		parent.firstChild.ondragover = layerOnDragOver;
		parent.firstChild.ondragenter = layerOnDragEnter;
		parent.firstChild.ondragleave = layerOnDragLeave;
		parent.firstChild.ondrop = layerOnDrop;
	}
}

function insertHistory() {
	var divHist = document.getElementById("canvas-history");
	var c = new Object();
	c.name = new Date().getTime();
	c.canvas = canvasEditor.toJSON();
	c.preview = canvasEditor.toDataURLWithMultiplier('png', .2, 1);
	var hist = localStorage["HISTORY_CANVAS"];
	var histcanvas = (hist ? JSON.parse(hist) : new Array());
	histcanvas.push(c);
	localStorage["HISTORY_CANVAS"] = JSON.stringify(histcanvas);
	var mini = new Image();
	mini.id = "hist-"+histcanvas.indexOf(c);
	mini.src = c.preview;
	mini.onclick = function() {
		var savedCanvas = JSON.parse(localStorage["HISTORY_CANVAS"]);
		canvasEditor.loadFromJSON(savedCanvas[this.id.split("-")[1]].canvas,
			function() {
				document.getElementById("canvas-layers").innerHTML = "";
				var objects = canvasEditor.getObjects();
				for (var i=0; i<objects.length; i++) {
					insertLayer(objects[i]);
				}
			});
	}
	divHist.appendChild(mini);
}

function removeLayer(ts) {
	document.getElementById("canvas-layers")
		.removeChild(document.getElementById(ts));
}

function canvasInsertImage(ev) {
	fabric.Image.fromURL(ev.target.src, function(image) {
		image.set({
			left: LEFT,
			top: TOP,
			angle: 0,
			padding: PADDING,
			cornersize: 8,
		});
		canvasEditor.add(image);
		var im_width = image.currentWidth;
		if (im_width > WIDTH) image.scaleToWidth(WIDTH);
		var im_height = image.currentHeight;
		if (im_height > HEIGHT) image.scaleToWidth(HEIGHT);
		canvasEditor.renderAll();
		insertLayer(image);
		insertHistory();
	});
}
function canvasInsertRect() {
	var rect = new fabric.Rect({
        left: LEFT,
		top: TOP,
        fill: OBJCOLOR,
        width: 70,
        height: 40,
        padding: PADDING,
        opacity: OBJOPACITY
        });
	canvasEditor.add(rect);
	canvasEditor.setActiveObject(rect);
	insertLayer(rect);
	insertHistory();
}

function canvasInsertCircle() {
	var circ = new fabric.Circle({
        left: LEFT,
		top: TOP,
        fill: OBJCOLOR,
        radius: 50,
        padding: PADDING,
        opacity: OBJOPACITY
        });
	canvasEditor.add(circ);
	canvasEditor.setActiveObject(circ);
	insertLayer(circ);
	insertHistory();
}

function canvasInsertTriangle() {
	var tri = new fabric.Triangle({
        left: LEFT,
		top: TOP,
        fill: OBJCOLOR,
        width: 50,
        height: 50,
        padding: PADDING,
        opacity: OBJOPACITY,
        strokeWidth: 5,
        stroke: '#666'
        });
	canvasEditor.add(tri);
	canvasEditor.setActiveObject(tri);
	insertLayer(tri);
	insertHistory();
}

function canvasInsertLine() {
	var line = new fabric.Line(
		[50, 50, 100, 50],
		{
	        fill: OBJCOLOR,
	        opacity: OBJOPACITY,
	        strokeWidth: 5,
	        padding: 0
        });
	line.hasBorders = false;
	line.hasControls = false;
	// line.lockMovementX=  true;
 //    line.lockMovementY=  true;
    line.lockRotation=  true;
    line.lockScalingX=   true;
    line.lockScalingY=   true;
    line.lockUniScaling= true;
	canvasEditor.add(line);
	var cLeft = new fabric.Rect({
		left: line.get('x1'),
		top: line.get('y1'),
		width: 5,
		height: 5,
		opacity: 100,
		fill: '#000'
	})
	cLeft.lineL = line;
	line.pointL = cLeft;
	cLeft.hasControls = cLeft.hasBorders = false;
	canvasEditor.add(cLeft);
	var cRight = new fabric.Rect({
		left: line.get('x2'),
		top: line.get('y2'),
		width: 5,
		height: 5,
		opacity: 0
	})
	cRight.lineR = line;
	line.pointR = cRight;
	cRight.hasControls = cRight.hasBorders = false;
	canvasEditor.add(cRight);
	insertLayer(line);
	insertHistory();
}

function canvasInsertText(e) {
	if (e.target.className.match(" on")) {
		e.target.className = e.target.className.replace(" on", "");
		canvasEditor.deactivateAll();
		canvasEditor.renderAll();
		return;
	}
	var text = new fabric.Text(
		"", {
			left: LEFT,
			top: TOP,
			padding: PADDING,
			fontFamily: document.getElementById("canvas-text-font").value
		});
	canvasEditor.add(text);
	canvasEditor.setActiveObject(text);
	insertLayer(text);
	insertHistory();
	e.target.className += " on";
	document.getElementById("canvas-text-value").focus();
}

function canvasObjOpacity(ev) {
	document.getElementById("obj-opacity-val").value = ev.target.value+ " %";
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
        canvasEditor.fire('object:modified', {target:activeObj});
    }
}

function objectSelected(e) {
	var active = e.target;
	document.getElementById("obj-color").value = active.fill;
	document.getElementById("obj-opacity").value = Math.round(active.opacity*100);
	document.getElementById("canvas-text-font").value = active.text;
}

function objectModified(e) {
	console.log("modi");
	var element = e.target;
	var ts = element.ts;
	try {
		if (e.target.type == "text")
			document.getElementById("txt-"+ts).innerText =   element.text;
		else if (element.type == "path") {
			var c = document.createElement("canvas");
			c.width = element.width;
			c.height = element.height;
			var p = new fabric.Path.fromObject(element.toObject());
			p.left = p.width/2;
			p.top = p.height/2;
			var f = new fabric.Canvas(c);
			f.add(p);
			document.getElementById("thumb-"+ts).src = f.toDataURLWithMultiplier('png', .2, 1);
		} else {
			element.toDataURL(function(data) {
			document.getElementById("thumb-"+ts).src = data;
			});
		}
	} catch(err) {
		console.log(err);
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
		var margin = 2;
		for (var i=0; i<group.length; i++) {
			var elemW = 0;
			if (group[i].type=="image")
				elemW = group[i].width;
			else 
				elemW = group[i].currentWidth;
			elemWnew = (Math.round(elemW/unit)*unit - margin) || (unit-margin);
			// if (elemWnew==0) elemWnew = unit;
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
	function cropGroup(group) {
		for (var i=0; i<group.length; i++) {
			if (group[i].type=="image") {
				
			} else {
				
			}
		}
	}
	
	var unit = 200;
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
	var url = ev.target.id;
	fabric.loadSVGFromURL(url, function(objects, options) {
		var loadedObject = fabric.util.groupSVGElements(objects, options);
        loadedObject.set({
        	left: LEFT,
        	top: TOP,
        	angle: 0
        });
        loadedObject.setCoords();
        canvasEditor.add(loadedObject);
        insertLayer(loadedObject);
	})
}

function getOpenClips() {
	document.getElementById("clips-loader").style.display = "block";
	var query = document.getElementById("clips-search-string").value;
	apiCall("GET", "http://openclipart.org/search/json/", {"query":query,"page":1}, function(r){
		console.log(r.replace("\n", ""));
		console.log(r.replace("\r", ""));
		console.log(r.replace("\r\n", ""));
		console.log(r.replace("\n\r", ""));
		var data = JSON.parse(r.replace("\n", ""));
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

function getGoogleImages() {
	var gstring = document.getElementById("google-search-string").value;
	chrome.tabs.create({url:"https://www.google.com/search?safe=off&site=imghp&tbm=isch&pws=0&q="+gstring,
		active: false}, 
		function(tab){
			setTimeout(function() {
				chrome.tabs.executeScript(
					tab.id,
					{file: 'js/getgoogleimages.js', runAt: 'document_end'},
					function(r){onImages(r, "google")})
				}, 3000)
		});
}

function onCropImage() {
	canvasEditor.discardActiveObject();
	var objects = canvasEditor.getObjects();
	for (var i=0; i<objects.length; i++) {
		objects[i].selectable = false;
	}
	var rect = new fabric.Rect({
        left: LEFT,
		top: TOP,
        fill: '#000',
        opacity: 0.2,
        width: 100,
        height: 100,
        padding: PADDING
        })
	rect.lockRotation = true;
	canvasEditor.add(rect);
	canvasEditor.setActiveObject(rect);
	canvasEditor.upperCanvasEl.addEventListener('mousedown', mouseCrop);
	canvasEditor.off('object:modified', objectModified);
	function mouseCrop(e) {
		if (e.button == 2) {
			cropImage();
			canvasEditor.upperCanvasEl.removeEventListener('mousedown', mouseCrop);
			canvasEditor.on('object:modified', objectModified);
		}
	}
}

function onCropPolyImage() {
	canvasEditor.discardActiveObject();
	var objects = canvasEditor.getObjects();
	for (var i=0; i<objects.length; i++) {
		objects[i].selectable = false;
	}
	var pol = new fabric.Polygon(
		[],
		{	canRotate: false,
	        left: LEFT,
			top: TOP,
	        fill: '#000',
	        stroke: "#0f0",
	        strokeWidth: 1,
	        opacity: 0.2,
	        padding: PADDING
        })
	pol.selectable = false;
	canvasEditor.add(pol);
	canvasEditor.upperCanvasEl.addEventListener('mousedown', mousePolyCrop);
	function mousePolyCrop(e) {
		if (e.button == 0) {
			var pointer = canvasEditor.getPointer(e);
			pointer.x -= pol.left;
			pointer.y -= pol.top;
			pol.add(pointer);
			canvasEditor.renderAll();
		}
		else if (e.button == 2) {
			cropPolyImage();
			canvasEditor.upperCanvasEl.removeEventListener('mousedown', mousePolyCrop);
		}
		return false;
	}
}
function cropImage() {
	var rect = canvasEditor.item(canvasEditor.getObjects().length-1);
	var x = rect.left;
	var y = rect.top;
	var w = rect.currentWidth;
	var h = rect.currentHeight;
	canvasEditor.remove(rect);

	var newcanvas = document.createElement('canvas');
	newcanvas.width = w; 
	newcanvas.height = h;
	var newcontext = newcanvas.getContext('2d');
	var canvas = canvasEditor.getElement();
	newcontext.drawImage(canvas, x-w/2, y-h/2, w, h, 0, 0, w, h);
	fabric.Image.fromURL(newcanvas.toDataURL('png', 1.0),
		function(image) {
			image.set({
				left: LEFT,
				top: TOP,
				angle: 0,
				padding: PADDING,
				cornersize: 8,
			});
			canvasEditor.add(image);
			canvasEditor.renderAll();
			canvasEditor.setActiveObject(image);
			insertLayer(image);
		})
	var objects = canvasEditor.getObjects();
	for (var i=0; i<objects.length; i++) {
		objects[i].selectable = true;
	}
}
function cropPolyImage() {
	var poly = canvasEditor.item(canvasEditor.getObjects().length-1);
	canvasEditor.remove(poly);
	poly._calcDimensions();
	var x = poly.left;
	var y = poly.top;
	var w = poly.width;
	var h = poly.height;

	var newcanvas = document.createElement('canvas');
	newcanvas.width = w; 
	newcanvas.height = h;
	var newcontext = newcanvas.getContext('2d');
	newcontext.save();
	newcontext.beginPath();
	newcontext.moveTo(poly.points[0].x-poly.minX, poly.points[0].y-poly.minY);
	for (var i=1; i<poly.points.length; i++) {
		newcontext.lineTo(poly.points[i].x-poly.minX, poly.points[i].y-poly.minY);
	}
	newcontext.closePath();
	newcontext.clip();
	var canvas = canvasEditor.getElement();

	newcontext.drawImage(canvas, x+poly.minX, y+poly.minY, w, h, 0, 0, w, h);
	newcontext.restore();
	fabric.Image.fromURL(newcanvas.toDataURL('png', 1.0),
		function(image) {
			image.set({
				left: LEFT,
				top: TOP,
				angle: 0,
				padding: PADDING,
				cornersize: 8,
			});
			canvasEditor.add(image);
			canvasEditor.renderAll();
			canvasEditor.setActiveObject(image);
			insertLayer(image);
		})
	var objects = canvasEditor.getObjects();
	for (var i=0; i<objects.length; i++) {
		objects[i].selectable = true;
	}
}

function canvasSave(key) {
	var c = new Object();
	c.name = document.getElementById("canvas-save-name").value;
	c.canvas = canvasEditor.toJSON();
	c.preview = canvasEditor.toDataURLWithMultiplier('png', .2, 1);
	var saved = localStorage["SAVED_CANVAS"];
	var savedCanvas = (saved ? JSON.parse(saved) : new Array());
	savedCanvas.push(c);
	localStorage["SAVED_CANVAS"] = JSON.stringify(savedCanvas);
	populateSaved();
}
function populateSaved() {
	var saved = localStorage["SAVED_CANVAS"];
	if (!saved) return;
	var savedCanvas = JSON.parse(saved);
	var savedDiv = document.getElementById("saved-canvas");
	var savedTable = document.createElement("table");
	savedTable.innerHTML = "<tr><th>vista previa</th><th>nombre</th><th></th></tr>";
	for (var s=0; s<savedCanvas.length; s++) {
		var row = document.createElement("tr");
		var tdImg = document.createElement("td");
		var img = new Image();
		img.src = savedCanvas[s].preview;
		tdImg.appendChild(img);
		var tdName = document.createElement("td");
		tdName.innerText = savedCanvas[s].name;
		var tdAction = document.createElement("td");
		var button = document.createElement("input");
		button.type="button";
		button.value="cargar";
		button.id = savedCanvas[s].name;
		button.onclick = function() {
			var savedCanvas = JSON.parse(localStorage["SAVED_CANVAS"]);
			for (var s=0; s<savedCanvas.length; s++) {
				if (savedCanvas[s].name == this.id) {
					canvasEditor.loadFromJSON(savedCanvas[s].canvas,
						function() {
							var objects = canvasEditor.getObjects();
							for (var i=0; i<objects.length; i++) {
								insertLayer(objects[i]);
							}
						});
				}
			}
		}
		tdAction.appendChild(button);
		row.appendChild(tdImg);
		row.appendChild(tdName);
		row.appendChild(tdAction);
		savedTable.appendChild(row);
	}
	savedDiv.innerHTML = "";
	savedDiv.appendChild(savedTable);
}

function Filter(e) {
	console.log(e);
	var o = canvasEditor.getActiveObject();
	var canvas = document.createElement("canvas");
	Caman(o._originalImage.src, canvas, function() {
		this[e.target.id](e.target.value).render(function(){
			var newimg = new Image();
			newimg.onload = function() {
				o.setElement(this);
				canvasEditor.renderAll();
			}
			newimg.src = canvas.toDataURL('png', 1.0);
		});
	})
}