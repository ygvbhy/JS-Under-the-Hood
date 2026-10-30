function makeGreeter() {
  let name = 'Kim';
  const greet = () => 'Hi, ' + name;
  name = 'Lee';
  return greet;
}
const sayHi = makeGreeter();
console.log(sayHi());
