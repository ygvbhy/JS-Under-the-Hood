var calls = [];
var pair = {
  [Symbol.iterator]() {
    var i = 0;
    return {
      next() {
        calls.push('next');
        return i < 2 ? { value: i++, done: false } : { value: undefined, done: true };
      },
      return() {
        calls.push('return');
        return { done: true };
      },
    };
  },
};
console.log(JSON.stringify([...pair]), calls.join(','));
calls = [];
var [first] = pair;
console.log(first, calls.join(','));
