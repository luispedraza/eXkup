var MARGIN = 60;	// marge estándar para los gráficos
var PROCESSOR = null;
var VISUALIZER = null;
var FREQUENCIES = null;
var CONVERSATION = null;

function initThread(apiData) {
	PROCESSOR = new DataProcessor(apiData);
	FREQUENCIES = new FrequencyVisualizer("#d3-frequency", PROCESSOR, MARGIN);
	VISUALIZER = new TalkVisualizer("#d3-chart", PROCESSOR, MARGIN);
	CONVERSATION = new Conversation(PROCESSOR.tree); // conversación: mensajes de la barra izquierda
	populateController(PROCESSOR);
};

var TEST = 1;
if ((typeof SAMPLE_DATA != "undefined") && (typeof TEST != "undefined")) {
	if (TEST === 0) { TEST = SAMPLE_DATA._testTiny;
	} else if (TEST === 1) { TEST = SAMPLE_DATA._testSmall;
	} else if (TEST === 2) { TEST = SAMPLE_DATA._testMedium;
	} else if (TEST === 3) { TEST = SAMPLE_DATA._testBig;
	};
	initThread(TEST);
} else {
	chrome.runtime.onMessage.addListener (
		function(request, sender) {
			initThread(request.info);
		});
};

function sortUsers(sorting) {
	var sorting = $(this).attr("data-field");
	var $list = $("#chart-control .users-list .list");
	var $items = $list.find("li");
	$items = $items.sort(function(a,b) {
		if (sorting=="nickname") {
			if ($(a).data().nickname < $(b).data().nickname) return -1;
			else if ($(a).data().nickname > $(b).data().nickname) return 1;
			return 0;
		} else {	// valores numéricos
			if (($(a).data()[sorting]||0) > ($(b).data()[sorting]||0)) return -1;
			else if (($(a).data()[sorting]||0) < ($(b).data()[sorting]||0)) return 1;
			return 0;
		};
	});
	$items.detach().appendTo($list);
};
/* Mensaje de cambio de selección */
function dispatchSelect(type, value, add) {
	var e = document.createEvent("CustomEvent");
	var detail = {'add': add,'type': type,'value':value};
	e.initCustomEvent("updateSelection", false, false, detail);
	document.body.dispatchEvent(e);
};

function dispatchConversation(message) {
	var e = document.createEvent("CustomEvent");
	var detail = {'message': message};
	e.initCustomEvent("conversation", false, false, detail);
	document.body.dispatchEvent(e);
};

function dispatchTimeRange(range) {
	var e = document.createEvent("CustomEvent");
	var detail = {'range': range};
	e.initCustomEvent("timeRange", false, false, detail);
	document.body.dispatchEvent(e);
};
function dispatchTimeRangeMove(range) {
	var e = document.createEvent("CustomEvent");
	var detail = {'range': range};
	e.initCustomEvent("timeRangeMove", false, false, detail);
	document.body.dispatchEvent(e);
};

/* Configuración de las opciones del gráfico */
function updateSelector() {
	var selID = $("#chart-options .layout.on").attr("id");
	$("#chart-options .options").toggleClass('active', selID!="set-interaction");
};
updateSelector();


/* EVENTOS */

// Cambio de lógica de selección
$("#switch").on("click", function() {
	$(this).toggleClass("OR AND");
	PROCESSOR.selectMode($(this).hasClass("AND") ? "AND" : "OR");
	VISUALIZER.updateGraph();
});
// selección de todos los usuarios
$("#check-all-users").on("click", function() {
	var $checkAll = $(this);
	$checkAll.toggleClass('on');
	var sel0 = $("#chart-control .users-list li .check.on")
		.map(function() {
			return $(this).closest("li").data().nickname;
		})
		.get();
	$("#chart-control .users-list li .check").toggleClass('on', $checkAll.hasClass('on'));
	var sel1 = $("#chart-control .users-list li .check.on")
		.map(function() {
			return $(this).closest("li").data().nickname;
		})
		.get();
	if (sel1.length>sel0.length) {
		// se añade la nueva selección de usuarios
		sel1 = sel1.filter(function(s) {return sel0.indexOf(s)<0;});
		dispatchSelect("user", sel1, true)
	} else {
		dispatchSelect("user", sel0, false);	
	};
});
// Ordenación de usuarios:
$("#chart-control .sort-users").on("click", sortUsers);

$(".expandable").draggable();
function updateConfiguration() {
	var layoutID = $("#chart-options .layout.on").attr("id");
	var layout = layoutID.split("-")[1];
	var options= {};
	$("#chart-options .option").each(function() {
		options[this.id] = $(this).hasClass('on');
	});
	VISUALIZER.config({layout: layout, options: options});
};

$("#chart-options").draggable();
$("#chart-options .layout").on("click", function() {
	var $this = $(this);
	if ($this.hasClass('on')) return;
	$("#chart-options .layout").removeClass('on');
	$this.addClass('on');
	updateSelector();
	updateConfiguration();
});
$("#chart-options .option").on("click", function() {
	var $this = $(this);
	var selected = $this.hasClass('on');
	$("#chart-options .option").removeClass('on');
	$this.toggleClass('on', !selected);
	updateConfiguration();
});

$(window).resize(function() {
	clearTimeout(window.doResize);
	window.doResize = setTimeout(function() {
		VISUALIZER.updateGraph();
		FREQUENCIES.updateGraph();
	}, 1000);
});

/* Actualización de filtros */
document.body.addEventListener("updateSelection", function(e) {
	PROCESSOR.select(e.detail);
	VISUALIZER.updateGraph();
	FREQUENCIES.updateGraph();
	CONVERSATION.update();
});
/* Selección de conversación */
document.body.addEventListener("conversation", function(e) {
	var message = e.detail.message;
	CONVERSATION.expand(message);
});
/* Selección de un nuevo rango de tiempo */
/* Selección de conversación */
document.body.addEventListener("timeRange", function(e) {
	var range = e.detail.range;
	VISUALIZER.selectTimeRange(range);
});
document.body.addEventListener("timeRangeMove", function(e) {
	var range = e.detail.range;
	VISUALIZER.moveTimeRange(range);
});

