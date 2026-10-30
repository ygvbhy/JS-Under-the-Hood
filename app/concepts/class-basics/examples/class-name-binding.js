class Config {
  static reset() { Config = null; }
}
try { Config.reset(); } catch (e) { console.log(e.name); }
Config = 'replaced';
console.log(Config);
var Shape = class Inner { name() { return typeof Inner; } };
console.log(new Shape().name(), typeof Inner);
