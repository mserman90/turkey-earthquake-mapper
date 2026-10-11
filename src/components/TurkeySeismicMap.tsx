import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  FaultSegmentFeature,
  ProbabilityResult,
  UdesQuakeEvent,
} from '../types/seismic';
import { useMapperStore } from '../store/useMapperStore';
import { TRANSLATIONS } from '../lib/i18n';
import { AlertTriangle, Layers, Navigation } from 'lucide-react';

interface TurkeySeismicMapProps {
  segments: FaultSegmentFeature[];
  probabilitiesById: Record<string, ProbabilityResult>;
  liveQuakes: UdesQuakeEvent[];
}

export function getProbabilityColor(prob: number): string {
  if (prob >= 0.45) return '#ef4444'; // Red-500 (Critical >= 45%)
  if (prob >= 0.25) return '#f97316'; // Orange-500 (High 25-45%)
  if (prob >= 0.1) return '#eab308'; // Yellow-500 (Moderate 10-25%)
  return '#22c55e'; // Green-500 (Low < 10%)
}

export function getMagnitudeColor(mag: number): string {
  if (mag >= 5.0) return '#dc2626';
  if (mag >= 4.0) return '#f97316';
  if (mag >= 3.0) return '#facc15';
  return '#38bdf8';
}

function MapViewportController() {
  const map = useMap();
  const mapViewTarget = useMapperStore((s) => s.mapViewTarget);

  useEffect(() => {
    if (mapViewTarget) {
      map.flyTo([mapViewTarget.lat, mapViewTarget.lon], mapViewTarget.zoom, {
        duration: 1.2,
      });
    }
  }, [map, mapViewTarget]);

  return null;
}

