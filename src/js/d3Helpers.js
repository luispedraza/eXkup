function d3Translate(vector) {
	return " translate(" + vector + ")";
};
// function d3TranslateNodeXXYY(node) {
//     return " translate(" + [node.xx, node.yy] + ")";
// };
function d3TranslateNode(node) {
    return " translate(" + [node.x, node.y] + ")";
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

function ColorGenerator() {
    var current = 0;
    // var generator = d3.scale.category20();
    // var generator = d3.scale.category20b();
    var generator = d3.scale.category20c();
    this.get = function() {
        return generator(current++);
    };
};

function d3TimelinePath(d) {
    var source = d.source, target = d.target;
    var dx = target.x - source.x,
        // dcx = Math.min(50, .5*dx),
        dcx = 0.5*dx,
        cx = source.x + dcx;
    return  "M" + [source.x, source.y].join(",") + 
            "C" + [ cx, source.y,
                    cx, target.y, 
                    target.x, target.y].join(",");
};



