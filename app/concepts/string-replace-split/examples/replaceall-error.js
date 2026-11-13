try {
  'aa'.replaceAll(/a/, 'b');
} catch (e) {
  console.log(e.name);
}
console.log('aa'.replaceAll(/a/g, 'b'));
console.log('aaa'.replaceAll('aa', 'b'));
console.log('abc'.replace('', '-'));
console.log('abc'.replaceAll('', '-'));