export function TurkeySeismicMap({
  segments,
  probabilitiesById,
  liveQuakes,
}: TurkeySeismicMapProps) {
  const {
    language,
    theme,
    horizonYears,
    targetMagnitude,
    selectedSegmentId,
    setSelectedSegmentId,
    showFaultProbabilityLayer,
    showLiveQuakesLayer,
    showSeismicGapBadges,
    userLocation,
  } = useMapperStore();

  const t = TRANSLATIONS[language];

  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div
      id="turkey-seismic-map-container"
      className="relative w-full h-full min-h-[420px] select-none overflow-hidden"
    >
      <MapContainer
        center={[39.05, 34.8]}
        zoom={6}
        minZoom={5}
        maxZoom={18}
        zoomControl={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | MTA Diri Fay & UdesQuake'
          url={tileUrl}
          className={theme === 'dark' ? 'map-tiles-dark' : 'map-tiles-light'}
        />

        <MapViewportController />

        {/* Active Fault Segments & Renewal Probability Layer */}
        {showFaultProbabilityLayer &&
          segments.map((seg) => {
            const probRes = probabilitiesById[seg.id];
            const condProb = probRes?.conditionalProbability ?? 0;
            const color = getProbabilityColor(condProb);
            const isSelected = selectedSegmentId === seg.id;
            const latLngs = seg.coordinates.map(
              ([lon, lat]) => [lat, lon] as [number, number]
            );
            const midIdx = Math.floor(latLngs.length / 2);
            const midPoint = latLngs[midIdx] ?? latLngs[0];

            return (
              <div key={seg.id}>
                {/* Outer glow / halo for seismic gaps or selected fault */}
                {(isSelected || (showSeismicGapBadges && (probRes?.seismicGapScore ?? 0) >= 65)) && (
                  <Polyline
                    positions={latLngs}
                    pathOptions={{
                      color,
                      weight: isSelected ? 14 : 11,
                      opacity: isSelected ? 0.38 : 0.22,
                      lineCap: 'round',
                    }}
                  />
                )}

                {/* MTA Active Fault Line colored by Conditional Probability */}
                <Polyline
                  positions={latLngs}
                  eventHandlers={{
                    click: () => setSelectedSegmentId(seg.id),
                  }}
                  pathOptions={{
                    color,
                    weight: isSelected ? 6.5 : 4.5,
                    opacity: 0.95,
                    dashArray:
                      seg.parameters.mechanism === 'Normal Fay'
                        ? '8, 4'
                        : undefined,
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.97}>
                    <div className="text-xs font-sans p-0.5">
                      <div className="font-bold text-slate-900">
                        {seg.name[language]}
                      </div>
                      <div className="text-slate-700">
                        P({horizonYears} {t.yearsUnit}, Mw≥{targetMagnitude}):{' '}
                        <span className="font-extrabold" style={{ color }}>
                          %{(condProb * 100).toFixed(1)}
                        </span>{' '}
                        | Gap: {probRes?.seismicGapScore ?? 0}/100
                      </div>
                    </div>
                  </Tooltip>

                  <Popup>
                    <div className="min-w-[235px] text-xs space-y-1.5 font-sans text-slate-800">
                      <div className="font-bold text-sm border-b border-slate-200 pb-1 text-slate-900">
                        {seg.name[language]}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <span className="text-slate-500">{t.lastRupture}:</span>
                        <span className="font-semibold text-right">
                          {seg.parameters.lastRuptureYear} (Mw{' '}
                          {seg.parameters.lastRuptureMagnitude})
                        </span>
                        <span className="text-slate-500">{t.meanRecurrence}:</span>
                        <span className="font-semibold text-right">
                          {seg.parameters.meanRecurrenceYears} ±{' '}
                          {seg.parameters.meanUncertaintyYears} {t.yearsUnit}
                        </span>
                        <span className="text-slate-500">
                          P(30 {t.yearsUnit}, {probRes?.model}):
                        </span>
                        <span
                          className="font-bold text-right"
                          style={{ color }}
                        >
                          %{((probRes?.prob30Yr ?? 0) * 100).toFixed(1)}
                        </span>
                        <span className="text-slate-500">
                          {t.uncertainty90}:
                        </span>
                        <span className="font-medium text-right">
                          %{((probRes?.uncertaintyBounds.p5 ?? 0) * 100).toFixed(1)}{' '}
                          – %
                          {((probRes?.uncertaintyBounds.p95 ?? 0) * 100).toFixed(1)}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-200 text-[10px] text-slate-500">
                        Ref: {seg.parameters.references.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  </Popup>
                </Polyline>

                {/* Seismic Gap Pulsing Marker at segment midpoint */}
                {showSeismicGapBadges &&
                  (probRes?.seismicGapScore ?? 0) >= 68 &&
                  midPoint && (
                    <CircleMarker
                      center={midPoint}
                      radius={7}
                      eventHandlers={{
                        click: () => setSelectedSegmentId(seg.id),
                      }}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 1.5,
                        fillColor: '#ef4444',
                        fillOpacity: 0.9,
                      }}
                    >
                      <Tooltip direction="right" offset={[8, 0]}>
                        <span className="text-[11px] font-bold text-red-600">
                          Sismik Boşluk (Skor: {probRes?.seismicGapScore}/100)
                        </span>
                      </Tooltip>
                    </CircleMarker>
                  )}
              </div>
            );
          })}

        {/* Live Earthquakes Layer from UdesQuake API */}
        {showLiveQuakesLayer &&
          liveQuakes.map((ev) => {
            const radius = Math.max(3.5, Math.min(20, Math.pow(ev.magnitude, 1.85) * 1.1));
            const color = getMagnitudeColor(ev.magnitude);

            return (
              <CircleMarker
                key={ev.event_id}
                center={[ev.latitude, ev.longitude]}
                radius={radius}
                pathOptions={{
                  color: '#0f172a',
                  weight: 1,
                  fillColor: color,
                  fillOpacity: 0.78,
                }}
              >
                <Popup>
                  <div className="min-w-[200px] text-xs space-y-1 font-sans text-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="font-bold text-sm text-slate-900">
                        M {ev.magnitude.toFixed(1)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {ev.source}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      {ev.region}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Derinlik / Depth: {ev.depth.toFixed(1)} km
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(ev.timestamp * 1000).toLocaleString(
                        language === 'tr' ? 'tr-TR' : 'en-US'
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* User Geolocation Marker */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 2.5,
              fillColor: '#3b82f6',
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              <span className="text-xs font-bold text-blue-700">
                {t.myLocationBtn}
              </span>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Floating Legend & Scale Overlay (Bottom-Left) */}
      <div
        aria-label={t.legendTitle}
        className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-md border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 shadow-xl max-w-[290px]"
      >
        <div className="flex items-center gap-1.5 font-semibold mb-2 text-slate-200">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {t.legendTitle} ({horizonYears} {t.yearsUnit}, Mw ≥ {targetMagnitude})
          </span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>{t.riskLow}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-2 rounded-full bg-yellow-500 inline-block" />
            <span>{t.riskModerate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-2 rounded-full bg-orange-500 inline-block" />
            <span>{t.riskHigh}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-2 rounded-full bg-red-500 inline-block" />
            <span>{t.riskCritical}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3 text-sky-400" /> Canlı Deprem:{' '}
            {liveQuakes.length}
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <AlertTriangle className="w-3 h-3" /> Bilimsel Model
          </span>
        </div>
      </div>
    </div>
  );
}
