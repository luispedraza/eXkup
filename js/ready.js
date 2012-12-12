$(document).ready(function(){
	$(".list_opener_mistemas").click(function(){
		$("#temas_lista").toggle(300);
	});
	$(".list_opener_block").click(function(){
		$("#temas_block_lista").toggle(300);
	});
	$(".list_opener_todos").click(function(){
		$("#temas_todos_lista").toggle(300);
	});
//	$(".list_opener").mouseover(function(){
//		$("#temas_lista").style.display = "block";
//		$("#temas_lista").toggle();
//	});
//	$(".list_opener").mouseout(function(){
//		$("#temas_lista").style.display = "none";
//	});
});