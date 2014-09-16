/* Clase especial para realizar búsquedas con selector
	@param container: contenedor del widget
	@param provider: proveedor de datos
	@param appender: función para agregar resultados al pulsar enter
*/
function Finder(container, provider, appender) {
	var $container = container,
		$input = $container.find("input"),	// valor de búsquedda
		$found = $container.find("ul");		// resultados de búsqueda
	var dataProvider = provider;
	var appenderFunction = appender;

	/* Buscador de usuarios para enviar privados */
	function searchValue(e) {
		var newValue = $input.val();
		var oldValue = $input.attr("data-value");
		if (newValue==oldValue) return;
		$input.attr("data-value", newValue);
		dataProvider(newValue, function(users) {
			$found.empty();
			if (users) {
				$found.fadeIn();
				if (users.answer.length) {
					$found.append(users.answer.map(function(u, i) {
						var $li = $("<li>")
							.attr("data-info", u.nick)
							.append($("<img>").attr("src", checkUserPhoto(u.pathfoto)))
							.append($("<span>").addClass("nickname").text("@" + u.nick))
							.append($("<span>").text(u.nombrebonito))
							.on("click", function() {selectItem($(this));});
						if (i==0) $li.addClass('on');
						return $li;
					}));
				} else {
					$found.append($("<li>").addClass("no-result").text("sin resultados"));
				};
			} else {
				$found.fadeOut();
			};
		});
	};

	/* Selección de usuarios de la lista encontrada */
	function onKeySelector(e) {
		var move = 0;
		if (e.which == 40) { // keydown
			move = 1;
		} else if (e.which == 38) {	// keyup
			move = -1;
		};
		if (move != 0) {
			e.preventDefault();
			$list = $found.find("li");
			var theIndex = $list.index($found.find("li.on"));
			var newIndex = theIndex+move;
			if ((newIndex<0)||(newIndex==$list.length)) return false;
			$list.each(function(i) {
				if (i==theIndex) $(this).removeClass("on");
				else if (i==newIndex) $(this).addClass("on").get(0).scrollIntoView(false);
			});
			return false;
		};
		if (e.which == 13) {	// enter
			selectItem($found.find("li.on"));
			return false;
		};
		if (e.which == 27) {	// escape
			$input.val("").trigger("keyup").blur();
			return false;
		};
		return true;
	};

	function selectItem($item) {
		appenderFunction([$item.attr("data-info")]);	// se añade el nuevo resultado
		$input.val("").trigger("keyup");
	};

	$input		
		.on("focus", searchValue)						
		.on("keyup", searchValue)		// buscar datos en el servidor
		.on("keydown", onKeySelector)		// seleccionar de la lista encontrada con cursores
		.on("blur", function() {
			$found.fadeOut();		// se ocultan los resultados
		});
};