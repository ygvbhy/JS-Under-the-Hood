function outer() {
  const arrow = () => this.name;
  return arrow;
}
const kim = { name: 'Kim' };
const lee = { name: 'Lee' };
const arrow = outer.call(kim);
console.log(arrow());
console.log(arrow.call(lee));
console.log(arrow.bind(lee)());
const obj = { name: 'obj', arrow };
console.log(obj.arrow());
