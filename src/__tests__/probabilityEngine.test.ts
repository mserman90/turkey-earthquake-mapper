import { describe, it, expect } from 'vitest';
import {
  bptCDF,
  lognormalCDF,
  weibullCDF,
  poissonConditionalProbability,
  computeConditionalProbability,
  evaluateSegmentProbability,
  standardNormalCDF,
} from '../lib/probabilityEngine';
import { TURKEY_FAULT_SEGMENTS } from '../data/turkeyFaultSegments';

describe('Scientific Earthquake Renewal Probability Engine', () => {
  it('computes accurate Standard Normal CDF values', () => {
    expect(standardNormalCDF(0)).toBeCloseTo(0.5, 5);
    expect(standardNormalCDF(1.96)).toBeCloseTo(0.975, 3);
    expect(standardNormalCDF(-1.96)).toBeCloseTo(0.025, 3);
  });

  it('satisfies boundary conditions for BPT, Lognormal, and Weibull CDFs', () => {
    expect(bptCDF(0, 250, 0.4)).toBe(0);
    expect(lognormalCDF(0, 250, 0.4)).toBe(0);
    expect(weibullCDF(0, 250, 0.4)).toBe(0);

    // At large elapsed times (t >> mu), CDF approaches 1
    expect(bptCDF(2500, 250, 0.4)).toBeGreaterThan(0.999);
    expect(lognormalCDF(2500, 250, 0.4)).toBeGreaterThan(0.999);
    expect(weibullCDF(2500, 250, 0.4)).toBeGreaterThan(0.999);
  });

  it('yields higher conditional probability than Poisson for mature seismic gaps (t >= mu) and lower for recently ruptured faults (t << mu)', () => {
    const mu = 250;
    const alpha = 0.4;
    const deltaT = 30;

    const poissonP = poissonConditionalProbability(deltaT, mu);

    // Recently ruptured fault (e.g., 1999 Izmit, t = 27 years)
    const earlyBpt = computeConditionalProbability('BPT', 27, deltaT, mu, alpha);
    expect(earlyBpt).toBeLessThan(poissonP);

    // Mature seismic gap (e.g., 1766 Northern Marmara, t = 260 years)
    const matureBpt = computeConditionalProbability('BPT', 260, deltaT, mu, alpha);
    expect(matureBpt).toBeGreaterThan(poissonP);
  });

  it('evaluates all 12 curated Turkish active fault segments with valid 90% uncertainty intervals and Seismic Gap Scores', () => {
    expect(TURKEY_FAULT_SEGMENTS.length).toBeGreaterThanOrEqual(10);

    for (const seg of TURKEY_FAULT_SEGMENTS) {
      const res = evaluateSegmentProbability(seg, {
        model: 'BPT',
        horizonYears: 30,
        targetMw: 7.0,
        scenarioOffsetYears: 0,
        baseYear: 2026,
      });

      expect(res.conditionalProbability).toBeGreaterThanOrEqual(0);
      expect(res.conditionalProbability).toBeLessThanOrEqual(1);
      expect(res.prob10Yr).toBeLessThanOrEqual(res.prob30Yr);
      expect(res.prob30Yr).toBeLessThanOrEqual(res.prob50Yr);
      expect(res.uncertaintyBounds.p5).toBeLessThanOrEqual(
        res.uncertaintyBounds.p50
      );
      expect(res.uncertaintyBounds.p50).toBeLessThanOrEqual(
        res.uncertaintyBounds.p95
      );
      expect(res.seismicGapScore).toBeGreaterThanOrEqual(0);
      expect(res.seismicGapScore).toBeLessThanOrEqual(100);
    }
  });

  it('increases conditional probability when scenario time slider advances for an unruptured segment', () => {
    const yedisu = TURKEY_FAULT_SEGMENTS.find((s) => s.id === 'kaf-yedisu')!;
    const nowRes = evaluateSegmentProbability(yedisu, {
      model: 'Weibull',
      horizonYears: 30,
      targetMw: 7.0,
      scenarioOffsetYears: 0,
      baseYear: 2026,
    });
    const futureRes = evaluateSegmentProbability(yedisu, {
      model: 'Weibull',
      horizonYears: 30,
      targetMw: 7.0,
      scenarioOffsetYears: 35,
      baseYear: 2026,
    });

    expect(futureRes.elapsedYears).toBe(nowRes.elapsedYears + 35);
    expect(futureRes.conditionalProbability).toBeGreaterThan(
      nowRes.conditionalProbability
    );
  });
});
