try {
  var label = 'start'
  (function () {
    console.log('실행');
  })();
} catch (e) {
  console.log(e.name);
}
console.log(typeof label);
var label2 = 'start'
;(function () {
  console.log('실행');
})();
