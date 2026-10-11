import type {
  FaultSegmentFeature,
  ProbabilityResult,
  RenewalModelType,
} from '../types/seismic';

/**
 * High-precision standard normal cumulative distribution function Phi(z)
 * using Abramowitz & Stegun (1964) Formula 7.1.26 (max error < 1.5e-7).
 */
export function standardNormalCDF(z: number): number {
  if (z < -8.0) return 0.0;
  if (z > 8.0) return 1.0;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const erf =
    1.0 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * erf);
}

/**
 * Lanczos approximation for the Gamma function Γ(z) for Weibull shape solving.
 */
export function gammaFunction(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gammaFunction(1 - z));
  }

  const shifted = z - 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (shifted + i);
  }
  const t = shifted + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, shifted + 0.5) * Math.exp(-t) * x;
}

/**
 * Brownian Passage Time (BPT / Inverse Gaussian) Cumulative Distribution Function F(t; μ, α).
 * Matthews, Ellsworth, & Reasenberg (2002), Bull. Seismol. Soc. Am.
 *
 * F_BPT(t) = Φ( u1(t) ) + exp(2 / α²) * Φ( -u2(t) )
 * where:
 *   u1(t) = (1 / α) * ( sqrt(t / μ) - sqrt(μ / t) )
 *   u2(t) = (1 / α) * ( sqrt(t / μ) + sqrt(μ / t) )
 * Note: For large 2/α², exp(2/α²) * Φ(-u2) can overflow/underflow separately,
 * so we use asymptotic mill's ratio / log-space stabilization when needed.
 */
export function bptCDF(t: number, mu: number, alpha: number): number {
  if (t <= 0) return 0.0;
  const safeMu = Math.max(1, mu);
  const safeAlpha = Math.max(0.08, Math.min(1.5, alpha));

  const rootRatio = Math.sqrt(t / safeMu);
  const invRootRatio = Math.sqrt(safeMu / t);

  const u1 = (rootRatio - invRootRatio) / safeAlpha;
  const u2 = (rootRatio + invRootRatio) / safeAlpha;

  const term1 = standardNormalCDF(u1);

  const exponent = 2.0 / (safeAlpha * safeAlpha);
  let term2 = 0.0;

  if (u2 > 6.5) {
    // Use asymptotic expansion of Φ(-u2) ≈ exp(-u2²/2) / (sqrt(2π) * u2) * (1 - 1/u2² + 3/u2⁴)
    // Combined with exp(2/α²): exponent - u2²/2 = -(u1²)/2
    const invU2Sq = 1.0 / (u2 * u2);
    const series = 1.0 - invU2Sq + 3.0 * invU2Sq * invU2Sq;
    term2 =
      (Math.exp(-0.5 * u1 * u1) / (Math.sqrt(2.0 * Math.PI) * u2)) * series;
  } else {
    term2 = Math.exp(exponent) * standardNormalCDF(-u2);
  }

  return Math.max(0.0, Math.min(1.0, term1 + term2));
}

/**
 * Lognormal Renewal Model CDF F_LN(t; μ, α)
 * where σ_ln = sqrt(ln(1 + α²)) and m_ln = ln(μ) - 0.5 * σ_ln²
 */
export function lognormalCDF(t: number, mu: number, alpha: number): number {
  if (t <= 0) return 0.0;
  const safeMu = Math.max(1, mu);
  const safeAlpha = Math.max(0.08, Math.min(1.5, alpha));

  const sigmaLnSq = Math.log(1.0 + safeAlpha * safeAlpha);
  const sigmaLn = Math.sqrt(sigmaLnSq);
  const mLn = Math.log(safeMu) - 0.5 * sigmaLnSq;

  const z = (Math.log(t) - mLn) / sigmaLn;
  return standardNormalCDF(z);
}

/**
 * Weibull Renewal Model CDF F_W(t; μ, α)
 * Approximates shape k ≈ α^(-1.086) (standard hydrological/seismic moment match for 0.15 <= α <= 1.0)
 * and scale λ = μ / Γ(1 + 1/k)
 */
export function weibullCDF(t: number, mu: number, alpha: number): number {
  if (t <= 0) return 0.0;
  const safeMu = Math.max(1, mu);
  const safeAlpha = Math.max(0.08, Math.min(1.5, alpha));

  const k = Math.pow(safeAlpha, -1.086);
  const lambda = safeMu / gammaFunction(1.0 + 1.0 / k);

  return 1.0 - Math.exp(-Math.pow(t / lambda, k));
}

/**
 * Time-independent Poisson (Memoryless) CDF / Conditional probability over horizon Δt:
 * P(T <= t + Δt | T > t) = 1 - exp(-Δt / μ)
 */
