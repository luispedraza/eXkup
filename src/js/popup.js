var API = new EskupApi();	// La API de Eskup
var EDITOR = null;			// El editor de mensajes
var LOADING = false;
var CURRENT_THEME = null;	// el tablón actual
var HISTORY = [];			// historial de tablones, para navegacion
var HISTORY_POSITION = -1;	// posición sobre HISTORY
var CURRENT_PAGE = 1;

/*
 * jQuery Highlight Regex Plugin v0.1.2
 *
 * Based on highlight v3 by Johann Burkard
 * http://johannburkard.de/blog/programming/javascript/highlight-javascript-text-higlighting-jquery-plugin.html
 *
 * (c) 2009-13 Jacob Rothstein
 * MIT license
 */!function(a){var b=function(c){if(c&&c.childNodes){var d=a.makeArray(c.childNodes),e=null;a.each(d,function(a,d){3===d.nodeType?""===d.nodeValue?c.removeChild(d):null!==e?(e.nodeValue+=d.nodeValue,c.removeChild(d)):e=d:(e=null,d.childNodes&&b(d))})}};a.fn.highlightRegex=function(c,d){return"object"==typeof c&&"RegExp"!==c.constructor.name&&(d=c,c=void 0),"undefined"==typeof d&&(d={}),d.className=d.className||"highlight",d.tagType=d.tagType||"span",d.attrs=d.attrs||{},"undefined"==typeof c||""===c.source?a(this).find(d.tagType+"."+d.className).each(function(){a(this).replaceWith(a(this).text()),b(a(this).parent().get(0))}):a(this).each(function(){var e=a(this).get(0);b(e),a.each(a.makeArray(e.childNodes),function(e,f){var g,h,i,j,k,l;if(b(f),3==f.nodeType){if(a(f).parent(d.tagType+"."+d.className).length)return;for(;f.data&&(j=f.data.search(c))>=0&&(k=f.data.slice(j).match(c)[0],k.length>0);)g=document.createElement(d.tagType),g.className=d.className,a(g).attr(d.attrs),l=f.parentNode,h=f.splitText(j),f=h.splitText(k.length),i=h.cloneNode(!0),g.appendChild(i),l.replaceChild(g,h)}else a(f).highlightRegex(c,d)})}),a(this)}}(jQuery);

/* Carga dinámica de mensajes en el scroll del board */
function enableDynamicLoad(enable) {
	if (enable) {
		$("#board").on("scroll", function() {
			if (CURRENT_THEME.id == "favs") return;
			if (this.scrollTop+this.offsetHeight >= this.scrollHeight) {
				loadBoardMessages(null);
			};
		});
	} else {
		$("#board").off("scroll");
	};
};

/* Clase para realizar búsquedas sobre los mensajes */
function SearchFunction() {
	var $board = null;
	var $allResults = null;
	var term = null;			// término a buscar
	var termRegexp = null;
	var currentResult = 0;
	var nMessages = 0;			// total de mensajes buscados
	var scrollable = false;		
	var THAT = this;
	/* Función de búsqueda */
	this.enableSearch = function(board, isScrollable) {
		if (board) {
			$board = $(board);
			scrollable = isScrollable;	// para el tablón de mensajes
			enableDynamicLoad(false);
		} else {
			THAT.clear();
			enableDynamicLoad(true);
		};
	};
	var scrollToCurrentResult = function() {
		$("#search-info").text((currentResult+1) + " de " + $allResults.length + " en " + nMessages + " mensajes");
		$allResults.removeClass('current');
		var current = $allResults[currentResult];
		if (current) {
			current.className += " current";	// resultado actual
			current.scrollIntoView();
			$board.scrollTop($board.scrollTop()-80);	// para evitar la barra superior
		};
	};
	var updateSearch = function($messages) {
		nMessages += $messages.length;
		var $newResults = $messages.highlightRegex(termRegexp).find("span.highlight");
		if ($newResults.length) {
			$allResults = $allResults.add($newResults);
		} else {
			currentResult = $allResults.length-1;	// se mantiene en el último resultado
		};
		scrollToCurrentResult();
	};

	this.search = function(searchTerm) {
		if ((searchTerm === 1)||(term === searchTerm)) {	// avance en resultados
			currentResult++;
			if (currentResult < $allResults.length) {
				scrollToCurrentResult();	// vamos al siguiente resultado
			} else if (scrollable) {
				// se cargan más mensajes
				loadBoardMessages(null, updateSearch);
			} else {
				currentResult = $allResults.length;
			};
		} else if (searchTerm === -1) {
			currentResult--;
			if (currentResult>=0) {
				scrollToCurrentResult();
			} else {
				currentResult = 0;
			};
		} else {		// nuevo término de búsqueda
			THAT.clear();
			term = searchTerm;
			termRegexp = makeRegexp(term);
			var $messages = $board.find(".message");
			updateSearch($messages);
		};
	};
	/* Limpia los resultados de esta búsqueda */
	this.clear = function() { 
		if ($board) {
			$board.find(".message").highlightRegex(); 	// limpieza
			$("#search-info").text("");
			$allResults = $();
			currentResult = 0;
			nMessages = 0;
			term = null;
		};
	};
};

