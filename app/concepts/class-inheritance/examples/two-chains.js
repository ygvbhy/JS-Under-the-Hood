class Animal {
  static create(name) { return new this(name); }
  constructor(name) { this.name = name; }
}
class Cat extends Animal {}
const kitty = Cat.create('Nabi');
console.log(Object.getPrototypeOf(Cat) === Animal);
console.log(kitty instanceof Cat, kitty.name);
console.log(Object.getPrototypeOf(Animal) === Function.prototype);
