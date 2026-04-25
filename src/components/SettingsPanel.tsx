import React, { useState } from 'react';
import { useConfigStore } from '../lib/store';
import { db } from '../lib/db';
import { Cloud, CloudOff, Zap, Eye, Trash2, Database, Download, Sun, Moon, Package, Upload, Loader2, CheckCircle2, Signal, Navigation, Activity } from 'lucide-react';
import DownloadManager from './DownloadManager';
import JSZip from 'jszip';

const SettingsPanel: React.FC = () => {
  const { 
    isOnline, setOnline, 
    autoCache, setAutoCache, 
    showCacheVis, setShowCacheVis, 
    theme, setTheme,
    isGPSEngineActive, setGPSEngine,
    isSensorsActive, setSensors,
    positionMode, setPositionMode,
    performanceMode, setPerformanceMode
  } = useConfigStore();
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const clearAllTiles = async () => {
    if (confirm('Are you sure? This will delete ALL cached map tiles for all layers.')) {
      await db.tiles.clear();
      alert('Cache cleared.');
    }
  };

  const exportMissionPackage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setArchiveStatus('Packaging Mission Archive...');
    
    try {
      const zip = new JSZip();
      const bookmarks = await db.bookmarks.toArray();
      const overlays = await db.overlays.toArray();
      const tiles = await db.tiles.toArray();

      // Intelligence Manifest
      const manifest = {
        version: '2.1-TACTICAL',
        exportedAt: new Date().toISOString(),
        bookmarks,
        overlays: overlays.map(o => ({ ...o, url: undefined, internalFile: `overlays/ov_${o.id}.bin` }))
      };

      zip.file('mission_manifest.json', JSON.stringify(manifest, null, 2));

      // Overlays (Binary)
      const overlayFolder = zip.folder('overlays');
      for (const o of overlays) {
        if (o.id && o.url) {
          const base64 = o.url.split(',')[1];
          overlayFolder?.file(`ov_${o.id}.bin`, base64, { base64: true });
        }
      }

      // Map Tiles (The heavy lifting)
      const tileFolder = zip.folder('map_tiles');
      for (const t of tiles) {
        // JSZip handles nested paths correctly if we provide a full path string
        tileFolder?.file(t.id, t.data);
      }

      setArchiveStatus('Compressing Package...');
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MISSION_ARCHIVE_${new Date().toISOString().split('T')[0]}.vian`;
      a.click();
      
      setArchiveStatus('Export Complete');
    } catch (err) {
      console.error(err);
      setArchiveStatus('Package Error');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setArchiveStatus(null), 3000);
    }
  };

  const importMissionPackage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isProcessing) return;

    if (!confirm('Warning: Importing a mission package will merge with current data. Map tiles will be added to cache. Continue?')) return;

    setIsProcessing(true);
    setArchiveStatus('Unpacking Archive...');

    try {
      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file('mission_manifest.json');
      if (!manifestFile) throw new Error('Invalid Mission Archive: No manifest found.');

      const manifestText = await manifestFile.async('text');
      const manifest = JSON.parse(manifestText);

      // Restore Bookmarks
      if (manifest.bookmarks) {
        for (const bm of manifest.bookmarks) {
          const { id, ...data } = bm;
          await db.bookmarks.put(data);
        }
      }

      // Restore Overlays & Images
      if (manifest.overlays) {
        for (const oDef of manifest.overlays) {
          const imgFile = zip.file(oDef.internalFile);
          if (imgFile) {
            const blob = await imgFile.async('blob');
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            const { id, internalFile, ...oData } = oDef;
            await db.overlays.put({ ...oData, url: dataUrl });
          }
        }
      }

      // Restore Tiles
      const tileEntries = zip.folder('map_tiles')?.files;
      if (tileEntries) {
        setArchiveStatus('Restoring Map Cache...');
        const entries = Object.entries(tileEntries);
        for (const [name, zipFile] of entries) {
          if (zipFile.dir) continue;
          // ID is the relative path from map_tiles/
          const tileId = name.replace('map_tiles/', '');
          const tileData = await zipFile.async('blob');
          await db.tiles.put({ id: tileId, data: tileData, timestamp: Date.now() });
        }
      }

      setArchiveStatus('Restore Successful');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      setArchiveStatus('Import Failed');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setArchiveStatus(null), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Theme & Priority */}
      <div className="flex gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        {['light', 'dark'].map(t => (
          <button
            key={t}
            onClick={() => setTheme(t as any)}
            className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
              theme === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        {['gps', 'location'].map(m => (
          <button
            key={m}
            onClick={() => setPositionMode(m as any)}
            className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
              positionMode === m ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500'
            }`}
          >
            {m === 'gps' ? 'SATELLITE' : 'INTEGRATED'}
          </button>
        ))}
      </div>

      {/* Network & Cache List */}
      <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        {[
          { label: 'SYSTEM LINK', icon: isOnline ? Cloud : CloudOff, value: isOnline, toggle: () => setOnline(!isOnline), color: 'text-green-500' },
          { label: 'AUTO-CACHE', icon: Zap, value: autoCache, toggle: () => setAutoCache(!autoCache), color: 'text-blue-500' },
          { label: 'CACHE VISUAL', icon: Eye, value: showCacheVis, toggle: () => setShowCacheVis(!showCacheVis), color: 'text-purple-500' },
          { label: 'HIGH PERF', icon: Activity, value: performanceMode === 'high', toggle: () => setPerformanceMode(performanceMode === 'high' ? 'low' : 'high'), color: 'text-orange-500' },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.toggle}
            className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <div className="flex items-center gap-2">
              <item.icon className={`w-3.5 h-3.5 ${item.value ? item.color : 'text-zinc-400'}`} />
              <span className="text-[9px] font-black text-zinc-600 dark:text-zinc-400 uppercase">{item.label}</span>
            </div>
            <div className={`w-6 h-3 rounded-full relative transition-colors ${item.value ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
              <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${item.value ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </button>
        ))}
      </div>

      {/* Bundle Tools */}
      <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        {archiveStatus && (
          <div className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase rounded flex items-center gap-2">
            {isProcessing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
            {archiveStatus}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1">
          <button onClick={exportMissionPackage} disabled={isProcessing} className="py-2 bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-950 rounded-md text-[8px] font-black uppercase tracking-tight flex items-center justify-center gap-1.5">
            <Package className="w-3 h-3" /> EXPORT
          </button>
          <label className="py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[8px] font-black uppercase tracking-tight flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload className="w-3 h-3" /> IMPORT
            <input type="file" className="hidden" accept=".vian" onChange={importMissionPackage} disabled={isProcessing} />
          </label>
        </div>
      </div>

      <div className="mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <DownloadManager />
      </div>

      <button onClick={clearAllTiles} className="w-full mt-2 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
        <Trash2 className="w-3 h-3" /> PURGE TILE CACHE
      </button>
    </div>
  );
};

export default SettingsPanel;