var SEARCHER = new SearchFunction();	// para buscar en el tablón o en el thread

function showSearchForm(show) {
	$form = $("form.search").toggleClass('on', show);
	if ($form.hasClass('on')) {
		switch (CURRENT_THEME.type) {
			case "board":
				SEARCHER.enableSearch("#board", true);
				break;
			case "thread":
				SEARCHER.enableSearch("#tree", false);
				break;
		};
		$form.find("#searchTXT").focus();
	} else {
		SEARCHER.enableSearch(false);
		$form.find("#searchTXT").val("");
	};
};

/* Función que se ejecuta al pulsar en nuevo mensaje */
function onNewMessage() {
	showEditor(true);
	// $("#edit-section-h1").off();	// se vuelve a cerrar presionando cancel
};

/* Función que se ejecuta al cancelar en el editor */
function onCancelEditor() {
	$("#replying-message").remove();	// si se estuviera respondiendo a un mensaje
	showEditor(null);					// se oculta y resetea el editor
	// $("#edit-section-h1").off().on("click", onNewMessage);
};

/* INICIALIZACIÓN DEL POPUP */
window.addEventListener("load", function() {
	/* Obtención de la clave pública de usuario, e inicialización del perfil */
	API.init(function(userID) {
		if (!userID) {
			chrome.tabs.create({url:"http://eskup.elpais.com/index.html"});
			return;
		};
		EDITOR = new Editor("#editor-container", API, function() {
			$("#cancel").on("click", onCancelEditor);
		});	// se innicializa en este contenedor 
		TABLONES["mios"] = "t1-" + userID;
		fillHeader();
		fillThemes();

		// Eventos
		/* Elementos de búsqueda de texto */
		$("form.search").on("submit", function(e) {
			event.preventDefault();
			SEARCHER.search($(this).find("#searchTXT").val());	// comenzar búsqueda
	        return false;
		});
		$("#search-down").on("click", function() {
			SEARCHER.search(1);
		});
		$("#search-up").on("click", function() {
			SEARCHER.search(-1);
		});
		$("#search-button").on("click", function() {
			showSearchForm();
		});
		$(document).on("keydown", function(e) {
			if((event.ctrlKey || event.metaKey) && event.which == 70) {
				showSearchForm();
	            // event.preventDefault();
	            // return false;
	        };
		});
		/* Navegación histórica */
		$("#history-left").on("click", function() {loadBoard(-1);});
		$("#history-right").on("click", function() {loadBoard(1);});
		enableDynamicLoad(true);
		$(".board-selector").on("click", function() { loadBoard(this.id); });
		$("#logout").on("click", function() { 
			new ModalDialog("Cerrar sesión",
				"¿Deseas cerrar tu sesión en Eskup?", 
				["Aceptar", "Cancelar"], function(r) {
					if (r=="Aceptar") API.logOut();
				});
		});
		$("#closetree").on("click", function() {
			loadBoard(-1);
			// showTreeBoard(false);
		});
		$("#noindent").on("click", function() {
			$(this).toggleClass('on');
			$("#tree").toggleClass('no-indent');
		});
		$("#mouse-follow").on("click", function() {
			$(this).toggleClass('on');
		});
		$("#edit-section-h1").on("click", onNewMessage);
		/* Mostrar el perfil */
		$("#profile-item").on("click", function() {
			showProfile();
			fillProfile();
		});
		// Mostrar secciones del perfil
		$("#profile-section .selector-item h4").on("click", function() {
			$("#profile-section .selector-item").removeClass('on');
			$(this).closest(".selector-item").addClass('on');
		});
		$("#follow-to h4").on("click", fillFollowTo);
		$("#follow-me h4").on("click", fillFollowMe);
		$("#themes-follow h4").on("click", fillFollowThemes);
		$("#themes-write h4").on("click", fillWritableThemes);
		/* Información sobre el tablón actual */
		$("#board-title").on("click", function() {
			$("#messages-header").toggleClass("on");
		});
		/* Muestra la visualiación de un thread */
		$("#show-d3").on("click", function() {
			var threadID = $("#tree-board").attr("data-thread");
			API.loadThread(threadID, function(info) {
				chrome.tabs.create({url:"d3Thread.html", active:false}, function(tab) {
					var theTabID = tab.id;
					chrome.tabs.onUpdated.addListener(function(tabId , changedInfo) {
						if ((tabId == theTabID) && (changedInfo.status == "complete")) {
							chrome.tabs.sendMessage(theTabID, {info: info});
							chrome.tabs.update(theTabID, {active: true});	// activamos la nueva pestaña
						};
					});
				});
			});
		});

		// Inicialización de contenidos
		chrome.tabs.executeScript({ file: "exe/elpais.js" }, function(result) {
			if (result && (result = result[0])) {
				switch (result.type) {
					case "thread":
						loadBoard(null, result.id, result.id);
						break;
					case "theme":
						loadBoard("ev-" + result.id);
						break;
					case "user":
						loadBoard("t1-" + result.id);
						break;
				};
			} else {
				// cargar tablón de eventos seguidos
				var evObj = document.createEvent('MouseEvents');
			    evObj.initEvent("click", true, false);
			    document.getElementById("sigo").dispatchEvent(evObj);
			};
		});	
	});
});

