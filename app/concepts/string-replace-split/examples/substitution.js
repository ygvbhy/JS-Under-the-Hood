const date = '2026-11-13';
console.log(date.replace(/(\d+)-(\d+)-(\d+)/, '$3/$2/$1'));
console.log('2026-11'.replace(/(?<y>\d+)-(?<m>\d+)/, '$<m>.$<y>'));
console.log('abc'.replace('b', "[$`|$']"));
console.log('ab'.replace(/(?<x>a)/, '[$<zz>]'));
console.log('ab'.replace(/(a)/, '[$<x>]'));
console.log('a'.replace(/(a)/, '[$0|$1|$10]'));
