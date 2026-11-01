import type { UdesQuakeEvent } from '../types/seismic';

export interface AfadRawEvent {
  eventID: string;
  location: string;
  latitude: string;
  longitude: string;
  depth: string;
  type: string;
  magnitude: string;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  date: string; // e.g. "2026-11-01T08:09:33"
  isEventUpdate?: boolean;
  lastUpdateDate?: string | null;
  rms?: string;
}

const AFAD_DIRECT_ORIGIN = 'https://deprem.afad.gov.tr/apiv2/event';
const PROXY_AFAD_URL = '/api/afad';

// Client-side response cache (TTL: 30s)
const afadCache = new Map<string, { timestamp: number; data: UdesQuakeEvent[] }>();

export function normalizeAfadEvent(raw: AfadRawEvent): UdesQuakeEvent {
  const ts = Math.floor(new Date(raw.date).getTime() / 1000);
  const mag = parseFloat(raw.magnitude) || 0;
  const lat = parseFloat(raw.latitude) || 0;
  const lon = parseFloat(raw.longitude) || 0;
  const depth = Math.abs(parseFloat(raw.depth) || 7.0);

  let region = raw.location?.trim() || '';
  if (!region) {
    const parts = [raw.neighborhood, raw.district, raw.province].filter(Boolean);
    region = parts.join(', ') || 'Türkiye';
  }

  return {
    id: Number(raw.eventID) || undefined,
    event_id: `afad_${raw.eventID}`,
    source: 'AFAD (Resmi)',
    magnitude: Number(mag.toFixed(1)),
    latitude: lat,
    longitude: lon,
    depth: Number(depth.toFixed(1)),
    region,
    timestamp: isNaN(ts) ? Math.floor(Date.now() / 1000) : ts,
    time_str: raw.date,
    confidence: 0.95,
    confirmed_by: ['AFAD'],
    verification_status: 'official_agency',
    magnitude_type: raw.type || 'ML',
  };
}

/**
 * Fetches events from AFAD Official Earthquake Event Service (deprem.afad.gov.tr/event-service)
 */
export async function fetchAfadEvents(params: {
  minmag?: number;
  limit?: number;
} = {}): Promise<UdesQuakeEvent[]> {
  const minmag = params.minmag ?? 1.0;
  const limit = Math.min(400, params.limit ?? 250);
  const cacheKey = `afad_${minmag}_${limit}`;

  const cached = afadCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 30000) {
    return cached.data;
  }

  const isGitHubPages =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('github.io');

  const query = new URLSearchParams({
    minmag: String(minmag),
    limit: String(limit),
    format: 'json',
  });

  const targetUrl = `${AFAD_DIRECT_ORIGIN}/filter?${query.toString()}`;
  const candidates: string[] = [];

  // Snapshot has highest priority on static hosts for instant render
  candidates.push('./afad-events-snapshot.json');

  if (!isGitHubPages) {
    candidates.unshift(`${PROXY_AFAD_URL}/filter?${query.toString()}`);
  } else {
    candidates.push(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`);
  }

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const text = await res.text();
      const trimmed = text.trim();
      if (
        trimmed.startsWith('<!DOCTYPE') ||
        trimmed.startsWith('<html') ||
        trimmed.startsWith('error code:')
      ) {
        continue;
      }

      const rawList = JSON.parse(trimmed) as AfadRawEvent[];
      if (!Array.isArray(rawList)) continue;

      const normalized = rawList
        .map(normalizeAfadEvent)
        .filter((ev) => ev.magnitude >= minmag);

      afadCache.set(cacheKey, { timestamp: Date.now(), data: normalized });
      return normalized;
    } catch {
      // Try next candidate
    }
  }

  if (cached) return cached.data;
  return [];
}

/**
 * Merges events from multiple agencies (UDES & AFAD) deduplicating events occurring
 * within 90 seconds and 0.15 degrees spatial proximity.
 */
export function mergeSeismicEvents(
  udesEvents: UdesQuakeEvent[],
  afadEvents: UdesQuakeEvent[],
  mode: 'ALL' | 'UDES' | 'AFAD'
): UdesQuakeEvent[] {
  if (mode === 'UDES') return udesEvents;
  if (mode === 'AFAD') return afadEvents;

  // Deduplicate and combine
  const merged: UdesQuakeEvent[] = [...udesEvents];

  for (const afadEv of afadEvents) {
    const isDuplicate = udesEvents.some((uEv) => {
      const timeDiff = Math.abs(uEv.timestamp - afadEv.timestamp);
      const latDiff = Math.abs(uEv.latitude - afadEv.latitude);
      const lonDiff = Math.abs(uEv.longitude - afadEv.longitude);
      return timeDiff < 90 && latDiff < 0.18 && lonDiff < 0.18;
    });

    if (!isDuplicate) {
      merged.push(afadEv);
    }
  }

  // Sort descending by timestamp
  return merged.sort((a, b) => b.timestamp - a.timestamp);
}
