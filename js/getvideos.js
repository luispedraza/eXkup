var objects = [].slice.apply(document.getElementsByTagName('object'));
objects = objects.map(function(element) {
	return element.data;
});

var embeds = [].slice.apply(document.getElementsByTagName('embed'));
embeds = objects.map(function(element) {
	return element.src;
});

[].concat(objects, embeds)