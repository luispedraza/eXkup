// Object to hold information about the current page
// Send the information back to the extension
// nota: http://stackoverflow.com/questions/2626859/chrome-extension-how-to-capture-selected-text-and-send-to-a-web-service
var entry = document.getElementById("current-entry");
var title = entry.getElementsByClassName("entry-title-link")[0];
var toremove = title.getElementsByClassName("entry-title-go-to")[0];
var toremoveparent = toremove.parentNode
toremoveparent.removeChild(toremove);
chrome.extension.sendRequest(title.innerHTML);
toremoveparent.appendChild(toremove);



