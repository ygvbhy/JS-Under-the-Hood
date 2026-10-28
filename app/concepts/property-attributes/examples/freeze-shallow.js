const config = { level: 1, limits: { max: 10 } };
Object.freeze(config);
config.level = 2;
config.limits.max = 20;
console.log(config.level);
console.log(config.limits.max);
console.log(Object.isFrozen(config));
console.log(Object.isFrozen(config.limits));
