const base = { z: 'base z', 7: 'base 7', shared: 'base' };
const item = Object.create(base);
item.b = 'own b';
item[3] = 'own 3';
item.shared = 'own';
for (const key in item) {
  console.log(key);
}
