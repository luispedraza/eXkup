/* Integración con algunas páginas */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	var twitterPattern = RegExp("https?://(w{3}\.)?twitter\.com");
	if ((twitterPattern.exec(tab.url)) && (changeInfo.status == "complete")) {
		chrome.tabs.executeScript(tabId, { file: "exe/twitter2eskup.js" });	
	};
	// var elpaisPattern = RegExp("https?://.*?\.?elpais\.com");
	// if ((elpaisPattern.exec(tab.url)) && (changeInfo.status == "complete")) {
	// 	console.log("encontrado");
	// 	chrome.tabs.executeScript(tabId, { file: "exe/elpais.js" });	
	// };
});
