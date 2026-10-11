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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves candidate upstream/proxy URLs so the app works seamlessly both behind
 * the local/Edge `/api` proxy AND when hosted statically on GitHub Pages.
 */
function buildCandidateUrls(endpoint: string): string[] {
  const targetUrl = `${UDESQUAKE_DIRECT_ORIGIN}/api${endpoint}`;
  const isGitHubPages =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('github.io');

  const corsProxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  ];

  if (isGitHubPages) {
    return corsProxies;
  }

  return [`${PROXY_BASE_URL}${endpoint}`, ...corsProxies];
}

/**
 * Fetches from the UdesQuake proxy with automatic 429 exponential backoff,
 * multi-proxy CORS fallback for static hosts (GitHub Pages), optional X-API-Key header,
 * and 5xx user-friendly error handling.
 */
async function fetchWithRetry<T>(
  endpoint: string,
  cacheTtlMs: number = 25000,
  maxRetries: number = 2
): Promise<T> {
  const cacheKey = endpoint;
  const now = Date.now();
  const cached = responseCache.get(cacheKey);

  if (cached && now - cached.timestamp < cacheTtlMs) {
    return cached.data as T;
  }

  const candidateUrls = buildCandidateUrls(endpoint);

  for (const url of candidateUrls) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const headers: Record<string, string> = {
          Accept: 'application/json',
        };
        if (API_KEY && url.startsWith('/')) {
          headers['X-API-Key'] = API_KEY;
        }

        const response = await fetch(url, { headers });

        if (response.status === 429) {
          if (attempt === maxRetries) break;
          const backoffMs = Math.min(6000, 1000 * Math.pow(2, attempt));
          await sleep(backoffMs);
          attempt++;
          continue;
        }

        if (response.status >= 500) {
          break; // try next proxy candidate
        }

        if (!response.ok) {
          break; // e.g. 404 on static host -> immediately try next proxy candidate
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          break; // SPA fallback HTML instead of JSON -> try next proxy candidate
        }

        const data = JSON.parse(text) as T;
        void contentType;
        responseCache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      } catch {
        if (attempt === maxRetries) break;
        await sleep(500 * Math.pow(2, attempt));
        attempt++;
      }
    }
  }

  if (cached) {
    return cached.data as T;
  }

  throw new UdesQuakeApiError(
    'Veri kaynağı geçici olarak kullanılamıyor (5xx). Yerel önbellek verileri gösteriliyor.',
    503
  );
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

  const res = await fetchWithRetry<{ events?: UdesQuakeEvent[] } | UdesQuakeEvent[]>(
    `/events?${query.toString()}`,
    25000
  );

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

  return fetchWithRetry<UdesQuakeSeismicHistory>(
    `/seismic_history?${query.toString()}`,
    60 * 60 * 1000 // 1 hour cache
  );
}
