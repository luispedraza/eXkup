var SELECTION = [];
var NEWMESSAGE;

window.addEventListener("load", function() {
	NEWMESSAGE = document.getElementById("newmessage");
	document.getElementById("send").addEventListener("click", Update);
	document.getElementById("cancel").addEventListener("click", CancelUpdate);
	$("#setitalic").on("click", function() {
		console.log("hola");
		document.execCommand('italic',false,null);
	});
	$("#setbold").on("click", function() {
		document.execCommand('bold',false,null);	// selección en negritas
	});
	document.getElementById("newmessage").addEventListener("keydown", Counter);
	document.getElementById("newmessage").addEventListener("mouseup", Selection);
	document.getElementById("insertvideo").addEventListener("click", insertVideo);
	document.getElementById("insertimage").addEventListener("click", insertImage);
	document.getElementById("insertlink").addEventListener("click", insertLink);
});

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
};