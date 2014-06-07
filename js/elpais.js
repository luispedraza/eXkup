console.log("hola");
var link = document.querySelector(".bloque_comentarios .conversacion");
var result = null;
if (link) {
	result = link.getAttribute("onclick");
};
result;