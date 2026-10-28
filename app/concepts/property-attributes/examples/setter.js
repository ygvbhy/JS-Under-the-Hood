let celsius = 0;
const temp = {
  get fahrenheit() {
    return (celsius * 9) / 5 + 32;
  },
  set fahrenheit(f) {
    celsius = ((f - 32) * 5) / 9;
  },
};
temp.fahrenheit = 212;
console.log(celsius);
console.log(temp.fahrenheit);
console.log(JSON.stringify(Object.keys(Object.getOwnPropertyDescriptor(temp, 'fahrenheit'))));