/* Gestión de la ventana de edición 
	@param config: 	true o false: muestra u oculta el editor
					null: resetea el editor y lo cierra
					si se pasa un objeto, se muestra el editor con esa configuración
*/
function showEditor(config) {
	if (typeof config === "object") {
		var infoMessage = "ESCRIBIENDO UN NUEVO MENSAJE";
		if (config) {
			switch (config.command) {
				case "replyPrivate":
					infoMessage = "RESPONDIENDO AL MENSAJE PRIVADO:";
					break;
				case "reply":
					infoMessage = "RESPONDIENDO AL MENSAJE:";
					break;
				case "forward":
					infoMessage = "REENVIANDO EL MENSAJE:";
					break;
			};
		};
		$("#edit-section").toggleClass('on', config != null)
			.find(".edit-description").text(infoMessage);
		EDITOR.configure(config);	// configuración del editor	
	} else {
		$("#edit-section").toggleClass("on", config);
	};
};

/* Carga de un tablón en la ventana de mensajes 
	@param id: identificador del tablón,
				-1: retrocede en el historial
				1: avanza en el historial
				null: se pide un thread, entonces se usan threadID, originalMsgID
*/
function loadBoard(id, threadID, originalMsgID) {
	showSearchForm(false);
	var previousTheme = null;
	if (id === -1) {
		if (HISTORY_POSITION>0) {
			previousTheme = HISTORY[HISTORY_POSITION];
			CURRENT_THEME = HISTORY[--HISTORY_POSITION];
		} else return;
	} else if (id === 1) {
		if (HISTORY_POSITION<(HISTORY.length-1)) {
			previousTheme = HISTORY[HISTORY_POSITION];
			CURRENT_THEME = HISTORY[++HISTORY_POSITION];
		} else return;
	} else {
		if (id === null) {	// thread
			if (CURRENT_THEME && (CURRENT_THEME.type == "thread") && (CURRENT_THEME.id == threadID)) return; // se pide el mismo thread
			CURRENT_THEME = {type: "thread", id: threadID, original: originalMsgID};
		} else {			// tablón
			var newBoard = getBoard(id);
			if (CURRENT_THEME && (CURRENT_THEME.type == "board") && (CURRENT_THEME.id == newBoard)) return; 	// se pide el mismo tablón
			CURRENT_THEME = {type: "board", id: newBoard};
		};
		HISTORY = HISTORY.slice(0, ++HISTORY_POSITION);
		HISTORY.push(CURRENT_THEME);
	};

	/* Gestión de los botones de navegación */
	$("#history-left").toggleClass('disabled', HISTORY_POSITION==0);
	$("#history-right").toggleClass('disabled', HISTORY_POSITION==HISTORY.length-1);

	if (previousTheme && (previousTheme.type == "thread") && (CURRENT_THEME.type != "thread")) {
		// esto es que hemos cerrado un thread
		showTreeBoard(false);
	} else {
		// algo habrá que cargar
		if (CURRENT_THEME.type == "board") {
			if (CURRENT_THEME.id == "favs") {	// los mensajes favoritos los guarda la extensión
				loadFavorites();
			} else {
				loadBoardMessages(CURRENT_THEME.id);
			};
		} else if (CURRENT_THEME.type == "thread") {
			showThread(CURRENT_THEME.id, CURRENT_THEME.original);
		};	
	};
	uiSelectBoard(CURRENT_THEME.id);
};

