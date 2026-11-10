fetch('/missing.json')
  .then((response) => {
    console.log('then', response.status, response.ok);
    return response.json();
  })
  .then((body) => {
    console.log(body.message);
  })
  .catch((error) => {
    console.log('catch', error.name);
  });
