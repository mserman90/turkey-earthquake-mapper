import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Globe,
  Moon,
  Sun,
  RefreshCw,
  ExternalLink,
  Heart,
} from 'lucide-react';
import { TURKEY_FAULT_SEGMENTS } from './data/turkeyFaultSegments';
import { evaluateSegmentProbability } from './lib/probabilityEngine';
import {
  fetchUdesQuakeEvents,
  fetchUdesQuakeStatus,
} from './services/udesQuakeApi';
import { useMapperStore } from './store/useMapperStore';
import { TRANSLATIONS } from './lib/i18n';
import { ControlPanelLeft } from './components/ControlPanelLeft';
import { TurkeySeismicMap } from './components/TurkeySeismicMap';
import { AnalyticsPanelRight } from './components/AnalyticsPanelRight';
import type { ProbabilityResult } from './types/seismic';

export function App() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    selectedModel,
    horizonYears,
    targetMagnitude,
    scenarioOffsetYears,
    selectedRegion,
    searchQuery,
    liveQuakesTimeWindowHours,
    liveQuakesMinMagnitude,
  } = useMapperStore();

  const t = TRANSLATIONS[language];

  // Apply color-scheme and dark/light class to documentElement per modern-web-guidance
  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = theme;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Poll UdesQuake /api/status every 45 seconds
  const { data: apiStatus, isError: statusError } = useQuery({
    queryKey: ['udesquake-status'],
    queryFn: fetchUdesQuakeStatus,
    refetchInterval: 45000,
    retry: 2,
  });

  // Poll UdesQuake /api/events every 40 seconds
  const {
    data: rawEvents = [],
    isFetching: fetchingEvents,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['udesquake-events', liveQuakesMinMagnitude],
    queryFn: () =>
      fetchUdesQuakeEvents({
        limit: 300,
        magnitude_min: liveQuakesMinMagnitude,
      }),
    refetchInterval: 40000,
    retry: 2,
  });

  // Filter live quakes by selected time window (24h, 72h, 168h) and minimum magnitude
  const filteredLiveQuakes = useMemo(() => {
    if (rawEvents.length === 0) return [];
    const latestTimestamp = Math.max(...rawEvents.map((e) => e.timestamp));
    const cutoffSec = latestTimestamp - liveQuakesTimeWindowHours * 3600;
    return rawEvents.filter(
      (ev) =>
        ev.magnitude >= liveQuakesMinMagnitude && ev.timestamp >= cutoffSec
    );
  }, [rawEvents, liveQuakesTimeWindowHours, liveQuakesMinMagnitude]);

  // Filter fault segments by Region and Search Query
  const filteredSegments = useMemo(() => {
    return TURKEY_FAULT_SEGMENTS.filter((seg) => {
      if (selectedRegion !== 'ALL' && seg.region !== selectedRegion) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const inName =
          seg.name.tr.toLowerCase().includes(q) ||
          seg.name.en.toLowerCase().includes(q) ||
          seg.zoneName.tr.toLowerCase().includes(q);
        const inCity = seg.majorCities.some((c) =>
          c.toLowerCase().includes(q)
        );
        return inName || inCity;
      }
      return true;
    });
  }, [selectedRegion, searchQuery]);

  // Compute time-dependent renewal probabilities for all segments
  const probabilitiesById = useMemo(() => {
    const map: Record<string, ProbabilityResult> = {};
    for (const seg of TURKEY_FAULT_SEGMENTS) {
      map[seg.id] = evaluateSegmentProbability(seg, {
        model: selectedModel,
        horizonYears,
        targetMw: targetMagnitude,
        scenarioOffsetYears,
        baseYear: 2026,
      });
    }
    return map;
  }, [selectedModel, horizonYears, targetMagnitude, scenarioOffsetYears]);

  return (
    <div
      className={`min-h-screen lg:h-screen flex flex-col overflow-x-hidden ${
        theme === 'dark'
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header & Scientific Disclaimer Bar */}
      <header className="shrink-0 bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-900/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                {t.appTitle}
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Persistent Scientific Disclaimer Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs max-w-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{t.scientificDisclaimerBanner}</span>
        </div>

        {/* Status Indicator, UDES Link, Language & Theme Controls */}
        <div className="flex items-center gap-2">
          <a
            href="https://udesquake.com.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-xs font-semibold text-sky-300 transition"
            title="UDES (UdesQuake) Resmi Web Sitesi"
          >
            <span>UDES</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={() => refetchEvents()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:border-slate-700 transition cursor-pointer"
            title="Canlı Deprem Verisini Yenile"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !statusError && apiStatus?.status === 'running'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline font-medium text-slate-200">
              {!statusError && apiStatus?.status === 'running'
                ? t.apiConnected
                : t.apiFallback}
            </span>
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-400 ${
                fetchingEvents ? 'animate-spin text-sky-400' : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            aria-label="Dil Değiştir / Switch Language"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Tema Değiştir / Toggle Theme"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Disclaimer Banner */}
      <div className="xl:hidden bg-amber-950/70 border-b border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>{t.scientificDisclaimerBanner}</span>
      </div>

      {/* Main 3-Column Interactive Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <ControlPanelLeft
          segments={filteredSegments}
          probabilitiesById={probabilitiesById}
        />

        <section
          aria-label="Türkiye Deprem Olasılık Haritası"
          className="flex-1 h-[480px] lg:h-auto relative"
        >
          <TurkeySeismicMap
            segments={filteredSegments}
            probabilitiesById={probabilitiesById}
            liveQuakes={filteredLiveQuakes}
          />
        </section>

        <AnalyticsPanelRight
          segments={filteredSegments}
          probabilitiesById={probabilitiesById}
          liveQuakes={filteredLiveQuakes}
        />
      </main>

      {/* Bottom Acknowledgments & Resource Links Footer */}
      <footer className="shrink-0 bg-slate-950 border-t border-slate-800/90 px-4 py-2 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400/20 shrink-0" />
          <span className="font-semibold text-slate-200">
            {language === 'tr' ? 'Teşekkürler & Kaynaklar:' : 'Acknowledgments & Sources:'}
          </span>
          <span>
            {language === 'tr'
              ? 'Gerçek zamanlı deprem verileri ve API altyapısı için'
              : 'Special thanks to'}
          </span>
          <a
            href="https://udesquake.com.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 font-bold underline underline-offset-2"
          >
            UDES (UdesQuake)
          </a>
          <span>
            {language === 'tr'
              ? 'ekibine ve tüm yerbilim kaynaklarına teşekkür ederiz.'
              : 'and all geophysical data providers.'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <a
            href="https://udesquake.com.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-300 transition flex items-center gap-1"
          >
            <span>UDES Web</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://api.udesquake.com.tr/api/status"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-300 transition flex items-center gap-1"
          >
            <span>UDES API</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.mta.gov.tr/v3.0/hizmetler/yenilenmis-diri-fay-haritalari"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-300 transition flex items-center gap-1"
          >
            <span>MTA Diri Fay</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://deprem.afad.gov.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-200 transition flex items-center gap-1"
          >
            <span>AFAD</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="http://www.koeri.boun.edu.tr/scripts/lst5.asp"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-200 transition flex items-center gap-1"
          >
            <span>Kandilli (KOERI)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.emsc-csem.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-200 transition flex items-center gap-1"
          >
            <span>EMSC</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-200 transition flex items-center gap-1"
          >
            <span>OpenStreetMap</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://github.com/mserman90/turkey-earthquake-mapper"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-300 transition flex items-center gap-1"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
