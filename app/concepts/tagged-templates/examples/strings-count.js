function count(strings, ...values) {
  return JSON.stringify(strings) + ' ' + values.length;
}
console.log(count`plain`);
console.log(count`${1}`);
console.log(count`${1}${2}`);
console.log(count`a${1}b`);
