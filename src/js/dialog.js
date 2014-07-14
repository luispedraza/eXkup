/* Show a modal dialog onscreen */
function ModalDialog(msg, extra, buttons, callback, timeout) {
	var THAT = this;
	function removeDialog() {
		modalDialog.modal.fadeOut(function() { this.remove(); });
	};
	this.close = removeDialog;
	var modalDialog = this;
	var $modal = this.modal = $("<div class='modal'><div class='dlg'></div></div>");
	var $dlg = $modal.find(".dlg");
	// insertamos el diálogo modal
	$("body").append($modal);
	if (msg) {
		$("<div class='dlg_msg'>"+msg+"</div>").appendTo($dlg);
	};
	if (extra) {
		var $extra = $("<div class='dlg_extra'></div>");
		if (extra.type == "progress") {
			var callbackItem = extra.callbackItem;	// a ejecutar sobre cada item
			var callbackEnd = extra.callbackEnd;	// a ejecutar al final
			var dataArray = extra.data;				// array de items
			var span = extra.span;					// elementos a procesar por iteración
			$bar = $("<div>").addClass('loading-progress'); 	// la barra de progreso
			$extra
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
		} else if (extra.type=="spinner") {
			$extra
				.append($("<div>").addClass('spinner fa fa-spinner fa-spin'))
				.append($("<div>").text(extra.text));
		} else {
			$extra.append(extra);
		};
		$dlg.append($extra);
	};
	if (buttons) {
		buttonsDiv = $("<div class='dlg_buttons'></div>");
		$dlg.append(buttonsDiv);
		for (var b=0; b<buttons.length; b++) {
			var btn = $("<div class='btn'>"+buttons[b]+"</div>");
			btn.on("click", function() {
				removeDialog();
				if (callback) {
					// posible valor de retorno generado en el diálogo modal 
					returnArray = $dlg.find("[data-return]").map(function() {
						return $(this).attr("data-return");
					})
					.get();
					callback(this.textContent, returnArray);
				};
			});
			buttonsDiv.append(btn);
		};
	};
	// optional timeout function
	if (timeout) {
		setTimeout(function() {
			removeDialog();
			if (callback) callback();
		}, timeout);
	};
	// cerrar el modal cuando se hace click fuera de la ventana 
	$modal.on("click", function(e) {
		if (e.target.className == "modal"){
			removeDialog();
			if (callback) callback();	
		};
	});
	// Algunos elementos del contenido pueden cerrar el diálogo (independientemente de que tengan otros eventos asociados)
	$modal.find(".close-on-click").on("click", removeDialog);
};

/* Para mostrar información contextual sobre un elementos */
function ChartTooltip(whereMouseMoved,x,y,content,config) {
	if (typeof config == "undefined") config = {};
	var delay = config.delay || 800;
	var autoClose = config.autoClose || "yes";
	if (!typeof delay ==="undefined") delay=800;
	$(whereMouseMoved).on("mouseleave",function() {
		clearTimeout(timeout);
		if (autoClose=="yes") close();
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
			.appendTo('#d3-chart-container');
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