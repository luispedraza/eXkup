///////////////////////////////////////
// Integracicón con twitter:
///////////////////////////////////////
function SendT2E(texto)
{
	var publickey = localStorage["eskupkey"];
	if (publickey == "undefined")
		alert("Para poder enviar a Eskup, antes debes configurar la extensión indicando tu clave pública");	
	var eskuprequpdate = new XMLHttpRequest();
	eskuprequpdate.open("GET",
					   "http://eskup.elpais.com/Ineskup?c="+
					   "add" +
					   "&m=" + 
					   texto +
					   "&id=" + publickey,
					   true);	
	eskuprequpdate.send(null);	
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	callbackFunc = SendT2E;
	if (tab.url.match('http://twitter') && changeInfo.status == "complete")
	{
		chrome.tabs.executeScript(null, { file: "twitter2eskup.js" });	
	}
});
