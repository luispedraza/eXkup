//var divcode = document.createElement('script');
//divcode.src="chrome-extension://jpkkajlcacgejoenhhomlfekkokehigp/twitter2eskup_code.js";
//divcode.type ="text/javascript";
//divwhere.appendChild(divcode);

(function init() {
	if (!window.jQuery) return;
	// Inserción de los botones en los lugares correctos (al pie de cada twitt)
	(function insertButtons() {
		// obtener elementos de acción del tweet
		$(".ProfileTweet-actionList").each(function(i,list) {
			$list = $(list);
			if ($list.hasClass("eskup-inserted")) 
				// nada que hacer: botón ya insertado
				return;
			$button = $("<div>").addClass("action-eskup-container")
				.on("click", function() {
					alert("hola!");
				})
				.append($("<a>").attr("href", "#").addClass("ProfileTweet-action js-tooltip").attr("data-original-title", "Enviar a Eskup")
					// .tooltip({placement: "top"})
					.append($("<span>").addClass("icon icon-eskup")));
			$list
				.addClass("eskup-inserted")
				.find(".ProfileTweet-action--retweet").after($button);
			console.log("insertado");

			// var info = item.getElementsByClassName("tweet")[0];
			// tweet_id = info.getAttribute("data-item-id");
			// console.log(tweet_id);
			// // header, footer y content
			// var header = item.getElementsByClassName("stream-item-header")[0];
			// var content = item.getElementsByClassName("js-tweet-text")[0];
			// var footer = item.getElementsByClassName("stream-item-footer")[0];
			// // elementos del header
			// var avatar = header.getElementsByClassName("avatar")[0].src;
			// var username = header.getElementsByClassName("username")[0].innerText;
			// var fullname = header.getElementsByClassName("fullname")[0].innerText;

			// // las acciones: 
			// var actions = item.getElementsByClassName("tweet-actions")[0];
			// var eskupli = document.createElement("li");
			// eskupli.className = "action-eskup-container";
			// var eskupa = document.createElement("a");
			// eskupa.href = "#";
			// var eskupi = document.createElement("i");
			// eskupi.className = "sm-eskup";
			// var eskupb = document.createElement("b");
			// eskupb.innerText = "Eskup";
			// eskupa.appendChild(eskupi);
			// eskupa.appendChild(eskupb);
			// eskupli.appendChild(eskupa);
			// actions.appendChild(eskupli);

			// console.log(avatar, username, fullname);
			// console.log(content.innerHTML);
		});
	})();
})();

// function Send2EskupOption()
// {
// 	quediv = document.getElementById('send2eskup');
// 	quedivimg = document.getElementById('send2eskupimg');
// 	if (quediv.className == "t2e_disabled")
// 	{
// 		quediv.title = "No enviar a Eskup";
// 		quediv.className = "t2e_enabled";
// 		quedivimg.style.borderColor="#f30";
// 	}
// 	else if (quediv.className == "t2e_enabled")
// 	{
// 		quediv.title = "Enviar a Eskup";
// 		quediv.className = "t2e_disabled";
// 		quedivimg.style.borderColor="#fff";		
// 	}
// }

// function RT2EskupOption()
// {
// 	quedivimg = document.getElementById('RT2eskupimg');
// 	if (quedivimg.className == "rtoff")
// 	{
// 		quedivimg.title = "No enviar a Eskup";
// 		quedivimg.className = "rton";
// 		quedivimg.style.borderColor="#f30";
// 		localStorage["RTeskup"] = 1;
// 	}
// 	else if (quedivimg.className == "rton")
// 	{
// 		quedivimg.title = "Enviar a Eskup";
// 		quedivimg.className = "rtoff";
// 		quedivimg.style.borderColor="#fff";		
// 		localStorage["RTeskup"] = 0;
// 	}
// }

// function Send()
// {
// 	var texto = document.getElementById('status').value;
// 	var opcion = document.getElementById('send2eskup');	
// 	if ((texto != "") && (opcion.className == "t2e_enabled"))
// 	{
// 		chrome.extension.sendRequest(texto);
// 	}
// }

// function removeHTMLTags(strInputCode){
// 	var strTagStrippedText = strInputCode.replace(/<\/?[^>]+(>|$)/g, "");
// 	return strTagStrippedText;
// }

