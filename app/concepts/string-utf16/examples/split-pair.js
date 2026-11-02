var text = 'a😀b';
console.log(JSON.stringify(text[1]), JSON.stringify(text.charAt(2)));
console.log(JSON.stringify(text.slice(0, 2)), text.indexOf('b'));
console.log(JSON.stringify(text.split('')));
console.log(JSON.stringify(text.split('').reverse().join('')));
