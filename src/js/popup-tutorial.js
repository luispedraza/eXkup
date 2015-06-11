/* Tutorial de la extensión utilizando Tourist */

function startTutorial(){

	function loadLibraries() {
		/* Carga de una hoja de estilos */
		loadCSS = function(href) {
			var cssLink = $("<link rel='stylesheet' type='text/css' href='"+href+"'>");
			$("head").append(cssLink); 
		};
		/* Carga de un script JS*/ 
		loadJS = function(src) {
			var jsLink = $("<script type='text/javascript' src='"+src+"'>");
			$("head").append(jsLink); 
		};
		var underscore_js = "lib/backbone/underscore-min.js"
		var backbone_js = "lib/backbone/backbone-min.js";
		var tourist_js = "lib/tourist/tourist.js";
		var tourist_css = "lib/tourist/tourist.css";
		var popover_css = "lib/tourist/my-popover.css";
		loadJS(underscore_js);
		loadJS(backbone_js);
		loadJS(tourist_js);
		loadCSS(tourist_css);
		loadCSS(popover_css);
		$(document).ready(startTutorial);
	};
	if (typeof Tourist === "undefined") {
		loadLibraries();
		return;	
	};

	window.setTimeout(function() {
		new ModalDialog({
			title: "Tutorial de la extensión",
			content: "A continuación se mostrará un tutorial guiado que te ayudará a conocer las principales caracteríasticas de esta extensión",
			buttons: ["OK"],
			callback: function(r) {
				if (r==="OK") {
					var steps = [{
						target: $('#msg-section'),
						content: '<p>Esta sección es el selector de mensajes. Puedes seleccionar los principales tablones de Eskup</p>',
						highlightTarget: true,
						nextButton: true,
						my: 'left center',
						at: 'right center',
						closeButton: true
					}, {
						content: '<p>Los mensajes contenidos en el tablón seleccionado aparecerán aquí.</p>',
						highlightTarget: true,
						nextButton: true,
						target: $('#board .message:nth-child(2)'),
						my: 'bottom center',
						at: 'top center',
						closeButton: true
					}, {
						content: '<p>Aquí se muestra el título del tablón actual. Haciendo click sobre él obtendrás más información sobre el mismo.</p>',
						highlightTarget: true,
						nextButton: true,
						target: $('#board-info'),
						my: 'top center',
						at: 'bottom center',
						closeButton: true
					}, {
						content: '<p>Puedes moverte por la lista de tablones visitados, y realizar búsquedas de texto dentro del tablón mostrado actualmente.</p>',
						highlightTarget: true,
						nextButton: true,
						target: $('#board-info .nav'),
						my: 'top right',
						at: 'bottom center',
						closeButton: true
					}, {
						content: '<p>Este es un tablón especial sólo disponible a través de desta extensión. Los mensajes que guardes como favoritos se guardarán localmente en tu navegador, y podrás acceder a ellos siempre que quieras. Esta es una característica esperimental que puede cambiar en el futuro.</p>',
						highlightTarget: true,
						nextButton: true,
						target: $('#favs'),
						my: 'left center',
						at: 'right center'
					}, {
						content: '<p>En esta otra sección de la barra de navegación puedes seleccionar los temas que sigues en Eskup.</p>',
						highlightTarget: true,
						nextButton: true,
						target: $('#thm-section'),
						my: 'left center',
						at: 'right center'
					}, {
						content: '<p>Para escribir un nuevo mensaje sólo tienes que pulsar un botón</p>' + 
							'<p class="action">Pulsa el botón "NUEVO MENSAJE" para continuar el tutorial.</p>',
						highlightTarget: true,
						target: $('#edit-button'),
						my: 'bottom left',
						at: 'top center',
						closeButton: true,
						setup: function(tour, options) {
							$("#edit-button").on("mouseup", function() {
								setTimeout(function() {
									tour.next();
								}, 200);
							});
						},
						teardown: function(tour, options) {
							$("#edit-button").off("mouseup");
						}
					}, {
						content: '<p>Puedes controlar la apariencia del mensaje con letras negritas o cursivas, insertar enlaces a las pestañas abiertas en el navegador, o incluir una imagen capturada de la página actual.</p>',
						highlightTarget: true,
						nextButton: true,
						closeButton: true,
						setup: function() {
							return { target: $('#toolbar') };
						},
						my: 'top center',
						at: 'bottom center'
					}, {
						content: '<p>También puedes seleccionar los temas donde publicar tus mensajes, o enviar mensajes privados a otros usuarios. ¡Utiliza el buscador en cada caso!</p>',
						highlightTarget: true,
						nextButton: true,
						closeButton: true,
						setup: function() {
							var i = $("#send2user input").focus();
							i.val("Luis Pedraza");
							var e = $.Event("keyup");
							i.trigger(e);
							return { target: $("#destinations")};
						},
						teardown: function() {
							$("#cancel").click();
						},
						my: 'bottom left',
						at: 'top center'
					}, {
						content: '<p>Aquí arriba puedes ver tu nombre de usuario y avatar.</p>' +
								'<p class="action">Haz click en tu nombre de usuario para seguir el tutorial</p>',
						highlightTarget: true,
						target: $('#profile-item'),
						my: 'top left',
						at: 'bottom center',
						closeButton: true,
						setup: function() {
							$("#profile-item").on("mouseup", function() {
								setTimeout(function() {
									tour.next();
								}, 200)
							});
						},	
						teardown: function() {
							$("#profile-item").off("mouseup");
						}
					}, {
						content: '<p>Aquí podrás ver información como los usuarios que sigues, o que te siguen, o los temas que sigues o en los que puedes escribir.</p>',
						highlightTarget: true,
						nextButton: true,
						target: $('#follow-to'),
						my: 'bottom center',
						at: 'top center',
						closeButton: true,
						setup: function() {
							setTimeout(function() {
								$("#follow-to").toggleClass("on");
								$("#follow-to h4").click();
							}, 1000);
						}
					}, {
						content: '<p>Finalmente, aquí arriba encontrarás botones para cerrar tu sesión de Eskup, o repetir este tutorial en otro momento.</p>',
						highlightTarget: true,
						nextButton: true,
						target: $('#profile-toolbar'),
						my: 'top right',
						at: 'bottom center',
						closeButton: true,
						teardown: function() {
							$("#profile-item").click();
						}
					}];
					// Código del tutorial:
					var tour = new Tourist.Tour({
						steps: steps
					});
					tour.start();
				};
			}
		});
	},500);
};
