/**
 * MapView — Renders a Leaflet map centered on Singapore with bounds locked.
 * Displays animated heart-shaped markers with heartbeat, sparkle, and glow effects.
 * Uses CartoDB Voyager tiles with a warm romantic tint.
 *
 * Design: Romantic botanical scrapbook — warm map tiles, animated hearts.
 */
import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { Memory } from "@/lib/types";

const SG_CENTER: [number, number] = [1.3521, 103.8198];
const SG_BOUNDS = L.latLngBounds(
  L.latLng(1.15, 103.59),
  L.latLng(1.47, 104.05)
);

/**
 * Generate sparkle particles HTML — 6 tiny dots that orbit around the heart.
 * Each sparkle has randomized position, timing, and trajectory.
 */
function generateSparklesHTML(): string {
  const sparkles: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 14 + Math.random() * 8;
    const sx = Math.cos(angle) * 4;
    const sy = Math.sin(angle) * 4;
    const ex = Math.cos(angle) * dist;
    const ey = Math.sin(angle) * dist;
    const dur = (2 + Math.random() * 2).toFixed(1);
    const delay = (Math.random() * 2).toFixed(1);
    const size = 2 + Math.random() * 3;
    sparkles.push(
      `<div class="heart-sparkle" style="width:${size}px;height:${size}px;--sx:${sx}px;--sy:${sy}px;--ex:${ex}px;--ey:${ey}px;--sparkle-dur:${dur}s;--sparkle-delay:${delay}s"></div>`
    );
  }
  return sparkles.join("");
}

/**
 * Creates a heart-shaped SVG icon with heartbeat animation, sparkles, and glow rings.
 */
function createHeartIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: "heart-marker",
    html: `
      <div class="heart-marker-inner">
        <div class="heart-glow-ring"></div>
        <div class="heart-glow-ring-2"></div>
        <div class="heart-sparkles">${generateSparklesHTML()}</div>
        <svg class="heart-icon" viewBox="0 0 24 24" fill="#C4878E">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        ${count > 1 ? `<span class="heart-count-badge">${count}</span>` : ""}
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function BoundsEnforcer() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(SG_BOUNDS);
    map.setMinZoom(11);
    map.setMaxZoom(17);
  }, [map]);
  return null;
}

interface MapViewProps {
  memories: Memory[];
  onPinClick: (locationKey: string) => void;
}

export default function MapView({ memories, onPinClick }: MapViewProps) {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const locationGroups = useMemo(() => {
    const groups: Record<string, { memories: Memory[]; lat: number; lng: number }> = {};
    for (const m of memories) {
      if (!groups[m.locationKey]) {
        groups[m.locationKey] = { memories: [], lat: m.lat, lng: m.lng };
      }
      groups[m.locationKey].memories.push(m);
    }
    return groups;
  }, [memories]);

  return (
    <MapContainer
      center={SG_CENTER}
      zoom={12}
      className="w-full h-full"
      zoomControl={true}
      attributionControl={true}
      style={{ background: "#f5f0eb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <BoundsEnforcer />

      {Object.entries(locationGroups).map(([key, group]) => (
        <Marker
          key={key}
          position={[group.lat, group.lng]}
          icon={createHeartIcon(group.memories.length)}
          eventHandlers={{
            click: () => onPinClick(key),
          }}
          ref={(ref) => {
            if (ref) markersRef.current.set(key, ref);
          }}
        />
      ))}
    </MapContainer>
  );
}
