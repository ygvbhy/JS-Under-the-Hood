function errorName(f) {
  try {
    f();
    return 'ok';
  } catch (e) {
    return e.name;
  }
}
function indexes(it) {
  var a = [];
  for (var m of it) a.push(m.index);
  return JSON.stringify(a);
}
console.log(errorName(function () { 'aa'.matchAll(/a/); }), errorName(function () { 'aa'.matchAll(/a/y); }));
console.log(indexes('a1b2'.matchAll('[0-9]')));
console.log(indexes('ab'.matchAll()));
console.log(indexes('aXa'.matchAll(/a/gy)));
console.log(indexes('\u{1F600}'.matchAll(/(?:)/g)), indexes('\u{1F600}'.matchAll(/(?:)/gu)));
