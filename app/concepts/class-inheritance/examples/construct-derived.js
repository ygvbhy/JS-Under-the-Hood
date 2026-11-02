class Animal {
  constructor(name) {
    this.name = name;
  }
}
class Dog extends Animal {
  constructor(name) {
    super(name);
    this.kind = 'dog';
  }
}
const pet = new Dog('Rex');
console.log(pet.name, pet.kind);
console.log(Object.getPrototypeOf(pet) === Dog.prototype);
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype);
