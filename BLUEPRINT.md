# Vian Maps Rebuild Blueprint

## Core Architecture
Vian Maps is a specialized offline-first mapping application designed for high-resolution imagery and precise GPS tracking. It is built using React 19, TypeScript, and Tailwind CSS, leveraging Leaflet for mapping and Dexie (IndexedDB) for persistent data storage.

### Subsystems

1. **Map Core (`MapComponent.tsx`)**
   - React-Leaflet integration.
   - Unified layer management (OSM, Google Satellite, OpenTopoMap).
   - Global map instance management via Zustand.

2. **Persistence Layer (`db.ts`, `OfflineLayer.ts`)**
   - `Dexie` IndexedDB: Stores binary tile blobs, marks, and historical tracks.
   - `OfflineTileLayer`: Custom Leaflet class extension that handles tile interception, CORS-aware fetching, and local caching.
   - Supports `harvest()` (proactive caching) and `deepErase()` (spatial clearing).

3. **GPS & Mission Engine (`store.ts`, `MapComponent.tsx`)**
   - Real-time geolocation tracking with accuracy and bearing awareness.
   - Tactical trail rendering and position edge-detection.
   - Auto-caching logic integrated with movement telemetry.

4. **Tactical Tools**
   - **Eraser (`EraserTool.tsx`)**: Implements "Freeze and Scour" logic. Allows navigation until "Locked" via long-press, then permits data scrubbing without accidental map movement.
   - **Measurement (`MeasurementTool.tsx`)**: Precision distance and path measurement with real-time UI overlays.
   - **Download Manager (`DownloadManager.tsx`)**: Handles region-based tile harvesting for mission preparation.

5. **UI & State Management (`App.tsx`, `store.ts`)**
   - Centralized `Zustand` stores for GPS telemetry and system configuration.
   - Multi-panel side interface (Layers, Tools, Bookmarks) with Auto-Dismiss logic for tactical tools.
   - Responsive design with "Thumb Zone" safe navigation for field use.
   - Dark/Light mode support with synchronized tactical color palettes.

6. **PWA & Native Support**
   - Capacitor-ready for Android/iOS builds.
   - Web Manifest and Service Worker for full PWA "Install to Home Screen" support.

## Final Polishing Status
- [x] Uncaught ReferenceErrors resolved.
- [x] JSX Transformation issues fixed (literal strings for tactical markers).
- [x] Unified Quick-Exit button for all tactical instruments.
- [x] Gesture-based map locking (Long-press to Scour).
- [x] Type-safe state management across all components.
