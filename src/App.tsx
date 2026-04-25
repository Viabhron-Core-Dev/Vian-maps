import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Panel from './components/UI/Panel';
import { Layers, Navigation, Bookmark, Wrench, Settings, Search, Map as MapIcon, Signal, SignalLow, Ruler, Zap, Menu, X, Download, Eraser, Hash, Circle, Compass, Plus, Minus, Cloud, CloudOff, Wifi, WifiOff, Locate, LocateFixed, LocateOff, Trash2, RefreshCw, Activity, Share2 } from 'lucide-react';
import { useConfigStore, useGPSStore, useMapStore } from './lib/store';
import { MAP_LAYERS, OfflineTileLayer } from './lib/OfflineLayer';
import { toDMS, getMapScaleLabel, getMetersPerPixel } from './lib/utils';

import BookmarkManager from './components/BookmarkManager';
import SettingsPanel from './components/SettingsPanel';
import MiniLayerManagerPanel from './components/MiniLayerManager';
import SensorDashboard from './components/SensorDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './lib/db';

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const { 
    activeLayerId, 
    setActiveLayer, 
    isOnline, 
    setOnline,
    isGPSEngineActive,
    setGPSEngine,
    isSensorsActive,
    setSensors,
    activeTagFilters,
    setTagFilters,
    theme,
    eraserMode,
    setEraserMode,
    pendingBookmark,
    mapRotation,
    setMapRotation,
    setMapRotationLocked,
    compassLocked,
    setCompassLocked,
    activeTool,
    setActiveTool,
    positionMode,
    setPositionMode,
    selectedTiles,
    setSelectedTiles,
    performanceMode,
    setPerformanceMode,
    deepDelete,
    setDeepDelete
  } = useConfigStore();
  const { isTracking, setTracking, position, speed, accuracy, altitude, heading } = useGPSStore();
  const map = useMapStore(s => s.map);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [center, setCenter] = useState<{lat: number, lng: number}>({ lat: 0, lng: 0 });
  const [coordMode, setCoordMode] = useState<'dms' | 'decimal'>('dms');
  const [showCopied, setShowCopied] = useState(false);
  const [showRefreshPulse, setShowRefreshPulse] = useState(false);
  const [isSensorDashboardOpen, setSensorDashboardOpen] = useState(false);

  useEffect(() => {
    // Handle Shared Coordinates (Deep Linking)
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat') || '');
    const lng = parseFloat(params.get('lng') || '');
    const zoom = parseInt(params.get('z') || '15', 10);

    if (!isNaN(lat) && !isNaN(lng) && map) {
      map.setView([lat, lng], zoom);
      // Optional: Add a temporary marker or highlight?
    }
  }, [map]);

  const handleManualRefresh = () => {
    setShowRefreshPulse(true);
    window.dispatchEvent(new CustomEvent('map-manual-refresh'));
    setTimeout(() => setShowRefreshPulse(false), 1000);
  };

  const shareCoords = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('lat', center.lat.toFixed(6));
    url.searchParams.set('lng', center.lng.toFixed(6));
    url.searchParams.set('z', map?.getZoom().toString() || '15');

    const shareData = {
      title: 'Vian Maps Location',
      text: `Tactical Coordinates: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`,
      url: url.toString()
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url.toString());
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  const toggleGPSMode = () => {
    if (!isTracking) {
      setTracking(true);
      setPositionMode('gps');
    } else if (positionMode === 'gps') {
      setPositionMode('location');
    } else {
      setTracking(false);
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
  };
  const isEraserActive = activeTool === 'eraser';
  const isMeasureActive = activeTool === 'measure';
  const isAnyToolActive = activeTool !== null;

  useEffect(() => {
    if (performanceMode === 'low') {
      document.documentElement.classList.add('performance-low');
    } else {
      document.documentElement.classList.remove('performance-low');
    }
  }, [performanceMode]);

  // Use this to get distance if needed
  const [measureDistance, setMeasureDistance] = useState(0);

  useEffect(() => {
    // Listen for custom event from MeasurementTool if we want to show it in HUD
    const handleDist = (e: any) => setMeasureDistance(e.detail);
    window.addEventListener('measure-update', handleDist);
    return () => window.removeEventListener('measure-update', handleDist);
  }, []);

  useEffect(() => {
    if (pendingBookmark) {
      setActivePanel('bookmarks');
    }
  }, [pendingBookmark]);

  useEffect(() => {
    if (!map) return;
    setCurrentZoom(map.getZoom());
    const onZoom = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const onMove = () => {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
    };
    map.on('move', onMove);
    onMove(); // Initial sync
    return () => { map.off('move', onMove); };
  }, [map]);

  useEffect(() => {
    let watchId: number | null = null;
    
    if (isTracking && isGPSEngineActive) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          useGPSStore.getState().setPosition([pos.coords.latitude, pos.coords.longitude]);
          useGPSStore.getState().setMetrics({
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            altitude: pos.coords.altitude,
          });
        },
        (err) => console.error(err),
        { 
          enableHighAccuracy: positionMode === 'gps',
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, isGPSEngineActive, positionMode]);

  const mpp = getMetersPerPixel(position?.[0], currentZoom);
  const scaleWidth = Math.min(100, 200 / mpp); // Aim for 200m representation, capped at 100% width
  const scaleLabel = mpp > 0 ? "200m" : "--";

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-zinc-100 dark:bg-zinc-950">
      {/* Main Map Background - Lowest Level */}
      <MapComponent />

      {/* Global Scrim for Outside Tap Detection - Above Map, Below UI */}
      <AnimatePresence>
        {activePanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePanel(null)}
            className="absolute inset-0 z-[2500] bg-black/5 backdrop-blur-[2px] pointer-events-auto"
          />
        )}
      </AnimatePresence>

      {/* HUD Top Bar - Floating Intelligence Stack */}
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, x: -20, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -20, y: -20 }}
          className="absolute top-4 left-4 z-[3000] flex flex-col gap-1.5 items-start pointer-events-none"
        >
          {/* Primary Position Header */}
          {!isMeasureActive && !isEraserActive && (
            <div className="flex items-center gap-1.5 pointer-events-auto">
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => {
                        if (!isTracking) {
                          setTracking(true);
                          setGPSEngine(true);
                        }
                        setCoordMode(coordMode === 'dms' ? 'decimal' : 'dms');
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                      }}
                      className={`white-glass px-3 py-1.5 rounded-lg flex items-center gap-3 active:scale-95 transition-transform ${!position ? 'animate-pulse opacity-80' : ''}`}
                    >
                       <div className="flex flex-col">
                          <div className={`text-[11px] font-black tactical-font transition-colors ${position ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                            {position ? (
                              coordMode === 'dms' 
                              ? `${toDMS(position[0], true)} ${toDMS(position[1], false)}`
                              : `${position[0].toFixed(6)}° N ${position[1].toFixed(6)}° E`
                            ) : 'SIGNAL TRAPPED'}
                          </div>
                       </div>
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      if (position) {
                        const text = coordMode === 'dms' 
                          ? `${toDMS(position[0], true)} ${toDMS(position[1], false)}`
                          : `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`;
                        navigator.clipboard.writeText(text);
                        setShowCopied(true);
                        setTimeout(() => setShowCopied(false), 2000);
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(100);
                      } else {
                        setShowCopied(true);
                        setTimeout(() => setShowCopied(false), 2000);
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
                      }
                    }}
                    className={`white-glass w-9 h-9 rounded-lg flex items-center justify-center active:scale-95 transition-transform ${showCopied ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <Bookmark className={`w-5 h-5 transition-colors ${showCopied ? 'text-blue-600' : 'text-zinc-600 dark:text-zinc-300'}`} strokeWidth={2.5} />
                    {showCopied && (
                     <motion.div 
                       initial={{ opacity: 0, x: 10 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="absolute -right-16 top-1 text-[8px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 px-2 py-0.5 rounded font-black whitespace-nowrap shadow-xl"
                     >
                       {position ? 'COPIED' : 'NO FIX'}
                     </motion.div>
                    )}
                  </button>
              </div>
            )}

            {isMeasureActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="white-glass px-4 py-2 rounded-xl flex items-center gap-4 shadow-2xl border border-white/40 pointer-events-auto"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-lg ring-2 ring-white/20">
                    <Ruler className="w-5 h-5 text-zinc-950" strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter leading-none">Ruler Mode Active</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 tactical-font leading-tight">
                      {measureDistance > 1000 ? (measureDistance/1000).toFixed(3) + ' km' : Math.round(measureDistance) + ' m'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('measure-clear'));
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Clear measurement"
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 dark:text-zinc-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('measure-save'));
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Save as route"
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 dark:text-zinc-400"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTool(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Close tool"
                    className="p-1.5 text-white active:scale-125 transition-all outline-none"
                  >
                     <X className="w-8 h-8 drop-shadow-lg" strokeWidth={3} />
                  </button>
                </div>
              </motion.div>
            )}

            {isEraserActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="white-glass px-4 py-2 rounded-xl flex items-center gap-4 shadow-2xl border border-red-500/40 pointer-events-auto"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ring-2 ring-white/20 ${selectedTiles.length > 0 ? 'bg-red-600' : 'bg-red-600/60'}`}>
                    <Eraser className="w-5 h-5 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase tracking-tighter leading-none">Purge Selection</span>
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tactical-font leading-tight">
                      {selectedTiles.length > 0 ? `${selectedTiles.length} TILES MARKED` : 'TAP TO CHOOSE TILES'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeepDelete(!deepDelete);
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
                    }}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${
                      deepDelete 
                      ? 'bg-red-600/20 border-red-500/50 text-red-500' 
                      : 'bg-zinc-800/40 border-zinc-700 text-zinc-500'
                    }`}
                  >
                    DEEP
                  </button>
                  {selectedTiles.length > 0 && (
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([40, 40]);
                        
                        const layerDef = MAP_LAYERS[activeLayerId];
                        const tempLayer = new OfflineTileLayer(layerDef.url, layerDef.id);

                        if (deepDelete) {
                          // Recursive Purge
                          for (const t of selectedTiles) {
                            const [z, x, y] = t.split('-').map(Number);
                            await tempLayer.deleteTileFamily(z, x, y);
                          }
                        } else {
                          // Simple Purge
                          const prefix = activeLayerId + '/';
                          const keys = selectedTiles.map(t => {
                            const [z, x, y] = t.split('-');
                            return `${prefix}${z}/${x}/${y}`;
                          });
                          await db.tiles.bulkDelete(keys);
                        }
                        
                        setSelectedTiles([]);
                        window.dispatchEvent(new CustomEvent('map-refresh'));
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-colors shadow-lg active:scale-95"
                    >
                      PURGE DATA
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTool(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Close tool"
                    className="p-1.5 text-white active:scale-125 transition-all outline-none"
                  >
                     <X className="w-8 h-8 drop-shadow-lg" strokeWidth={3} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Scale & Mission Detail Overlay */}
            {!isMeasureActive && !isEraserActive && (
              <div className="white-glass px-3 py-2 rounded-lg flex flex-col gap-2 pointer-events-auto w-fit min-w-[160px]">
               {/* Center HUD */}
               <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => setCoordMode(coordMode === 'dms' ? 'decimal' : 'dms')}>
                    <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Map Center</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {coordMode === 'dms' ? toDMS(center.lat, center.lng) : `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`}
                    </span>
                  </div>
                  <button 
                    onClick={shareCoords}
                    className="p-1 text-zinc-400 hover:text-blue-500 transition-colors"
                    title="Share Center"
                  >
                    <Share2 className="w-3 h-3" strokeWidth={3} />
                  </button>
               </div>

               <div className="flex items-center justify-between gap-4">
                  <button 
                    onClick={() => setActivePanel('layers')}
                    className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                  >
                    <MapIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-100" strokeWidth={2.5} />
                    <span className="text-[10px] font-black tactical-font text-zinc-900 dark:text-zinc-100">
                      {getMapScaleLabel(currentZoom)}
                    </span>
                  </button>
                  <div className="text-[10px] font-bold tactical-font text-zinc-500">
                    {Math.round(currentZoom)}/20
                  </div>
               </div>
               
               <div className="flex flex-col gap-1">
                  <div className="h-[2px] bg-zinc-200 dark:bg-zinc-800 w-full relative">
                    <div 
                      className="h-full bg-zinc-900 dark:bg-zinc-100 relative scale-line transition-all duration-300"
                      style={{ width: `${scaleWidth}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[7px] font-black text-zinc-400">
                     <span>0m</span>
                     <span>{scaleLabel}</span>
                  </div>
               </div>

               {/* Telemetry Inline */}
               <div className="flex items-center gap-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[9px] font-black tactical-font text-zinc-900 dark:text-zinc-100">{speed ? (speed * 3.6).toFixed(1) : '0.0'}</span>
                    <span className="text-[6px] text-zinc-400 font-bold uppercase tracking-tighter text-zinc-500">kmh</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[9px] font-black tactical-font text-zinc-900 dark:text-zinc-100">{accuracy ? accuracy.toFixed(0) : '--'}</span>
                    <span className="text-[6px] text-zinc-400 font-bold uppercase tracking-tighter text-zinc-500">acc</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[9px] font-black tactical-font text-zinc-900 dark:text-zinc-100">{altitude ? altitude.toFixed(0) : '--'}</span>
                    <span className="text-[6px] text-zinc-400 font-bold uppercase tracking-tighter text-zinc-500">alt</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[9px] font-black tactical-font text-zinc-900 dark:text-zinc-100">{heading ? heading.toFixed(0) : '--'}</span>
                    <span className="text-[6px] text-zinc-400 font-bold uppercase tracking-tighter text-zinc-500">hdg</span>
                  </div>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>


      {/* Main Map */}
      <MapComponent />

      {/* Global Scrim for Outside Tap Detection */}
      <AnimatePresence>
        {activePanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePanel(null)}
            className="absolute inset-0 z-[1500] pointer-events-auto"
          />
        )}
      </AnimatePresence>

      {/* Tool Quick Exit Button - Only visible in other tool modes if any */}
      <AnimatePresence>
        {isAnyToolActive && !isMeasureActive && !isEraserActive && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-6 z-[3000] pointer-events-none"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTool(null);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-12 h-12 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20 transition-colors pointer-events-auto ${
                isEraserActive ? 'bg-red-600 active:bg-red-700' : 'bg-amber-500 active:bg-amber-600'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical Tactical Stack - Right Side Column */}
      <div className="absolute right-4 bottom-8 z-[3000] flex flex-col gap-3 items-center pointer-events-none">
         {/* Sensor Intelligence */}
         <button 
           onClick={() => setSensorDashboardOpen(!isSensorDashboardOpen)}
           className={`p-2 rounded-lg backdrop-blur-md border transition-all active:scale-90 pointer-events-auto shadow-xl ${
             isSensorDashboardOpen 
             ? 'bg-blue-600 border-blue-400 text-white' 
             : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
           }`}
           title="Sensor Intel"
         >
           <Activity className="w-5 h-5" strokeWidth={3} />
         </button>

         {/* Manual Refresh */}
         <button 
           onClick={handleManualRefresh}
           className={`p-2 rounded-lg backdrop-blur-md border transition-all active:scale-90 pointer-events-auto shadow-xl ${
             showRefreshPulse 
             ? 'bg-blue-600 border-blue-400 text-white animate-pulse' 
             : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
           }`}
           title="Refresh Scan"
         >
           <RefreshCw className={`w-5 h-5 ${showRefreshPulse ? 'animate-spin' : ''}`} strokeWidth={3} />
         </button>

         {/* Network Toggle */}
         <button 
           onClick={() => setOnline(!isOnline)}
           className={`p-2 rounded-lg backdrop-blur-md border transition-all active:scale-90 pointer-events-auto shadow-xl ${
             isOnline 
             ? 'bg-green-600/20 border-green-500/50 text-green-500' 
             : 'bg-zinc-800/80 border-zinc-700 text-zinc-500'
           }`}
           title={isOnline ? "Network: ACTIVE" : "Network: STEALTH"}
         >
           {isOnline ? <Wifi className="w-5 h-5" strokeWidth={3} /> : <WifiOff className="w-5 h-5" strokeWidth={3} />}
         </button>

         {/* GPS Mode Cycle */}
         <button 
           onClick={toggleGPSMode}
           className={`p-2 rounded-lg backdrop-blur-md border transition-all active:scale-90 pointer-events-auto shadow-xl ${
             !isTracking 
             ? 'bg-zinc-800/80 border-zinc-700 text-zinc-500' 
             : positionMode === 'gps'
             ? 'bg-blue-600 border-white/20 text-white animate-pulse'
             : 'bg-amber-600/20 border-amber-500/50 text-amber-500'
           }`}
           title={`Positioning: ${!isTracking ? 'OFF' : positionMode.toUpperCase()}`}
         >
           {!isTracking ? <LocateOff className="w-5 h-5" strokeWidth={3} /> : positionMode === 'gps' ? <LocateFixed className="w-5 h-5" strokeWidth={3} /> : <Locate className="w-5 h-5" strokeWidth={3} />}
         </button>

         {/* Zoom Pack - White Style */}
         <div className="flex flex-col gap-2 mt-2">
           <button 
             onClick={() => map?.zoomIn()}
             className="p-1 px-2 text-white drop-shadow-lg active:scale-125 transition-all pointer-events-auto"
           >
             <Plus className="w-8 h-8" strokeWidth={4} />
           </button>
           <button 
             onClick={() => map?.zoomOut()}
             className="p-1 px-2 text-white drop-shadow-lg active:scale-125 transition-all pointer-events-auto"
           >
             <Minus className="w-8 h-8" strokeWidth={4} />
           </button>
         </div>
      </div>

      <SensorDashboard isOpen={isSensorDashboardOpen} onClose={() => setSensorDashboardOpen(false)} />

      {/* Primary Navigation Console - Left Aligned */}
      <AnimatePresence>
        {!isAnyToolActive && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute left-2 bottom-8 z-[3000] pointer-events-none flex flex-col items-start gap-3"
          >

        <div className="obsidian-glass rounded-xl p-1 pointer-events-auto flex items-center gap-1 shadow-2xl relative">
          {/* Anchored Dropdown Menus - Absolute positioned relative to toolbar container */}
          <AnimatePresence>
            {activePanel && (
              <div className="absolute bottom-full left-0 mb-3 w-64 pointer-events-auto shadow-2xl">
                <Panel
                  title={
                    activePanel === 'settings' ? 'CONFIG' :
                    activePanel === 'layers' ? 'MISSION' :
                    activePanel === 'bookmarks' ? 'INTEL' :
                    activePanel === 'flags' ? 'FLAGS' :
                    activePanel === 'tools' ? 'TOOLS' : ''
                  }
                  isOpen={true}
                  onClose={() => setActivePanel(null)}
                  variant="menu"
                  align="left"
                >
                  {activePanel === 'layers' && (
                    <div className="flex flex-col">
                      {Object.values(MAP_LAYERS).map(layer => (
                        <button
                          key={layer.id}
                          onClick={() => setActiveLayer(layer.id)}
                          className={`w-full px-3 py-2 text-left text-[10px] font-bold rounded-md flex items-center justify-between group ${
                            activeLayerId === layer.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          <span className="truncate">{layer.name.toUpperCase()}</span>
                          {activeLayerId === layer.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {activePanel === 'bookmarks' && (
                    <BookmarkManager />
                  )}

                  {activePanel === 'flags' && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase px-2 py-1">Tactical Identifiers</span>
                      {[
                        { id: 'pharmacy', label: 'PHARMACY' },
                        { id: 'store', label: 'STORE' },
                        { id: 'bank', label: 'BANK / ATM' },
                        { id: 'cafe', label: 'CAFE / FOOD' },
                        { id: 'gas', label: 'FUEL / ENERGY' },
                        { id: 'medical', label: 'MEDICAL / HOSP' },
                        { id: 'security', label: 'POLICE / SEC' },
                        { id: 'water', label: 'WATER SUPPLY' },
                        { id: 'tower', label: 'COMMS / TOWER' },
                      ].map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            const next = activeTagFilters.includes(tag.id)
                              ? activeTagFilters.filter(f => f !== tag.id)
                              : [...activeTagFilters, tag.id];
                            setTagFilters(next);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-[9px] font-black tactical-font rounded-md flex items-center justify-between ${
                            activeTagFilters.includes(tag.id)
                            ? 'bg-blue-600/10 text-blue-500 border border-blue-500/30'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          <span>{tag.label}</span>
                          {activeTagFilters.includes(tag.id) && <Hash className="w-2.5 h-2.5" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {activePanel === 'tools' && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          const newState = activeTool === 'eraser' ? null : 'eraser';
                          setActiveTool(newState);
                          if (newState === 'eraser') setActivePanel(null);
                        }}
                        className={`w-full px-3 py-2 text-left text-[10px] font-bold rounded-md flex items-center justify-between ${
                          activeTool === 'eraser' ? 'bg-red-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Eraser className="w-3.5 h-3.5" />
                          <span>ERASER</span>
                        </div>
                        {activeTool === 'eraser' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      </button>
                      <button
                        onClick={() => {
                          const newState = activeTool === 'measure' ? null : 'measure';
                          setActiveTool(newState);
                          if (newState === 'measure') setActivePanel(null);
                        }}
                        className={`w-full px-3 py-2 text-left text-[10px] font-bold rounded-md flex items-center justify-between ${
                          activeTool === 'measure' ? 'bg-amber-500 text-zinc-950' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Ruler className="w-3.5 h-3.5" />
                          <span>RULER</span>
                        </div>
                        {activeTool === 'measure' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-pulse" />}
                      </button>
                      <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <MiniLayerManagerPanel />
                      </div>
                    </div>
                  )}

                  {activePanel === 'settings' && (
                    <SettingsPanel />
                  )}
                </Panel>
              </div>
            )}
          </AnimatePresence>

          {[
            { id: 'settings', icon: Settings, label: 'CONFIG' },
            { id: 'layers', icon: MapIcon, label: 'MISSION' },
            { id: 'bookmarks', icon: Bookmark, label: 'INTEL' },
            { id: 'flags', icon: Hash, label: 'FLAGS' },
            { id: 'tools', icon: Wrench, label: 'TOOLS' },
            { 
              id: 'compass', 
              icon: Compass, 
              label: compassLocked ? 'LOCKED' : 'NORTH', 
              onClick: () => {
                if (mapRotation !== 0) {
                  setMapRotation(0);
                  setMapRotationLocked(true);
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                } else {
                  setCompassLocked(!compassLocked);
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(100);
                }
              },
              rotate: -mapRotation 
            }
          ].map((item: any) => (
            <div key={item.id} className="relative">
              <button
                onClick={item.onClick || (() => setActivePanel(activePanel === item.id ? null : item.id))}
                onPointerDown={item.onPointerDown}
                onPointerUp={item.onPointerUp}
                onPointerLeave={item.onPointerUp}
                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all ${
                  activePanel === item.id 
                  ? 'bg-blue-600 text-white shadow-inner scale-95 ring-1 ring-white/40' 
                  : item.id === 'compass' && (mapRotation !== 0 || compassLocked)
                  ? 'text-blue-500 bg-blue-500/20 ring-1 ring-blue-500/40'
                  : 'text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white hover:bg-white/10'
                }`}
                title={item.label}
              >
                <item.icon 
                  className="w-6 h-6 transition-transform duration-300" 
                  strokeWidth={2.5}
                  style={item.rotate !== undefined ? { transform: `rotate(${item.rotate}deg)` } : {}}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>

    </div>
  );
};

export default App;
