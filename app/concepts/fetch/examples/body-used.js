fetch('/user.json')
  .then((response) => {
    console.log(response.bodyUsed);
    const reading = response.text();
    console.log(response.bodyUsed);
    return reading.then((text) => {
      console.log(typeof text);
      return response.json();
    });
  })
  .catch((error) => {
    console.log('catch', error.name);
  });
