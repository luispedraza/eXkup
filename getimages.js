// Object to hold information about the current page
var imagelist = document.getElementsByTagName('img');
// Send the information back to the extension
var imgurl = {"url":[]};
for (i=0;i in imagelist ;i++)
{
	imgurl.url[i] = imagelist[i].src;
}
chrome.extension.sendRequest(imgurl);

