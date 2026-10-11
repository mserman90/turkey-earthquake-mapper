import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Table2,
  Radio,
  BookOpen,
  AlertTriangle,
  ArrowUpDown,
  MapPin,
  ShieldAlert,
  TrendingUp,
  ExternalLink,
  Heart,
} from 'lucide-react';
import type {
  FaultSegmentFeature,
  ProbabilityResult,
  UdesQuakeEvent,
} from '../types/seismic';
import { useMapperStore } from '../store/useMapperStore';
import { TRANSLATIONS } from '../lib/i18n';
import { getProbabilityColor } from '../lib/colorScale';
import { fetchSeismicHistory } from '../services/udesQuakeApi';

interface AnalyticsPanelRightProps {
  segments: FaultSegmentFeature[];
  probabilitiesById: Record<string, ProbabilityResult>;
  liveQuakes: UdesQuakeEvent[];
}

export function AnalyticsPanelRight({
  segments,
  probabilitiesById,
  liveQuakes,
}: AnalyticsPanelRightProps) {
  const {
    language,
    horizonYears,
    targetMagnitude,
    selectedSegmentId,
    setSelectedSegmentId,
    activeRightTab,
    setActiveRightTab,
    flyToLocation,
  } = useMapperStore();

  const [sortBy, setSortBy] = useState<'prob' | 'gap' | 'elapsed'>('prob');
  const t = TRANSLATIONS[language];

  const selectedSegment = useMemo(() => {
    return (
      segments.find((s) => s.id === selectedSegmentId) ?? segments[0] ?? null
    );
  }, [segments, selectedSegmentId]);

  const selectedProb = selectedSegment
    ? probabilitiesById[selectedSegment.id]
    : null;

  // Compute midpoint of selected segment for UdesQuake /api/seismic_history lookup
  const selectedMidpoint = useMemo(() => {
    if (!selectedSegment) return { lat: 40.8, lon: 29.0 };
    const mid =
      selectedSegment.coordinates[
        Math.floor(selectedSegment.coordinates.length / 2)
      ] ?? selectedSegment.coordinates[0];
    return { lon: mid[0], lat: mid[1] };
  }, [selectedSegment]);

  const { data: regionalHistory, isLoading: loadingHistory } = useQuery({
    queryKey: [
      'seismic_history',
      selectedSegment?.id,
      selectedMidpoint.lat,
      selectedMidpoint.lon,
    ],
    queryFn: () =>
      fetchSeismicHistory({
        lat: selectedMidpoint.lat,
        lon: selectedMidpoint.lon,
        region: selectedSegment?.region ?? 'marmara',
        days: 365,
      }),
    enabled: Boolean(selectedSegment) && activeRightTab === 'segment',
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => {
      const rA = probabilitiesById[a.id];
      const rB = probabilitiesById[b.id];
      if (!rA || !rB) return 0;
      if (sortBy === 'prob') {
        return rB.conditionalProbability - rA.conditionalProbability;
      }
      if (sortBy === 'gap') {
        return rB.seismicGapScore - rA.seismicGapScore;
      }
      return rB.elapsedYears - rA.elapsedYears;
    });
  }, [segments, probabilitiesById, sortBy]);

  return (
    <aside
      aria-label="Fay Segment Analizi ve Olasılık Tablosu"
      className="w-full lg:w-96 xl:w-[430px] shrink-0 bg-slate-900/95 border-l border-slate-800 flex flex-col overflow-hidden text-slate-100"
    >
      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/70 p-1 gap-1 text-[11px] font-medium">
        <button
          type="button"
          onClick={() => setActiveRightTab('segment')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-md transition cursor-pointer ${
            activeRightTab === 'segment'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.tabSegmentDetail}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRightTab('table')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-md transition cursor-pointer ${
            activeRightTab === 'table'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.tabProbabilityTable}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRightTab('live')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-md transition cursor-pointer ${
            activeRightTab === 'live'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {t.tabLiveFeed} ({liveQuakes.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRightTab('methodology')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-md transition cursor-pointer ${
            activeRightTab === 'methodology'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.tabMethodology}</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SELECTED FAULT SEGMENT SCIENTIFIC ANALYSIS */}
        {activeRightTab === 'segment' && selectedSegment && selectedProb && (
          <div className="space-y-4">
            {/* Segment Title & Header */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {selectedSegment.zoneName[language]}
                  </span>
                  <h2 className="text-sm font-bold text-white mt-1.5">
                    {selectedSegment.name[language]}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    flyToLocation(selectedMidpoint.lat, selectedMidpoint.lon, 9)
                  }
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                  title="Haritada Odaklan"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedSegment.parameters.notes[language]}
              </p>

              <div className="flex flex-wrap gap-1 pt-1">
                {selectedSegment.majorCities.map((city) => (
                  <span
                    key={city}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300"
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>

            {/* Primary Probability Gauge & Uncertainty Bar */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">
                    {t.conditionalProb} ({horizonYears} {t.yearsUnit}, Mw ≥{' '}
                    {targetMagnitude.toFixed(1)})
                  </div>
                  <div
                    className="text-3xl font-black tracking-tight mt-0.5"
                    style={{
                      color: getProbabilityColor(
                        selectedProb.conditionalProbability
                      ),
                    }}
                  >
                    %{(selectedProb.conditionalProbability * 100).toFixed(1)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">
                    {t.seismicGapScore}
                  </div>
                  <div className="text-xl font-extrabold text-amber-400">
                    {selectedProb.seismicGapScore} / 100
                  </div>
                </div>
              </div>

              {/* Visual Confidence Interval Bar (P5 - P50 - P95) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t.uncertainty90}:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    %{(selectedProb.uncertaintyBounds.p5 * 100).toFixed(1)} – %
                    {(selectedProb.uncertaintyBounds.p95 * 100).toFixed(1)}
                  </span>
                </div>
                <div className="relative h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="absolute top-0 bottom-0 bg-amber-500/35 rounded-full"
                    style={{
                      left: `${Math.min(100, selectedProb.uncertaintyBounds.p5 * 100)}%`,
                      width: `${Math.max(
                        4,
                        (selectedProb.uncertaintyBounds.p95 -
                          selectedProb.uncertaintyBounds.p5) *
                          100
                      )}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-red-500 rounded-full"
                    style={{
                      left: `${Math.min(98, selectedProb.conditionalProbability * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 10 / 30 / 50 Year Horizon Comparison Cards */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-slate-400">10 {t.yearsUnit}</div>
                  <div className="text-sm font-bold text-slate-100">
                    %{(selectedProb.prob10Yr * 100).toFixed(1)}
                  </div>
                </div>
                <div className="bg-slate-900/90 border border-amber-500/40 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-amber-300">30 {t.yearsUnit}</div>
                  <div className="text-sm font-bold text-amber-400">
                    %{(selectedProb.prob30Yr * 100).toFixed(1)}
                  </div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-slate-400">50 {t.yearsUnit}</div>
                  <div className="text-sm font-bold text-slate-100">
                    %{(selectedProb.prob50Yr * 100).toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Time-Independent Poisson Comparison & Gain */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400">{t.poissonComparison}:</span>
                <span className="font-mono text-slate-200">
                  %{(selectedProb.poissonProbability * 100).toFixed(1)} (
                  <strong className="text-amber-400">
                    {selectedProb.probabilityGain.toFixed(2)}x
                  </strong>{' '}
                  Gain)
                </span>
              </div>
            </div>

            {/* Paleoseismic & Tectonic Parameters Grid */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Paleosismolojik & Tektonik Parametreler</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">{t.lastRupture}</div>
                  <div className="font-bold text-slate-100">
                    {selectedSegment.parameters.lastRuptureYear} (Mw{' '}
                    {selectedSegment.parameters.lastRuptureMagnitude})
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {selectedSegment.parameters.lastRuptureLabel}
                  </div>
                </div>

                <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">
                    {t.elapsedTime} / {t.meanRecurrence}
                  </div>
                  <div className="font-bold text-slate-100">
                    {selectedProb.elapsedYears} /{' '}
                    {selectedSegment.parameters.meanRecurrenceYears} ±{' '}
                    {selectedSegment.parameters.meanUncertaintyYears} {t.yearsUnit}
                  </div>
                  <div className="text-[10px] text-amber-400">
                    Çevrim Oranı (t/μ): {(selectedProb.maturityRatio * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">{t.slipRate}</div>
                  <div className="font-bold text-slate-100">
                    {selectedSegment.parameters.slipRateMmYr} ±{' '}
                    {selectedSegment.parameters.slipRateUncertainty} mm/yıl
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedSegment.parameters.mechanism} (
                    {selectedSegment.parameters.lengthKm} km)
                  </div>
                </div>

                <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">{t.slipDeficit}</div>
                  <div className="font-bold text-red-400">
                    {selectedProb.accumulatedSlipDeficitMeters.toFixed(2)} metre
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Karakteristik: Mw{' '}
                    {selectedSegment.parameters.characteristicMagnitude}
                  </div>
                </div>
              </div>

              {/* References */}
              <div className="pt-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">
                  {t.scientificReferences}:{' '}
                </span>
                {selectedSegment.parameters.references.join(' • ')}
              </div>
            </div>

            {/* UdesQuake Regional Seismic History (/api/seismic_history) */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>{t.regionalSeismicHistory}</span>
              </div>
              {loadingHistory ? (
                <div className="text-slate-400 text-[11px] animate-pulse">
                  UdesQuake bölgesel sismik geçmiş analiz ediliyor...
                </div>
              ) : regionalHistory ? (
                <div className="space-y-1.5 text-[11px]">
                  <p className="text-slate-300 leading-relaxed">
                    {regionalHistory.comment}
                  </p>
                  {regionalHistory.stats && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <div className="bg-slate-900 p-1.5 rounded text-center">
                        <div className="text-[10px] text-slate-400">
                          M3.0+ (50km)
                        </div>
                        <div className="font-bold text-sky-300">
                          {regionalHistory.stats.total_nearby_10y}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded text-center">
                        <div className="text-[10px] text-slate-400">M4.0+</div>
                        <div className="font-bold text-amber-300">
                          {regionalHistory.stats.m4_plus_10y}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded text-center">
                        <div className="text-[10px] text-slate-400">Max M</div>
                        <div className="font-bold text-red-300">
                          {regionalHistory.stats.max_magnitude_10y}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Bölgesel aletsel katalog istatistiği hazır.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SORTABLE PROBABILITY COMPARISON TABLE */}
        {activeRightTab === 'table' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Sıralama Ölçütü:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSortBy('prob')}
                  className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 cursor-pointer ${
                    sortBy === 'prob'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-300 border border-slate-800'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" /> Olasılık
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('gap')}
                  className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 cursor-pointer ${
                    sortBy === 'gap'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-300 border border-slate-800'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" /> Boşluk Skoru
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('elapsed')}
                  className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 cursor-pointer ${
                    sortBy === 'elapsed'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-300 border border-slate-800'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" /> Geçen Süre
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {sortedSegments.map((seg, idx) => {
                const r = probabilitiesById[seg.id];
                if (!r) return null;
                const color = getProbabilityColor(r.conditionalProbability);
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => {
                      setSelectedSegmentId(seg.id);
                      const mid =
                        seg.coordinates[Math.floor(seg.coordinates.length / 2)];
                      if (mid) flyToLocation(mid[1], mid[0], 8);
                    }}
                    className="deferred-list-item w-full text-left bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded-xl p-3 transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {idx + 1}. {seg.name[language]}
                      </span>
                      <span
                        className="text-sm font-black shrink-0"
                        style={{ color }}
                      >
                        %{(r.conditionalProbability * 100).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Son: {seg.parameters.lastRuptureYear} (t={r.elapsedYears}y / μ=
                        {seg.parameters.meanRecurrenceYears}y)
                      </span>
                      <span className="font-mono text-amber-300">
                        Skor: {r.seismicGapScore}/100
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE UDESQUAKE EARTHQUAKES FEED */}
        {activeRightTab === 'live' && (
          <div className="space-y-2">
            {liveQuakes.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center bg-slate-950 rounded-xl border border-slate-800">
                Seçilen büyüklük ve zaman aralığında deprem bulunamadı.
              </div>
            ) : (
              liveQuakes.slice(0, 60).map((ev) => (
                <button
                  key={ev.event_id}
                  type="button"
                  onClick={() => flyToLocation(ev.latitude, ev.longitude, 10)}
                  className="deferred-list-item w-full text-left bg-slate-950/85 hover:bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-3 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        ev.magnitude >= 4.0
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : ev.magnitude >= 3.0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {ev.magnitude.toFixed(1)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {ev.region}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Derinlik: {ev.depth.toFixed(1)} km • Kaynak: {ev.source}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(ev.timestamp * 1000).toLocaleTimeString(
                      language === 'tr' ? 'tr-TR' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* TAB 4: SCIENTIFIC METHODOLOGY & LIMITATIONS */}
        {activeRightTab === 'methodology' && (
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-300 mb-0.5">
                  Bilimsel Sınırlamalar ve Yasal Uyarı
                </div>
                Bu uygulama kesin deprem tahmini (yer, gün ve saat) yapmaz.
                Gösterilen tüm değerler, aktif fay segmentlerinin paleosismolojik
                tekrarlanma periyotlarına dayalı istatistiksel koşullu
                olasılıklardır: P(t &lt; T ≤ t + Δt | T &gt; t).
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <h3 className="font-bold text-white">
                1. Brownian Passage Time (BPT / Inverse Gaussian)
              </h3>
              <p>
                Matthews et al. (2002) tarafından geliştirilen fiziksel
                yenilenme modelidir. Sabit tektonik yükleme hızı ile rastgele
                stres pertürbasyonlarını (Brownian hareket) birleştirir. Ortalama
                tekrarlanma periyodu (μ) ve aperiyodiklik (α = CV) parametrelerini
                kullanır.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <h3 className="font-bold text-white">
                2. Lognormal, Weibull ve Poisson Modelleri
              </h3>
              <p>
                <strong>Lognormal:</strong> Tekrarlanma sürelerinin logaritmasının
                normal dağıldığını varsayar. <br />
                <strong>Weibull:</strong> Tehlike fonksiyonu (hazard rate) geçen
                süreyle monotonik olarak artan elastik geri sekme modelidir.{' '}
                <br />
                <strong>Poisson:</strong> Zaman-bağımsız (hafızasız) referans
                modeldir: P = 1 − exp(−Δt / μ).
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <h3 className="font-bold text-white">
                3. Veri Kaynakları ve Paleosismolojik Belirsizlik
              </h3>
              <p>
                Fay geometrileri ve kayma hızları MTA Türkiye Diri Fay Haritası
                (Emre et al., 2018), Parsons (2004), Barka (1996), Rockwell et al.
                (2009) ve Güvercin et al. (2022) çalışmalarından derlenmiştir.
                Hendek (trench) verilerindeki tarihlendirme belirsizlikleri %90
                güven aralığı (P5–P95) olarak her segmentte açıkça
                hesaplanmaktadır.
              </p>
            </div>

            {/* Teşekkürler & Yararlanılan Kurum/Veri Kaynakları (Links) */}
            <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3.5 space-y-3">
              <h3 className="font-bold text-amber-300 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-red-400 fill-red-400/20" />
                <span>
                  {language === 'tr'
                    ? 'Teşekkürler & Yararlanılan Kaynaklar'
                    : 'Acknowledgments & Data Sources'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {language === 'tr'
                  ? 'Bu açık kaynaklı bilimsel farkındalık projesi, gerçek zamanlı sismik telemetri sağlayan UDES (UdesQuake) platformuna ve Türkiye’nin aktif tektonik/paleosismolojik mirasını belgeleyen tüm yerbilimcilere teşekkür sunar:'
                  : 'This open-source scientific awareness project gratefully acknowledges the UDES (UdesQuake) platform for real-time seismic telemetry and the earth scientists documenting Turkey’s active tectonics:'}
              </p>

              <div className="space-y-1.5 text-[11px]">
                <a
                  href="https://udesquake.com.tr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-sky-300 font-semibold transition"
                >
                  <span>UDES / UdesQuake (Canlı Deprem & Erken Uyarı)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href="https://api.udesquake.com.tr/api/status"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-sky-300 transition"
                >
                  <span>UdesQuake Açık Sismik API (api.udesquake.com.tr)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href="https://www.mta.gov.tr/v3.0/hizmetler/yenilenmis-diri-fay-haritalari"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-amber-300 transition"
                >
                  <span>MTA Türkiye Yenilenmiş Diri Fay Haritaları</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href="https://deprem.afad.gov.tr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
                >
                  <span>AFAD Deprem Dairesi Başkanlığı</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href="http://www.koeri.boun.edu.tr/scripts/lst5.asp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
                >
                  <span>Boğaziçi Üniversitesi Kandilli Rasathanesi (KOERI)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href="https://www.emsc-csem.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
                >
                  <span>EMSC (Avrupa-Akdeniz Sismoloji Merkezi)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
                >
                  <span>OpenStreetMap Vakfı & Katkıda Bulunanlar</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  href="https://github.com/mserman90/turkey-earthquake-mapper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-emerald-300 transition"
                >
                  <span>GitHub Açık Kaynak Deposu (MIT Lisansı)</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
