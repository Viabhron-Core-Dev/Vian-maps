import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Ruler, Trash2, X, Bookmark } from 'lucide-react';
import { useConfigStore } from '../lib/store';
import { db } from '../lib/db';

const MeasurementTool: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const map = useMap();
  const { mapRotation } = useConfigStore();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [distance, setDistance] = useState(0);
  const lineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  const clear = useCallback(() => {
    setPoints([]);
    setDistance(0);
    window.dispatchEvent(new CustomEvent('measure-update', { detail: 0 }));
    if (lineRef.current) map.removeLayer(lineRef.current);
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    lineRef.current = null;
  }, [map]);

  const saveRoute = useCallback(async () => {
    if (points.length < 2) return;
    
    await db.bookmarks.add({
      lat: points[0].lat,
      lng: points[0].lng,
      name: `ROUTE ${new Date().toLocaleTimeString()}`,
      category: 'route',
      savedAt: Date.now(),
      note: `Measured Distance: ${Math.round(distance)}m`,
      data: {
        path: points.map(p => ({ lat: p.lat, lng: p.lng })),
        distance
      }
    });
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    clear();
    useConfigStore.getState().setActiveTool(null);
  }, [points, distance, clear]);

  useEffect(() => {
    const handleClear = () => clear();
    const handleSave = () => saveRoute();
    
    window.addEventListener('measure-clear', handleClear);
    window.addEventListener('measure-save', handleSave);
    
    return () => {
      window.removeEventListener('measure-clear', handleClear);
      window.removeEventListener('measure-save', handleSave);
    };
  }, [clear, saveRoute]);

  useEffect(() => {
    if (!isActive) {
      clear();
      window.dispatchEvent(new CustomEvent('measure-update', { detail: 0 }));
    }
  }, [isActive, clear]);

  useMapEvents({
    click(e) {
      if (!isActive) return;
      
      let latlng = e.latlng;

      if (mapRotation !== 0) {
        const container = map.getContainer();
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Use clientX/Y from the native event
        const mouseEvent = e.originalEvent as MouseEvent;
        const dx = mouseEvent.clientX - centerX;
        const dy = mouseEvent.clientY - centerY;
        
        // theta is the angle we need to UN-rotate the point
        const theta = (-mapRotation * Math.PI) / 180;
        const rDx = dx * Math.cos(theta) - dy * Math.sin(theta);
        const rDy = dx * Math.sin(theta) + dy * Math.cos(theta);
        
        // Convert relative center point + unrotated delta back to LatLng
        const containerPoint = L.point(centerX + rDx, centerY + rDy);
        // We need point relative to the map container for containerPointToLatLng
        const rectMap = container.getBoundingClientRect();
        const mapRelativePoint = L.point(centerX + rDx - rectMap.left, centerY + rDy - rectMap.top);
        latlng = map.containerPointToLatLng(mapRelativePoint);
      }

      const newPoints = [...points, latlng];
      setPoints(newPoints);

      // Add visual marker
      const marker = L.circleMarker(latlng, {
        radius: 5,
        color: '#fbbf24',
        fillColor: '#fbbf24',
        fillOpacity: 1
      }).addTo(map);
      markersRef.current.push(marker);

      // Update line
      if (!lineRef.current) {
        lineRef.current = L.polyline(newPoints, { color: '#fbbf24', weight: 4, dashArray: '5, 10' }).addTo(map);
      } else {
        lineRef.current.setLatLngs(newPoints);
      }

      // Calculate total distance
      let d = 0;
      for (let i = 0; i < newPoints.length - 1; i++) {
        d += newPoints[i].distanceTo(newPoints[i+1]);
      }
      setDistance(d);
      window.dispatchEvent(new CustomEvent('measure-update', { detail: d }));
    }
  });

  if (!isActive) return null;

  return null;
};

export default MeasurementTool;
