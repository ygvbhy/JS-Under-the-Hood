function makeBox(box = { count: 0 }) {
  box.count = box.count + 1;
  return box;
}
const a = makeBox();
const b = makeBox();
console.log(a.count, b.count, a === b);
const shared = { count: 0 };
makeBox(shared);
makeBox(shared);
console.log(shared.count);
