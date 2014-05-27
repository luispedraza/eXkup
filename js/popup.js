var currentBoard = null;
var loading = false;

window.addEventListener("load", initPopup);

function initPopup() {
	initEskup(function() {
		loadProfile();
		LoadTemasBlock();
		// Eventos
		document.getElementById("search").addEventListener("click", Search);
		document.getElementById("board").addEventListener("scroll", function() {
			if ((currentBoard == "favs") || loading) return;
			if (this.scrollTop+this.offsetHeight >= this.scrollHeight) {
				loading = true;
				loadData(null, function() {
					loading = false;
				});
			};
		});
		document.getElementById("todo").addEventListener("click", function(){
			loadBoard(this.id);
		});
		document.getElementById("sigo").addEventListener("click", function() {
			loadBoard(this.id);
		});
		document.getElementById("mios").addEventListener("click", function() {
			loadBoard(this.id);
		});
		document.getElementById("priv").addEventListener("click", function() {
			loadBoard(this.id);
		});
		document.getElementById("favs").addEventListener("click", function() {
			currentBoard = getBoard(this.id);
			loadFavs();
			uiSelectBoard(this.id);
		});
		document.getElementById("logout").onclick = logOut;
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

function loadBoard(id) {
	currentBoard = getBoard(id);
	loadData(currentBoard);
	uiSelectBoard(id);
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
