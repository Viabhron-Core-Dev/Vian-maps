import React, { useEffect, useState, useRef } from 'react';
import { Circle, Marker, useMap, FeatureGroup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useGPSStore } from '../lib/store';
import { Radio, TowerControl as Tower } from 'lucide-react';
import { renderToString } from 'react-dom/server';

interface CellTower {
  id: string;
  lat: number;
  lng: number;
  provider: string;
  signal: number; // dBm
  type: '4G' | '5G' | 'LTE';
}

const SignalRadar: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const map = useMap();
  const position = useGPSStore(s => s.position);
  const [pulseRadius, setPulseRadius] = useState(0);
  const [towers, setTowers] = useState<CellTower[]>([]);
  const lastPos = useRef<[number, number] | null>(null);

  // Animation for the radar pulse
  useEffect(() => {
    if (!isActive) {
      setPulseRadius(0);
      return;
    }

    let frame: number;
    let start: number;

    const animate = (time: number) => {
      if (!start) start = time;
      const progress = (time - start) % 3000;
      setPulseRadius((progress / 3000) * 2000); // Pulse up to 2km
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isActive]);

  // Generate mock towers around position
  useEffect(() => {
    if (!isActive || !position) return;
    
    // Only regenerate if moved significantly (e.g. 500m)
    if (lastPos.current) {
        const dist = L.latLng(position).distanceTo(L.latLng(lastPos.current));
        if (dist < 500) return;
    }

    const providers = ['TIM', 'Vodafone', 'WindTre', 'Iliad'];
    const types: ('4G' | '5G' | 'LTE')[] = ['4G', '5G', 'LTE'];
    
    const newTowers: CellTower[] = Array.from({ length: 8 }).map((_, i) => {
      // Random offset within ~3km
      const offsetLat = (Math.random() - 0.5) * 0.04;
      const offsetLng = (Math.random() - 0.5) * 0.06;
      return {
        id: `tower-${i}`,
        lat: position[0] + offsetLat,
        lng: position[1] + offsetLng,
        provider: providers[Math.floor(Math.random() * providers.length)],
        signal: -Math.floor(Math.random() * 50 + 60), // -60 to -110 dBm
        type: types[Math.floor(Math.random() * types.length)]
      };
    });

    setTowers(newTowers);
    lastPos.current = position;
  }, [isActive, position]);

  if (!isActive || !position) return null;

  const towerIcon = (type: string, provider: string) => L.divIcon({
    className: 'tower-marker',
    html: `<div class="relative flex items-center justify-center unrotate">
      <div class="absolute inset-0 bg-blue-500/20 rounded-full animate-ping scale-75"></div>
      <div class="w-8 h-8 bg-zinc-900 border-2 border-blue-500 rounded-lg flex items-center justify-center text-blue-500 shadow-xl">
        ${renderToString(<Radio size={16} strokeWidth={3} />)}
      </div>
      <div class="absolute -top-1 -right-1 px-1 bg-blue-600 text-white text-[6px] font-black rounded uppercase">${type}</div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  return (
    <FeatureGroup>
      {/* Radar Pulses */}
      <Circle
        center={position}
        radius={pulseRadius}
        pathOptions={{
          color: '#3b82f6',
          weight: 1,
          fillColor: '#3b82f6',
          fillOpacity: Math.max(0, 0.15 * (1 - pulseRadius / 2000)),
          interactive: false
        }}
      />
      <Circle
        center={position}
        radius={pulseRadius * 0.5}
        pathOptions={{
          color: '#3b82f6',
          weight: 1,
          fillColor: '#3b82f6',
          fillOpacity: Math.max(0, 0.1 * (1 - (pulseRadius * 0.5) / 2000)),
          interactive: false
        }}
      />

      {/* Detected Towers */}
      {towers.map(tower => (
        <Marker 
          key={tower.id} 
          position={[tower.lat, tower.lng]} 
          icon={towerIcon(tower.type, tower.provider)}
        >
          <Tooltip direction="top" className="tactical-tooltip">
            <div className="flex flex-col gap-1 p-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black text-zinc-900 uppercase">{tower.provider}</span>
                <span className={`text-[10px] font-bold ${tower.signal > -80 ? 'text-green-500' : 'text-amber-500'}`}>
                  {tower.signal} dBm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1 bg-zinc-800 text-white text-[8px] font-black rounded">{tower.type}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const bars = tower.signal > -100 ? (tower.signal > -85 ? 4 : 3) : 2;
                    return (
                        <div 
                            key={i} 
                            className={`w-1 h-${i + 1} rounded-full ${i < bars ? 'bg-blue-500' : 'bg-zinc-300'}`} 
                        />
                    );
                  })}
                </div>
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </FeatureGroup>
  );
};

export default SignalRadar;
