class Wallet {
  #balance = 100;
  spend(n) { this.#balance -= n; return this.#balance; }
}
var w = new Wallet();
console.log(w.spend(30));
console.log(JSON.stringify(Object.keys(w)), JSON.stringify(w), w.balance);
w['#balance'] = 0;
console.log(w.spend(10), w['#balance']);
