var SELECTION = [];
var MAXCHAR = 280;

window.addEventListener("load", function() {
	NEWMESSAGE = document.getElementById("newmessage");
	$("#send").on("click", Update);
	$("#cancel").on("click", CancelUpdate);
	$("#setitalic").on("click", function() {
		document.execCommand('italic',false,null);
	});
	$("#setbold").on("click", function() {
		document.execCommand('bold',false,null);
	});
	$("#newmessage").on("keyup", Counter);
	$("#insertvideo").on("click", insertVideo);
	$("#insertimage").on("click", insertImage);
	$("#insertlink").on("click", insertLink);
});

/* contador de caracteres del mensaje */
function Counter() {
	var message = $("#newmessage").text();
	console.log(message);
	console.log(message.length);
	var remaining = MAXCHAR - message.length;
	$("#counter").text(remaining.toString());
};