var bare = Object.create(null);
try {
  console.log(String(bare));
} catch (e) {
  console.log(e.name);
}
var stubborn = {
  valueOf() {
    return {};
  },
  toString() {
    return {};
  },
};
try {
  console.log(stubborn + '');
} catch (e) {
  console.log(e.name);
}
