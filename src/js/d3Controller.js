/* Controladores de selección de usuarios, palabras, imágenes y vídeos */
function populateController(processor) {
	function insertMessage(id, clean) {
		var $ouput = $('#chart-ouput');
		if (typeof clean == "undefined") clean=true;
		if (clean) $ouput.empty();
		if (isArray(id)) id.forEach(function(i) {insertMessage(i, false);});
		else {
			$ouput.append(createMessage(THAT.messages[id]));
		};
	};
	function populateUsers(users) {
		var theUsers = sortArray(makeArray(users, "nickname"), "nickname");
		$("#n-users").text(theUsers.length);
		var $list = $("#chart-control .users-list ul");
		theUsers.forEach(function(user) {
			var $row = $("<li>").addClass("item").data(user)
			.on("mouseover", function() {
				var nickname = $(this).closest("li").data().nickname;
				VISUALIZER.highlightUsers([nickname], true);
			})
			.on("mouseout", function() {
				var nickname = $(this).closest("li").data().nickname;
				VISUALIZER.highlightUsers([nickname], false);
			})
			.append($("<span>").addClass("nickname check").text("@"+user.nickname)
				.on("click", function() {
					var user = $(this).closest("li").data();
					dispatchSelect("user", [user.nickname], $(this).toggleClass('on').hasClass('on'));
					$(this).closest("li").find(".color-picker").css("background-color", user.color).find("input").val(user.color);
				}))
			.append($("<span>").addClass("color-picker").css("background-color", getUserColor(user))
				.append($("<input>").attr("type", "color").val(getUserColor(user))
					.on("change", function(e) {
						var $this = $(this);
						var newColor = $this.val();
						$this.closest('.color-picker').css("background-color", newColor);
							// Actualización del color en visualizaciones
							var user = $this.closest('li').data();
							user.color = newColor;
							d3.selectAll("g.node.user-"+user.nickname+" .shape").attr("fill", newColor);
							$("#chart-messages .msg-container[data-user="+user.nickname+"] .handle").css("background-color", newColor);
						})))
			.append($("<span>").addClass("nmessages").text(user.nMessages))
			.append($("<span>").addClass("ndeleted").text(user.nDeleted))
			.append($("<span>").addClass("nwords").text(user.nWords))
			.append($("<span>").addClass("nreplies").text(user.nReplies));
			$list.append($row);	// guardamos también el usuario correspondientes
		});
	};
	function populateImages(images) {
		var theImages = makeArray(images, "src");
		var li = d3.select("#chart-control .images-list ul").selectAll("li").data(theImages);
		li.enter().append("img")
			.attr("src", function(d){return d.src})
			.on("mouseover", function(d) {
				d3.selectAll("g.node")
				.attr("opacity", function(n) {
					return (n.cont_adicional == d.src) ? 1 : .1;
				});
			})
			.on("click", function(d) {
				var messages = d.messages;
				// selección de los mensajes que contienen esta imagen:
				dispatchSelect("image", messages, $(this).toggleClass('on').hasClass('on'));
			});
	};
	// function populateVideos(theVideos) {

	// };
	function populateWords(words) {
		var theWords = sortNumArray(makeArray(words, "word"), "n", true).slice(0,56);	// 65 primeras palabras
		var $list = $("#chart-control .words-list .list");
		theWords.forEach(function(w) {
			$list.append($("<li>").addClass("word").text(w.word + " (" + w.n + ")")
				.data(w)
				.on("click", function() {
					var $this = $(this);
					dispatchSelect("word", [$this.data().word], $(this).toggleClass('on').hasClass('on'));
				}));
		});			
	};
	populateUsers(processor.users);
	populateWords(processor.words);
	populateImages(processor.images);
	// populateVideos(processor.videos);
};