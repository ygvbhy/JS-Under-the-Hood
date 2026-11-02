class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return this.name + ' makes a sound';
  }
}
class Dog extends Animal {
  speak() {
    return super.speak() + ' (woof)';
  }
}
const pet = new Dog('Rex');
console.log(pet.speak());
console.log(pet.hasOwnProperty('speak'), Dog.prototype.hasOwnProperty('speak'));
