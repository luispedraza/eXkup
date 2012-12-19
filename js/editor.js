/////////////////////////////////////
// Contador de caracteres restantes
/////////////////////////////////////
var SELECTION = [];
var NEWMESSAGE;

window.addEventListener("load", initEditor);
function initEditor() {
	NEWMESSAGE = document.getElementById("newmessage");
	document.getElementById("send").addEventListener("click", Update);
	document.getElementById("cancel").addEventListener("click", CancelUpdate);
	document.getElementById("setitalic").addEventListener("click", setItalic);
	document.getElementById("setbold").addEventListener("click", setBold);
	document.getElementById("newmessage").addEventListener("keydown", Counter);
	document.getElementById("newmessage").addEventListener("mouseup", Selection);
	document.getElementById("insertvideo").addEventListener("click", insertVideo);
	document.getElementById("insertimage").addEventListener("click", insertImage);
	document.getElementById("insertlink").addEventListener("click", insertLink);
}

function Counter()
{
	var remaining = maxchar - NEWMESSAGE.innerText.length-1;
	document.getElementById("counter").innerText = String(remaining);
};

function Selection() {
	SELECTION = [];
	var sel = document.getSelection();
	if (!sel.containsNode(NEWMESSAGE, true))
		return;
	for (var s=0; s<sel.rangeCount; s++) {
		SELECTION.push(sel.getRangeAt(s));
	}
}
//////////////////////////////////////
// Aplica la etiqueta <tag> a la selección
//////////////////////////////////////
function setTag(tag) {
	var tagini = "<"+tag+">";
	var tagfin = "</"+tag+">";
	for (r in SELECTION) {
		range = SELECTION[r];
		console.log(range);
		if (range.commonAncestorContainer.parentNode.tagName.match(RegExp(tag, "i"))) {
			var text = range.commonAncestorContainer.parentNode.outerHTML;
			 range.commonAncestorContainer.parentNode.outerHTML = text.replace(tagfin, "").replace(tagini, "");
		}
		var ini = range.startOffset;
		var fin = range.endOffset;
		var iniCon = range.startContainer;
		var finCon = range.endContainer;
		if (iniCon == finCon) {
			iniCon.textContent = iniCon.textContent.slice(0,ini) +
				tagini + iniCon.textContent.slice(ini,fin) + tagfin +
				iniCon.textContent.slice(fin);
		}
		else {
			iniCon.textContent = iniCon.textContent.slice(0,ini) + tagini + iniCon.textContent.slice(ini);
			finCon.textContent = finCon.textContent.slice(0,fin) + tagfin + finCon.textContent.slice(fin);	
		}
	}
	html = NEWMESSAGE.innerHTML;
	html = html.replace("&lt;"+tag+"&gt;", tagini);
	html = html.replace("&lt;/"+tag+"&gt;", tagfin);
	NEWMESSAGE.innerHTML = html;
	SELECTION = [];
}
//////////////////////////////////////
// Aplica etilo <b> a la selección
//////////////////////////////////////
function setBold()
{
	setTag("b");
}
//////////////////////////////////////
// Aplica etilo <i> a la selección
//////////////////////////////////////
function setItalic()
{
	setTag("i");
}

// http://www.codetoad.com/javascript_get_selected_text.asp
// Slecciona texto de la ventana principal
function getSelText()
{
	var txt = '';
	if (window.getSelection)
	{
		return window.getSelection();
	}
	else if (document.getSelection)
	{
		return document.getSelection();
	}
	else if (document.selection)
	{
		return document.selection.createRange().text;
	}
	else return "";
}