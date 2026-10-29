const shop = {
  order() {},
};
try {
  new shop.order();
} catch (e) {
  console.log(e.name);
}
try {
  new Math.max();
} catch (e) {
  console.log(e.name);
}
console.log(typeof shop.order);
console.log(typeof Math.max);
