let reads = 0;
const counter = {
  get next() {
    reads = reads + 1;
    return reads;
  },
};
console.log(counter.next);
console.log(counter.next);
console.log(typeof Object.getOwnPropertyDescriptor(counter, 'next').get);
console.log(JSON.stringify(counter));
