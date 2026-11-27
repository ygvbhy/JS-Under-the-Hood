const user = { name: 'kim', _token: 'abc' };
const hideIn = new Proxy(user, {
  has(target, key) {
    return !String(key).startsWith('_') && key in target;
  },
});
const hideKeys = new Proxy(user, {
  ownKeys(target) {
    return Reflect.ownKeys(target).filter((key) => !String(key).startsWith('_'));
  },
});
console.log('_token' in hideIn, Object.keys(hideIn).join());
console.log('_token' in hideKeys, Object.keys(hideKeys).join(), JSON.stringify(hideKeys));
console.log(hideIn._token, hideKeys._token, Object.hasOwn(hideKeys, '_token'));
