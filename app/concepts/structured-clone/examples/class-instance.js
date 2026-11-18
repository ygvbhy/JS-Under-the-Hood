class Point {
  #secret = 1;
  x = 1;
  y = 2;
  get sum() {
    return this.x + this.y;
  }
  move() {}
  static read(o) {
    try {
      return o.#secret;
    } catch (e) {
      return e.name;
    }
  }
}
const p = new Point();
const c = structuredClone(p);
console.log(c instanceof Point, Object.getPrototypeOf(c) === Object.prototype);
console.log(JSON.stringify(c));
console.log(typeof c.move, c.sum);
console.log(Point.read(p), Point.read(c));
