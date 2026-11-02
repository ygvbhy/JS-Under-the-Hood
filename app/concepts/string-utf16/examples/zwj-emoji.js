var family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}';
console.log(family.length);
console.log(family.codePointAt(2).toString(16));
console.log(JSON.stringify(family.slice(0, 2)), family.split('\u200D').length);