export function poissonConditionalProbability(
  deltaT: number,
  mu: number
): number {
  if (deltaT <= 0) return 0.0;
  const safeMu = Math.max(1, mu);
  return 1.0 - Math.exp(-deltaT / safeMu);
}

/**
 * Computes the conditional probability P(t < T <= t + Δt | T > t) = (F(t + Δt) - F(t)) / (1 - F(t))
 * for any selected renewal model.
 */
export function computeConditionalProbability(
  model: RenewalModelType,
  elapsedYears: number,
  deltaT: number,
  mu: number,
  alpha: number
): number {
  if (deltaT <= 0) return 0.0;
  const t = Math.max(0.01, elapsedYears);

  if (model === 'Poisson') {
    return poissonConditionalProbability(deltaT, mu);
  }

  if (model === 'Weibull') {
    // Direct analytical survival ratio for Weibull prevents floating point precision loss:
    // S(t + Δt) / S(t) = exp( (t/λ)^k - ((t+Δt)/λ)^k )
    const safeMu = Math.max(1, mu);
    const safeAlpha = Math.max(0.08, Math.min(1.5, alpha));
    const k = Math.pow(safeAlpha, -1.086);
    const lambda = safeMu / gammaFunction(1.0 + 1.0 / k);
    const h1 = Math.pow(t / lambda, k);
    const h2 = Math.pow((t + deltaT) / lambda, k);
    return Math.max(0.0, Math.min(1.0, 1.0 - Math.exp(h1 - h2)));
  }

  const cdfFn = model === 'BPT' ? bptCDF : lognormalCDF;
  const fT = cdfFn(t, mu, alpha);
  const fTDelta = cdfFn(t + deltaT, mu, alpha);

  const survival = 1.0 - fT;
  if (survival <= 1e-11) {
    return poissonConditionalProbability(deltaT, mu);
  }

  const cond = (fTDelta - fT) / survival;
  return Math.max(0.0, Math.min(0.999, cond));
}

/**
 * Adjusts conditional probability when user queries a target magnitude threshold Mw_target
 * relative to the fault segment's characteristic magnitude Mw_char, combining a truncated
 * Gutenberg-Richter / Youngs & Coppersmith (1985) characteristic magnitude taper.
 */
export function adjustForTargetMagnitude(
  baseProb: number,
  characteristicMw: number,
  targetMw: number
): number {
  const diff = targetMw - characteristicMw;
  if (diff <= -0.25) {
    // Target magnitude is noticeably smaller than characteristic magnitude:
    // moderate-to-large sub-characteristic events can also occur alongside characteristic ruptures
    const boostFactor = Math.min(1.35, Math.pow(10, -0.35 * (diff + 0.25)));
    return Math.min(0.99, 1.0 - Math.pow(1.0 - baseProb, boostFactor));
  }
  if (diff <= 0.1) {
    // Within characteristic magnitude band (±0.15 Mw)
    return baseProb;
  }
  // Target magnitude exceeds segment's single-segment characteristic magnitude:
  // requires multi-segment cascade rupture, probability tapers exponentially
  const penalty = Math.exp(-3.2 * (diff - 0.1));
  return baseProb * penalty;
}

/**
 * Deterministic Gauss-Hermite / Latin-Hypercube style 25-point parameter variation grid
 * over (μ ± Δμ, α ± Δα) to quantify epistemic uncertainty bounds [P5, P50, P95] quickly and reproducibly.
 */
export function computeUncertaintyBounds(
  model: RenewalModelType,
  elapsedYears: number,
  deltaT: number,
  mu: number,
  muStd: number,
  alpha: number,
  alphaStd: number,
  characteristicMw: number,
  targetMw: number
): { p5: number; p50: number; p95: number; stdDev: number } {
  const zQuantiles = [-1.645, -0.842, 0.0, 0.842, 1.645];
  const samples: number[] = [];

  for (const zMu of zQuantiles) {
    const sampleMu = Math.max(40, mu + zMu * muStd);
    for (const zAlpha of zQuantiles) {
      const sampleAlpha = Math.max(0.18, Math.min(0.95, alpha + zAlpha * alphaStd));
      const rawP = computeConditionalProbability(
        model,
        elapsedYears,
        deltaT,
        sampleMu,
        sampleAlpha
      );
      const adjP = adjustForTargetMagnitude(rawP, characteristicMw, targetMw);
      samples.push(adjP);
    }
  }

  samples.sort((a, b) => a - b);
  const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length;
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) /
    samples.length;

  return {
    p5: samples[1] ?? samples[0],
    p50: samples[Math.floor(samples.length / 2)],
    p95: samples[samples.length - 2] ?? samples[samples.length - 1],
    stdDev: Math.sqrt(variance),
  };
}

/**
 * Calculates a 0-100 Seismic Gap Score combining:
 * 1. Maturity Ratio (t / μ) [45% weight]
 * 2. Accumulated Tectonic Slip Deficit (in meters, capped at 5.0m) [30% weight]
 * 3. 30-Year BPT Conditional Probability [25% weight]
 */
