class S {
  static _n = 0;
  static get count() {
    return this._n;
  }
  static set count(x) {
    this._n = x;
  }
}
class T extends S {}
console.log(Object.hasOwn(S, 'count'), Object.hasOwn(S.prototype, 'count'), new S().count);
T.count = 7;
console.log(S.count, T.count, Object.hasOwn(T, '_n'));
