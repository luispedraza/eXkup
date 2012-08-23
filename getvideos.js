// Object to hold information about the current page
// Send the information back to the extension
var vidurl = {"url":[]};
var videolist = document.getElementsByTagName('object');
for (i=0;i in videolist ;i++)
{
	vidurl.url[i] = videolist[i].data;
}

videolist = document.getElementsByTagName('embed');
for (i=0;i in videolist ;i++)
{
	vidurl.url[i] = videolist[i].src;
}


chrome.extension.sendRequest(vidurl);

