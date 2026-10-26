console.log(JSON.stringify(String(5)), JSON.stringify(String(null)), JSON.stringify(String(true)));
console.log(Number('42'), Number(''), Number('12px'), Number(true), Number(null), Number(undefined));
console.log(Boolean('0'), Boolean(''), Boolean(0), Boolean({}));
console.log(JSON.stringify(String(Symbol('id'))), Number(10n));
