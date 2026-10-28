let color = '빨강';
if (true) {
  try {
    console.log(color);
  } catch (e) {
    console.log(e.name);
  }
  let color = '파랑';
  console.log(color);
}
console.log(color);
