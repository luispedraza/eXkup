/* Show a modal dialog onscreen */
function ModalDialog(msg, extra, buttons, callback, timeout) {
	function removeDialog() {
		var m = modalDialog.modal;
		m.fadeOut(function() { this.remove(); });
	};
	var modalDialog = this;
	var modal = this.modal = $("<div class='modal'><div class='dlg'></div></div>");
	var dlg = modal.find(".dlg");
	// insertamos el diálogo modal
	$("body").append(modal);
	if (msg) {
		dlg.append("<div class='dlg_msg'>"+msg+"</div>");
	};
	if (extra) {
		dlg.append("<div class='dlg_extra'>"+extra+"</div>")
	};
	if (buttons) {
		buttonsDiv = $("<div class='dlg_buttons'></div>");
		dlg.append(buttonsDiv);
		for (var b=0; b<buttons.length; b++) {
			var btn = $("<div class='btn'>"+buttons[b]+"</div>");
			btn.on("click", function() {
				removeDialog();
				if (callback) callback(this.textContent);
			});
			buttonsDiv.append(btn);
		};
	};
	// optional timeout function
	if (timeout) {
		setTimeout(function() {
			removeDialog();
		}, timeout);
	};
	// cerrar el modal cuando se hace click fuera de la ventana 
	modal.on("click", function(e) {
		if (e.target.className == "modal") removeDialog();
	});
};