// function RT2Eskup()
// {
// 	if ((localStorage["text_t2e"] != "") && (localStorage["RTeskup"] == 1))
// 	{		
// 		chrome.extension.sendRequest(localStorage["text_t2e"]);
// 	}
// }

// function InsertRTimg()
// {
// 	if (document.getElementById("RT2eskupimg") != null) return;
// 	var divwhere = document.getElementsByClassName('inline-form-buttons')[0];
// 	var diveskupimg = document.createElement('img');
// 	diveskupimg.src="http://eskup.elpais.com/favicon.png";
// 	diveskupimg.id = "RT2eskupimg";
// 	diveskupimg.style.padding = "1px";
// 	diveskupimg.style.verticalAlign="middle";
// 	diveskupimg.style.border="3px solid #fff";
// 	diveskupimg.style.marginBottom="6px";
// 	diveskupimg.className = "rtoff";
// 	diveskupimg.style.marginLeft="1px";
// 	localStorage["RTeskup"] = 0;
// 	diveskupimg.addEventListener("click", RT2EskupOption, false);
// 	divwhere.appendChild(diveskupimg);
	
// 	elemento = document.getElementsByClassName('perma-hover')[0];	
// 	texto = elemento.getElementsByClassName('entry-content')[0].innerHTML;
// 	texto = removeHTMLTags(texto);	
// 	emisor = elemento.getElementsByClassName('screen-name')[0].innerHTML;
// 	localStorage["text_t2e"] = "RT @" + emisor + " " + texto;
// 	divwhere.getElementsByClassName('btn')[0].addEventListener("click", RT2Eskup, false);	
// }

// function SendRTpopup()
// {
// 	setTimeout(InsertRTimg, 500);
// }

// function InsertRTlinks()
// {
// 	// para los RT
// 	console.log('rts');
// 	var RTlinks = document.getElementsByClassName('retweet-link');
// 	for (var cont = 0; cont < RTlinks.length; cont++)
// 	{
// 		RTlinks[cont].onclick = SendRTpopup;
// 	}
// 	var RTlinksNew = document.getElementsByClassName('tweet-actions');
// 	for (var contNew = 0; contNew < RTlinksNew.length; contNew++)
// 	{
// 		console.log('rt2eskup inserted');
// 		var diveskup = document.createElement('a');
// 		diveskup.className = 'eskup-action';
// 		diveskup.innerHTML = 'a eskup';
// 		RTlinksNew[contNew].appendChild(diveskup);
// 	}
// }

// function InsertEskupElements()
// {
// 	// para los tweets
// 	var divwhere = null;
// 	divwhere = document.getElementById('tweeting_controls');
// 	if (divwhere == null) 
// 		divwhere = document.getElementsByClassName('tweet-box-title')[0];
// 	if (divwhere == null)
// 	{	
// 		setTimeout("InsertEskupElements()", 100);
// 		return;
// 	}
// 	else
// 	{
// 		var diveskup = document.createElement('a');
// 		var diveskupimg = document.createElement('img');
// 		diveskup.id="send2eskup";
// 		diveskup.href="#";
// 		diveskup.addEventListener("click", Send2EskupOption, false);
// 		diveskup.className = "t2e_disabled";	
// 		diveskup.title = "Enviar a Eskup";
// 		diveskup.style.display = "inline-block";	
// 		diveskup.style.marginTop="0px";
// 		diveskupimg.src="http://eskup.elpais.com/favicon.png";
// 		diveskupimg.id = "send2eskupimg";
// 		diveskupimg.style.padding = "1px";
// 		diveskupimg.style.verticalAlign="middle";
// 		diveskupimg.style.border="3px solid #fff";
// 		diveskupimg.style.marginBottom="6px";
// 		//diveskup.innerHTML = "Enviar a Eskup";
// 		diveskup.appendChild(diveskupimg);	
// 		divwhere.appendChild(diveskup);
		
// 		var sendbutton;
// 		sendbutton =  document.getElementById('tweeting_button');
// 		if (sendbutton != null) sendbutton.addEventListener("click", Send, false);
		
// 		InsertRTlinks();		
// 		// para cuando se pulsa en 'mas' cargar nuevos RT links
// 		// document.getElementById('timeline').addEventListener('DOMSubtreeModified', InsertRTlinks, false);
// 		//document.addEventListener('DOMSubtreeModified', InsertRTlinks, false);
// 	}
// }

// if (document.getElementById('send2eskup') == null)
// {	
// 	//InsertEskupElements();
// }