/* Carga de mensajes de un tablón */
function loadBoardMessages(theme, callback) {
	function noMoreMessages() {
		CURRENT_PAGE = -1;		// no cargar más páginas en el futuro
		$board.append("<div class='no-messages'>No hay más mensajes para mostrar.</div>");
	};
	function infoShowLoadingMessages() {
		LOADING = true;
		$board.append("<div class='loading'><i class='fa fa-spinner fa-spin'></i> CARGANDO...</div>");
	};
	function infoHideLoadingMessages() {
		LOADING = false;
		$board.find(".loading").remove();
	};
	if (LOADING) return;
	if (theme) {
		CURRENT_PAGE = 1;
	} else if (CURRENT_PAGE<0) {
		return;
	} else {
		CURRENT_PAGE++;		// nueva página
	};
	var $board = $("#board");
	if (CURRENT_PAGE == 1) $board.empty();			// limpieza

	infoShowLoadingMessages();
	API.loadMessages(CURRENT_THEME.id, CURRENT_PAGE, function(info) {
		if (info) {
			var messages = info.mensajes;
			var usersInfo = info.perfilesUsuarios;
			var themesInfo = info.perfilesEventos;
			var $newMessages = $();	// empty selection
			if (messages.length == 0) {
				noMoreMessages();
			} else {
				messages.forEach(function(m) {
					if (!m.borrado) {
						API.buildMessage(m, usersInfo);
						// se van agregando nuevos mensajes:
						$newMessages = $newMessages.add(createMessage(m, themesInfo).appendTo($board));	
					};
				});
				if (Math.ceil(info.numMensajes / API.NUMMSG) == CURRENT_PAGE) {
					noMoreMessages();
				};
			};
			showTreeBoard(false);
		};
		infoHideLoadingMessages();
		if (callback) callback($newMessages);	// acción a realizar sobre los nuevos mensajes cargados
		$newMessages = null;
	});
};

/* Selecciona el board actual en la interfaz */
function uiSelectBoard(board) {
	// selección del tablón actual en el menú lateral
	$(".board-selector.on").removeClass("on");
	$("#"+board).addClass("on");
	// información sobre el tablero actual:
	$title = $("#board-title").text("");
	$description = $("<div>").appendTo($("#board-description").empty());
	if (board == getBoard("sigo")) {
		$description
			.append($("<p>").text("Aquí encontrarás todos los mensajes publicados por los usuarios a los que sigues, y en los temas que sigues."));
		$title.text("Mensajes de usuarios y temas que sigo");
	} else if (board == getBoard("todo")) {
		$title.text("Todos los mensajes de Eskup");
	} else if (board == getBoard("mios")) {
		$title.text("Mensajes enviados por mí");
	} else if (board == getBoard("priv")) {
		$title.text("Mis mensajes privados");
	} else if (board == getBoard("favs")) {
		$title.text("Mis mensajes favoritos");
	} else {
		var boardInfo = board.split("-");
		switch (boardInfo[0]) {
			case "ev": 	// UN EVENTO
				$description.addClass("theme-information");
				var theme = boardInfo[1];
				API.loadThemeInfo(theme, function(themeInfo) {
					$("<img>").attr("src", themeInfo.pathfoto).appendTo($description);
					$("<p>").html(themeInfo.descripcion).appendTo($description);
					var $themeControl = $("<div>").attr("class", "theme-control").appendTo(($description));
					var $apoyos = null;
					for (var a in themeInfo.apoyos) {
						var apoyo = themeInfo.apoyos[a];
						var apoyo_title = apoyo.titulo_apoyo;
						var apoyo_link = apoyo.enlace_apoyo;
						if (apoyo_title) {
							$apoyos = ($apoyos || $("<ul>").attr("class", "links"));
							$apoyos.append($("<li>").append( apoyo_link ? makeLink(apoyo_title, apoyo_link) : apoyo_title));
						};
					};
					if ($apoyos) $description.append($apoyos);
					// control de seguimiento
					var followed = (themeInfo.estado_seguimiento == 1);
					$themeControl.append(
						$("<div>").attr("class", "control-item " + ((followed) ? "follow on" : "follow"))
							.attr("data-theme", theme)
							.on("click", onFollowTheme));
					// control de escritura
					var writable = (themeInfo.estado_escritura == 1);
					if (themeInfo.tipo_suscripcion == 1) {
						$themeControl.append(
							$("<div>").attr("class", "control-item " + ((writable) ? "writable on" : "writable"))
								.attr("data-theme", theme)
								.attr("data-tiposuscripcion", themeInfo.tipo_suscripcion)
								.attr("data-tipoevento", themeInfo.tipo_evento)
								.attr("data-writable", themeInfo.estado_escritura)
								.on("click", onWriteTheme));			
					};
					$description.append($themeControl);
					$title.text(themeInfo.nombre);
				});
				break;

			case "t1": 	// UN USUARIO
				$description.addClass("user-information");
				var user = boardInfo[1];
				API.loadProfile(user, function(userInfo) {
					var userURL = "http://eskup.elpais.com/" + user + "/";
					// enlaces de usuario
					var $links = $("<ul>").attr("class", "links");
					$links.append($("<li>").addClass("fa eskup").append(makeLink("Eskup", userURL)));	// perfil de eskup
					if (userInfo.urlblog) $links.append($("<li>").addClass("fa fa-pencil-square").append(makeLink("Blog", userInfo.urlblog)));
					if (userInfo.urltwitter) $links.append($("<li>").addClass("fa fa-twitter").append(makeLink("Twitter", userInfo.urltwitter)));
					if (userInfo.urlwebpersonal) $links.append($("<li>").addClass("fa fa-globe").append(makeLink("Web", userInfo.urlwebpersonal)));
					$description.append($links);
					// avatar
					$("<img>").addClass("avatar").attr("src", checkUserPhoto(userInfo.pathfoto)).appendTo($description);
					// descripción
					$("<p>").html(userInfo.descripcion || "[Este usuario no ha proporcionado nincuna descripción.]").appendTo($description);
					// control de usuario 
					var $userControl = $("<div>").attr("class", "user-control").appendTo(($description));
					$userControl
						.append($("<div>")
							.attr("class", "control-item " + ((userInfo.seguido == 1) ? "follow on" : "follow"))
							.attr("data-user", user)
							.on("click", onFollowUser))
						.append($("<div>")
							.attr("class", "control-item " + ((userInfo.bloqueado == 1) ? "blocked on" : "blocked"))
							.attr("data-user", user)
							.on("click", function() {
								onBlockUser(this);
							}));
					// datos de eskup
					var $stats = $("<div>").addClass('eskup-info')
						.append($("<div>").addClass('stats info-users')
							.append($("<div>").addClass("from")
								.append(makeLink(userInfo.numero_usuarios, userURL + "seguidos")))
							.append($("<div>").addClass("to")
								.append(makeLink(userInfo.numero_seguidores, userURL + "seguidores"))))
						.append($("<div>").addClass('stats info-messages')
							.append($("<div>").addClass("from")
								.append(makeLink(userInfo.numero_mensajes_propios, userURL)))
							.append($("<div>").addClass("to")
								.append(makeLink(userInfo.numero_mensajes_referenciados, userURL + "referencias"))))
						.append($("<div>").addClass('stats info-themes')
							.append($("<div>").addClass("follow")
								.append(makeLink(userInfo.numero_eventos, userURL + "temasseguidos")))
							.append($("<div>").addClass("write")
								.append(makeLink(userInfo.numero_eventos_escribe, userURL + "temasescritos"))));
					$description.append($stats);

					$title.text("Mensajes de @" + user + " - " + userInfo.nombre + " " + userInfo.apellidos);
				});
				break;
			default: 	// UN THREAD
				$title.text("Se está mostrando un thread");
		};
	};
};

