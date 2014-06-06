///////////////////////////////////////
// Integracicón con twitter:
///////////////////////////////////////
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	var twitterPattern = RegExp("https?://(w{3}\.)?twitter\.com");
	// console.log(pattern.exec(tab.url));
	if ((twitterPattern.exec(tab.url)) && (changeInfo.status == "complete")) {
		chrome.tabs.executeScript(tabId, { file: "js/twitter2eskup.js" });	
	};
	var elpaisPattern = RegExp("https?://.*?\.?elpais\.com");
	if ((elpaisPattern.exec(tab.url)) && (changeInfo.status == "complete")) {
		console.log("encontrado");
		chrome.tabs.executeScript(tabId, { file: "js/elpais.js" });	
	};
});
