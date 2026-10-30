var result = (function () {
  var temp = 10;
  return temp * 2;
})();
console.log(result);
console.log(typeof temp, 'temp' in globalThis);
