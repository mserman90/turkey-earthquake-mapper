import { useState } from 'react';
import {
  Sliders,
  MapPin,
  Search,
  Layers,
  Clock,
  Download,
  Compass,
  Activity,
} from 'lucide-react';
import { useMapperStore } from '../store/useMapperStore';
import { TRANSLATIONS } from '../lib/i18n';
import { MAJOR_TURKEY_CITIES } from '../data/turkeyFaultSegments';
import type {
  FaultRegion,
  FaultSegmentFeature,
  ProbabilityResult,
  RenewalModelType,
} from '../types/seismic';
import {
  exportMapToPNG,
  exportSegmentsToCSV,
  exportSegmentsToGeoJSON,
} from '../lib/exportUtils';

interface ControlPanelLeftProps {
  segments: FaultSegmentFeature[];
  probabilitiesById: Record<string, ProbabilityResult>;
}

const MODELS: Array<{ id: RenewalModelType; label: string; badge: string }> = [
  { id: 'BPT', label: 'BPT (Brownian Passage Time)', badge: 'Varsayılan' },
  { id: 'Lognormal', label: 'Lognormal Renewal', badge: 'Yarı-Periyodik' },
  { id: 'Weibull', label: 'Weibull Hazard', badge: 'Monotonik' },
  { id: 'Poisson', label: 'Poisson (Sabit Hız)', badge: 'Zaman-Bağımsız' },
];

const REGIONS: Array<FaultRegion | 'ALL'> = [
  'ALL',
  'Marmara',
  'KAF',
  'DAF',
  'Ege',
  'İç Anadolu',
];

