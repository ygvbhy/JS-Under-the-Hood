class Plain extends Array {
  static get [Symbol.species]() {
    return Array;
  }
}
const list = Plain.of(1, 2, 3);
console.log(list instanceof Plain);
console.log(list.map((x) => x) instanceof Plain);
console.log(list.filter((x) => x > 1) instanceof Plain);
console.log(Plain.from([1, 2]) instanceof Plain);
console.log(new Plain() instanceof Plain);
