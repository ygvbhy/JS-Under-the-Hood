var Counter = (function () {
  var count = 0;
  function increase() {
    count++;
    return count;
  }
  return { increase: increase };
}());
Counter.increase();
console.log(Counter.increase());
console.log(Counter.count, typeof count);
Counter.count = 100;
console.log(Counter.increase());
