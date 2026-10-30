class Point {
  constructor(x) { this.x = x; }
  getX() { return this.x; }
}
console.log(typeof Point);
console.log(Point.prototype.constructor === Point);
var p = new Point(3);
console.log(Object.getPrototypeOf(p) === Point.prototype, p.getX());
