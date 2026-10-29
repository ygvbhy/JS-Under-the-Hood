function whoAmI() {
  return this.name;
}
const kim = { name: 'Kim' };
const lee = { name: 'Lee' };
const bound = whoAmI.bind(kim);
console.log(bound());
console.log(bound.call(lee));
console.log(bound.bind(lee)());
const obj = { name: 'obj', bound };
console.log(obj.bound());
