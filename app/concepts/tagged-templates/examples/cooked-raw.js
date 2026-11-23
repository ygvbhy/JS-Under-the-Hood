function both(strings) {
  console.log(JSON.stringify(strings[0]), strings[0].length);
  console.log(JSON.stringify(strings.raw[0]), strings.raw[0].length);
}
both`a\tb`;
console.log(JSON.stringify(String.raw`a\tb${1 + 1}c`));
console.log(String.raw`a\tb` === 'a\\tb');
console.log(String.raw({ raw: ['x', 'y'] }, 1, 2));
