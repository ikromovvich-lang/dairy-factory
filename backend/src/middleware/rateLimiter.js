const rateLimit = require('express-rate-limit');

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Жуда кўп сўровлар. Кейинроқ уриниб кўринг.' }
});

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Жуда кўп уринишлар. 15 дақиқадан сўнг уриниб кўринг.' }
});
