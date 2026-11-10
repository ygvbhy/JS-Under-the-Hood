function getJSON(path) {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.json();
  });
}

getJSON('/user.json')
  .then((user) => {
    console.log('data', user.name);
    return getJSON('/missing.json');
  })
  .then((data) => {
    console.log('data', data.message);
  })
  .catch((error) => {
    console.log('catch', error.message);
  });
