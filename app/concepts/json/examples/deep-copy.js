function Point(x) { this.x = x; }
var shared = { n: 1 };
var source = {
  point: new Point(1),
  roles: new Map([['admin', true]]),
  created: new Date(0),
  memo: undefined,
  left: shared,
  right: shared
};
var copy = JSON.parse(JSON.stringify(source));
console.log(copy.point instanceof Point, JSON.stringify(copy.point));
console.log(JSON.stringify(copy.roles), typeof copy.created, 'memo' in copy);
console.log(source.left === source.right, copy.left === copy.right);
copy.left.n = 99;
console.log(copy.right.n, source.left.n);
