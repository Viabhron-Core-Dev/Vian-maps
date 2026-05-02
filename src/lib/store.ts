import { create } from 'zustand';
import L from 'leaflet';

interface MapInstance {
  map: L.Map | null;
  setMap: (map: L.Map | null) => void;
}

export const useMapStore = create<MapInstance>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
}));

interface GPSState {
  position: [number, number] | null;
  accuracy: number | null;
  speed: number | null; // m/s
  heading: number | null;
  altitude: number | null;
  isTracking: boolean;
  isNearEdge: boolean;
  
  // Actions
  setPosition: (pos: [number, number] | null) => void;
  setMetrics: (metrics: Partial<Pick<GPSState, 'accuracy' | 'speed' | 'heading' | 'altitude'>>) => void;
  setTracking: (tracking: boolean) => void;
  setNearEdge: (edge: boolean) => void;
}

export const useGPSStore = create<GPSState>((set) => ({
  position: null,
  accuracy: null,
  speed: null,
  heading: null,
  altitude: null,
  isTracking: false,
  isNearEdge: false,

  setPosition: (position) => set({ position }),
  setMetrics: (metrics) => set((state) => ({ ...state, ...metrics })),
  setTracking: (isTracking) => set({ isTracking }),
  setNearEdge: (isNearEdge) => set({ isNearEdge }),
}));

interface ConfigState {
  activeLayerId: string;
  isOnline: boolean;
  isGPSEngineActive: boolean;
  isSensorsActive: boolean;
  autoCache: boolean;
  showCacheVis: boolean;
  cacheMaxTiles: number;
  cacheMaxAgeDays: number;
  cacheAutoClean: boolean;
  eraseRadius: number;
  activeTagFilters: string[];
  theme: 'light' | 'dark';
  eraserMode: 'brush' | 'circle';
  isEraserArmed: boolean;
  activeTool: string | null;
  zoomOffset: number;
  pendingBookmark: { lat: number, lng: number } | null;
  mapRotation: number;
  mapRotationLocked: boolean;
  compassLocked: boolean;
  positionMode: 'gps' | 'location';
  selectedTiles: string[];
  performanceMode: 'high' | 'low';
  deepDelete: boolean;
  isHudFolded: boolean;
  
  setActiveLayer: (id: string) => void;
  setOnline: (online: boolean) => void;
  setGPSEngine: (active: boolean) => void;
  setSensors: (active: boolean) => void;
  setAutoCache: (auto: boolean) => void;
  setShowCacheVis: (show: boolean) => void;
  setCacheMaxTiles: (tiles: number) => void;
  setCacheMaxAgeDays: (days: number) => void;
  setCacheAutoClean: (auto: boolean) => void;
  setEraseRadius: (radius: number) => void;
  setTagFilters: (filters: string[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setEraserMode: (mode: 'brush' | 'circle') => void;
  setEraserArmed: (armed: boolean) => void;
  setActiveTool: (tool: string | null) => void;
  setZoomOffset: (offset: number) => void;
  setPendingBookmark: (bm: { lat: number, lng: number } | null) => void;
  setMapRotation: (rotation: number) => void;
  setMapRotationLocked: (locked: boolean) => void;
  setCompassLocked: (locked: boolean) => void;
  setPositionMode: (mode: 'gps' | 'location') => void;
  setSelectedTiles: (tiles: string[]) => void;
  setPerformanceMode: (mode: 'high' | 'low') => void;
  setDeepDelete: (deep: boolean) => void;
  setHudFolded: (folded: boolean) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  activeLayerId: 'blank',
  isOnline: true,
  isGPSEngineActive: true,
  isSensorsActive: true,
  autoCache: localStorage.getItem('vian-maps-auto-cache') !== 'false',
  showCacheVis: false,
  cacheMaxTiles: Number(localStorage.getItem('vian-maps-cache-limit') || 5000),
  cacheMaxAgeDays: Number(localStorage.getItem('vian-maps-cache-age') || 30),
  cacheAutoClean: localStorage.getItem('vian-maps-cache-autoclean') !== 'false',
  eraseRadius: 50,
  activeTagFilters: ['all'],
  theme: localStorage.getItem('vian-maps-theme') as 'light' | 'dark' || 'light',
  eraserMode: 'brush',
  isEraserArmed: false,
  activeTool: null,
  zoomOffset: 120,
  pendingBookmark: null,
  mapRotation: 0,
  mapRotationLocked: true,
  compassLocked: false,
  positionMode: 'gps',
  selectedTiles: [],
  performanceMode: 'low',
  deepDelete: false,
  isHudFolded: localStorage.getItem('vian-maps-hud-folded') !== 'false',

  setActiveLayer: (activeLayerId) => set({ activeLayerId }),
  setOnline: (isOnline) => set({ isOnline }),
  setGPSEngine: (isGPSEngineActive) => set({ isGPSEngineActive }),
  setSensors: (isSensorsActive) => set({ isSensorsActive }),
  setAutoCache: (autoCache) => {
    localStorage.setItem('vian-maps-auto-cache', String(autoCache));
    set({ autoCache });
  },
  setShowCacheVis: (showCacheVis) => set({ showCacheVis }),
  setCacheMaxTiles: (cacheMaxTiles) => {
    localStorage.setItem('vian-maps-cache-limit', String(cacheMaxTiles));
    set({ cacheMaxTiles });
  },
  setCacheMaxAgeDays: (cacheMaxAgeDays) => {
    localStorage.setItem('vian-maps-cache-age', String(cacheMaxAgeDays));
    set({ cacheMaxAgeDays });
  },
  setCacheAutoClean: (cacheAutoClean) => {
    localStorage.setItem('vian-maps-cache-autoclean', String(cacheAutoClean));
    set({ cacheAutoClean });
  },
  setEraseRadius: (eraseRadius) => set({ eraseRadius }),
  setTagFilters: (activeTagFilters) => set({ activeTagFilters }),
  setTheme: (theme) => {
    localStorage.setItem('vian-maps-theme', theme);
    set({ theme });
  },
  setEraserMode: (eraserMode) => set({ eraserMode }),
  setEraserArmed: (isEraserArmed) => set({ isEraserArmed }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setZoomOffset: (zoomOffset) => set({ zoomOffset }),
  setPendingBookmark: (pendingBookmark) => set({ pendingBookmark }),
  setMapRotation: (mapRotation) => set({ mapRotation }),
  setMapRotationLocked: (mapRotationLocked) => set({ mapRotationLocked }),
  setCompassLocked: (compassLocked) => set({ compassLocked }),
  setPositionMode: (positionMode) => set({ positionMode }),
  setSelectedTiles: (selectedTiles) => set({ selectedTiles }),
  setPerformanceMode: (performanceMode) => set({ performanceMode }),
  setDeepDelete: (deepDelete) => set({ deepDelete }),
  setHudFolded: (isHudFolded) => {
    localStorage.setItem('vian-maps-hud-folded', String(isHudFolded));
    set({ isHudFolded });
  },
}));
