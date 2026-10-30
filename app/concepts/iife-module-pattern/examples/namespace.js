var MyApp = {};
MyApp.count = 0;
MyApp.increase = function () {
  MyApp.count++;
  return MyApp.count;
};
MyApp.increase();
console.log(MyApp.increase());
MyApp.count = 100;
console.log(MyApp.count);
