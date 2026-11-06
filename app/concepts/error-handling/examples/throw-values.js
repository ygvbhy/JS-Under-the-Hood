try {
  throw 'error가 아닌 문자열';
} catch (e) {
  console.log(typeof e);
}
try {
  null.x;
} catch (e) {
  console.log(e.name);
  console.log(e instanceof TypeError);
  console.log(e instanceof Error);
}
try {
  throw new RangeError('범위');
} catch {
  console.log('바인딩 없는 catch');
}