/* Seguir o dejar de seguir a un usuario */
function onFollowUser() {
	var $this = $(this);
	var user = $this.attr("data-user");
	var followed = $this.hasClass('on');
	new ModalDialog((followed ? "Dejar de" : "Comenzar a") + " seguir a este usuario", 
		"Si continúas, " + (followed ? "dejarás de seguir" : "comenzarás a seguir") + " a este usuario en Eskup", 
		[(followed ? "Dejar de " : "Comenzar a ") + "seguirlo", "Cancelar"],
		function(result) {
			if (result == "Cancelar") return;
			API.followUsers([user],
				result == "Comenzar a seguirlo",
				function(r) {
					if (r == "OK") {
						$this.toggleClass('on');
						fillProfile();
						fillFollowTo();	// se recargan los usuarios seguidos
					} else {
						new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
					};
				});
		});
};

/* Bloquear o desbloquear a un usuario */
function onBlockUser() {
	var $this = $(this);
	var user = $this.attr("data-user");
	var blocked = $this.hasClass('on');
	new ModalDialog((blocked ? "Desbloquear" : "Bloquear") + " a este usuario", 
		"Si continúas, " + (blocked ? "dejarás de bloquear" : "comenzarás a bloquear") + " a este usuario en Eskup", 
		[(blocked ? "Desbloquear" : "Bloquear"), "Cancelar"],
		function(result) {
			if (result == "Cancelar") return;
			API.blockUsers([user],
				result == "Bloquear",
				function(r) {
					if (r == "OK") {
						$this.toggleClass('on');
					} else {
						new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
					};
					if (callback) callback();
				});
		});
};

/* Seguir o dejar de seguir un tema */
function onFollowTheme() {
	var $this = $(this);
	var theme = $this.attr("data-theme");
	var followed = $this.hasClass('on');
	new ModalDialog((followed ? "Dejar de" : "Comenzar a") + " seguir este tema", 
		"Si continúas, " + (followed ? "dejarás de seguir" : "comenzarás a seguir") + " este tema en Eskup", 
		[(followed ? "Dejar de " : "Comenzar a ") + "seguirlo", "Cancelar"],
		function(result) {
			if (result == "Cancelar") return;
			API.followThemes([theme],
				result == "Comenzar a seguirlo",
				function(r) {
					if (r == "OK") {
						$this.toggleClass('on');
						fillProfile();
						fillFollowThemes();	// se recargan los temas seguidos
						fillThemes();	// se recarga la lista de temas seguidos
					} else {
						new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
					};
				});
		});
};

