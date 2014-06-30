var TEST = 2;
var VISUALIZER = null;

if ((typeof SAMPLE_DATA != "undefined") && (typeof TEST != "undefined")) {
	if (TEST === 0) { TEST = SAMPLE_DATA._testTiny;
	} else if (TEST === 1) { TEST = SAMPLE_DATA._testSmall;
	} else if (TEST === 2) { TEST = SAMPLE_DATA._testMedium;
	} else if (TEST === 3) { TEST = SAMPLE_DATA._testBig;
	};
	VISUALIZER = new TalkVisualizer(TEST);
} else {
	chrome.runtime.onMessage.addListener (
		function(request, sender) {
			VISUALIZER = new TalkVisualizer(request.info);
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

/* EVENTOS */
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
$(".expand").on("click", function() {
	var $expandable = $(this).closest(".expandable").toggleClass('on');
	var newSize = "";
	if ($expandable.hasClass('on')) {
		var newSize = $expandable.attr("data-width");
		if (newSize=="max") {
			newSize = (window.innerWidth - $expandable.offset().left - 20) + "px";
		};
	};
	$expandable.css("width", newSize);
});

$("#set-timeline").on("click", function() {
	VISUALIZER.config({layout:"timeline"});
});
$("#set-tree").on("click", function() {
	VISUALIZER.config({layout:"tree"});
});

