Promise.all([]).then(function (v) { console.log('all', JSON.stringify(v)); });
Promise.allSettled([]).then(function (v) { console.log('allSettled', JSON.stringify(v)); });
Promise.any([]).catch(function (e) { console.log('any', e.name, e.errors.length); });
Promise.race([]).then(function () { console.log('race settled'); });
