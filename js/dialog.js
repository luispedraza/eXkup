/* Show a modal dialog onscreen */
function showDialog(msg, extra, callback, timeout) {
	function removeDialog() { $("#modal").remove(); };
	var DIALOG_HTML = "<div id='modal'><div id='dlg'><div id='dlg_msg'></div><div id='dlg_extra'></div><div id='btn-yes' class='btn yes'>Sí</div><div id='btn-no' class='btn no'>No</div></div></div>";
	// insertamos el diálogo modal
	$("body").append(DIALOG_HTML);
	$("#dlg_msg").html(msg);
	$("#dlg_extra").html(extra);
	$("#btn-yes").on("click", function() {
		removeDialog();
		callback(true);
	});
	$("#btn-no").on("click", function() {
		removeDialog();
	});
	// optional timeout function
	if (timeout) {
		setTimeout(function() {
			removeDialog();
		}, timeout);
	};
};