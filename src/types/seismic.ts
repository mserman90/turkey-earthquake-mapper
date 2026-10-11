export type RenewalModelType = 'BPT' | 'Lognormal' | 'Weibull' | 'Poisson';

export type FaultRegion =
  | 'Marmara'
  | 'KAF' // Kuzey Anadolu Fayı
  | 'DAF' // Doğu Anadolu Fayı
  | 'Ege' // Batı Anadolu Graben Sistemi
  | 'İç Anadolu'
  | 'Doğu Anadolu';

export interface PaleoseismicParameters {
  /** Mean recurrence interval (μ) in years */
  meanRecurrenceYears: number;
  /** Standard deviation or uncertainty in μ (±years) */
  meanUncertaintyYears: number;
  /** Aperiodicity / Coefficient of Variation (α or CV), typical 0.3 - 0.7 */
  aperiodicity: number;
  /** Uncertainty in α (±) */
  aperiodicityUncertainty: number;
  /** Year of the last characteristic major rupture */
  lastRuptureYear: number;
  /** Magnitude of the last major rupture (Mw) */
  lastRuptureMagnitude: number;
  /** Name/label of the historical or instrumental event */
  lastRuptureLabel: string;
  /** Geological slip rate in mm/yr */
  slipRateMmYr: number;
  /** Slip rate uncertainty (± mm/yr) */
  slipRateUncertainty: number;
  /** Characteristic earthquake magnitude (Mw) */
  characteristicMagnitude: number;
  /** Fault length in km */
  lengthKm: number;
  /** Fault mechanism (Strike-Slip, Normal, Thrust) */
  mechanism: 'Doğrultu Atımlı' | 'Normal Fay' | 'Ters / Bindirme';
  /** Literature references */
  references: string[];
  /** Scientific notes in Turkish and English */
  notes: {
    tr: string;
    en: string;
  };
}

export interface FaultSegmentFeature {
  id: string;
  name: {
    tr: string;
    en: string;
  };
  zoneName: {
    tr: string;
    en: string;
  };
  region: FaultRegion;
  majorCities: string[];
  parameters: PaleoseismicParameters;
  /** GeoJSON LineString coordinates: [longitude, latitude][] */
  coordinates: [number, number][];
}

export interface ProbabilityResult {
  segmentId: string;
  model: RenewalModelType;
  /** Base year of evaluation (e.g., 2026 + scenarioOffsetYears) */
  evaluationYear: number;
  /** Elapsed time t since last rupture (in years) */
  elapsedYears: number;
  /** Ratio t / μ (Elapsed ratio / Maturity ratio) */
  maturityRatio: number;
  /** Conditional probability for 10, 30, 50 years */
  prob10Yr: number;
  prob30Yr: number;
  prob50Yr: number;
  /** Target horizon Δt conditional probability (adjusted for target Mw threshold) */
  conditionalProbability: number;
  /** Time-independent Poisson baseline probability for the same Δt */
  poissonProbability: number;
  /** Probability gain: P_conditional / P_poisson */
  probabilityGain: number;
  /** 90% confidence interval [p5, p95] from parameter variation / Monte Carlo */
  uncertaintyBounds: {
    p5: number;
    p50: number;
    p95: number;
    stdDev: number;
  };
  /** Seismic Gap Score (0 - 100 composite index based on slip deficit, maturity t/μ, and conditional probability) */
  seismicGapScore: number;
  /** Accumulated tectonic slip deficit in meters: (elapsedYears * slipRateMmYr) / 1000 */
  accumulatedSlipDeficitMeters: number;
  /** Risk category based on conditional probability */
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

export interface UdesQuakeEvent {
  id?: number;
  event_id: string;
  source: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  region: string;
  timestamp: number;
  time_str?: string;
  confidence?: number;
  confirmed_by?: string[];
  verification_status?: string;
  magnitude_type?: string;
}

export interface UdesQuakeStatus {
  status: string;
  version: string;
  uptime: number;
  dedup?: {
    total_received: number;
    unique_events: number;
    multi_source_events: number;
    active_events: number;
    by_source: Record<string, number>;
  };
  sources?: Record<string, unknown>;
}

export interface UdesQuakeSeismicHistory {
  severity: string;
  comment: string;
  safety_tips: string;
  stats: {
    total_nearby_10y: number;
    m4_plus_10y: number;
    m5_plus_10y: number;
    max_magnitude_10y: number;
  };
}
