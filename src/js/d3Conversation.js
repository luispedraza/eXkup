/* Clase controlador para los mensajes de la conversación */
function Conversation(tree) {
	var root = tree;
	var $rootMsgContainer = null;	// contenedor del mensaje raíz
	/* Activa un contenedor de mensajes, insertando el mensaje correspondiente */
	function toggleElement(e) {
		e.stopPropagation();
		var $this = $(this);
		if ($this.hasClass('on')) {	// colapsar
			var $containers = $this.add($this.find(".msg-container.on"))
			.removeClass('on')
			.css("width", "")
			.each(function() {
				$(this).find(".message").remove();
			})
			.siblings().css("width", "");
		} else {	// expandir
			$this
			.add($this.parents(".msg-container:not(.on)"))
			.addClass("on")
			.css("width", "100%")
			.each(function() {
				var $this = $(this);
				$this.find("> .handle").append(createMessage($this.data()));
			})
			.siblings().css( "width", "0px" );
		};
		updateButtons();
	};
	function accordion(event) {
		var $element = $(this);
		event.stopPropagation();
		var $children = $element.children();
		var nChildren = $children.length;
		if (nChildren == 1) return;	// sólo hay un hijo, no tiene sentido lupa
		if($children.filter(".on").length) return;	// hay un mensaje hijo mostrado 
		var offset = $element.offset();
		var x = event.pageX - offset.left;	// origen de coordenadas de la función coseno: (cos(theta)+1)/2
		var width = $element.width();
		var span = width/nChildren;
		var sum = 0;
		var m = _MIN(nChildren, 30);		// número de elementos que sufren transformación
		var virtualSpan = width/m;			// span virtual, considerando solo elementos transformables
		var xScale = virtualSpan/span;
		$children.each(function(i) {
			var xPos = ((i*span+span/2)-x) * xScale;
			if (_ABS(xPos)<=(width/2)) {
				var xTheta = xPos*(2*_PI/width);
				sum += (_COS(xTheta)+1)/2;
			};
		});
		var k = 100/sum;
		$children.each(function(i) {
			var xPos = ((i*span+span/2)-x) * xScale;
			if (_ABS(xPos)<=(width/2)) {
				var xTheta = xPos*(2*_PI/width);
				$(this).css("width", (k*(_COS(xTheta)+1)/2) + "%");
			} else {
				$(this).css("width", "0px");
			};
		});
		return false;
	};
	function accordionReset() {$(this).find(".msg-container:not(.on)").css("width","");};
	function appendMessageContainer(msg, $container) {
		var $msgContainer = $("<div>")
		.addClass('msg-container')
		.attr("data-user", msg.usuarioOrigen)
		.append($("<div>").addClass('handle').css("background-color", getMsgColor(msg)))
				.on("click", toggleElement)	// muestra u oculta la conversación
				.data(msg)					// guardamos el mensaje con el elemento
				.appendTo($container);
		msg.container = $msgContainer;		// el mensaje guarda su contenedor correspondiente
		if (msg.children) {
			var children = msg.children;
			var $childrenContainer = $("<div>").addClass('children-container')
			.on("mousemove", accordion)
			.on("mouseleave", accordionReset)
			.appendTo($msgContainer);
			children.forEach(function(m) {
				appendMessageContainer(m, $childrenContainer).addClass(m.selected ? "sel" : "nosel");
			});
		};
		return $msgContainer;
	};
	/* Expandir la conversación a un mensaje arbitrario */
	this.expand = function(m) {
		$rootMsgContainer.find(".msg-container.on")
			.removeClass('on')
			.css("width", "")
			.each(function() { $(this).find(".message").remove(); })
			.siblings().css("width", "");
		$(m.container).trigger("click");
		// mostramos las conversaciones
		$rootMsgContainer.closest(".expandable").toggleClass("fixed", true);
	};
	var update = this.update = function() {
		$mainContainer = $("#chart-output").empty();
		$rootMsgContainer = appendMessageContainer(root, $mainContainer)
		.trigger("click")
			.off();		// conversación de mensajes
		};
		update();
	};