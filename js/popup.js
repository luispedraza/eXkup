var currentBoard = null;
var loading = false;

window.addEventListener("load", initPopup);

function initPopup() {
	/* Obtención de la clave pública de usuario, e inicialización del perfil */
	initEskup(function() {
		eskupLoadProfile(function(user) {
			fillHeader(user);
			fillProfile(user);
			LoadFollowTo();
			LoadFollowMe();
			eskupLoadFollowedThemes(function(data) {
				fillThemes(data);
			});
			eskupLoadWritableThemes(function() {

			});
		});
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
			loadFavorites();
			uiSelectBoard(this.id);
		});
		document.getElementById("logout").onclick = logOut;
		document.getElementById("closetree").addEventListener("click", function() {
			document.getElementById("board").style.left = 0;
			document.getElementById("tree-board").style.left = "450px";
		})

		$("#edit-section-h1").on("click", function() {
			showEditor();
		});
		$("#cancel").on("click", function() {
			showEditor(false);
		});
		/* Mostrar el perfil */
		$("#profile-item").on("click", function() {
			$(this).toggleClass('on');
			$("#profile-container").toggleClass('on');
		});
		// cargar tablón de eventos seguidos
		(function() {
			var evObj = document.createEvent('MouseEvents');
		    evObj.initEvent("click", true, false);
		    document.getElementById("sigo").dispatchEvent(evObj);
		})();

		/* Información sobre el tablón actual */
		$("#board-info .see-more").on("click", function() {
			$("#board-info").toggleClass("on");
		});
	});
}



/* Gestión de la ventana de edición */
function showEditor(show, info) {
	$edit = $("#edit-section");
	(show == null) ? $edit.toggleClass("on") : $edit.toggleClass("on", show);
	// título de la ventana de edición:
	$("#edit-section-h1 .edit-title").html(info ? info : "escribir nuevo mensaje");
};

function dispatchProgress(p) {
	var event = document.createEvent("Event");
	event.initEvent("change", true, true);
	event.customData = p;
	document.getElementById("progress").dispatchEvent(event);
};

/* Carga de un tablón en la ventana de mensajes */
function loadBoard(id) {
	currentBoard = getBoard(id);
	loadData(currentBoard, function (data) {
		uiSelectBoard(id, data);
	});
};

/* Selecciona el board actual en la interfaz */
function uiSelectBoard(board, data) {
	// selección del tablón actual en el menú lateral
	$(".board-selector.on").removeClass("on");
	$("#"+board).addClass("on");
	// información sobre el tablero actual:
	console.log("datos", board, data);
	$boardTitle = $("#board-title");
	$boardDescription = $("#board-description");
	var title, description;
	if (board == "sigo") {
		title = "Mensajes de usuarios y temas que sigo";
	} else if (board == "todo") {
		title = "Todos los mensajes de Eskup";
	} else if (board == "mios") {
		title = "Mensajes enviados por mí";
	} else if (board == "priv") {
		title = "Mis mensajes privados";
	} else if (board == "favs") {
		title = "Mis mensajes favoritos";
	} else {

	};
	$boardTitle.text(title);
};


