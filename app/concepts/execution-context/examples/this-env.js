const obj = {
  name: 'obj',
  regular() {
    const arrow = () => this.name;
    return arrow();
  },
};
console.log(obj.regular());
