import { useMemo } from 'react';
import {
  Flame,
  AlertOctagon,
  Radio,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type {
  FaultSegmentFeature,
  ProbabilityResult,
  UdesQuakeEvent,
} from '../types/seismic';
import { useMapperStore } from '../store/useMapperStore';
import { getProbabilityColor } from './TurkeySeismicMap';

interface ExecutiveSummaryStripProps {
  segments: FaultSegmentFeature[];
  probabilitiesById: Record<string, ProbabilityResult>;
  liveQuakes: UdesQuakeEvent[];
}

export function ExecutiveSummaryStrip({
  segments,
  probabilitiesById,
  liveQuakes,
}: ExecutiveSummaryStripProps) {
  const {
    language,
    horizonYears,
    targetMagnitude,
    selectedModel,
    selectedSegmentId,
    setSelectedSegmentId,
    flyToLocation,
  } = useMapperStore();

  const summary = useMemo(() => {
    const rankedByProb = [...segments].sort((a, b) => {
      const pA = probabilitiesById[a.id]?.conditionalProbability ?? 0;
      const pB = probabilitiesById[b.id]?.conditionalProbability ?? 0;
      return pB - pA;
    });

    const rankedByGap = [...segments].sort((a, b) => {
      const gA = probabilitiesById[a.id]?.seismicGapScore ?? 0;
      const gB = probabilitiesById[b.id]?.seismicGapScore ?? 0;
      return gB - gA;
    });

    const topProbSegment = rankedByProb[0];
    const topProbResult = topProbSegment
      ? probabilitiesById[topProbSegment.id]
      : null;

    const topGapSegment = rankedByGap[0];
    const topGapResult = topGapSegment
      ? probabilitiesById[topGapSegment.id]
      : null;

    const criticalCount = segments.filter(
      (s) => (probabilitiesById[s.id]?.seismicGapScore ?? 0) >= 65
    ).length;

    const maxLiveQuake =
      liveQuakes.length > 0
        ? [...liveQuakes].sort((a, b) => b.magnitude - a.magnitude)[0]
        : null;

    return {
      top3: rankedByProb.slice(0, 3),
      topProbSegment,
      topProbResult,
      topGapSegment,
      topGapResult,
      criticalCount,
      maxLiveQuake,
    };
  }, [segments, probabilitiesById, liveQuakes]);

  const focusSegment = (seg: FaultSegmentFeature) => {
    setSelectedSegmentId(seg.id);
    const mid = seg.coordinates[Math.floor(seg.coordinates.length / 2)];
    if (mid) {
      flyToLocation(mid[1], mid[0], 8);
    }
  };

  return (
    <section
      aria-label={
        language === 'tr'
          ? 'İlk Bakışta Kritik Sismik Özet'
          : 'At-a-Glance Critical Seismic Summary'
      }
      className="shrink-0 bg-slate-900/95 border-b border-slate-800 px-3 py-2 text-slate-100"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Card 1: Highest Conditional Probability Segment */}
        {summary.topProbSegment && summary.topProbResult && (
          <button
            type="button"
            onClick={() => focusSegment(summary.topProbSegment!)}
            className="text-left bg-slate-950/90 hover:bg-slate-900 border border-red-500/40 rounded-xl px-3 py-2 transition cursor-pointer flex items-center justify-between gap-2 group"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {language === 'tr'
                    ? `En Yüksek Olasılık (${horizonYears}Y, Mw≥${targetMagnitude})`
                    : `Highest Probability (${horizonYears}Y, Mw≥${targetMagnitude})`}
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate mt-0.5">
                {summary.topProbSegment.name[language]}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {selectedModel} • %90 GA: %
                {(summary.topProbResult.uncertaintyBounds.p5 * 100).toFixed(0)}–%
                {(summary.topProbResult.uncertaintyBounds.p95 * 100).toFixed(0)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="text-lg sm:text-xl font-black leading-none"
                style={{
                  color: getProbabilityColor(
                    summary.topProbResult.conditionalProbability
                  ),
                }}
              >
                %{(summary.topProbResult.conditionalProbability * 100).toFixed(1)}
              </div>
              <span className="inline-flex items-center text-[10px] text-amber-400 group-hover:translate-x-0.5 transition">
                {language === 'tr' ? 'Odaklan' : 'Focus'}
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </button>
        )}

        {/* Card 2: Most Mature Seismic Gap & Deficit */}
        {summary.topGapSegment && summary.topGapResult && (
          <button
            type="button"
            onClick={() => focusSegment(summary.topGapSegment!)}
            className="text-left bg-slate-950/90 hover:bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 transition cursor-pointer flex items-center justify-between gap-2 group"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {language === 'tr'
                    ? 'Birincil Sismik Boşluk (Gap)'
                    : 'Primary Seismic Gap'}
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate mt-0.5">
                {summary.topGapSegment.name[language]}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {language === 'tr' ? 'Son:' : 'Last:'}{' '}
                {summary.topGapSegment.parameters.lastRuptureYear} (
                {summary.topGapResult.elapsedYears}y) •{' '}
                {summary.topGapResult.accumulatedSlipDeficitMeters.toFixed(1)}m
                açık
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg sm:text-xl font-black text-amber-400 leading-none">
                {summary.topGapResult.seismicGapScore}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="inline-flex items-center text-[10px] text-amber-300">
                {summary.criticalCount}{' '}
                {language === 'tr' ? 'Kritik Segment' : 'Critical Gaps'}
              </span>
            </div>
          </button>
        )}

        {/* Card 3: Top 3 Critical Fault Quick-Select Pills */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {language === 'tr'
                ? 'İlk 3 Kritik Fay (Hızlı Seçim)'
                : 'Top 3 Critical Faults (Quick Jump)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {summary.top3.map((seg, idx) => {
              const prob =
                (probabilitiesById[seg.id]?.conditionalProbability ?? 0) * 100;
              const isSelected = selectedSegmentId === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => focusSegment(seg)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  #{idx + 1} {seg.majorCities[0]} (%{prob.toFixed(0)})
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 4: Live UDES Telemetry Highlight */}
        <button
          type="button"
          onClick={() => {
            if (summary.maxLiveQuake) {
              flyToLocation(
                summary.maxLiveQuake.latitude,
                summary.maxLiveQuake.longitude,
                9
              );
            }
          }}
          className="text-left bg-slate-950/90 hover:bg-slate-900 border border-sky-500/35 rounded-xl px-3 py-2 transition cursor-pointer flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
              <Radio className="w-3.5 h-3.5 shrink-0 animate-pulse" />
              <span className="truncate">
                {language === 'tr'
                  ? 'Canlı UDES Deprem Özeti'
                  : 'Live UDES Telemetry'}
              </span>
            </div>
            {summary.maxLiveQuake ? (
              <>
                <div className="text-xs font-bold text-white truncate mt-0.5">
                  Max M{summary.maxLiveQuake.magnitude.toFixed(1)} •{' '}
                  {summary.maxLiveQuake.region}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {liveQuakes.length}{' '}
                  {language === 'tr'
                    ? 'kayıtlı sarsıntı • Kaynak:'
                    : 'events • Source:'}{' '}
                  {summary.maxLiveQuake.source}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 mt-0.5">
                {language === 'tr'
                  ? 'Veri yükleniyor...'
                  : 'Fetching live events...'}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg sm:text-xl font-black text-sky-400 leading-none">
              {liveQuakes.length}
            </div>
            <span className="text-[10px] text-slate-400">
              {language === 'tr' ? 'Deprem' : 'Quakes'}
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}
