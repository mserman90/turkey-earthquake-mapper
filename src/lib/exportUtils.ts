import type {
  FaultSegmentFeature,
  ProbabilityResult,
} from '../types/seismic';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all active fault segments along with their computed renewal probabilities
 * as a standard RFC 7946 GeoJSON FeatureCollection.
 */
export function exportSegmentsToGeoJSON(
  segments: FaultSegmentFeature[],
  resultsById: Record<string, ProbabilityResult>
): void {
  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      generator: 'Türkiye Deprem Olasılık Haritası v1.0',
      exportedAt: new Date().toISOString(),
      disclaimer:
        'Bilimsel yenilenme (renewal) modellerine dayalı koşullu olasılıklardır; kesin deprem tahmini değildir.',
    },
    features: segments.map((seg) => {
      const res = resultsById[seg.id];
      return {
        type: 'Feature',
        id: seg.id,
        properties: {
          name_tr: seg.name.tr,
          name_en: seg.name.en,
          zone_tr: seg.zoneName.tr,
          region: seg.region,
          last_rupture_year: seg.parameters.lastRuptureYear,
          mean_recurrence_years: seg.parameters.meanRecurrenceYears,
          aperiodicity_alpha: seg.parameters.aperiodicity,
          slip_rate_mm_yr: seg.parameters.slipRateMmYr,
          characteristic_mw: seg.parameters.characteristicMagnitude,
          model: res?.model ?? 'BPT',
          evaluation_year: res?.evaluationYear ?? 2026,
          elapsed_years: res?.elapsedYears ?? 0,
          prob_10yr: Number((res?.prob10Yr ?? 0).toFixed(4)),
          prob_30yr: Number((res?.prob30Yr ?? 0).toFixed(4)),
          prob_50yr: Number((res?.prob50Yr ?? 0).toFixed(4)),
          conditional_probability: Number(
            (res?.conditionalProbability ?? 0).toFixed(4)
          ),
          poisson_probability: Number(
            (res?.poissonProbability ?? 0).toFixed(4)
          ),
          uncertainty_p5: Number((res?.uncertaintyBounds.p5 ?? 0).toFixed(4)),
          uncertainty_p95: Number((res?.uncertaintyBounds.p95 ?? 0).toFixed(4)),
          seismic_gap_score: res?.seismicGapScore ?? 0,
          slip_deficit_m: Number(
            (res?.accumulatedSlipDeficitMeters ?? 0).toFixed(2)
          ),
        },
        geometry: {
          type: 'LineString',
          coordinates: seg.coordinates,
        },
      };
    }),
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  });
  triggerDownload(
    blob,
    `turkiye-fay-olasilik-${new Date().toISOString().slice(0, 10)}.geojson`
  );
}

/**
 * Exports all computed segment probabilities as a UTF-8 CSV table (with BOM for Excel compatibility).
 */
export function exportSegmentsToCSV(
  segments: FaultSegmentFeature[],
  resultsById: Record<string, ProbabilityResult>
): void {
  const headers = [
    'Segment ID',
    'Segment Adı (TR)',
    'Bölge',
    'Model',
    'Son Deprem Yılı',
    'Geçen Süre t (Yıl)',
    'Ortalama Periyot μ (Yıl)',
    'Aperiyodiklik α',
    'Kayma Hızı (mm/yıl)',
    'Biriken Kayma Açığı (m)',
    'Karakteristik Mw',
    '10 Yıllık Olasılık (%)',
    '30 Yıllık Olasılık (%)',
    '50 Yıllık Olasılık (%)',
    'Seçili Koşullu Olasılık (%)',
    'Poisson Olasılığı (%)',
    '%90 Güven Aralığı P5 (%)',
    '%90 Güven Aralığı P95 (%)',
    'Sismik Boşluk Skoru (0-100)',
  ];

  const rows = segments.map((seg) => {
    const r = resultsById[seg.id];
    return [
      seg.id,
      `"${seg.name.tr.replace(/"/g, '""')}"`,
      seg.region,
      r?.model ?? 'BPT',
      seg.parameters.lastRuptureYear,
      r?.elapsedYears ?? 0,
      seg.parameters.meanRecurrenceYears,
      seg.parameters.aperiodicity,
      seg.parameters.slipRateMmYr,
      (r?.accumulatedSlipDeficitMeters ?? 0).toFixed(2),
      seg.parameters.characteristicMagnitude,
      ((r?.prob10Yr ?? 0) * 100).toFixed(1),
      ((r?.prob30Yr ?? 0) * 100).toFixed(1),
      ((r?.prob50Yr ?? 0) * 100).toFixed(1),
      ((r?.conditionalProbability ?? 0) * 100).toFixed(1),
      ((r?.poissonProbability ?? 0) * 100).toFixed(1),
      ((r?.uncertaintyBounds.p5 ?? 0) * 100).toFixed(1),
      ((r?.uncertaintyBounds.p95 ?? 0) * 100).toFixed(1),
      r?.seismicGapScore ?? 0,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  triggerDownload(
    blob,
    `turkiye-deprem-olasilik-tablosu-${new Date().toISOString().slice(0, 10)}.csv`
  );
}

/**
 * Exports the interactive map view container as a high-resolution PNG snapshot.
 */
export async function exportMapToPNG(elementId: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) return;

  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
  });

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `turkiye-deprem-olasilik-haritasi-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
