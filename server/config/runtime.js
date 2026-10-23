const jwt = require('jsonwebtoken');

const parseTrustProxyHops = (value) => {
  if (value === undefined || value === '') return 0;
  const hops = Number(value);
  if (!Number.isSafeInteger(hops) || hops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  }
  return hops;
};

const validateRuntimeConfig = (env = process.env) => {
  const secret = env.JWT_SECRET;
  if (
    typeof secret !== 'string' ||
    Buffer.byteLength(secret, 'utf8') < 32 ||
    new Set(Buffer.from(secret, 'utf8')).size < 12 ||
    /your[_-]?|change.?me|replace|example|placeholder/i.test(secret)
  ) {
    throw new Error('JWT_SECRET must be a non-placeholder secret of at least 32 bytes with at least 12 distinct bytes.');
  }

  if (typeof env.MONGO_URI !== 'string' || !/^mongodb(?:\+srv)?:\/\//i.test(env.MONGO_URI)) {
    throw new Error('MONGO_URI must be set to a MongoDB connection string.');
  }

  const provider = (env.AI_PROVIDER || 'gemini').toLowerCase();
  if (!['gemini', 'openai'].includes(provider)) {
    throw new Error('AI_PROVIDER must be either "gemini" or "openai".');
  }

  parseTrustProxyHops(env.TRUST_PROXY_HOPS);

  // Catch malformed expiration settings at startup rather than on a user's first login.
  try {
    jwt.sign({ check: true }, secret, { expiresIn: env.JWT_EXPIRES_IN || '7d' });
  } catch {
    throw new Error('JWT_EXPIRES_IN must be a valid jsonwebtoken duration.');
  }
};

module.exports = { validateRuntimeConfig, parseTrustProxyHops };
