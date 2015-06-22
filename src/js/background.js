chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.type === "nMessages") {	
		chrome.browserAction.setBadgeText({text: request.num});
		chrome.browserAction.setBadgeBackgroundColor({color: "#000", tabId: sender.tab.id});	
	};
});