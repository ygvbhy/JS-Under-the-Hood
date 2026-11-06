function box(width, height = width, area = width * height) {
  return width + ' ' + height + ' ' + area;
}
console.log(box(3));
console.log(box(3, 4));
console.log(box(3, undefined, 0));
