/* Show a modal dialog onscreen 
	config = {
		type = "progress", "spinner", "html"
		progress = {
			callbackItem,			función a ejecutar sobre cada item
			callbackEnd, 			función a ejectuar al final del proceso
			data,					array de items a procesar
			span,					número de elementos a procesar en cada iteración
		}
		title (string), 			ej: "Título del modal"
		content, 					html content ej: "<h1>Title</h1><div>Este es el contenido</div>"
		buttons (array(string)), 	ej. ["OK", "Cancel"]
		callback (function), 		
		timeout (int), 				Tiempo que tardará en cerrarse el modal automáticamente
		container ($)				Contenedor del modal, si existe.
	}
*/
function ModalDialog(config) {
	var THAT = this;
	this.close = function() { 
		$modal.fadeOut(function() { 
			this.remove(); 
		}); 
	};
	var title = config.title,
		type = config.type,
		content = config.content,
		buttons = config.buttons,
		callback = config.callback,
		timeout = config.timeout,
		$container = config.container || ($("#eskup-popup").length ? $("#eskup-popup") : $("body"));	// contenedor del popup
	var $modal = $("<div>")
			.addClass("modal")
			.on("click", function(e) {
				// Cerrar el modal al hacer click fuera de la ventana
				if (e.target.className == "modal") {
					THAT.close();
					if (callback) callback();	
				};
			});
	var $dlg = $("<div>")
			.addClass("dlg")
			.appendTo($modal);
	// insertamos el diálogo modal
	$container.append($modal);
	// Inserción del contenido del diálogo:
	if (title) { 
		$dlg.append($("<div>").addClass("dlg-title").text(title)); 
	};
	var $content = $("<div>").addClass("dlg-content");
	if (type == "progress") {
		var progress = config.progress;
		var callbackItem = progress.callbackItem;	// a ejecutar sobre cada item
		var callbackEnd = progress.callbackEnd;		// a ejecutar al final
		var dataArray = progress.data;				// array de items
		var span = progress.span;					// elementos a procesar por iteración
		$bar = $("<div>").addClass('loading-progress'); 	// la barra de progreso
		$content
			.append($("<div>").addClass('loading-container')
				.append($("<div>").addClass('loading-bar')
					.append($bar)));
		var iterations = Math.floor(dataArray.length/span);	// número de procesamientos
		var currentIteration = 0;	// procesamiento actual
		THAT.runProgress = function(value) {
			function processSpanArray() {
				setTimeout(function() {
					if (currentIteration>iterations) {
						callbackEnd();
						// close();
					} else {
						var initial = currentIteration*span;
						dataArray.slice(initial, initial+span).forEach(callbackItem);
						var completed = Math.floor(100*currentIteration/iterations) + "%";
						$bar.css("width", completed).text(completed);
						currentIteration++;
						processSpanArray();	// se vuelve a llamar a la función
					};
				}, 50);
			};
			processSpanArray();
		};
		THAT.stopProgress = function() {
			currentIteration = iterations;
		};
	} else if (type == "spinner") {
		$content
			.append($("<div>").addClass('spinner fa fa-spinner fa-spin'))
			.append($("<div>").text(content));
	} else {
		$content.append(content);
	};
	$dlg.append($content);
	
	if (buttons) {
		$buttonsDiv = $("<div>").addClass("dlg-buttons");
		$dlg.append($buttonsDiv);
		buttons.forEach(function(b) {
			$buttonsDiv.append($("<div>")
				.addClass("dlg-btn")
				.text(b)	
				.on("click", function() {
					THAT.close();
					if (callback) {
						// posible valor de retorno generado en el diálogo modal
						returnArray = $dlg.find("[data-return]").map(function() {
							return $(this).attr("data-return");
						}).get();
						callback(this.textContent, returnArray);
					};
				}));
		});
	};

	// optional timeout function
	if (timeout) {
		setTimeout(function() {
			THAT.close();
			if (callback) callback();
		}, timeout);
	};
	// Algunos elementos del contenido pueden cerrar el diálogo (independientemente de que tengan otros eventos asociados)
	$modal.find(".close-on-click").on("click", close);
};
