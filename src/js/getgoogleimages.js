var images = [].slice.apply(document.getElementById('search').getElementsByTagName('a'));
images = images.map(function(element) {
	var str  = element.href;
	var match = str.match("(imgurl=)(.+?)(?=&)");
	if (match){
		return match[2];	
	} else {
		var img = element.getElementsByTagName('img');
		if (img.length) return img[0].src;
	}
	return "";
});
result = {"title": document.title, "images": images}