/* Escribir o dejar de escribir en un tema */
function onWriteTheme() {
	var $this = $(this);
	var theme = $this.attr("data-theme");
	var typesuscription = $this.attr('data-tiposuscripcion');
	// var typeevent = $this.attr('data-tipoevento');
	var writable = $this.attr('data-writable');
	if ((typeof typesuscription === "undefined")||(typesuscription == "1")) {
		// no se precisa autorización
		new ModalDialog(((writable=="1") ? "Dejar de" : "Comenzar a") + " escribir en este tema",
			"Si continúas, " + ((writable=="1") ? "dejarás de escribir" : "comenzarás a escribir") + " en este tema en Eskup", 
			[((writable=="1") ? "Dejar de " : "Comenzar a ") + "escribir", "Cancelar"],
			function(result) {
				if (result == "Cancelar") return;
				API.writeThemes([theme],
					result == "Comenzar a escribir",
					function(r) {
						if (!r.match(/^error/)) {
							$this.toggleClass('on');
							$this.attr("data-writable", ((writable == "1") ? "0" : "1" ));	// cambio estado escritura
							fillProfile();
							fillWritableThemes();	// se recargan los temas en que escribo
						} else {
							new ModalDialog("ERROR", "Se ha producido un error al procesar la petición", ["OK"], null, 2000);
						};
					});
			});
	} else if (typesuscription == "2") {
		// se precisa autorización
		// TODO: hay que hacerlo, pero no sé si quedan eventos de este tipo
	};
};

/* Carga de una conversación completa */
function showThread(threadID, originalMsgID) {
	// var modal = new ModalDialog("Cargando datos",
	// 	"<div class='loading'><i class='fa fa-refresh fa-spin'></i> Por favor, espera mientras se carga la conversación</div>", 
	// 	[]);
	var modal = new ModalDialog("Cargando datos", {type:"spinner", text: "Obteniendo datos del servidor..."}, []);
	API.loadThread(threadID, function(info) {
		// TIC();
		modal.close()
		var $tree = $("#tree").empty();
		var aux = {};
		/* agregar un nuevo nodo: item + children */
		var $highlightedMsg = null;
		/* Función que añade un nuevo elemento a la conversación */
		function addNode(msg, parentID) {
			var msgID = msg.idMsg;
			var $msg = createMessage(msg);
			if (msgID == originalMsgID)
				$highlightedMsg = $msg.addClass('highlighted');	// resaltamos el mensaje de entrada al hilo
			var $newNode = $("<div>").addClass('node')
				.append($("<div>").addClass('item')
					.append($msg));
			aux[msgID] = {node: $newNode};
			if (parentID == null) {
				$tree.append($newNode);
				return;
			};
			var parent = aux[parentID];
			if (!parent.children) {
				parent.children = $("<div>").addClass('children on')
					.appendTo(parent.node)
					.append($("<div>").addClass('more fa fa-minus-square')
						.on("click", function() {
							$(this)
								.toggleClass('fa-minus-square')
								.toggleClass('fa-plus-square')
								.closest('.children').toggleClass('on');
							}));
			};
			parent.children.append($newNode);
		};
		/* Función que se ejecuta cuando termina de procesarse el thread */
		function onEnd() {
			// TOC(true);
			showTreeBoard(true);	// mostramos el resultado
			$treeBoard = $("#tree-board").attr("data-thread", threadID)	// lo guardamos en el board, para visualización
				.off("mousemove").on("mousemove", function(e) {
					if ($("#mouse-follow").hasClass('on')) {
						var treeBoardRect = this.getBoundingClientRect(),
							treeRect = document.getElementById("tree").getBoundingClientRect();
						var alfa = (e.clientX - treeBoardRect.left) / treeBoardRect.width;
						var scroll = Math.floor(alfa*(treeRect.width - treeBoardRect.width));
						$treeBoard.scrollLeft(scroll);
					};
				});
			setTimeout(function() {
				// scroll hasta el mensaje de punto de entrada
				$treeBoard.scrollTop($highlightedMsg.offset().top-$treeBoard.offset().top);
				modal.close();	// ocultamos el diálogo informativo de carga
			}, 1500);
		};
		var messages = info.mensajes;
		addNode(API.buildThreadMessage(messages[0], info.perfilesUsuarios), null);
		var replies = messages.slice(1);	// cojo todas las respuestas al nodo raíz
		var dlgConfig = {	type: "progress",
							data: replies,
							span: 100,
							callbackItem: function(item) {
								addNode(API.buildThreadMessage(item, info.perfilesUsuarios), item.idMsgRespuesta);
							},
							callbackEnd: onEnd};
		modal = new ModalDialog("Procesando " + messages.length + " mensajes",
			dlgConfig, ["Cancelar"], function(r) {
			if (r=="Cancelar") {
				modal.stopProgress();
				$tree.empty();
			};
		});
		modal.runProgress();
		// replies.forEach(function(m) {
		// 	addNode(API.buildThreadMessage(m, info.perfilesUsuarios), m.idMsgRespuesta);
		// });
		
	});
};

