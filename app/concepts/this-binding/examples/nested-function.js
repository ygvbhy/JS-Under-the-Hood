const counter = {
  run() {
    console.log(this === counter);
    function inner() {
      console.log(this === counter);
      console.log(this === globalThis);
    }
    inner();
  },
};
counter.run();
