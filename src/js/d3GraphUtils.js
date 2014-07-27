/* Para mostrar información contextual sobre un elementos */
function ChartTooltip(whereMouseMoved,x,y,content,config) {
	if (typeof config == "undefined") config = {};
	var delay = config.delay || 800;
	var autoClose = config.autoClose || "yes";
	if (!typeof delay ==="undefined") delay=800;
	$(whereMouseMoved).on("mouseleave",function() {
		clearTimeout(timeout);
		if (autoClose=="yes") close();
		$(this).off("mouseleave");
	});
	var $element = $("<div>");
	var timeout = setTimeout(initTooltip, delay);
	function initTooltip() {
		$element.addClass("message-detail")
			.css({"left": x, "top": y})
			.append($("<div>").addClass('tooltip-header'))
			.append(content)
			.draggable()
			.appendTo('#d3-chart-container');
		if (!autoClose) {
			$element.find(".tooltip-header")
				.append($("<div>").addClass('close fa fa-times')
					.on("click", close));
		};
	};
	function close() {
		$element.remove();
	};
};