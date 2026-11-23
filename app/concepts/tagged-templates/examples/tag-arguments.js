function inspect(strings, ...values) {
  console.log(JSON.stringify(strings), strings.length, values.length);
  console.log(typeof values[0], typeof values[1]);
  return values.length;
}
var item = { id: 7 };
var result = inspect`id:${item}, next:${item.id + 1}`;
console.log(result, typeof result);
console.log(`id:${item}, next:${item.id + 1}`);
function kind(arg) {
  return typeof arg;
}
console.log(kind`id`, kind(`id`));
