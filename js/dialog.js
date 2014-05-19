function showDialog(msg, extra, callback) {
	var bd = document.getElementsByTagName('body')[0];
	var dlg = document.createElement('div');
	dlg.id = 'dlg';
	var msgDiv = document.createElement('div');
	msgDiv.className = 'dlg_msg';
	msgDiv.innerText = msg;
	var extraDiv = document.createElement('div');
	extraDiv.innerText = extra;
	var ok = document.createElement('div');
	ok.className = 'btn';
	ok.innerText = 'Sí';
	ok.onclick = function() {
		document.getElementsByTagName('body')[0]
			.removeChild(document.getElementById('dlg'));
		callback(true);
	}
	var cancel = document.createElement('div');
	cancel.className = 'btn';
	cancel.innerText = 'No';
	cancel.onclick = function() {
		document.getElementsByTagName('body')[0]
			.removeChild(document.getElementById('dlg'));
	}
	dlg.appendChild(msgDiv);
	dlg.appendChild(extraDiv);
	dlg.appendChild(ok);
	dlg.appendChild(cancel);
	bd.appendChild(dlg);
}