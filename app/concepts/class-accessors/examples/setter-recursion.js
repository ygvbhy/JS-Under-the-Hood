let depth = 0;
class R {
  set v(x) {
    depth++;
    if (depth < 3) this.v = x;
  }
}
const r = new R();
r.v = 1;
console.log(depth, Object.hasOwn(r, 'v'));
