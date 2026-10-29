let value = 'outer';
function read() {
  try {
    console.log(value);
  } catch (e) {
    console.log(e.name);
  }
  let value = 'inner';
  console.log(value);
}
read();
