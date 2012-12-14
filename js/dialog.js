function showDialog(msg, extra, callback) {
	document.getElementById("dialog").style.display = "block";
	document.getElementById("dlg_msg").innerHTML = msg;
	document.getElementById("dlg_extra").innerHTML = extra;
	document.getElementById("dlg_ok").onclick = function() {
		document.getElementById("dialog").style.display = "none";
		callback(true);
	}
	document.getElementById("dlg_cancel").onclick = function() {
		document.getElementById("dialog").style.display = "none";
	}
}