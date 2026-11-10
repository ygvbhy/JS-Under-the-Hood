fetch('/offline.json').then(
  (response) => {
    console.log('then', response.status);
  },
  (error) => {
    console.log('rejected', error.name, error instanceof TypeError);
  }
);
Promise.resolve().then(() => {
  console.log('microtask');
});
