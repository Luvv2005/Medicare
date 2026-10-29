import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = L.divIcon({ className: 'mc-pin', html: '📍', iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -22] });

// points: [{ lat, lng, title, sub?, href? }]. Parent mein useMemo se do.
export default function MapView({ points, height = 360 }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current).setView([30.9, 75.85], 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers();
    const bounds = [];
    points.forEach((p) => {
      const m = L.marker([p.lat, p.lng], { icon }).addTo(layer.current);
      const box = document.createElement('div'); // textContent se, XSS nahi
      const s = document.createElement('strong');
      s.textContent = p.title;
      box.append(s);
      if (p.sub) {
        const d = document.createElement('div');
        d.textContent = p.sub;
        box.append(d);
      }
      if (p.href) {
        const a = document.createElement('a');
        a.href = p.href;
        a.textContent = 'View profile';
        box.append(a);
      }
      m.bindPopup(box);
      bounds.push([p.lat, p.lng]);
    });
    if (bounds.length > 1) map.current.fitBounds(bounds, { padding: [30, 30] });
    else if (bounds.length === 1) map.current.setView(bounds[0], 14);
  }, [points]);

  return <div ref={el} className="mc-map" style={{ height }} />;
}