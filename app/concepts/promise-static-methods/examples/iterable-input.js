var p = Promise.all(42);
console.log('no throw', p instanceof Promise);
p.catch(function (e) {
  console.log('rejected', e.name);
  return Promise.all('hi');
}).then(function (v) { console.log(JSON.stringify(v)); });
