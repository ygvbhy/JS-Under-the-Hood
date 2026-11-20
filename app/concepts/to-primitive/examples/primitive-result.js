var five = {
  valueOf() {
    return '5';
  },
};
console.log(five - 1, JSON.stringify(five + 1));
