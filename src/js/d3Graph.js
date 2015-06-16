/* Para mostrar información contextual sobre un elemento */
function ChartTooltip(whereMouseMoved,x,y,content,config) {
	if (typeof config == "undefined") config = {};
	var delay = (typeof config.delay === "undefined") ? 800 : config.delay;
	var autoClose = (typeof config.autoClose === "undefined") ? true : config.autoClose;
	$(whereMouseMoved).on("mouseleave",function() {
		clearTimeout(timeout);
		if (autoClose) close();
		$(this).off("mouseleave");
	});
	var $element = $("<div>");
	var timeout = setTimeout(initTooltip, delay);
	if (config.duration) setTimeout(close, config.duration);	// duración determinda de la muestra del tooltip
	function initTooltip() {
		$element.addClass("message-detail")
			.css({"left": x, "top": y})
			.append($("<div>").addClass('tooltip-header'))
			.append(content)
			.draggable()
			.appendTo('body');
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

/* Obtiene el color de pintado para un mensaje dado */
function getMsgColor(msg) {
	return msg.selected ? msg.author.color : "#ccc";
};
function getUserColor(user) {
	return user.selected ? user.color : "#ccc";
};
function updateButtons() {
	// Respuestas a mensajes:
	$("#chart-ouput .btn.reply").off("click").on("click", function() {
		onShowEditor();
	});
};
function onShowEditor() {
	$container = $("<div>").addClass('editor-container');
	EDITOR = new Editor($container, API);
	new ModalDialog({
		title: "Nuevo mensaje", 
		container: $container,
		buttons: ["Cancelar"]
	});
};

// VISUALIZACIÓN DE MENSAJES:
function TalkVisualizer(containerID, processor, margin) {
	// console.log(data);
	// console.log(JSON.stringify(data));
	var LINK_WIDTH_DEFAULT = 0.5,
		LINK_WIDTH = LINK_WIDTH_DEFAULT;
	var root = processor.tree;
	var CONTAINER = d3.select(containerID);
	function getBoundingRect() {
		return CONTAINER.node().getBoundingClientRect();
	};
	var margin = margin;
	var node_index = 0,
		author_index = 0,	// focos de autores (grafo)
		chord_index = 0,
		chord_index_array = null;	// almacena los índices de las cuerdas, ha de ser inicializado
		DURATION = 500,
		DELAY = .5;
	var diagonal = null;	// función de pintado de los links
	var diagonalTree = d3.svg.diagonal.radial()
		.source(function(d) {return {x: d.source.ang, y: d.source.r}})
		.target(function(d) {return {x: d.target.ang, y: d.target.r}})
		.projection(function(d) {return [d.y, d.x+_PI_2]; });
	// var line = d3.svg.line()
	// 	.x(function(d) { return d.x; })
	// 	.y(function(d) { return d.y; });
	// function diagonalGraph(d) { return line([d.source, d.target]); };
	function diagonalGraph(d) { return d3Line(d.source,d.target); };

	var LAYOUT_TYPE, LAYOUT_OPTIONS;	// opciones de configuración: agrupaciones, etc
	var LAYOUT = d3.layout.tree()
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
	// Para cálculo de distancias entre fotos del grafo agrupado:
	var LINK_DISTANCE = 20;
	var FORCE = d3.layout.force()
		.size([WIDTH, HEIGHT])
		.charge(-1000)
		.gravity(0.1)
		.friction(.9)
		// .linkDistance(function (l) { return l.distance; })
		.on("tick", tickUpdate);
	var CHORD = d3.layout.chord()
		.padding(0);
		// .sortGroups(d3.ascending)
		// .sortSubgroups(d3.ascending);
		var TIMELINE_SCROLL = 0;
	var TS_RANGE = processor.getFrequencies().tsRange;	// rango de tiempos de mensajes en timeline

	/* Inicialización del fondo de los contenedores, para eventos en grupo e imagen de fondo */
	function initBackground(selection) {
		selection.append("rect")
		.attr("class", "background")
		.attr("x", -10000)
		.attr("y", -10000)
		.attr("width", 20000)
		.attr("height", 20000);
	};
	/* zoom behavior: */
	function zoomAction() {
		var vector = d3.event.translate;
		var scale = d3.event.scale;
		// svg.attr("transform", d3Translate(vector) + d3Scale(scale));
		svg.style("-webkit-transform", d3Translate3D(vector) + d3Scale(scale));
	};
	function zoomActionTimeline() {
		var vector = d3.event.translate;
		var scale = d3.event.scale;
		var translation = 0;
		if (scale<1) translation = (TIMELINE_SCROLL-=10);
		else if (scale>1) translation = (TIMELINE_SCROLL+=10);
		else translation = vector[1]+TIMELINE_SCROLL;
		svg.style("-webkit-transform", d3Translate3D([0,translation]));
		ZOOM.scale(1);
	};
	/* para activar o desactivar temporalmente el zoom cuando se hace algo con una selección */
	function overrideZoom(selection) {
		selection.on("mousedown", function() {
			d3.select("#svg")
			.call(d3.behavior.zoom());
		});
		selection.on("mouseup", function() {
			d3.select("#svg")
			.call(ZOOM)
			.on("dblclick.zoom", null)
		});
	};

	// Menú contextual para los mensajes
	function ContextMenu(element) {
		var RADIUS = 40,
			timeout = setTimeout(initContextMenu, 400),
			d3Element = d3.select(element).classed("selected", true)
				.on("mouseleave", function() {
					clearTimeout(timeout); // para evitar que se muestre el menú si hemos abandonado el elemento
					if (!menu) d3.select(this).classed("selected", false);
				}),
			data = d3Element.datum(),
			color = getMsgColor(data);
		var menuItems = 
		[
			{"title": "ver mensaje", "action": "showMessage", "color": color, "data": data},
			{"title": "ver conversación", "action": "showConversation", "color": color, "data": data},
			{"title": "ver autor: @" + data.author.nickname, "action": "showAuthor", "color": color, "data": data}
		];
		var menu, items;
		/* Inicialización del menú contextual de mensaje */
		function initContextMenu() {
			menu = d3Element.append("g")
				.attr({"class": "msg-menu"})
				.on("mouseleave", clearContextMenu);
			menu.append("circle").attr({
				"r": 0,
				"fill": "rgba(255,255,255,.5)",
				"stroke": "#ddd",
				"stroke-width": 2,
				"stroke-dasharray": "3"
				})
				.transition().duration(DURATION)
					.attr("r", RADIUS);
			
			items = menu.selectAll(".msg-menu-item").data(menuItems);
			var itemsEnter = items.enter().append("g")
				.attr("class", "msg-menu-item")
				.attr("transform",d3Translate([0,0]))
				.on("click", onMenuItemClicked)
				.on("mouseenter", onMenuItemEnter);
			itemsEnter.append("circle")
				.attr({"r": 0,
					"stroke": "#fff",
					"stroke-width": "1px"
				})
				.style("fill", function(d) { return d.color; });
			// el icono:
			itemsEnter.append("text")
				.attr({"font-size": "20px",
					"dy": ".35em",
					"font-family": "fontawesome",
					"text-anchor": "middle",
					"stroke": "#fff",
					"stroke-width": "1px",
					"fill": "#333"
				})
				.text(function(d) {
					switch(d.action) {
						case "showMessage": return "\uF075";		// icono de mensaje
						case "showConversation": return "\uF086";	// icono de conversación
						case "showAuthor": return "\uF007";			// icono de avatar
					};
				});

			items.transition().duration(200).ease("bounce")
				.attr("transform", function(d,i) {
					var angle = i * _2_PI/menuItems.length,
						x = RADIUS * _COS(angle)
						y = RADIUS * _SIN(angle);
					return d3Translate([x,y]);
				});
			items.selectAll("circle")
				.transition().duration(200).ease("bounce")
				.attr("r", 20);
		};
		/* A ejecutar cuando se entra con el ratón en una opción del menú contextual */
		function onMenuItemEnter(d) {
			var tooltipConfig = {"autoClose": true, "delay": 500, "duration": 2000};
			new ChartTooltip(this, d3.event.offsetX+20, d3.event.offsetY, d.title, tooltipConfig);
		};
		/* A ejecutar al hacer click en una opción del menú contextual */
		function onMenuItemClicked(d) {
			switch (d.action) {
				case "showMessage":
					var tooltipConfig = {"autoClose": false, "delay": 0};
					new ChartTooltip(this, d3.event.offsetX, d3.event.offsetY, createMessage(d.data), tooltipConfig);
					break;
				case "showConversation":
					dispatchConversation(d.data);
					break;
				case "showAuthor":
					$("body").trigger("loadBoard", {id: "t1-" + d.data.author.nickname});
					break;
			};			
		};
		/* Borrar el menú contextual */
		function clearContextMenu() {
			d3Element.classed("selected", false);
			menu.transition().duration(DURATION)
				.style("opacity", 0)
				.remove();
		};
	};
	var ZOOM_SCALE, ZOOM_TR;
	function onZoomEnd() {
		var scale = ZOOM.scale();
		LINK_WIDTH = LINK_WIDTH_DEFAULT/scale;
		ANTI_ZOOM_SCALE = d3Scale(1/scale);
		chartNodes.selectAll("#chart-nodes > g")
			.transition().duration(DURATION)
			.attr("transform", function(d) {return d3TranslateNode(d) + ANTI_ZOOM_SCALE;});
		chartFocus.selectAll("g")
			.transition().duration(DURATION)
			.attr("transform", function(d) {return d3TranslateNode(d) + ANTI_ZOOM_SCALE;});
		chartLinks.selectAll("path")
			.transition().duration(DURATION)
			.style("stroke-width", LINK_WIDTH);
		chartFocusLinks.selectAll("path")
			.transition().duration(DURATION)
			.style("stroke-width", function(l) {
				return l.width / scale;
			});
	};

	function onFocusClick(d,i) {

	};
	// var ___COUNT___ = 0;
	var ZOOM = d3.behavior.zoom()
		.scaleExtent([.25,8])
		.on("zoom", zoomAction)
		.on("zoomend", onZoomEnd);
	var svgElement = d3.select(containerID)
		.insert("svg", ":first-child")
		.attr("id", "svg")
		.on("dblclick", resetZoom)
		.call(ZOOM)
		.on("dblclick.zoom", null);
	// Para redondear imágenes:
	var svgDefs = svgElement.append("defs");
	svgDefs.append("clipPath").attr("id", "round-clip")
		.append("circle").attr("r", 15);

	var svg = svgElement.append("g");
	var chart = svg.append("g").attr("id", "chart")
				.call(initBackground);	// inicialización del fondo del elemento
	var chartFocusLinks = chart.append("g").attr("id", "chart-focus-links");	// enlaces entre focos
	var chartFocus = chart.append("g").attr("id", "chart-focus");	// grupo para los focos 
	var chartLinks = chart.append("g").attr("id", "chart-links");	// grupo para los links
	var chartNodes = chart.append("g").attr("id", "chart-nodes");	// grupo para los nodos 

	var chartInteraction = svg.append("g").attr("id", "d3-chart-interaction");
	var timelineScale = d3.scale.linear();
	// mensajes, enlaces entre mensajes, autores, enlaces entre autores
	var nodes, links, authorFocus, authorLinks;
	var RECT = getBoundingRect(),
	WIDTH = RECT.width,
	HEIGHT = RECT.height;
	var ANTI_ZOOM_SCALE = d3Scale(1);
	/* Configuración del layout de la visualización 
	{	layout: tree, timeline, graph, interaction,
		options: group-user
	}
	*/
	function configureLayout (configuration) {
		if (typeof configuration==="undefined") configuration = {"layout": LAYOUT_TYPE, 
			"options": LAYOUT_OPTIONS};
		LAYOUT_TYPE = configuration.layout || "tree";
		LAYOUT_OPTIONS = configuration.options || {"group-author": false};
		var center = [WIDTH/2, HEIGHT/2];
		var chartPosition = [center.x,center.y];
		if (LAYOUT_TYPE=="interaction") {
			chartInteraction.style("-webkit-transform", d3Translate3D(center) + d3Scale(1));
			chart.style("-webkit-transform", d3Translate3D(center) + d3Scale(0));
			ZOOM.on("zoom", zoomAction);
		} else {
			chartInteraction.style("-webkit-transform", d3Translate3D(center) + d3Scale(0));
			if (LAYOUT_TYPE=="tree") {
				LAYOUT.size([_2_PI, _MIN(WIDTH, HEIGHT)/2-margin]);
				chart.style("-webkit-transform", d3Translate3D(center) + d3Scale(1));
				ZOOM.on("zoom", zoomAction);
			} else if (LAYOUT_TYPE=="timeline") {
				chart.style("-webkit-transform", d3Translate3D([0,0]) + d3Scale(1));
				ZOOM.on("zoom", zoomActionTimeline);
			} else if (LAYOUT_TYPE=="graph") {
				chart.style("-webkit-transform", d3Translate3D([0,0]) + d3Scale(1));
				ZOOM.on("zoom", zoomAction);
			};
		};
		// Clase para el contenedor de svg
		CONTAINER.attr("class", LAYOUT_TYPE);
		update();	// se actualiza para reflejar los cambios
	};

	// colapsar/expandir hijos
	function clickOnNode(d) {
		if (d.children) { d._children = d.children; d.children = null; } 
		else { d.children = d._children; d._children = null;};
		update(d);
		return false;
	};
	// Resaltado de las interacciones de un usuario, cuadno los mensajes están aagrupados
	function filterUserInteraction(d) {
		d3.selectAll("#chart-links path").classed("fade", function(l) {
			return ((l.source.author != d) && (l.target.author != d));
		});
	};
	// Resaltado de los links de un hilo de conversación:
	function filterConversation(d) {
		var conversation = processor.getConversation(d.target);
		d3.selectAll("#chart-links path")
		.each(function(l) {
			var thiz = d3.select(this);
			if ((conversation.indexOf(l.target)>=0) && (conversation.indexOf(l.source)>=0)) {
				thiz.style("stroke-width", LINK_WIDTH*5)
				.style("stroke", "#f30");
			};
		});
		// Al salir, se deselecciona la conversación
		d3.select(this)
		.on("click", function(d) {
				dispatchConversation(d.target);			// se muestra la conversación completa
			})
		.on("mouseleave", function(p) {
			d3.selectAll("#chart-links path")
			.transition().delay(500).duration(DURATION)
			.style("stroke-width", LINK_WIDTH)
			.style("stroke", null);
		});
	};
	/* Colapsa los nodos de la estructura de datos de árbol */
	function collapse(d) { if (d.children.length) { d._children = d.children; d._children.forEach(collapse); d.children = null; }; };
	
	/* actualización del grafo en cada tic */
	function tickUpdate(e) {
		if (LAYOUT_OPTIONS["group-author"]) {
			(function oldDistribution(focus) {
				// esta función corresponde a una distribución inicial de prueba, se deja como recuerdo
				(function collideFocus(focus) {
					var q = d3.geom.quadtree(focus),
					i = 0,
					n = focus.length;
					while (++i < n) q.visit(collide(focus[i]));
				})(focus);
				// distribuir mensajes alrededor del autor
				// (function distributeMessages(focus) {
				// 	focus.forEach(function(a) {
				// 		var r = a.radius;
				// 		var angStep = _2_PI/a.children.length;
				// 		a.children.forEach(function(c,i) {
				// 			var ang = i*angStep;
				// 			c.x = a.x + r * _COS(ang);
				// 			c.y = a.y + r * _SIN(ang);
				// 		});
				// 	});
				// })(focus);
			})(authorFocus);
		};
		// if (LAYOUT_OPTIONS["group-author"]) {
		// 	var k = 0.1 * e.alpha;
		// 	nodes.forEach(function(m, i) {
		// 		var author = m.author;
		// 		m.x += (author.x - m.x) * k;
		// 		m.y += (author.y - m.y) * k;
		// 	});
		// };
		updateFocus(false);
		updateFocusLinks(false);
		updateNodes(false);
		updateTreeLinks(false);
	};
	/* Visualización de los focos del grafo, cuandod hay agrupación */
	function updateFocus(animate) {
		if (typeof animate === "undefined") animate = true;
		var radiusValue = (LAYOUT_TYPE=="graph") ? (function(l) {return l.radius;}) : 20;
		/* Focos de autores */
		var f_author = chartFocus.selectAll("g")
			.data(authorFocus, function(d) { return d.graph_id || (d.graph_id = ++author_index); });
		var f_authorEnter = f_author.enter().append("g")
			.style("opacity", 0)
			.attr("transform", d3TranslateNode)
			.on("mouseenter", filterUserInteraction)	// filtrado de interacciones
			.on("click", onFocusClick)
			.call(overrideZoom);	// para desactivar el zoom cuando se clickea, draggea un nodo
		f_authorEnter.append("circle")
			.attr({"r": 0, "fill": getUserColor});
		f_authorEnter.append("image")
			.attr({
				"xlink:href": function(d) {return checkUserPhoto(d.pathfoto);},
				"x": -15, "y": -15, "width": 30, "height": 30,
				"clip-path": "url(#round-clip)"})
			.on("mouseenter", function (d) {
				new ChartTooltip(this, d3.event.offsetX, d3.event.offsetY,
					$("<div>").text("@" + d.nickname));
			});
		// update:
		(animate ? f_author.transition().duration(DURATION) : f_author)
			.style("opacity", 1)
			.attr("transform", d3TranslateNode)
			.selectAll("circle").attr("r", radiusValue);
		// exit:
		(animate ? f_author.exit().transition().duration(DURATION) : f_author.exit())
			.style("opacity", 0)
			.remove();
	};

	/* Actualización de límites temporales */
	function updateTimeRange() {
		function resizePosition(d) { return d3Translate3D([timelineScale(d),0]);};
		var range = d3.select("#svg").selectAll("g.resize")
			.data(TS_RANGE);
		range.enter().append("g")
			.attr("class", "resize")
			.style("-webkit-transform",resizePosition)
				.append("rect").attr({"x": -2, "y": 0, "width": 4, "height": 0});
		// update:
		range.style("-webkit-transform", resizePosition)
			.select("rect").attr("height", HEIGHT);
	};
	/* Actualización de los nodos: mensajes */
	function updateNodes(animate) {
		if (typeof animate === "undefined") animate = true;
		var node = chartNodes.selectAll("g")
			.data(nodes, function(d) { return d.id || (d.id = ++node_index); });
		var nodeEnter = node.enter().append("g")
			.attr("class", function(d) { return "user-" + d.usuarioOrigen; })
			.attr("transform", d3TranslateNode)
			.style("opacity", 0)
			// .call(overrideZoom)	// para desactivar el zoom cuando se clickea, draggea un nodo
			// .on("click", clickOnNode)
			.on("mouseenter", function(d, e) {
				// Se muestra un menú contextual para cada mensaje, con opciones: ver mensaje, ver usuario, ver conversación
				new ContextMenu(this);
			})
			.call(FORCE.drag);
		nodeEnter.append("rect")
			.attr({"x": -5, "y": -5, "width": 10, "height": 10})
			.style("fill", getMsgColor);
		// update:
		(animate 
		? node.transition().duration(DURATION).delay(function(d) {return d.id * DELAY;})
		: node)
			.style("opacity", 1)
			.attr("transform", d3TranslateNode)
			.select("rect").attr("fill", getMsgColor);
		// exit:
		(animate ? node.exit().transition().duration(DURATION) : node.exit())
			.style("opacity", 0)
			.remove();
	};
	/* Actualización de links: enlaces entre mensajes */
	function updateTreeLinks(animate) {
		if (typeof animate === "undefined") animate = true;
		var link = chartLinks.selectAll("path")
			.data(links, function(d) { return d.target.id; });
		link.enter().append("path")
			.attr("d", diagonal)
			.style("stroke-width", 0)
			.on("mouseenter", filterConversation);
		// update:
		(animate 
		? link.transition().duration(DURATION).delay(function(d) {return d.target.id * DELAY;})
		: link)
			.attr("d", diagonal)
			.style("stroke-width", LINK_WIDTH);
		// exit:
		(animate ? link.exit().transition().duration(DURATION) : link.exit())
			.style("opacity", 0)
			.remove();
	};
	/* Links entre autores, si hay agrupación */
	function updateFocusLinks(animate) {
		var flink = chartFocusLinks.selectAll("path")
			.data(authorLinks, function(d) { return d.target.graph_id; });
		flink.enter().append("path")
			.attr("d", diagonal)
			.style("stroke-width", 0);
		// update:
		(animate
		? flink.transition().duration(DURATION).delay(function(d) {return d.target.id * DELAY;})
		: flink)
			.attr("d", diagonal)
			.style("stroke-width", function(l) {
				return l.width / ZOOM.scale();
			});
		// exit:
		(animate ? flink.exit().transition().duration(DURATION) : flink.exit())
			.style("opacity", 0)
			.remove();
	};
	/* Actualización del gráfico de interacciones */
	function updateInteraction () {
		function arcTween(transition, angle) {
			transition.attrTween("d", function(d) {
				var endAngle = (angle===0) ? d.startAngle : d.endAngle;
				var interpolateStart = d3.interpolate(this._startAngle, d.startAngle);
				var interpolateEnd = d3.interpolate(this._endAngle, endAngle);
				this._startAngle = d.startAngle;
				this._endAngle = d.endAngle;
				return function(t) {
					d.startAngle = interpolateStart(t);
					d.endAngle = interpolateEnd(t);
					return arc(d);
				};
			});
		};
		function chordTween(transition, angle) {
			transition.attrTween("d", function(d) {
				var s_endAngle = (angle===0) ? d.source.startAngle : d.source.endAngle;
				var t_endAngle = (angle===0) ? d.target.startAngle : d.target.endAngle;
				var s_interpolateStart = d3.interpolate(this._source.startAngle, d.source.startAngle);
				var s_interpolateEnd = d3.interpolate(this._source.endAngle, s_endAngle);
				var t_interpolateStart = d3.interpolate(this._target.startAngle, d.target.startAngle);
				var t_interpolateEnd = d3.interpolate(this._target.endAngle, t_endAngle);
				this._source = {startAngle: d.source.startAngle, endAngle: s_endAngle};
				this._target = {startAngle: d.target.startAngle, endAngle: t_endAngle};
				return function(t) {
					d.source.startAngle = s_interpolateStart(t);
					d.source.endAngle = s_interpolateEnd(t);
					d.target.startAngle = t_interpolateStart(t);
					d.target.endAngle = t_interpolateEnd(t);
					return fChord(d);
				};
			});
		};
		// filtrado de los mensajes relacionados con un usuario
		function filterUser(d,i) {
			chartInteraction.selectAll(".chord").classed("fade", function(p) {
				return 	p.source.index != i && p.target.index != i;
			});
			chartInteraction.selectAll(".user").classed("fade", function(p) {
				var j = p.index;
				return (i==j) ? false : ((matrix[i][j]==0) && (matrix[j][i]==0));
			});
		};
		function unfilterUser(d,i) {
			chartInteraction.selectAll("path.chord").classed("fade", false);
		};
		function createUserTooltip(d,i) {
			var groups = CHORD.groups();
			function nm(i) {return _ROUND(groups[i].value);};						// mensajes enviados por un usuario
			function pm(i) {return (100*nm(i)/nMessages).toFixed(1);};				// porcentaje de mensajes enviados
			function nmr(i) {return _ROUND(d3.sum(matrix[i]));};					// número de mensajes recibidos
			function pmr(i) {return (100*nmr(i)/nMessages).toFixed(1);};			// porcentaje de mensajes recibidos
			var nickname = users[i].nickname;
			var $ulSent = $("<ul>");
			var $ulReceived = $("<ul>");
			matrix[i].forEach(function(c,t) {
				if (c!=0) $ulSent.append($("<li>").text("@" + users[t].nickname + ": " + c));
			});
			matrix.forEach(function(r,s) {
				if (r[i]!=0) $ulReceived.append($("<li>").text("@" + users[s].nickname + ": " + r[i]));
			});
			var $tooltip = $("<div>").addClass("interaction-tooltip")
			.append("<h2>@" + nickname + " ha enviado " + nm(i) + " mensajes ("+ pm(i) + "%) a:")
			.append($ulSent);
			if ($ulReceived.length) {
				$tooltip
				.append("<h2>@" + nickname + " ha recibido " + nmr(i) + " mensajes ("+ pmr(i) + "%) de:")
				.append($ulReceived);
			};
			return $tooltip;
		};
		var interaction = processor.getInteraction();
		var users = interaction.users;
		var matrix = interaction.matrix;
		var nMessages = sumArray(matrix);
		if (!chord_index_array) {
			chord_index_array = initArray(users.length, users.length, null);
		};
		CHORD.matrix(matrix);
		var outerRadius = _MIN(WIDTH, HEIGHT)/2 - margin;
		var innerRadius = outerRadius*.8;
		var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
		var fChord = d3.svg.chord().radius(innerRadius);
		// Agregamos un grupo por usuario
		var groups = chartInteraction.selectAll("g.user")
			.data(CHORD.groups);
		var groupsEnter = groups.enter().append("g")
			.attr("class", "user")
			.on("mouseenter", function(d,i) {
				filterUser(d,i);
					// var configTooltip = {autoClose: "no"};
					new ChartTooltip(this, d3.event.offsetX, d3.event.offsetY, createUserTooltip(d,i));
				});
		// groupsEnter.append("title").text(function(d,i) {
		// 	return users[i].nickname;
		// });
		var groupText = groupsEnter.append("text")
			.each(function(d) { d.degAngle = RAD2DEG * (d.startAngle + d.endAngle) / 2 - 90; })
			.attr("dy", ".35em")
			.attr("font-size", "10px")
			.attr("text-anchor", function(d) { return d.degAngle > 90 ? "end" : null; })
			.attr("transform", function(d) {
				return d3Rotate(d.degAngle) + d3Translate(outerRadius+10)
				+ ((d.degAngle>90) ? " rotate(180)" : "")
				+ ((d.value==0) ? " scale(0)" : "");
			})
			.text(function(d,i) { return "@" + users[i].nickname; });
		// Agregamos/actualizamos los grupos:
		groupsEnter.append("path")
			.each(function(d) {this._startAngle = d.startAngle; this._endAngle = d.startAngle;})
			.attr("d", function(d) {
				return d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius).startAngle(this._startAngle).endAngle(this._startAngle)(d);
			})
			.style("fill", function(d,i) { return users[i].color; });
		groups.select("path")
			.transition().duration(DURATION)
			.style("fill", function(d,i) { return users[i].color; })
			.call(arcTween);
		groups.select("text")
			.each(function(d) { d.degAngle = RAD2DEG * (d.startAngle + d.endAngle) / 2 - 90; })
			.transition().duration(DURATION)
			.style("opacity", function(d) { return (d.value==0) ? 0 : 1;})
			.attr("text-anchor", function(d) { return d.degAngle > 90 ? "end" : null; })
			.attr("transform", function(d) {
				return d3Rotate(d.degAngle) + d3Translate(outerRadius+10)
				+ ((d.degAngle>90) ? " rotate(180)" : "")
				+ ((d.value==0) ? " scale(0)" : "");
			});

		// Agregamos/actualizamos las cuerdas:
		var chords = chartInteraction.selectAll("path.chord")
			.data(CHORD.chords, function(d) { 
				var i = d.source.index;
				var j = d.source.subindex;
				return chord_index_array[i][j] || (chord_index_array[i][j] = ++chord_index); 
			});
		var chordsEnter = chords.enter().append("path")
			.each(function(d) {
				this._source = {startAngle: d.source.startAngle, endAngle: d.source.startAngle};
				this._target = {startAngle: d.target.startAngle, endAngle: d.target.startAngle};
			})
			.attr("class", "chord")
			.style("fill", function(d) { return users[d.source.index].color; })
			.attr("d", function(d) {
				return d3.svg.chord().radius(innerRadius).source(this._source).target(this._target)();
			})
			.on("click", function(d) {
				// se muestra la interacción entre los usuarios:
				dispatchUsersInteraction(users[d.source.index].nickname, users[d.source.subindex].nickname);
				// console.log(d, CHORD, users);
			});
		chords.transition().duration(DURATION)
			.call(chordTween);
		chords.exit()
			.transition().duration(DURATION)
			.call(chordTween, 0)
			.remove();
	};
	/* Principal función de actualización */
	function update(source) {
		if (typeof source == "undefined") source = root;
		// Limpieza de la actualización anterior:
		nodes=[], links=[], authorFocus=[], authorLinks=[];
		/* Cálculo de las posiciones de cada nodo, layouts de árbol y timeline */
		function computeTreePositions(nodes) {
			nodes.forEach(function(node) {
				var ang = node.ang = node.x;
				var r = node.r = node.y;
				node.x = _COS(ang)*r;
				node.y = _SIN(ang)*r;
			});
		};
		function computeTreePositionsGrouped(groups) {
			var nodes = [],
				N = groups.length,
				angStep = _2_PI/N,
				R0 = _MIN(WIDTH, HEIGHT)/2 - margin,
				R = R0 - 25;
			groups.forEach(function(g,i) {
				var rStep = _MIN(15, (R-100)/g.children.length),
					ang = i*angStep;
				g.x = R0 * _COS(ang);
				g.y = R0 * _SIN(ang);
				g.radius = 20;
				// posiciones de los mensajes
				g.children.forEach(function(c,i) {
					c.ang = ang;
					var r = c.r = R - i*rStep
					c.y = r * _SIN(ang);
					c.x = r * _COS(ang);
				});
				nodes = nodes.concat(g.children);
			});
			return nodes;
		};
		function computeTimelinePositions(nodes) {
			nodes.forEach(function(node) {
				node.y = margin + node.x;
				node.x = timelineScale(node.tsMensaje);
			});
		};
		function computeTimelinePositionsGrouped(groups) {
			var nodes = [];
			var vStep = 30;
			groups.forEach(function(g,i) {
				var y = margin + i*vStep;
				g.x = 15;
				g.y = y;
				g.radius = 20;
				// posiciones de los mensajes 
				g.children.forEach(function(c) {
					c.y = y;
					c.x = timelineScale(c.tsMensaje);
				});
				nodes = nodes.concat(g.children);
			});
			return nodes;
		};
		// configuración inicial del grafo, para evitar saltos bruscos del layout anterior
		function computeForceInitial(node) {
			var result = [];
			function computeNode(n) {
				n.px = n.x;	// || node.parent.x;
				n.py = n.y; // || node.parent.y;
				result.push(n);
				if (n.children) n.children.forEach(computeNode);
			};
			computeNode(node);
			return result;
		};
		// function computeFocusGrid(focus) {
		// 	var N = focus.length;
		// 	var w = WIDTH-2*margin, h = HEIGHT-2*margin;	// ancho y alto efectivos sin margenes
		// 	// Intento que los usuarios cubran el área de manera óptima, calculando espaciado constante:
		// 	// Ni * Nj = N; ((Ni-1)*s)*((Nj-1)*s) = w*h; Ni/Nj = h/w; y se resuelve
		// 	var Nj = _MAX(_FLOOR(_SQRT(N*w/h)), 2),
		// 	Ni = _CEIL(N/Nj),
		// 	focusPadding = _SQRT((w*h)/(Ni*Nj - Ni - Nj));
		// 	focusPadding = _MIN(focusPadding, h/(Ni-1));
		// 	focusPadding = _MIN(focusPadding, w/(Nj-1));
		// 	focus.forEach(function(a,i) {
		// 		var i_row = _FLOOR(i/Nj);
		// 		var i_col = i%Nj;
		// 		a.px = a.x = margin + i_col * focusPadding;
		// 		a.py = a.y = margin + i_row * focusPadding;
		// 		a.fixed = true;
		// 	});
		// };
		/* Algunas actualizaciones globales */
		RECT = getBoundingRect();
		WIDTH = RECT.width;
		HEIGHT = RECT.height;
		timelineScale.domain(TS_RANGE).range([margin,WIDTH-margin]);
		FORCE.stop();
		if (LAYOUT_TYPE=="graph") {
			diagonal = diagonalGraph;
			var linkDistance;
			var forceNodes = [], forceLinks = [];	// nodos y links para force layout
			if (LAYOUT_OPTIONS["group-author"]) {
				// Cálculo del radio de un foco
				function focusRadius(f) {
					// pi*R^2 = 2 * n_mensajes * L^2, donde L es el lado del cuadrado de un mensaje (10 pixeles)
					return 15 + (10 * _SQRT(2 * f.children.length / _PI));
				};
				function initFocusGraph(focus, interaction) {
					/* Inicialización de radios de focos (área proporcional al número de mensajes)
						y links entre focos (ancho proporcional al número de interacciones) */
					var links = [];
					focus.forEach(function(a,i) {
						a.px = a.x; a.py = a.py;		// posición previa, si la hubiera
						for (var j=i+1, len=authorFocus.length; j<len; j++) {
							var inter = interaction[i][j] + interaction[j][i];
							if (inter!=0) {	// existe interacción
								var t = authorFocus[j];
								var sourceR = a.radius || (a.radius = focusRadius(a));
								var targetR = t.radius || (t.radius = focusRadius(t));
								var d = sourceR + targetR + 20;
								// Link entre autores, con ancho proporcional a la interacción
								links.push({"source": a, "target": t, "distance": d, "width": inter});
							};
						};
					});
					return links;
				};
				var groups = processor.groupByAuthor();
				authorFocus = groups.authors;			// los focos de autores
				var interaction = groups.interaction;	// matriz de interacciones
				authorLinks = forceLinks = initFocusGraph(authorFocus, interaction);
				forceNodes = groups.authors;	// los nodos del grafo son los autores
				linkDistance = function(l) {return l.distance;};
			} else {
				nodes = forceNodes = computeForceInitial(root);	// posiciones iniciales para transición suave
				links = forceLinks = LAYOUT.links(forceNodes);
				linkDistance = LINK_DISTANCE;
			};
			FORCE.size([WIDTH, HEIGHT])
				.linkDistance(linkDistance)
				.nodes(forceNodes)
				.links(forceLinks)
				.start();
		} else if (LAYOUT_TYPE=="interaction") {
			updateInteraction();
		} else if (LAYOUT_TYPE=="tree") {
			if (LAYOUT_OPTIONS["group-author"]) {
				diagonal = hiveLink;
				var groups = processor.groupByAuthor();
				authorFocus = groups.authors;
				nodes = computeTreePositionsGrouped(authorFocus);
			} else {
				diagonal = diagonalTree;
				nodes = LAYOUT.nodes(root);
				authorFocus = [];
				computeTreePositions(nodes);
			};
			links = LAYOUT.links(nodes);
			updateFocus();
			updateFocusLinks();
			updateNodes();
			updateTreeLinks();
		} else if (LAYOUT_TYPE=="timeline") {
			diagonal = d3TimelinePath;
			if (LAYOUT_OPTIONS["group-author"]) {
				var groups = processor.groupByAuthor();
				authorFocus = groups.authors;
				nodes = computeTimelinePositionsGrouped(authorFocus);
			} else {
				LAYOUT.size([root.children.length * 20, 100]);
				nodes = LAYOUT.nodes(root);
				authorFocus = [];
				computeTimelinePositions(nodes);
			};
			links = LAYOUT.links(nodes);
			updateTimeRange();	// extremos del intervalo temporal
			updateFocus();
			updateFocusLinks();
			updateNodes();
			updateTreeLinks();
		};
		document.getElementById("svg").setCurrentTime(0);
	};
	function resetZoom() {
		TIMELINE_SCROLL=0; 
		ZOOM.translate([0,0]); 
		ZOOM.scale(1); 
		ZOOM.event(svg); 
	};
	this.config = function(configuration) {
		resetZoom();
		configureLayout(configuration);
	};
	this.updateGraph = function() {
		// window.requestAnimationFrame(update);
		update();
	};
	this.highlightUsers = function (users, highlight) {
		var selector = users.map(function(u) {return ".user-"+u;}).join(",");
		var scale = d3Scale((highlight ? 2 : 1)/(ZOOM.scale()));
		d3.selectAll(selector)
		.style("transform", function(d) {return d3TranslateNode(d) + scale; });
	};
	this.selectTimeRange = function(range) {
		TS_RANGE = range;
		if (LAYOUT_TYPE=="timeline") update();
	};
	this.moveTimeRange = function(range) {
		TS_RANGE = range;
		if (LAYOUT_TYPE=="timeline") updateTimeRange();
	};
	configureLayout();	// Establecimiento del layout inicial
};
