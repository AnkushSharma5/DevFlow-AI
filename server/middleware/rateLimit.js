const createRateLimiter = ({
  windowMs,
  maxRequests,
  keyGenerator,
  limitMessage,
  maxClients = 10000,
}) => {
  const buckets = new Map();

  return (req, res, next) => {
    const key = String(keyGenerator(req) || 'unknown');
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= maxClients) {
        for (const [client, current] of buckets) {
          if (current.resetAt <= now) buckets.delete(client);
        }
        if (buckets.size >= maxClients) {
          return res.status(503).json({ message: 'Request service is temporarily busy. Please try again shortly.' });
        }
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    if (bucket.count >= maxRequests) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message: limitMessage });
    }

    bucket.count += 1;
    res.set('RateLimit-Limit', String(maxRequests));
    res.set('RateLimit-Remaining', String(maxRequests - bucket.count));
    res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    return next();
  };
};

module.exports = { createRateLimiter };