export function ControlPanelLeft({
  segments,
  probabilitiesById,
}: ControlPanelLeftProps) {
  const {
    language,
    selectedModel,
    setSelectedModel,
    horizonYears,
    setHorizonYears,
    targetMagnitude,
    setTargetMagnitude,
    scenarioOffsetYears,
    setScenarioOffsetYears,
    selectedRegion,
    setSelectedRegion,
    searchQuery,
    setSearchQuery,
    liveQuakesTimeWindowHours,
    setLiveQuakesTimeWindowHours,
    liveQuakesMinMagnitude,
    setLiveQuakesMinMagnitude,
    showFaultProbabilityLayer,
    showLiveQuakesLayer,
    showSeismicGapBadges,
    toggleLayer,
    flyToLocation,
    setUserLocation,
  } = useMapperStore();

  const [locating, setLocating] = useState(false);
  const t = TRANSLATIONS[language];

  const handleGeolocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        flyToLocation(latitude, longitude, 9);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <aside
      aria-label="Bilimsel Model ve Harita Kontrolleri"
      className="w-full lg:w-80 xl:w-88 shrink-0 bg-slate-900/95 border-r border-slate-800 overflow-y-auto p-4 space-y-5 text-slate-100"
    >
      {/* Search & Quick City Jump */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.citySearchPlaceholder}
            aria-label={t.citySearchPlaceholder}
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label={t.quickJumpCity}
            onChange={(e) => {
              const city = MAJOR_TURKEY_CITIES.find(
                (c) => c.name === e.target.value
              );
              if (city) {
                flyToLocation(city.lat, city.lon, city.zoom);
              }
            }}
            defaultValue=""
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="" disabled>
              {t.quickJumpCity}...
            </option>
            {MAJOR_TURKEY_CITIES.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGeolocation}
            disabled={locating}
            className="flex items-center justify-center gap-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-medium rounded-lg px-3 py-2 transition cursor-pointer disabled:opacity-50"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{locating ? t.locatingBtn : t.myLocationBtn}</span>
          </button>
        </div>
      </div>

      {/* Scientific Renewal Model Selection */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <Sliders className="w-3.5 h-3.5" />
          <span>{t.modelLabel}</span>
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {MODELS.map((m) => {
            const active = selectedModel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModel(m.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                  active
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200 font-semibold shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    active
                      ? 'bg-amber-500/30 text-amber-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {m.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Forecast Horizon Δt (10 / 30 / 50 Years) & Target Magnitude Mw */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold text-slate-300">
            {t.horizonLabel}
          </span>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {([10, 30, 50] as const).map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setHorizonYears(yr)}
                className={`py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  horizonYears === yr
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {yr}y
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold text-slate-300">
            {t.magnitudeThresholdLabel}
          </span>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {([6.5, 7.0, 7.5] as const).map((mw) => (
              <button
                key={mw}
                type="button"
                onClick={() => setTargetMagnitude(mw)}
                className={`py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  targetMagnitude === mw
                    ? 'bg-red-500 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ≥{mw.toFixed(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Time Slider: "Today + X Years" */}
      <div className="space-y-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {t.scenarioSliderLabel}
          </span>
          <span className="font-mono font-bold text-amber-400">
            {2026 + scenarioOffsetYears}{' '}
            {scenarioOffsetYears > 0
              ? `(+${scenarioOffsetYears} ${t.yearsUnit})`
              : `(${t.todayLabel})`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={scenarioOffsetYears}
          onChange={(e) => setScenarioOffsetYears(Number(e.target.value))}
          aria-label={t.scenarioSliderLabel}
          className="w-full accent-amber-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>2026</span>
          <span>+15y (2041)</span>
          <span>+30y (2056)</span>
          <span>+50y (2076)</span>
        </div>
      </div>

      {/* Fault Region Filter */}
      <div className="space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          {t.regionFilterLabel}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((reg) => {
            const active = selectedRegion === reg;
            return (
              <button
                key={reg}
                type="button"
                onClick={() => setSelectedRegion(reg)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {reg === 'ALL' ? (language === 'tr' ? 'Tümü' : 'All') : reg}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Layers & UdesQuake Live Seismicity Filters */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-400">
          <Layers className="w-3.5 h-3.5" />
          {t.layersTitle}
        </span>

        <div className="space-y-1.5 text-xs">
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
            <span>{t.layerFaultProb}</span>
            <input
              type="checkbox"
              checked={showFaultProbabilityLayer}
              onChange={() => toggleLayer('faults')}
              className="accent-amber-500 w-4 h-4 rounded"
            />
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
            <span>{t.layerSeismicGaps}</span>
            <input
              type="checkbox"
              checked={showSeismicGapBadges}
              onChange={() => toggleLayer('seismicGaps')}
              className="accent-red-500 w-4 h-4 rounded"
            />
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
            <span>{t.layerLiveQuakes}</span>
            <input
              type="checkbox"
              checked={showLiveQuakesLayer}
              onChange={() => toggleLayer('liveQuakes')}
              className="accent-sky-500 w-4 h-4 rounded"
            />
          </label>
        </div>

        {/* Live Earthquakes Time & Magnitude Filter */}
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              {t.liveQuakesFilterTitle}
            </span>
            <span className="font-mono text-sky-400">
              M ≥ {liveQuakesMinMagnitude.toFixed(1)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {([24, 72, 168] as const).map((hrs) => (
              <button
                key={hrs}
                type="button"
                onClick={() => setLiveQuakesTimeWindowHours(hrs)}
                className={`py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                  liveQuakesTimeWindowHours === hrs
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {hrs === 24
                  ? t.timeWindow24h
                  : hrs === 72
                  ? t.timeWindow72h
                  : t.timeWindow7d}
              </button>
            ))}
          </div>

          <input
            type="range"
            min={1.0}
            max={5.0}
            step={0.5}
            value={liveQuakesMinMagnitude}
            onChange={(e) => setLiveQuakesMinMagnitude(Number(e.target.value))}
            aria-label={t.minMagLabel}
            className="w-full accent-sky-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Data Export Buttons (GeoJSON, CSV, PNG) */}
      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase">
          <Download className="w-3.5 h-3.5" /> Veri Dışa Aktar / Export
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => exportSegmentsToGeoJSON(segments, probabilitiesById)}
            className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-[11px] font-medium text-slate-200 transition cursor-pointer"
          >
            GeoJSON
          </button>
          <button
            type="button"
            onClick={() => exportSegmentsToCSV(segments, probabilitiesById)}
            className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-[11px] font-medium text-slate-200 transition cursor-pointer"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportMapToPNG('turkey-seismic-map-container')}
            className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-[11px] font-medium text-slate-200 transition cursor-pointer"
          >
            Harita PNG
          </button>
        </div>
      </div>
    </aside>
  );
}