export function calculateSeismicGapScore(
  maturityRatio: number,
  slipDeficitMeters: number,
  bpt30YrProb: number
): number {
  const maturityComponent = Math.min(1.0, maturityRatio / 1.25) * 45;
  const slipComponent = Math.min(1.0, slipDeficitMeters / 4.5) * 30;
  const probComponent = Math.min(1.0, bpt30YrProb / 0.65) * 25;

  return Math.round(
    Math.max(0, Math.min(100, maturityComponent + slipComponent + probComponent))
  );
}

export function classifyRiskLevel(
  probability: number
): 'low' | 'moderate' | 'high' | 'critical' {
  if (probability >= 0.45) return 'critical';
  if (probability >= 0.25) return 'high';
  if (probability >= 0.1) return 'moderate';
  return 'low';
}

// 1-Hour In-Memory Calculation Cache
const calculationCache = new Map<
  string,
  { timestamp: number; result: ProbabilityResult }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Evaluates full renewal probability metrics for a fault segment.
 */
export function evaluateSegmentProbability(
  segment: FaultSegmentFeature,
  options: {
    model: RenewalModelType;
    horizonYears: number;
    targetMw: number;
    scenarioOffsetYears: number;
    baseYear?: number;
  }
): ProbabilityResult {
  const baseYear = options.baseYear ?? 2026;
  const evaluationYear = baseYear + options.scenarioOffsetYears;
  const cacheKey = `${segment.id}:${options.model}:${options.horizonYears}:${options.targetMw}:${evaluationYear}`;

  const now = Date.now();
  const cached = calculationCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const {
    meanRecurrenceYears: mu,
    meanUncertaintyYears: muStd,
    aperiodicity: alpha,
    aperiodicityUncertainty: alphaStd,
    lastRuptureYear,
    slipRateMmYr,
    characteristicMagnitude,
  } = segment.parameters;

  const elapsedYears = Math.max(1, evaluationYear - lastRuptureYear);
  const maturityRatio = elapsedYears / mu;
  const accumulatedSlipDeficitMeters = (elapsedYears * slipRateMmYr) / 1000.0;

  const raw10 = computeConditionalProbability(
    options.model,
    elapsedYears,
    10,
    mu,
    alpha
  );
  const raw30 = computeConditionalProbability(
    options.model,
    elapsedYears,
    30,
    mu,
    alpha
  );
  const raw50 = computeConditionalProbability(
    options.model,
    elapsedYears,
    50,
    mu,
    alpha
  );
  const rawHorizon = computeConditionalProbability(
    options.model,
    elapsedYears,
    options.horizonYears,
    mu,
    alpha
  );

  const prob10Yr = adjustForTargetMagnitude(
    raw10,
    characteristicMagnitude,
    options.targetMw
  );
  const prob30Yr = adjustForTargetMagnitude(
    raw30,
    characteristicMagnitude,
    options.targetMw
  );
  const prob50Yr = adjustForTargetMagnitude(
    raw50,
    characteristicMagnitude,
    options.targetMw
  );
  const conditionalProbability = adjustForTargetMagnitude(
    rawHorizon,
    characteristicMagnitude,
    options.targetMw
  );

  const rawPoisson = poissonConditionalProbability(options.horizonYears, mu);
  const poissonProbability = adjustForTargetMagnitude(
    rawPoisson,
    characteristicMagnitude,
    options.targetMw
  );

  const probabilityGain =
    poissonProbability > 1e-6
      ? conditionalProbability / poissonProbability
      : 1.0;

  const uncertaintyBounds = computeUncertaintyBounds(
    options.model,
    elapsedYears,
    options.horizonYears,
    mu,
    muStd,
    alpha,
    alphaStd,
    characteristicMagnitude,
    options.targetMw
  );

  // Use 30-yr BPT at characteristic magnitude for intrinsic Seismic Gap Score
  const bpt30Char = computeConditionalProbability('BPT', elapsedYears, 30, mu, alpha);
  const seismicGapScore = calculateSeismicGapScore(
    maturityRatio,
    accumulatedSlipDeficitMeters,
    bpt30Char
  );

  const result: ProbabilityResult = {
    segmentId: segment.id,
    model: options.model,
    evaluationYear,
    elapsedYears,
    maturityRatio,
    prob10Yr,
    prob30Yr,
    prob50Yr,
    conditionalProbability,
    poissonProbability,
    probabilityGain,
    uncertaintyBounds,
    seismicGapScore,
    accumulatedSlipDeficitMeters,
    riskLevel: classifyRiskLevel(conditionalProbability),
  };

  calculationCache.set(cacheKey, { timestamp: now, result });
  return result;
}
