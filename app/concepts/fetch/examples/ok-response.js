fetch('/user.json')
  .then((response) => {
    console.log(response.status, response.ok);
    const body = response.json();
    console.log(body instanceof Promise);
    return body;
  })
  .then((user) => {
    console.log(user.name);
  });
console.log('sync end');
