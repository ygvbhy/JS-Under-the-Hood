function createAccount(initial) {
  let balance = initial;
  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    getBalance() {
      return balance;
    },
  };
}
const account = createAccount(100);
account.deposit(50);
console.log(account.getBalance());
console.log(account.balance);
account.balance = 0;
console.log(account.getBalance());
