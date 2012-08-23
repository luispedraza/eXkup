// Object to hold information about the current page
// Send the information back to the extension
// nota: http://stackoverflow.com/questions/2626859/chrome-extension-how-to-capture-selected-text-and-send-to-a-web-service
var texto = "";
texto = window.getSelection().toString();
chrome.extension.sendRequest(texto);


