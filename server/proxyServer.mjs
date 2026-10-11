import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 8787;
const UDESQUAKE_BASE = 'https://api.udesquake.com.tr';
const API_KEY = process.env.UDESQUAKE_API_KEY || '';

app.use(cors());

// Rate limit protection: 100 req/min unauthenticated, 500 req/min with API key
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => (req.headers['x-api-key'] || API_KEY ? 500 : 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded. Please wait before sending more requests.',
  },
});

app.use('/api', limiter);

// In-memory proxy cache (30s for live data, 1h for seismic_history)
const proxyCache = new Map();

app.get('/api/:endpoint', async (req, res) => {
  const endpoint = req.params.endpoint;
  const allowed = ['status', 'events', 'seismic_history'];
  if (!allowed.includes(endpoint)) {
    return res.status(404).json({ error: 'Unknown UdesQuake endpoint' });
  }

  const queryString = new URLSearchParams(req.query).toString();
  const targetUrl = `${UDESQUAKE_BASE}/api/${endpoint}${queryString ? `?${queryString}` : ''}`;

  const ttlMs = endpoint === 'seismic_history' ? 3600 * 1000 : 25 * 1000;
  const cached = proxyCache.get(targetUrl);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached.data);
  }

  try {
    const headers = { Accept: 'application/json' };
    const key = req.headers['x-api-key'] || API_KEY;
    if (key) headers['X-API-Key'] = String(key);

    const upstream = await fetch(targetUrl, { headers });
    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ error: `Upstream UdesQuake returned ${upstream.status}` });
    }

    const data = await upstream.json();
    proxyCache.set(targetUrl, { timestamp: Date.now(), data });
    res.setHeader('X-Cache', 'MISS');
    return res.json(data);
  } catch (err) {
    if (cached) {
      res.setHeader('X-Cache', 'STALE');
      return res.json(cached.data);
    }
    return res.status(503).json({
      error: 'Veri kaynağı geçici olarak kullanılamıyor.',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`UdesQuake Proxy & Cache Server running on http://localhost:${PORT}`);
});
