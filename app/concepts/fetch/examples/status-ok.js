const paths = ['/user.json', '/created.json', '/missing.json', '/server-error.json'];
Promise.all(paths.map((path) => fetch(path))).then((responses) => {
  const pairs = responses.map((response) => [response.status, response.ok]);
  console.log(JSON.stringify(pairs));
});