function showTreeBoard(show) {
	$(".board").toggleClass('switch', show);
};

/* Función que crea un nuevo mensaje
	@param msg: mensaje a agregar
	@themes: información complementaria (temas)

	@return: nuevo mensaje agregado
*/
function createMessage(msg, themes) {	
	var m_id = msg.idMsg;
	var user = msg.usuarioOrigen;
	var tsMessage = msg.tsMensaje * 1000;	// timestamp del mensaje
	// Creación del nuevo mensaje:
	$msg = $("<div>").addClass('message')
		.attr("data-author", user)
		.attr("data-id", m_id)
		.on("mouseenter", onMessageEnter)
		.on("mouseleave", onMessageExit);
	// La cabecera:
	var $head = $("<div>").addClass('msg_header')
		.append($("<img>").attr("src", msg.pathfoto))
		.append($("<a>").attr("href", "#").addClass("author")
			.text("@" + user + (msg.usuarioOrigenNombre ? (" (" + msg.usuarioOrigenNombre + ")") : ""))
			.attr("data-user", user))
		.append(
			makeLink(getTimeAgo(new Date(tsMessage), new Date()),"http://eskup.elpais.com/" + m_id)
				.addClass("time fa fa-clock-o").attr("data-ts", tsMessage));
	// Mensaje reenviado
	if (msg.reenvio) {
		$head.append($("<span>").addClass('btn reply2link fa fa-retweet')
			.text("mensaje reenviado")
			.attr("data-forward", msg.reenvio)
			.on("click", onForwardedMessageClick));
	};
	// El contenido del mensaje:
	var $content = $("<div>").addClass('msg_content').html(msg.contenido);
	processContent($content, true);				// PROCESAMIENTO DE LOS CONTENIDOS: ENLACES, VÍDEOS...
	if (msg.cont_adicional) {
		$content.append($("<img>").attr("src", msg.cont_adicional));
	};
	// Temas del mensaje
	var $themes = $("<ul>").addClass("themes nodisplay");
	if (themes) {
		var msgThemes = msg.CopiaEnTablones.split( "," ).filter(function(d) {return d.split("-")[0] == "ev"});	// temas del mensajes
		if (msgThemes.length) {
			$themes.removeClass('nodisplay');
			msgThemes.forEach(function(themeKey) {
				var themeID = themeKey.split("-")[1];
				$themes.append($("<li>")
					.attr("data-theme", themeKey)
					.text(themes[themeID].nombre));
			});
			$msg.attr("data-themes", JSON.stringify(msgThemes.map(function(d){return d.split("-")[1];})));
		};
	};
	// Elementos de control:
	var $control = $("<div>").addClass('msg_control')
		.append($("<div>").addClass('btn fav fa fa-star' + (API.checkFavorite(m_id) ? " on" : ""))
			.text(" favorito"))
		.append($("<div>").addClass('btn reply fa fa-mail-reply')
			.text(" responder"))
		.append($("<div>").addClass('btn fwd fa fa-retweet')
			.text(" reenviar"));
	// Hilos de mensajes
	if (msg.idMsgRespuesta && (msg.idMsgRespuesta != m_id)) {
		$head.append($("<span>").addClass('btn reply2link fa fa-mail-reply')
			.text(msg.autorMsgRespuesta + ((msg.usuarioRespuestaNombre) ? (" (" + msg.usuarioRespuestaNombre + ")") : ""))
			.attr("data-reply", msg.idMsgRespuesta)
			.on("click", onReplyClick));
		$control.append($("<div>").addClass('btn thlink fa fa-comments')
			.text(" charla")
			.attr("data-thread", msg.hilo)
			.on("click", onShowThreadClick));
	};
	// Mensaje propio
	if (user == API.getUserNickname()) {
		$control.append($("<div>").addClass('btn delete fa fa-trash-o')
			.text(" borrar"));
	};
	return $msg.append([$head, $content, $themes, $control]);
};

/* Carga de mensajes favoritos */
function loadFavorites() {
	API.loadFavorites(function(data) {
		var $favs = $("#board").empty();
		data.forEach(function(mID) {
			var msg = localStorage.getItem(mID);
			if (msg) {
				$favs.append(createMessage(JSON.parse(msg))).addClass('favorite');	
			};
		});
	});
};

/* Rellena la información de usuario en la página de perfil */
function fillProfile() {
	API.loadProfile(null, function(user) {
		$("#profile-avatar").attr("src", checkUserPhoto(user.pathfoto));
		$("#profile-nickname").text("@" + API.getUserNickname());
		$("#profile-fullname").text((user.nombre + user.apellidos).trim());
		$("#profile-description").text(user.descripcion);
		$("#follow-to .number").text(user.numero_usuarios);
		$("#follow-me .number").text(user.numero_seguidores);
		$("#themes-follow .number").text(user.numero_eventos);
		$("#themes-write .number").text(user.numero_eventos_escribe);
	});
};

