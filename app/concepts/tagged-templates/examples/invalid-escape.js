function both(strings) {
  console.log(strings[0], JSON.stringify(strings.raw[0]));
}
both`\unicode`;
both`C:\xyz`;
console.log(String.raw`\unicode`);
