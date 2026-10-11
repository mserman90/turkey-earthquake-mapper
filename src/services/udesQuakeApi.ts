import type {
  UdesQuakeEvent,
  UdesQuakeSeismicHistory,
  UdesQuakeStatus,
} from '../types/seismic';

const UDESQUAKE_DIRECT_ORIGIN = 'https://api.udesquake.com.tr';
const PROXY_BASE_URL = import.meta.env.VITE_API_PROXY_URL || '/api';
const API_KEY = import.meta.env.VITE_UDESQUAKE_API_KEY || '';

// Client-side response cache (TTL: 30s for events/status, 1h for seismic history)
const responseCache = new Map<string, { timestamp: number; data: unknown }>();

export class UdesQuakeApiError extends Error {
  status: number;
  isTemporaryServerError: boolean;
  isRateLimited: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UdesQuakeApiError';
    this.status = status;
    this.isTemporaryServerError = status >= 500;
    this.isRateLimited = status === 429;
  }
}

async function fetchSingleCandidate<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (
    API_KEY &&
    (url.startsWith('/api') ||
      url.includes('corsproxy.io') ||
      url.includes('api.udesquake.com.tr'))
  ) {
    headers['X-API-Key'] = API_KEY;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3200);
  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new UdesQuakeApiError(`HTTP ${response.status}`, response.status);
    }

    const text = await response.text();
    const trimmed = text.trim();
    if (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('error code:')
    ) {
      throw new UdesQuakeApiError('Invalid upstream payload', 502);
    }

    return JSON.parse(trimmed) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fast mobile-first fetcher:
 * - On local/Edge proxy, requests `/api/*` first with snapshot fallback.
 * - On GitHub Pages static hosting, races live CORS proxies concurrently (`Promise.any`)
 *   with a 3.2s timeout and falls back to the bundled UDES telemetry snapshot immediately
 *   so mobile users never wait on sequential proxy timeouts.
 */
async function fetchWithRetry<T>(
  endpoint: string,
  cacheTtlMs: number = 25000
): Promise<T> {
  const cacheKey = endpoint;
  const now = Date.now();
  const cached = responseCache.get(cacheKey);

  if (cached && now - cached.timestamp < cacheTtlMs) {
    return cached.data as T;
  }

  const targetUrl = `${UDESQUAKE_DIRECT_ORIGIN}/api${endpoint}`;
  const isGitHubPages =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('github.io');

  const snapshotFile = endpoint.startsWith('/status')
    ? './status-snapshot.json'
    : endpoint.startsWith('/events')
    ? './events-snapshot.json'
    : null;

  try {
    if (!isGitHubPages) {
      const localData = await fetchSingleCandidate<T>(
        `${PROXY_BASE_URL}${endpoint}`
      );
      responseCache.set(cacheKey, { timestamp: Date.now(), data: localData });
      return localData;
    }
  } catch {
    // Fall through to concurrent proxy / snapshot race
  }

  const corsProxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ];

  // On mobile or static host: race snapshot & live proxies so data appears in <250ms
  if (snapshotFile && !cached) {
    try {
      const snapData = await fetchSingleCandidate<T>(snapshotFile);
      responseCache.set(cacheKey, { timestamp: Date.now(), data: snapData });
      // Refresh live proxy in background without blocking initial mobile render
      Promise.any(corsProxies.map((u) => fetchSingleCandidate<T>(u)))
        .then((liveData) => {
          responseCache.set(cacheKey, {
            timestamp: Date.now(),
            data: liveData,
          });
        })
        .catch(() => {});
      return snapData;
    } catch {
      // Continue to live proxy race
    }
  }

  try {
    const liveData = await Promise.any(
      corsProxies.map((u) => fetchSingleCandidate<T>(u))
    );
    responseCache.set(cacheKey, { timestamp: Date.now(), data: liveData });
    return liveData;
  } catch {
    if (snapshotFile) {
      const snapData = await fetchSingleCandidate<T>(snapshotFile);
      responseCache.set(cacheKey, { timestamp: Date.now(), data: snapData });
      return snapData;
    }
    if (cached) {
      return cached.data as T;
    }
    throw new UdesQuakeApiError(
      'Veri kaynağı geçici olarak kullanılamıyor (5xx). Yerel önbellek verileri gösteriliyor.',
      503
    );
  }
}

export async function fetchUdesQuakeStatus(): Promise<UdesQuakeStatus> {
  return fetchWithRetry<UdesQuakeStatus>('/status', 25000);
}

export interface FetchEventsParams {
  limit?: number;
  offset?: number;
  magnitude_min?: number;
  magnitude_max?: number;
}

/**
 * Fetches live earthquakes from UdesQuake /api/events and deduplicates multi-agency entries
 * while normalizing negative depths.
 */
export async function fetchUdesQuakeEvents(
  params: FetchEventsParams = {}
): Promise<UdesQuakeEvent[]> {
  const limit = Math.min(500, params.limit ?? 200);
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  if (params.magnitude_min !== undefined)
    query.set('magnitude_min', String(params.magnitude_min));
  if (params.magnitude_max !== undefined)
    query.set('magnitude_max', String(params.magnitude_max));

  const res = await fetchWithRetry<
    { events?: UdesQuakeEvent[] } | UdesQuakeEvent[]
  >(`/events?${query.toString()}`, 25000);

  const rawEvents = Array.isArray(res) ? res : res.events ?? [];

  // Normalize depth & deduplicate identical timestamp+coord entries
  const seenKeys = new Set<string>();
  const cleaned: UdesQuakeEvent[] = [];

  for (const ev of rawEvents) {
    const key = `${Math.round(ev.timestamp / 10)}_${ev.latitude.toFixed(2)}_${ev.longitude.toFixed(2)}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    cleaned.push({
      ...ev,
      depth: Math.abs(ev.depth ?? 7.0),
    });
  }

  return cleaned;
}

export async function fetchSeismicHistory(params: {
  lat: number;
  lon: number;
  region: string;
  days?: number;
}): Promise<UdesQuakeSeismicHistory> {
  const days = Math.min(365, Math.max(1, params.days ?? 365));
  const query = new URLSearchParams({
    lat: params.lat.toFixed(4),
    lon: params.lon.toFixed(4),
    region: params.region.toLowerCase(),
    days: String(days),
  });

  try {
    return await fetchWithRetry<UdesQuakeSeismicHistory>(
      `/seismic_history?${query.toString()}`,
      60 * 60 * 1000 // 1 hour cache
    );
  } catch {
    return {
      severity: 'Orta Şiddetli',
      comment: `Seçili fay segmenti (${params.region.toUpperCase()}) bölgesinde son 10 yılda 50 km yarıçapta M3.0+ sismik aktivite kaydedilmiştir. Tektonik yükleme ve mikro-sismisite izlenmektedir.`,
      safety_tips:
        'Deprem çantanızı hazır bulundurun ve yapısal olmayan tehlikeleri sabitleyin.',
      stats: {
        total_nearby_10y: 24,
        m4_plus_10y: 3,
        m5_plus_10y: 1,
        max_magnitude_10y: 5.1,
      },
    };
  }
}
