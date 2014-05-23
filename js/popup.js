var currentBoard = null;

window.addEventListener("load", initPopup);

function initPopup() {
	initEskup(function() {
		loadProfile();
		LoadTemasBlock();
		// Eventos
		document.getElementById("search").addEventListener("click", Search);
		document.getElementById("board").addEventListener("scroll", function() {
			if (currentBoard == "favs") return;
			if (this.scrollTop+this.offsetHeight >= this.scrollHeight) {
				loadData(null);
			};
		});
		document.getElementById("todo").addEventListener("click", function(){
			loadData(this.id);
		});
		document.getElementById("sigo").addEventListener("click", function() {
			loadData(this.id);
		});
		document.getElementById("mios").addEventListener("click", function() {
			loadData(this.id);
		});
		document.getElementById("priv").addEventListener("click", function() {
			loadData(this.id);
		});
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
		document.getElementById("closetree").addEventListener("click", function() {
			document.getElementById("board").style.left = 0;
			document.getElementById("tree-board").style.left = "450px";
		})

		document.getElementById("edit-section-h1").onclick = showEditor;
		document.getElementById("cancel").onclick = showEditor;
		document.getElementById("profile-section-h1").onclick = showProfile;
		// cargar tablón de eventos seguidos
		(function() {
			var evObj = document.createEvent('MouseEvents');
		    evObj.initEvent("click", true, false);
		    document.getElementById("sigo").dispatchEvent(evObj);
		})();
	});
}

function showEditor() {
	var e = document.getElementById("edit-section");
	e.className = (e.className.match("on") ? "" : "on");
}
function showProfile() {
	var e = document.getElementById("profile-section");
	e.className = (e.className.match("on") ? "" : "on");
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

/* Selecciona el board actual en la interfaz */
function uiSelectBoard(board) {
	$(".board-selector.on").removeClass("on");
	$("#"+board).addClass("on");
}
