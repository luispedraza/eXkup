function d3Translate(vector) {
	return " translate(" + vector + ")";
};
function d3Scale(scale) {
	return " scale(" + scale + ")";
};
function d3Rotate(rot) {
	return " rotate(" + rot + ")";
};
function d3Matrix(matrix) {
	return " matrix("+matrix.join(",")+")"
};
function d3PolyPath(r, n) {
	var points = [],
        alfa = Math.PI/n,	// initial angle
        delta = alfa*2;
    do {
    	points.push([r*Math.cos(alfa), r*Math.sin(alfa)].join(","));
    	alfa += delta;
    } while (alfa < 2*Math.PI);
    return points.join(" ");
};