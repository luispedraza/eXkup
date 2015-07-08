(function() {
	var canvasEditor;
	var LEFT, TOP, WIDTH, HEIGHT, OBJOPACITY=1.0, PADDING=2;

	/* Obtención del color seleccionado para el fondo de objetos */
	function getObjColor() {
		return $("#obj-color").val();
	};
	/* Obtención del color seleccionado para el borde de objetos */
	function getObjBorderColor() {
		return $("#obj-border").is(":checked") ? $("#obj-border-color").val() : null;
	};
	/* Obtención del color del borde */
	function getObjBorderWidth() {
		return $("#obj-border").is(":checked") ? $("#obj-border-width").val()+"px" : null;
	};
	/* Obtención de las características comunides de un objeto */
	function getObjDefaultOptions() {
		return {
	        left: LEFT,
			top: TOP,
	        fill: getObjColor(),
	        padding: PADDING,
	        opacity: OBJOPACITY,
	        strokeWidth: getObjBorderWidth(),
	        stroke: getObjBorderColor(),
	        cornerSize: 6,
	        cornerColor: "#000000",
	        borderColor: "#cccccc"
		};
	};
	/* Tipo de fuente seleccionado actualmente */
	function getTextFont() {
		return $("#canvas-text-font").val();
	};
	function getTextSize() {
		return 20;
	};
	/* Función general para agregar nuevos elementos al dibujo */
	function addNewObject(o) {
		canvasEditor.add(o);
		canvasEditor.setActiveObject(o);
		// Cada nuevo objeto va en su propia capa,
		// para poder reordenarlos más tarde si se quiere
		insertLayer(o);
		insertHistory();
	};

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
		EDITOR = new Editor({
			container: $("#editor-container"),
			api: new EskupApi()
		});

		canvasEditor = new fabric.Canvas("canvas-editor");
		// canvasEditor.selection = false;		// Desactivada selección de grupo
		WIDTH = canvasEditor.getWidth();
		LEFT = WIDTH/2;
		HEIGHT = canvasEditor.getHeight();
		TOP = HEIGHT/2;
		initImageEditor();
		// Detección de objeto seleccionado:
		canvasEditor.on('object:selected', objectSelected);
		// Detección de objeto modificado: 
		canvasEditor.on('object:modified', objectModified);
		// Detección de trazado finalizado: 
		canvasEditor.on('path:created', function(p) {
			insertLayer(p.path);
			insertHistory;
		});
		// Detección del movimiento de un objeto: 
		canvasEditor.on('object:moving', function(e){
			var o = e.target;
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

		// Interacción con los paneles: mostrar u ocultar
		$('.panel h1').click(function() {
			$('.panel h1').removeClass("on");
			$(this).addClass("on");
		});
		
		populateSaved();
		// Buscador de clips
		document.getElementById("clips-search-form").onsubmit = function(){
			getOpenClips();
			return false;
		};
		// Buscador de Google
		document.getElementById("google-search-form").onsubmit = function(){
			getGoogleImages();
			return false;
		};
		// Selector de orígenes de imáagenes:
		$("#selector-items-opener").click(function() {
			$(this).closest(".selector-items-container").toggleClass("on");
		});

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

		/* Color del fondo del lienzo */
		$("#back-color").on("change", function(){
			canvasEditor.backgroundColor = this.value;
			canvasEditor.renderAll();
		});
		document.getElementById("insert-cancel").addEventListener("click", function() {
			document.getElementById("selector").className = "";
		});
		document.getElementById("insert-confirm").addEventListener("click", function() {
			var ctx = document.getElementById("canvasimage").getContext("2d");
			var element = canvasEditor.getElement();
			ctx.drawImage(element, 0, 0, 420, 500);
			document.getElementById("selector").className = "";
		});
		// Carga de una imagen del disco duro:
		$("#hd").on("change", loadHDImage);

		document.getElementById("show-small").addEventListener("change", showSmall);
		// Editor 
		// Inserción de formas básicas: cuadrado, círculo, triángulo, línea:
		$("#canvas-rect").click(canvasInsertRect);
		$("#canvas-circle").click(canvasInsertCircle);
		$("#canvas-triangle").click(canvasInsertTriangle);
		$("#canvas-line").click(canvasInsertLine);
		// Opacidad de un objeto:
		$("#obj-opacity").on("input", canvasObjOpacity);
		// Colores para el fondo y para el border de los objetos:
		$("#obj-color").on("change", canvasObjColor);
		$("#obj-border-color").on("change", canvasObjBorderColor);
		// Recortado de objetos:
		document.getElementById("obj-crop").addEventListener("click", onCropImage);
		document.getElementById("obj-crop-poly").addEventListener("click", onCropPolyImage);

		// Inserción de un objeto de texto
		$("#canvas-text").click(canvasInsertText);
		// Modificación del texto:
		$("#canvas-text-value").on("keyup", function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				active.text = this.value;
				canvasEditor.renderAll();
				//active.fire('object:modified', {target: active});
			};
		});
		// Cambio en el selector de tipo de fuente:
		$("#canvas-text-font").on("change", function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				active.fontFamily = getTextFont();
	        	canvasEditor.renderAll();
			};
		});
		// Selección de fuente en negrita
		$("#canvas-text-bold").click(function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				active.fontWeight = (active.fontWeight == 'bold' ? '' : 'bold');
	        	this.className = active.fontWeight ? 'btnon' : 'btn';
	        	canvasEditor.renderAll();
			};
		});
		// Selección de fuente itálica
		$("#canvas-text-italic").click(function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				active.fontStyle = (active.fontStyle == 'italic' ? '' : 'italic');
	        	this.className = active.fontStyle ? 'btnon' : 'btn';
	        	canvasEditor.renderAll();
			};
		});
		// Selección de fuente subrayada:
		$("#canvas-text-under").click(function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				var td = active.textDecoration;
				active.textDecoration = (td.match('underline') ? td.replace('underline', '') : td+'underline');
	        	this.className = active.textDecoration.match('underline') ? 'btnon' : 'btn';
	        	canvasEditor.renderAll();
			};
		});
		// Selección de fuente tachada
		$("#canvas-text-stroke").click(function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				var td = active.textDecoration;
				active.textDecoration = (td.match('line-through') ? td.replace('line-through', '') : td+'line-through');
	        	this.className = active.textDecoration.match('line-through') ? 'btnon' : 'btn';
	        	canvasEditor.renderAll();
			};
		});
		// Selección de fuente con sobrerayado:
		$("#canvas-text-over").click(function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				var td = active.textDecoration;
				active.textDecoration = (td.match('overline') ? td.replace('overline', '') : td+'overline');
	        	this.className = active.textDecoration.match('overline') ? 'btnon' : 'btn';
	        	canvasEditor.renderAll();
			};
		});
		// Selección de fuente con sombreado:
		$("#canvas-text-shadow").click(function() {
			var active = canvasEditor.getActiveObject();
			if (active && active.type == "text") {
				active.textShadow = (active.textShadow? '' : 'rgba(0,0,0,0.2) 2px 2px 10px');
	        	this.className = active.textShadow ? 'btnon' : 'btn';
	        	canvasEditor.renderAll();
			}
		});
		// Eliminación de un elemento del dibujo:
		$("#canvas-remove").click(canvasRemoveElement);
		// Limpia todo el lienzo:
		$("#canvas-clear").click(function() {
			new ModalDialog({
				title: "Confirmación de limpieza",
				content: "¿Seguro que deseas eliminar todos los objetos dibujados?",
				buttons: ["Sí", "No"],
				callback: function(r) {
					if (r === "Sí") canvasEditor.clear();
				}
			})
		});
		// Dibujo de una forma libre con el cursor */
		$("#canvas-draw").click("change", function() {
			canvasEditor.isDrawingMode = true;
			canvasEditor.freeDrawingLineWidth = parseInt($("#draw-width").val());
			canvasEditor.freeDrawingColor = $("#draw-color").val();
		});
		$("#draw-width").on("change", function() {
			canvasEditor.freeDrawingLineWidth = parseInt(this.value) || 1;
		});
		$("#draw-color").on("change", function() {
			canvasEditor.freeDrawingColor = this.value;
		});
		// Recolocación automática de imágenes, masonry
		// $("#canvas-layout").click(canvasLayout);
		// Guardado del canvas
		$("canvas-save").click(canvasSave);
		// Filtros de imagen: 
		$(".filter").on("mouseup", Filter)
					.on("input", Filter);
		// var filters = document.getElementsByClassName("filter");
		// for (var f=0; f<filters.length; f++) {
		// 	filters[f].addEventListener('mouseup', Filter);
		// 	filters[f].addEventListener('change', function(e) {
		// 		if (e.target.type == 'range') {
		// 			document.getElementById(e.target.id + '-val').value = e.target.value;
		// 		}
		// 	});
		// }
		$(".preset").click(Filter);
		// Gestión del modal de opciones de objeto.
		// Este modal se muestra cada vez que se inserta un objeto, o al seleccionar un objeto del canvas
		// Muestra las principales opciones de edición del objeto: color, tamaño, filtros, etc
		$(".options-modal-back").click(function(e) {
			if (e.target.className.match("options-modal-back")) {
				closeOptions();
			};
		});
		$("#close-options").click(closeOptions);
		$("#options-accept").click(closeOptions);
		$("#options-cancel").click(closeOptions);
	};

	/* Cierre del modal de opciones de objeto */
	function closeOptions() {
		// Se oculta el diálogo modal:
		$(".options-modal-back").removeClass("on");
	};
	/* Apertura del diálogo de opcions de objeto y ajuste de su configuración */
	function openOptions(element) {
		console.log(element.type);
		// Configuración según objeto:
		$(".options-modal .options-item").removeClass("on");
		$(".options-modal .options-item."+element.type).addClass("on");
		$(".options-modal-back").addClass("on");
	};

	function showSmall(ev) {
		var normal = document.getElementsByClassName("content-normal");
		var small = document.getElementsByClassName("content-small");
		var normalDisp = (ev.target.checked) ? ("none") : ("block");
		var smallDisp = (ev.target.checked) ? ("block") : ("none");
		for (var i=0; i<normal.length; i++) normal[i].style.display = normalDisp;
		for (var i=0; i<small.length; i++) small[i].style.display = smallDisp;
	}

	/* Carga de imágenes desde el disco duro */
	function loadHDImage() {
		var filename = this.files[0];
		var fr = new FileReader();
		fr.onload = function() {
			var img = new Image();
			img.src = this.result;
			img.onclick = canvasInsertImage;	// inserta la imagen en el lienzo
			document.getElementById("hd_images").appendChild(img);
		};
		fr.readAsDataURL(filename);
	};

	/* Recepción de la lista de imágenes para insertar */
	function onImages(result, source) {
		console.log(result, source);

		var $divItem;
		if (source) {
			$divItem = $("#"+source).empty();
		} else {
			$("<li>").addClass("item").append(
				$("<h2>").text("Imágenes encontradas en " + result[0].title))
			$divItem = $("<li>").addClass("item")
			divItem.className = "item";
			var divTitle = document.createElement("h2");
			
			
			var divSelector = document.getElementById("selector-items");
			divSelector.appendChild(divItem);
		}
		var divNormal = document.createElement("div");
		divNormal.className = "content-normal";
		var divSmall = document.createElement("div");
		divSmall.className = "content-small";
		divSmall.style.display = "none";
		
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
		divItem.appendChild(divNormal);
		divItem.appendChild(divSmall);
		// }
	}

	function initImageEditor() { 
		// BUscar imágenes en las pestañas abiertas acatualmente:
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

	/* Inserción de una nueva imagen */
	function canvasInsertImage() {
		fabric.Image.fromURL(this.src, function(image) {
			image.set(getObjDefaultOptions());
			// redimensionado de la imagen:
			if (image.currentWidth > WIDTH) image.scaleToWidth(WIDTH);
			if (image.currentHeight > HEIGHT) image.scaleToWidth(HEIGHT);
			addNewObject(image);
		});
	};

	/* Inserción de un rectángulo */
	function canvasInsertRect() {
		var rectOptions = getObjDefaultOptions();
		rectOptions.width = 70;
		rectOptions.height = 70;
		addNewObject(new fabric.Rect(rectOptions));
	};
	/* Inserción de un nuevo círculo */
	function canvasInsertCircle() {
		var circOptions = getObjDefaultOptions();
		circOptions.radius = 50;
		addNewObject(new fabric.Circle(circOptions));
	};
	/* Inserción de un objeto de forma triangular */
	function canvasInsertTriangle() {
		var triOptions = getObjDefaultOptions();
		triOptions.width = 50;
		triOptions.height = 50;
		addNewObject(new fabric.Triangle(triOptions));
	};
	/* Inserción de texto en el dibujo */
	function canvasInsertText() {
		var textOptions = getObjDefaultOptions();
		textOptions.fontFamily = $("#canvas-text-font").val();
		addNewObject(new fabric.Text("", textOptions));
		// Se lleva el focus al cuadro de texto para escribir:
		$("#canvas-text-value").focus();
	};
	/* Inserción de un SVG en el canvas */
	function canvasInsertSVG(ev) {
		console.log("svg insertado");
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
		});
	};

	function canvasInsertLine() {
		var line = new fabric.Line(
			[50, 50, 100, 50],
			{
		        fill: getObjColor(),
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
	};



	function canvasObjOpacity() {
		OBJOPACITY = parseInt(this.value)/100;
		console.log(OBJOPACITY);
		var activeObj = canvasEditor.getActiveObject();
		var activeGrp = canvasEditor.getActiveGroup();
		if (activeObj || activeGrp) {
			(activeObj || activeGrp).opacity = OBJOPACITY;
	        canvasEditor.renderAll();
	    }
	};
	/* Color del fondo de un objeto */
	function canvasObjColor() {
		var color = this.value;
		var activeObj = canvasEditor.getActiveObject();
		var activeGrp = canvasEditor.getActiveGroup();
		if (activeObj || activeGrp) {
			(activeObj || activeGrp).fill = color;
	        canvasEditor.renderAll();
	        canvasEditor.fire('object:modified', {target:activeObj});
	    };
	};
	/* Color del borde de un objeto */
	function canvasObjBorderColor() {
		var color = this.value;
		var activeObj = canvasEditor.getActiveObject();
		var activeGrp = canvasEditor.getActiveGroup();
		if (activeObj || activeGrp) {
			(activeObj || activeGrp).fill = color;
	        canvasEditor.renderAll();
	        canvasEditor.fire('object:modified', {target:activeObj});
	    };
	};

	/* Función que se ejecuta cuando se selecciona un objeto */
	function objectSelected(e) {
		var active = e.target;
		// copiado de las propiedades del objeto a los selectores de edición: 
		$("#obj-color").val(active.fill);
		$("#obj-opacity").val(Math.round(active.opacity*100))
		$("#canvas-text-font").val(active.text);
		// Apertura del modal de opcions de objeto para su edición: 
		openOptions(active);
	};

	/* Función que se ejecuta cuando se modifica un objeto */
	function objectModified(e) {
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

	// function canvasLayout() {
	// 	/* Crea el contenedor con los divs que mapean el canvas */
	// 	function setMasonry (container, group) {
	// 		container.innerHTML = "";
	// 		for (var i=0; i<group.length; i++) {
	// 			var dElement = document.createElement("div");
	// 			dElement.style.width = group[i].currentWidth+"px";
	// 			dElement.style.height = group[i].currentHeight+"px";
	// 			dElement.style.float = "left";
	// 			container.appendChild(dElement);
	// 		}
	// 	}
	// 	/* Adapata las dimensiones de los objetos al layout buscado */
	// 	function adaptGroup(group, unit) {
	// 		var margin = 2;
	// 		for (var i=0; i<group.length; i++) {
	// 			var elemW = 0;
	// 			if (group[i].type=="image")
	// 				elemW = group[i].width;
	// 			else 
	// 				elemW = group[i].currentWidth;
	// 			elemWnew = (Math.round(elemW/unit)*unit - margin) || (unit-margin);
	// 			// if (elemWnew==0) elemWnew = unit;
	// 			group[i].scaleToWidth(elemWnew);
	// 		}
	// 	}
	// 	/* Comprueba que todos los elementos caben dentro del lienzo */
	// 	function checkMasonry(container, maxH) {
	// 		for (var i=0; i<container.childNodes.length; i++) {
	// 			var bottom = parseInt(container.childNodes[i].style.top) + parseInt(container.childNodes[i].style.height);
	// 			if (bottom>maxH) return false;
	// 		}
	// 		return true;
	// 	}
	// 	/* Hace más pequeño el más grande de los elementos en una unidad */
	// 	function scaleGroup(group, unit) {
	// 		var maxHW = 0;
	// 		var iElement = 0;
	// 		for (var i=0; i<group.length; i++) {
	// 			if (group[i].currentWidth>maxHW) {
	// 				maxHW = group[i].currentWidth;
	// 				iElement = i;
	// 			} else if (group[i].currentHeight>maxHW) {
	// 				maxHW = group[i].currentHeight;
	// 				iElement = i;
	// 			}
	// 		}
	// 		var newWidth = group[iElement].currentWidth-unit;
	// 		group[iElement].scaleToWidth(newWidth);
	// 	}
	// 	function cropGroup(group) {
	// 		for (var i=0; i<group.length; i++) {
	// 			if (group[i].type=="image") {
					
	// 			} else {
					
	// 			}
	// 		}
	// 	}
		
	// 	var unit = 200;
	// 	var dContainer = document.getElementById("masonry-container");
	// 	var group = canvasEditor.getObjects();
	// 	group.shuffle();
	// 	adaptGroup(group, unit);
	// 	setMasonry(dContainer, group);
	// 	var wall = new Masonry(dContainer, {columnWidth: unit});
	// 	// Buscamos un layout que quepa en el lienzo
	// 	while (!checkMasonry(dContainer, canvasEditor.height)) {
	// 		scaleGroup(group, unit);
	// 		setMasonry(dContainer, group);
	// 		wall.reload();
	// 	}
	// 	for (var i=0; i<dContainer.childNodes.length; i++) {
	// 		group[i].set({
	// 			left: parseFloat(dContainer.childNodes[i].style.left) + group[i].currentWidth/2,
	// 			top: parseFloat(dContainer.childNodes[i].style.top) + group[i].currentHeight/2,
	// 			angle: 0
	// 		})
	// 	}
	// 	canvasEditor.renderAll();
	// }


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
						{file: 'exe/getgoogleimages.js', runAt: 'document_end'},
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
	/* Guardar un dibujo localmente */
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

	/* Recuperación de dibujos previamente guardados */
	function populateSaved() {
		chrome.storage.local.get("SAVED-CANVAS", function(o) {
			var savedCanvas = o["SAVED-CANVAS"];
			if (!savedCanvas) return;
			console.log(savedCanvas);
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
		});
	};

	/* Aplicación de un filtro de color a una imagen */
	function Filter() {
		var filterControl = this;				// El control de filtrado, con el nombre de filtro y valor
		console.log(filterControl);
		var o = canvasEditor.getActiveObject();	// La imagen activa
		console.log(o);
		var canvas = document.createElement("canvas");
		Caman(canvas, o._originalElement.src, function() {
			console.log(filterControl.id, filterControl.value);
			this[filterControl.id](filterControl.value).render(function() {
				var newimg = new Image();
				newimg.onload = function() {
					o.setElement(this);
					canvasEditor.renderAll();
				}
				newimg.src = canvas.toDataURL('png', 1.0);
			});
		});
	}
})();

