/* Visualización de frecuencias */
function FrequencyVisualizer(element, processor, margin) {
	/* datos de histograma */
	function getData() {
		return processor.getFrequencies().data;
	};
	/* rango de tiempos */
	function getRange() {
		return processor.getFrequencies().tsRange;	
	};
	var container = document.querySelector(element);
	d3.select(container).style({"left": margin+"px", "right": margin+"px"});

	var graph = new Rickshaw.Graph({
		element: container,
		series: [{
			color: "rgba(112, 230, 214, 0.5)",
			data: getData(),
			name: "Mensajes/h"
		}]
	});
	var x_axis = new Rickshaw.Graph.Axis.Time({graph: graph});
	var time = new Rickshaw.Fixtures.Time();
	var y_axis = new Rickshaw.Graph.Axis.Y({
		graph: graph,
		orientation: 'left',
		timeUnit: time.unit["hour"],
		tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
		element: container,
	});
	graph.render();
	var range = new RangeSelector(element, getRange());

	this.updateGraph = function() {
		graph.series[0].data = getData();
		var rect = container.getBoundingClientRect(),
		width = rect.width,
		height = rect.height;
		graph.configure({
			width: width, height: height
		});
		graph.render();
		range.update();		// actualización del selector de rango
	};
};

function RangeSelector(element, domain) {
	var extent = domain;
	var scale = d3.scale.linear();
	var container = document.querySelector(element)
	rect = container.getBoundingClientRect()
	width = rect.width,
	height = rect.height;
	var xScale = d3.scale.linear().range([0,width]).domain(domain);
	var brush = d3.svg.brush()
	.x(xScale)
	.extent(domain)
		// .on("brushstart", brushStart)
		.on("brush", brushMove)
		.on("brushend", brushEnd);
		var svg = d3.select(container)
		.append("svg").attr("class", "range");
		var brushg = svg.append("g")
		.attr("class", "brush")
		.call(brush);
		brushg.selectAll(".resize").append("rect")
		.attr("x", -2)
		.attr("y", 0)
		.attr("width", 4);
		brushg.selectAll("rect")
		.attr("height", height);
		this.update = function() {
			rect = container.getBoundingClientRect();
			width = rect.width;
			xScale.range([0,width]);
			var left = xScale(extent[0]);
			var right = xScale(extent[1]);
			brushg.select(".extent").attr({"x": left, "width": right-left});
			brushg.select(".resize.w").attr("transform", d3Translate([left,0]));
			brushg.select(".resize.e").attr("transform", d3Translate([right,0]));
		};
	// function brushStart() {
	// };
	function brushMove() {
		extent = brush.extent();
		dispatchTimeRangeMove(extent);
		dispatchTimeRange(extent);
	};
	function brushEnd() {
		extent = brush.extent();
		dispatchTimeRange(extent);
	};
};