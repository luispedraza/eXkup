///////////////////////////////////////
// Integracicón con twitter:
///////////////////////////////////////
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	var pattern = RegExp("https?://(w{3}\.)?twitter\.com");
	console.log(pattern.exec(tab.url));
	if ((pattern.exec(tab.url)) && (changeInfo.status == "complete")) {
		chrome.tabs.executeScript(tabId, { file: "js/twitter2eskup.js" });	
	};
});
