function greet(greeting, mark) {
  return greeting + ', ' + this.name + mark;
}
const kim = { name: 'Kim' };
console.log(greet.call(kim, 'Hi', '!'));
console.log(greet.apply(kim, ['Hello', '?']));
