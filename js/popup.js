window.addEventListener("load", initPopup);

function initPopup() {
	initEskup(function() {
		loadProfile();
		LoadTemasBlock();
		// Eventos
		document.getElementById("search").addEventListener("click", Search);
		document.getElementById("board").addEventListener("scroll", scroller);
		document.getElementById("todo").addEventListener("click", loadData);
		document.getElementById("sigo").addEventListener("click", loadData);
		document.getElementById("mios").addEventListener("click", loadData);
		document.getElementById("priv").addEventListener("click", loadData);
		document.getElementById("favs").addEventListener("click", loadFavs);
		document.getElementById("logout").onclick = logOut;

		document.getElementById("progress").addEventListener("change", function(e) {
			p = e.customData;
			if ((p<1)||(p>99)) e.target.style.display="none";
			else {
				e.target.style.display="block";
			}
			document.getElementById("progress-status").style.width = p+"%";
			sleep(1000);
		})
		document.getElementById("send2priv").addEventListener("click", sendPriv);
	});
}

function dispatchProgress(p) {
	var event = document.createEvent("Event");
	event.initEvent("change", true, true);
	event.customData = p;
	document.getElementById("progress").dispatchEvent(event);
}

function sendPriv(e) {
	if (e.target.className == "on") {
		e.target.className = "";
		document.getElementById("profile").className = "";
		document.getElementById("edit-section").className.replace(" on", "");
	} else {
		e.target.className = "on";
		document.getElementById("profile").className = "on";
		document.getElementById("edit-section").className += " on";
	}
}