/* Muestra u oculta el perfile */
function showProfile() {
	$(this).toggleClass('on');
	$("#profile-container").toggleClass('on');
	// $("#profile-container .selector-item").removeClass('on');	// para obligar recarga en click
};

/* Carga en el perfil la lista de usuarios a quienes sigo */
function fillFollowTo() {
	API.loadFollowUsers(1, function(users) {
		var $ul = $("#follow-to ul").empty();
		sortArray(users, "nickname").forEach(function(user) {
			var nickname = user.nickname;
			$ul.append(
				$("<li>")
					.append($("<div>").addClass('theme-control')
						.append($("<div>").addClass("control-item follow on")
							.attr("data-user", nickname)
							.on("click", onFollowUser)))
					.append($("<img>").attr("src", checkUserPhoto(user.pathfoto)).addClass(user.activo ? "online" : ""))
					.append($("<div>").addClass("puser-info")
						.append($("<div>").addClass("puser-nickname").attr("data-user", nickname).text("@" + nickname).on("click", function() {
							loadBoard("t1-" + $(this).attr("data-user"));
							showProfile();
						}))
						.append($("<div>").addClass("puser-fullname").text(user.nombre + " " + user.apellidos))
						)
				);
		});
	});
};

/* Carga en el perfil la lista de usuarios que me siguen */
function fillFollowMe() {
	API.loadFollowUsers(2, function(users) {
		var $ul = $("#follow-me ul").empty();
		sortArray(users, "nickname").forEach(function(user) {
			var nickname = user.nickname;
			$ul.append(
				$("<li>")
					.append($("<img>").attr("src", checkUserPhoto(user.pathfoto)).addClass(user.activo ? "online" : ""))
					.append($("<div>").addClass("puser-info")
						.append($("<div>").addClass("puser-nickname").attr("data-user", nickname).text("@" + nickname).on("click", function() {
							loadBoard("t1-" + $(this).attr("data-user"));
							showProfile();
						}))
						.append($("<div>").addClass("puser-fullname").text(user.nombre + " " + user.apellidos))
						)
				);
		});
	});
};

/* Carga en el perfil la lista de temas seguidos */
function fillFollowThemes() {
	API.loadFollowedThemes(function(themes) {
		var $ul = $("#themes-follow ul").empty();
		for (var t in themes) {
			var theme = themes[t];
			$ul.append(
				$("<li>")
					.append($("<div>").addClass('theme-control')
						.append($("<div>").addClass("control-item follow on")
							.attr("data-theme", t)
							.on("click", onFollowTheme)))
					.append($("<img>").attr("src", theme.pathfoto).addClass("big"))
					.append($("<div>").addClass("theme-info")
						.append($("<div>").addClass("ptheme-name").attr("data-theme", "ev-"+t).text(theme.nombre).on("click", function() {
							loadBoard($(this).attr("data-theme"));
							showProfile();
						}))
						.append($("<div>").addClass("ptheme-description").html(theme.descripcion))
						));
		};
	});
};

/* Carga en el perfil la lista de temas en los que puedo escribir */
function fillWritableThemes() {
	API.loadWritableThemes(function(themes) {
		var $ul = $("#themes-write ul").empty();
		for (var t in themes) {
			var theme = themes[t];
			$ul.append(
				$("<li>")
					.append($("<div>").addClass('theme-control')
						.append($("<div>").addClass("control-item writable on")
							.attr("data-theme", t)
							.attr("data-writable", "1")
							.on("click", onWriteTheme)))
					.append($("<img>").attr("src", theme.pathfoto).addClass("big"))
					.append($("<div>").addClass("theme-info")
						.append($("<div>").addClass("ptheme-name").attr("data-theme", "ev-"+t).text(theme.nombre).on("click", function() {
							loadBoard($(this).attr("data-theme"));
							showProfile();
						}))
						.append($("<div>").addClass("ptheme-description").html(theme.descripcion))
						)
				);
		};
	});
};

/* Rellena la cabecera del popup con información del usuario */
function fillHeader() {
	API.loadProfile(null, function(user) {
		$("#user-avatar").attr("src", checkUserPhoto(user.pathfoto));
		$("#user-nickname").text("@" + API.getUserNickname());
	});
};

/* Rellenar la lista de temas seguidos en el el menú de navegación */
function fillThemes() {
	API.loadFollowedThemes(function(themes) {
		$divThemes = $("#themes-follow").empty();
		themes = sortArray(makeArray(themes), "nombre");
		themes.forEach(function(theme) {
			themeID = "ev-"+theme.__key;
			var $item = $("<li>")
				.attr("class", "board-selector")
				.attr("data-theme", themeID)
				.attr("id", themeID)
				.text(theme.nombre)
				.on("click", function() { loadBoard($(this).attr("data-theme")); })
				.appendTo($divThemes);
		});
	});
};
