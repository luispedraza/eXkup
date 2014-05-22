/* Show a modal dialog onscreen */
function showDialog(msg, extra, buttons, callback, timeout) {
	function removeDialog() { $("#modal").remove(); };
	var DIALOG_HTML = "<div id='modal'><div id='dlg'><div id='dlg_msg'></div><div id='dlg_extra'></div><div id='dlg_buttons'></div></div></div>";
	// insertamos el diálogo modal
	$("body").append(DIALOG_HTML);
	$("#dlg_msg").html(msg);
	$("#dlg_extra").html(extra);
	if (buttons) {
		buttonsDiv = document.getElementById("dlg_buttons");
		for (var b=0; b<buttons.length; b++) {
			var btn = document.createElement("div");
			btn.className = "btn";
			btn.textContent = buttons[b];		// texto del botón, empleado como variable de retorno
			btn.addEventListener("click", function() {
				removeDialog();
				if (callback) callback(this.textContent);
			});
			buttonsDiv.appendChild(btn);
		};
	}
	// optional timeout function
	if (timeout) {
		setTimeout(function() {
			removeDialog();
		}, timeout);
	};
};