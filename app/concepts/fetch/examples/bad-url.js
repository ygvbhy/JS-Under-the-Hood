const promise = fetch('http://[');
console.log('after fetch');
promise.catch((error) => {
  console.log('catch', error.name);
});
Promise.resolve().then(() => {
  console.log('microtask');
});
