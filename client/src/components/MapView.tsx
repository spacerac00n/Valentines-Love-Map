/**
 * MapView — Renders a Leaflet map centered on Singapore with bounds locked.
 * Displays heart-shaped markers for each memory location.
 * Uses CartoDB Voyager tiles for a warm, soft aesthetic.
 *
 * Design: Botanical scrapbook — warm, muted map tiles.
 */
import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { Memory } from "@/lib/types";

// Singapore bounds — lock the map to this area
const SG_CENTER: [number, number] = [1.3521, 103.8198];
const SG_BOUNDS = L.latLngBounds(
  L.latLng(1.15, 103.59), // Southwest
  L.latLng(1.47, 104.05)  // Northeast
);

/**
 * Creates a heart-shaped SVG icon for map markers.
 * Includes a pulse animation ring and count badge for multiple memories.
 */
function createHeartIcon(count: number): L.DivIcon {
  const color = "#C4878E";
  const glowColor = "rgba(196,135,142,0.4)";

  return L.divIcon({
    className: "heart-marker",
    html: `
      <div class="heart-marker-inner">
        <div class="heart-pulse-ring"></div>
        <svg viewBox="0 0 24 24" fill="${color}" style="filter: drop-shadow(0 2px 4px ${glowColor}); position: relative; z-index: 2;">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        ${count > 1 ? `<span class="heart-count-badge">${count}</span>` : ""}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

/**
 * Component to enforce map bounds — prevents scrolling outside Singapore.
 */
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

  // Group memories by location key
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
      {/* Warm-toned map tiles — CartoDB Voyager for a soft, warm aesthetic */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <BoundsEnforcer />

      {/* Render heart markers for each location with memories */}
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
