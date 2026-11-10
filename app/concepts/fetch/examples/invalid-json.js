fetch('/broken.json')
  .then((response) => {
    console.log('then', response.status, response.ok);
    return response.json();
  })
  .catch((error) => {
    console.log('catch', error.name, error instanceof SyntaxError);
  });
