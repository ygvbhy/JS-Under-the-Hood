function run(callback) {
  return callback();
}
const book = {
  report() {
    function plain() {
      return this === book;
    }
    const that = this;
    function viaThat() {
      return that === book;
    }
    const viaArrow = () => this === book;
    console.log(run(plain));
    console.log(run(plain.bind(this)));
    console.log(run(viaThat));
    console.log(run(viaArrow));
  },
};
book.report();
