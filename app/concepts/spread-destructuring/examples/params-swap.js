function area({ width = 1, height = 1 } = {}) {
  return width * height;
}
console.log(area({ width: 3 }), area({ width: 3, height: null }), area());
var a = 1;
var b = 2;
[a, b] = [b, a];
console.log(a, b);
var x, y;
({ x, y } = { x: 'X', y: 'Y' });
console.log(x, y);
