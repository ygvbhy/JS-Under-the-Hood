let count = 0;
try {
  for (const i = 0; i < 3; i++) {
    count++;
  }
} catch (e) {
  console.log(e.name, count);
}
