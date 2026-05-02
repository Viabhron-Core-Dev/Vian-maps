import Dexie, { Table } from 'dexie';

export interface TileRecord {
  id: string; // z/x/y
  data: Blob;
  timestamp: number;
}

export interface Bookmark {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  zoom?: number;
  category: 'favorite' | 'waypoint' | 'warning' | 'other' | 'route';
  icon?: string;
  tags?: string;
  note: string;
  savedAt: number;
  data?: any; // For flexible data like route paths
}

export interface Overlay {
  id?: number;
  name: string;
  url: string;
  bounds: [[number, number], [number, number]];
  opacity: number;
}

export interface CachedPlace {
  id: string; // OsmId or similar
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  category?: string;
  type?: string;
  cachedAt: number;
}

export class OfflineMapDB extends Dexie {
  tiles!: Table<TileRecord>;
  bookmarks!: Table<Bookmark>;
  overlays!: Table<Overlay>;
  cachedPlaces!: Table<CachedPlace>;

  constructor() {
    super('VianOfflineMaps');
    this.version(6).stores({
      tiles: 'id, timestamp',
      bookmarks: '++id, name, category, savedAt',
      overlays: '++id, name',
      cachedPlaces: 'id, name, cachedAt'
    });
  }
}

export const db = new OfflineMapDB();
