class P {
  get #v() {
    return 'private';
  }
  get pub() {
    return 'public';
  }
  set #hidden(x) {}
  set shown(x) {}
  static read(o) {
    try {
      return o.#v;
    } catch (e) {
      return e.name;
    }
  }
  readShown() {
    return this.shown;
  }
  readHidden() {
    try {
      return this.#hidden;
    } catch (e) {
      return e.name;
    }
  }
}
const p = new P();
const child = Object.create(p);
console.log(P.read(p), P.read(child), P.read(P.prototype));
console.log(p.pub, child.pub, P.prototype.pub);
console.log(p.readShown(), p.readHidden());
