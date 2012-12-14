/////////////////////////////////////
// Contador de caracteres restantes
/////////////////////////////////////
var SELECTION = [];

function Counter()
{
	remaining = maxchar - NEWMESSAGE.innerHTML.length-1;
	document.getElementById("counter").innerHTML = String(remaining);
};

function Selection() {
	SELECTION = [];
	sel = document.getSelection();
	if (!sel.containsNode(NEWMESSAGE, true))
		return;
	for (var s=0; s<sel.rangeCount; s++) {
		SELECTION.push(sel.getRangeAt(s));
	}
}
//////////////////////////////////////
// Aplica la etiqueta <tag> a la selección
//////////////////////////////////////
function SetTag(tag) {
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
				iniCon.textContent.slice(ini,fin).bold() +
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
function SetBold()
{
	SetTag("b");
}
//////////////////////////////////////
// Aplica etilo <i> a la selección
//////////////////////////////////////
function SetItalic()
{
	SetTag("i");
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