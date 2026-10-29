const base = { kind: 'book', lang: 'ko' };
Object.defineProperty(base, 'hidden', { value: 1, enumerable: false });
const item = Object.create(base);
item.title = 'JS';
item.kind = 'ebook';
for (const key in item) {
  console.log(key);
}
