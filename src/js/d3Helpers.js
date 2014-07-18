function d3Translate(vector) {
	return " translate(" + vector + ")";
};
function d3Translate3D(vector) {
    return " translate3d(" + [vector[0]+"px", vector[1]+"px", "0px"] + ")";
}
function d3TranslateNode(node) {
    return " translate(" + [node.x, node.y] + ")";
};
function d3TranslateNode3D(node) {
    return " translate3d(" + [node.x+"px", node.y+"px", "0px"] + ")";  
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
        alfa = _PI/n,	// initial angle
        delta = alfa*2;
    do {
    	points.push([r*_COS(alfa), r*_SIN(alfa)].join(","));
    	alfa += delta;
    } while (alfa < 2*_PI);
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

/* Links en el plot de dependencias hive (árbol agrupado) */
function hiveLink(d) {
    var s = d.source,
        t = d.target,
        x;
    if (t.ang < s.ang) x = t, t = s, s = x;
    if (t.ang - s.ang > _PI) s.ang += 2 * _PI;
    var a1 = s.ang - (t.ang - s.ang) / 3,
        a2 = t.ang + (t.ang - s.ang) / 3;
    return "M" + _COS(s.ang) * s.r + "," + _SIN(s.ang) * s.r
        + "C" + _COS(a1) * s.r + "," + _SIN(a1) * s.r
        + " " + _COS(a2) * t.r + "," + _SIN(a2) * t.r
        + " " + _COS(t.ang) * t.r + "," + _SIN(t.ang) * t.r;
};
/* Construye una línea entre source y target */
function d3Line(s,t) {
    return "M"+s.x+","+s.y+"L"+t.x+","+t.y;
};

// http://bl.ocks.org/mbostock/3231298
function collide(node) {
  var r = node.radius + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  };
}

