try {
  new Animal();
} catch (e) {
  console.log(e.name);
}
class Animal {}
console.log(typeof new Animal());
let Shape = 'outer';
{
  try {
    console.log(Shape);
  } catch (e) {
    console.log(e.name);
  }
  class Shape {}
}
