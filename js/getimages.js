var images = [].slice.apply(document.getElementsByTagName('img'));
images = images.map(function(element) {
	return element.src;
});
images
