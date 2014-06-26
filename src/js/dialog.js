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
			$extra
				.append($("<div>").addClass('loading-container')
					.append($("<div>").addClass('loading-bar')
						.append($("<div>").addClass('loading-progress'))));
			THAT.setProgress = function(value) {
				console.log(value);
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
		if (e.target.className == "modal") removeDialog();
	});
	// Algunos elementos del contenido pueden cerrar el diálogo (independientemente de que tengan otros eventos asociados)
	$modal.find(".close-on-click").on("click", removeDialog);
};
