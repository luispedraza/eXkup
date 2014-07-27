/* Show a modal dialog onscreen */
function ModalDialog(config) {
	var THAT = this;
	function removeDialog() {
		$modal.fadeOut(function() { this.remove(); });
	};
	this.close = removeDialog;
	var title = config.title,
		content = config.content,
		buttons = config.buttons,
		callback = config.callback,
		timeout = config.timeout,
		$container = config.container ? $(config.container) : $("#eskup-popup");	// contenedor del popup
	var $modal = $("<div>").addClass("modal")
		.on("click", function(e) {
			// Cerrar el modal al hacer click fuera de la ventana
			if (e.target.className == "modal") {
				removeDialog();
				if (callback) callback();	
			};
		});
	var $dlg = $("<div>").addClass("dlg").appendTo($modal);
	// insertamos el diálogo modal
	$container.append($modal);
	if (title) { $dlg.append($("<div>").addClass("dlg-title").text(title)); };
	if (content) {
		var $content = $("<div>").addClass("dlg-content");
		if (content.type == "progress") {
			var callbackItem = content.callbackItem;	// a ejecutar sobre cada item
			var callbackEnd = content.callbackEnd;	// a ejecutar al final
			var dataArray = content.data;				// array de items
			var span = content.span;					// elementos a procesar por iteración
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
							// removeDialog();
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
		} else if (content.type=="spinner") {
			$content
				.append($("<div>").addClass('spinner fa fa-spinner fa-spin'))
				.append($("<div>").text(content.text));
		} else {
			$content.append(content);
		};
		$dlg.append($content);
	};
	if (buttons) {
		buttonsDiv = $("<div>").addClass("dlg-buttons");
		$dlg.append(buttonsDiv);
		for (var b=0; b<buttons.length; b++) {
			buttonsDiv.append($("<div>")
				.addClass("dlg-btn")
				.text(buttons[b])	
				.on("click", function() {
					removeDialog();
					if (callback) {
						// posible valor de retorno generado en el diálogo modal
						returnArray = $dlg.find("[data-return]").map(function() {
							return $(this).attr("data-return");
						}).get();
						callback(this.textContent, returnArray);
					};
				}));
		};
	};
	// optional timeout function
	if (timeout) {
		setTimeout(function() {
			removeDialog();
			if (callback) callback();
		}, timeout);
	};
	// Algunos elementos del contenido pueden cerrar el diálogo (independientemente de que tengan otros eventos asociados)
	$modal.find(".close-on-click").on("click", removeDialog);
};

/* Para mostrar información contextual sobre un elementos */
function ChartTooltip(whereMouseMoved,x,y,content,config) {
	if (typeof config == "undefined") config = {};
	var delay = (typeof config.delay === "undefined") ? 800 : config.delay;
	var autoClose = (typeof config.autoClose === "undefined") ? true : config.autoClose;
	$(whereMouseMoved).on("mouseleave",function() {
		clearTimeout(timeout);
		if (autoClose) close();
		$(this).off("mouseleave");
	});
	var $element = $("<div>");
	var timeout = setTimeout(initTooltip, delay);
	function initTooltip() {
		$element.addClass("message-detail")
			.css({"left": x, "top": y})
			.append($("<div>").addClass('tooltip-header'))
			.append(content)
			.draggable()
			.appendTo('body');
		if (!autoClose) {
			$element.find(".tooltip-header")
				.append($("<div>").addClass('close fa fa-times')
					.on("click", close));
		};
	};
	function close() {
		$element.remove();
	};
};