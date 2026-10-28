const item = {};
Object.defineProperty(item, 'code', { value: 'A1' });
try {
  Object.defineProperty(item, 'code', { value: 'B2' });
} catch (e) {
  console.log(e.name);
}
console.log(item.code);
