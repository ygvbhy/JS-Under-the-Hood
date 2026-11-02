var smile = '😀';
console.log(smile.length, 'a😀b'.length, '가나'.length);
console.log(smile.charCodeAt(0).toString(16), smile.charCodeAt(1).toString(16));
console.log(smile.codePointAt(0).toString(16), smile.codePointAt(1).toString(16));
console.log(String.fromCodePoint(0x1f600) === smile, '\u{1F600}' === smile);
