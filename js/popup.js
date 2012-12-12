// JavaScript Document  
//0 means disabled; 1 means enabled;  
// nota: http://yensdesign.com/2008/09/how-to-create-a-stunning-and-smooth-popup-using-jquery/

var popupStatus = 0;  

//loading popup with jQuery magic!  
function loadPopup(){  
//loads popup only if it is disabled  
if(popupStatus==0){  
	$("#tabber").css({  
		"opacity": "0.5"  
	});  
//$("#tabber").fadeIn("slow");  
$("#popupWnd").fadeIn("slow");  
popupStatus = 1;  
}  
}  

//disabling popup with jQuery magic!  
function disablePopup(){  
//disables popup only if it is enabled  
if(popupStatus==1){  
	$("#tabber").css({  
		"opacity": "1"  
	});  
//$("#tabber").fadeOut("slow");  
$("#popupWnd").fadeOut("slow");  
popupStatus = 0;  
}  
}  