/* Tutorial de la extensión utilizando Tourist */

function startTutorial(){
	var steps = [{
		content: '<p>First look at this thing</p>',
		highlightTarget: true,
		nextButton: true,
		target: $('#profile-item'),
		closeButton: true
	}, {
		content: '<p>First look at this thing</p>',
		highlightTarget: true,
		nextButton: true,
		target: $('#msg-section'),
		my: 'left center',
		at: 'right center'
	}, {
		content: '<p>And then at this thing</p>',
		highlightTarget: true,
		nextButton: true,
		target: $('#thm-section'),
		my: 'left center',
		at: 'right center'
	}];
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
		var tourist_js = "lib/tourist/tourist.min.js";
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
	// Código del tutorial:
	var tour = new Tourist.Tour({
		steps: steps
	});
	tour.start();
};