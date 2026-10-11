import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FaultRegion, RenewalModelType } from '../types/seismic';

export type Language = 'tr' | 'en';
export type ThemeMode = 'dark' | 'light';

interface MapperState {
  // Scientific Model Settings
  selectedModel: RenewalModelType;
  horizonYears: 10 | 30 | 50;
  targetMagnitude: 6.5 | 7.0 | 7.5;
  scenarioOffsetYears: number; // 0 to +50 years from 2026

  // Filters & Layers
  selectedRegion: FaultRegion | 'ALL';
  searchQuery: string;
  liveQuakesTimeWindowHours: 24 | 72 | 168;
  liveQuakesMinMagnitude: number;
  showFaultProbabilityLayer: boolean;
  showLiveQuakesLayer: boolean;
  showSeismicGapBadges: boolean;

  // Selection & Map View
  selectedSegmentId: string | null;
  mapViewTarget: { lat: number; lon: number; zoom: number } | null;
  userLocation: { lat: number; lon: number } | null;

  // UI & Preferences
  language: Language;
  theme: ThemeMode;
  activeRightTab: 'segment' | 'table' | 'live' | 'methodology';

  // Actions
  setSelectedModel: (model: RenewalModelType) => void;
  setHorizonYears: (years: 10 | 30 | 50) => void;
  setTargetMagnitude: (mw: 6.5 | 7.0 | 7.5) => void;
  setScenarioOffsetYears: (offset: number) => void;
  setSelectedRegion: (region: FaultRegion | 'ALL') => void;
  setSearchQuery: (query: string) => void;
  setLiveQuakesTimeWindowHours: (hours: 24 | 72 | 168) => void;
  setLiveQuakesMinMagnitude: (minMag: number) => void;
  toggleLayer: (
    layer: 'faults' | 'liveQuakes' | 'seismicGaps'
  ) => void;
  setSelectedSegmentId: (id: string | null) => void;
  flyToLocation: (lat: number, lon: number, zoom?: number) => void;
  setUserLocation: (loc: { lat: number; lon: number } | null) => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setActiveRightTab: (tab: 'segment' | 'table' | 'live' | 'methodology') => void;
}

export const useMapperStore = create<MapperState>()(
  persist(
    (set) => ({
      selectedModel: 'BPT',
      horizonYears: 30,
      targetMagnitude: 7.0,
      scenarioOffsetYears: 0,

      selectedRegion: 'ALL',
      searchQuery: '',
      liveQuakesTimeWindowHours: 24,
      liveQuakesMinMagnitude: 1.5,
      showFaultProbabilityLayer: true,
      showLiveQuakesLayer: true,
      showSeismicGapBadges: true,

      selectedSegmentId: 'kaf-adalar-cinarcik',
      mapViewTarget: null,
      userLocation: null,

      language: 'tr',
      theme: 'dark',
      activeRightTab: 'segment',

      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setHorizonYears: (horizonYears) => set({ horizonYears }),
      setTargetMagnitude: (targetMagnitude) => set({ targetMagnitude }),
      setScenarioOffsetYears: (scenarioOffsetYears) =>
        set({ scenarioOffsetYears }),
      setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setLiveQuakesTimeWindowHours: (liveQuakesTimeWindowHours) =>
        set({ liveQuakesTimeWindowHours }),
      setLiveQuakesMinMagnitude: (liveQuakesMinMagnitude) =>
        set({ liveQuakesMinMagnitude }),
      toggleLayer: (layer) =>
        set((state) => {
          if (layer === 'faults') {
            return { showFaultProbabilityLayer: !state.showFaultProbabilityLayer };
          }
          if (layer === 'liveQuakes') {
            return { showLiveQuakesLayer: !state.showLiveQuakesLayer };
          }
          return { showSeismicGapBadges: !state.showSeismicGapBadges };
        }),
      setSelectedSegmentId: (selectedSegmentId) =>
        set({
          selectedSegmentId,
          activeRightTab: selectedSegmentId ? 'segment' : 'table',
        }),
      flyToLocation: (lat, lon, zoom = 9) =>
        set({ mapViewTarget: { lat, lon, zoom } }),
      setUserLocation: (userLocation) => set({ userLocation }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
    }),
    {
      name: 'tr-earthquake-mapper-preferences',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        horizonYears: state.horizonYears,
        targetMagnitude: state.targetMagnitude,
        language: state.language,
        theme: state.theme,
        liveQuakesMinMagnitude: state.liveQuakesMinMagnitude,
      }),
    }
  )
);
