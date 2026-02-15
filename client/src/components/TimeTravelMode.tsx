/**
 * TimeTravelMode — Animated relationship timeline overlay.
 *
 * When activated:
 * 1. Sorts memories chronologically
 * 2. Auto-zooms to the first pin (earliest date)
 * 3. Draws an animated dotted red line that progressively extends between memories
 * 4. Camera stays zoomed in and slowly follows the leading edge of the dotted line
 * 5. Fades in soft ambient music
 * 6. Shows a Polaroid card for each memory as the camera pans
 * 7. Feels like watching a love documentary
 *
 * Uses Leaflet map instance directly for smooth animations.
 * The glowing path is drawn as an SVG overlay on the map.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, X, Volume2, VolumeX, ChevronRight, ChevronLeft } from "lucide-react";
import L from "leaflet";
import type { Memory } from "@/lib/types";
import { getMemoryImages } from "@/lib/types";
import { SG_LOCATIONS } from "@/lib/locations";
import { startMusic, stopMusic, isMusicPlaying } from "@/lib/ambientMusic";

interface TimeTravelModeProps {
  memories: Memory[];
  mapInstance: L.Map | null;
  onExit: () => void;
}

/** The zoom level used during the line-drawing travel. Close enough to see streets. */
const TRAVEL_ZOOM = 15;

/** Duration of the line-drawing animation in ms — slow and romantic */
const ANIM_DURATION = 5000;

/** Sort memories chronologically */
function sortChronologically(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => {
    const dateA = a.memoryDate ? new Date(a.memoryDate).getTime() : a.createdAt;
    const dateB = b.memoryDate ? new Date(b.memoryDate).getTime() : b.createdAt;
    return dateA - dateB;
  });
}

/** Format a date nicely */
function formatDate(memory: Memory): string {
  const dateStr = memory.memoryDate || new Date(memory.createdAt).toISOString().split("T")[0];
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-SG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Get location name from key */
function getLocationName(key: string): string {
  return SG_LOCATIONS.find((l) => l.key === key)?.name || key.replace(/-/g, " ");
}

/**
 * Interpolate between two LatLng points.
 * t ranges from 0 to 1.
 */
function interpolateLatLng(
  from: L.LatLngExpression,
  to: L.LatLngExpression,
  t: number
): L.LatLngExpression {
  const f = L.latLng(from);
  const tgt = L.latLng(to);
  return [
    f.lat + (tgt.lat - f.lat) * t,
    f.lng + (tgt.lng - f.lng) * t,
  ] as L.LatLngExpression;
}

/**
 * The animated dotted red polyline drawn on the Leaflet map.
 *
 * Key behaviour:
 * - The camera zooms in to TRAVEL_ZOOM at the start of each transition
 * - The dotted line draws slowly from the current memory to the next
 * - The camera center is locked to the leading edge of the line every frame
 * - This creates a "following the trail" cinematic feel
 */
function useAnimatedGlowingPath(
  map: L.Map | null,
  sortedMemories: Memory[],
  currentIndex: number,
  isTransitioning: boolean,
  onTransitionComplete: () => void
) {
  // Layers for completed segments (already visited)
  const completedGlowRef = useRef<L.Polyline | null>(null);
  const completedCoreRef = useRef<L.Polyline | null>(null);
  // Layers for the currently-animating segment
  const animGlowRef = useRef<L.Polyline | null>(null);
  const animCoreRef = useRef<L.Polyline | null>(null);
  // Pulsing dot at the leading edge
  const pulseRef = useRef<L.CircleMarker | null>(null);
  // Animation frame ref
  const rafRef = useRef<number | null>(null);
  // Track if we should cancel
  const cancelRef = useRef(false);

  // Clean up all layers
  const cleanupLayers = useCallback(() => {
    if (!map) return;
    if (completedGlowRef.current) { map.removeLayer(completedGlowRef.current); completedGlowRef.current = null; }
    if (completedCoreRef.current) { map.removeLayer(completedCoreRef.current); completedCoreRef.current = null; }
    if (animGlowRef.current) { map.removeLayer(animGlowRef.current); animGlowRef.current = null; }
    if (animCoreRef.current) { map.removeLayer(animCoreRef.current); animCoreRef.current = null; }
    if (pulseRef.current) { map.removeLayer(pulseRef.current); pulseRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, [map]);

  useEffect(() => {
    if (!map) return;
    cancelRef.current = false;

    // Build completed path (all segments before the current transition)
    const completedPoints: L.LatLngExpression[] = sortedMemories
      .slice(0, currentIndex + 1)
      .map((m) => [m.lat, m.lng] as L.LatLngExpression);

    // Clean up previous layers
    cleanupLayers();

    // Draw completed segments — faint and subtle so they don't clutter the view
    if (completedPoints.length >= 2) {
      // Very faint glow underneath — barely visible
      completedGlowRef.current = L.polyline(completedPoints, {
        color: "#d4a0a6",
        weight: 5,
        opacity: 0.08,
        smoothFactor: 1.5,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Faint dotted core — thin, low opacity, soft color
      completedCoreRef.current = L.polyline(completedPoints, {
        color: "#c9868e",
        weight: 1.5,
        opacity: 0.25,
        smoothFactor: 1.5,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "4 8",
      }).addTo(map);
    }

    // If we are transitioning to the next memory, animate the new segment
    if (isTransitioning && currentIndex < sortedMemories.length - 1) {
      const fromMemory = sortedMemories[currentIndex];
      const toMemory = sortedMemories[currentIndex + 1];
      const from: L.LatLngExpression = [fromMemory.lat, fromMemory.lng];
      const to: L.LatLngExpression = [toMemory.lat, toMemory.lng];

      // Create the animating segment layers — prominent, glowy, clearly dotted
      // Outer glow layer — soft warm pink bloom
      animGlowRef.current = L.polyline([from, from], {
        color: "#ff6688",
        weight: 12,
        opacity: 0.18,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
        className: "active-trail-glow",
      }).addTo(map);

      // Core dotted line — clearly dotted with round dots (small dash, generous gap)
      animCoreRef.current = L.polyline([from, from], {
        color: "#ff3355",
        weight: 3,
        opacity: 0.9,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "2 10",
        className: "active-trail-core",
      }).addTo(map);

      // Pulsing dot at leading edge — soft glowing beacon
      pulseRef.current = L.circleMarker(from, {
        radius: 6,
        color: "rgba(255,51,85,0.6)",
        fillColor: "#ff4466",
        fillOpacity: 0.9,
        weight: 2,
        className: "time-travel-pulse",
      }).addTo(map);

      // Ease function — gentle ease-in-out for romantic slow feel
      const easeInOutSine = (t: number): number => {
        return -(Math.cos(Math.PI * t) - 1) / 2;
      };

      let startTime: number | null = null;

      const animate = (now: number) => {
        if (cancelRef.current) return;

        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const rawT = Math.min(elapsed / ANIM_DURATION, 1);
        const t = easeInOutSine(rawT);

        // Interpolate the current leading point
        const currentPoint = interpolateLatLng(from, to, t);

        // Update the animating polyline
        if (animGlowRef.current) {
          animGlowRef.current.setLatLngs([from, currentPoint]);
        }
        if (animCoreRef.current) {
          animCoreRef.current.setLatLngs([from, currentPoint]);
        }

        // Move the pulsing dot
        if (pulseRef.current) {
          pulseRef.current.setLatLng(currentPoint as L.LatLngExpression);
        }

        // *** KEY FIX: Camera stays zoomed in and follows the leading edge ***
        // Center the map exactly on the leading edge of the dotted line.
        // Use setView with animate:false so it tracks every frame without lag.
        map.setView(currentPoint as L.LatLngExpression, TRAVEL_ZOOM, {
          animate: false,
        });

        if (rawT < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete — notify parent
          onTransitionComplete();
        }
      };

      // First zoom into the starting point at TRAVEL_ZOOM, then begin drawing
      map.flyTo(from, TRAVEL_ZOOM, {
        duration: 1.2,
        easeLinearity: 0.25,
      });

      // Wait for the flyTo to finish before starting the line animation
      const onFlyEnd = () => {
        map.off("moveend", onFlyEnd);
        if (!cancelRef.current) {
          // Small extra pause for dramatic effect before the line starts drawing
          setTimeout(() => {
            if (!cancelRef.current) {
              rafRef.current = requestAnimationFrame(animate);
            }
          }, 400);
        }
      };
      map.on("moveend", onFlyEnd);

    } else {
      // Not transitioning — just show a gentle pulse at current position
      const currentMemory = sortedMemories[currentIndex];
      if (currentMemory) {
        pulseRef.current = L.circleMarker([currentMemory.lat, currentMemory.lng], {
          radius: 6,
          color: "rgba(255,51,85,0.5)",
          fillColor: "#ff4466",
          fillOpacity: 0.8,
          weight: 2,
          className: "time-travel-pulse",
        }).addTo(map);
      }
    }

    return () => {
      cancelRef.current = true;
      cleanupLayers();
    };
  }, [map, sortedMemories, currentIndex, isTransitioning, onTransitionComplete, cleanupLayers]);
}

/**
 * Realistic masking tape strip rendered as an inline SVG.
 * Each tape piece is slightly translucent with a fibrous texture,
 * soft edges, and a subtle shadow to look physically taped.
 */
function MaskingTape({
  rotation,
  top,
  left,
  right,
  bottom,
  width = 48,
  height = 18,
}: {
  rotation: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width?: number;
  height?: number;
}) {
  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        top,
        left,
        right,
        bottom,
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          {/* Fibrous noise texture for realistic tape look */}
          <filter id={`tape-texture-${rotation}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9 0.4"
              numOctaves="4"
              seed={Math.abs(rotation * 7 + 13)}
              result="noise"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="noise"
              result="grayNoise"
            />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
          </filter>
          {/* Soft torn / uneven edges */}
          <filter id={`tape-edge-${rotation}`}>
            <feTurbulence
              type="turbulence"
              baseFrequency="0.06"
              numOctaves="3"
              seed={Math.abs(rotation * 3 + 5)}
              result="warp"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="warp"
              scale="2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        {/* Tape shadow */}
        <rect
          x="1"
          y="2"
          width={width - 2}
          height={height - 2}
          rx="1"
          ry="1"
          fill="rgba(120,100,80,0.10)"
          filter={`url(#tape-edge-${rotation})`}
        />
        {/* Tape body — warm semi-translucent masking tape */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="1"
          ry="1"
          fill="rgba(245,228,205,0.72)"
          filter={`url(#tape-texture-${rotation})`}
        />
        {/* Subtle highlight along top edge */}
        <rect
          x="0"
          y="0"
          width={width}
          height="1.5"
          rx="0.5"
          fill="rgba(255,255,255,0.18)"
        />
      </svg>
    </div>
  );
}

/** Memory card shown during timeline playback — Polaroid with masking tape */
function TimelineCard({
  memory,
  index,
  total,
}: {
  memory: Memory;
  index: number;
  total: number;
}) {
  const images = getMemoryImages(memory);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Auto-cycle photos
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % images.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 40, scale: 0.9, rotate: -2 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{ type: "spring", damping: 20, stiffness: 200 }}
    >
      {/* ===== Masking tape on all four corners ===== */}
      {/* Top-left tape */}
      <MaskingTape rotation={-28} top="-8px" left="-10px" width={50} height={17} />
      {/* Top-right tape */}
      <MaskingTape rotation={22} top="-8px" right="-10px" width={48} height={16} />
      {/* Bottom-left tape */}
      <MaskingTape rotation={18} bottom="-7px" left="-8px" width={46} height={16} />
      {/* Bottom-right tape */}
      <MaskingTape rotation={-24} bottom="-7px" right="-10px" width={50} height={17} />

      {/* ===== Polaroid card body ===== */}
      <div
        className="polaroid-realistic relative"
        style={{
          width: "min(280px, 80vw)",
          padding: "10px 10px 16px 10px",
          /* Warm creamy Polaroid paper background */
          background: "linear-gradient(168deg, #fdf6ee 0%, #f9ede0 40%, #faf0e4 70%, #f5e8d8 100%)",
          borderRadius: "2px",
          /* Realistic layered shadow — depth of a physical photo */
          boxShadow: `
            0 1px 2px rgba(139,115,85,0.10),
            0 3px 6px rgba(139,115,85,0.08),
            0 8px 24px rgba(139,115,85,0.12),
            0 16px 40px rgba(100,80,60,0.08),
            inset 0 0 0 0.5px rgba(180,160,130,0.15)
          `,
        }}
      >
        {/* Paper grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "2px",
            opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            mixBlendMode: "multiply",
          }}
        />
        {/* Subtle inner edge shadow for paper depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "2px",
            boxShadow: "inset 0 0 16px rgba(160,130,100,0.08), inset 0 0 4px rgba(160,130,100,0.05)",
          }}
        />
        {/* Very slight yellowing at edges — aged paper effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "2px",
            background: "radial-gradient(ellipse at center, transparent 60%, rgba(210,185,150,0.08) 100%)",
          }}
        />

        {/* Photo with crossfade — warm pastel tinted frame */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: "clamp(160px, 50vw, 200px)",
            borderRadius: "1px",
            /* Subtle warm border around the photo like real Polaroid */
            border: "1px solid rgba(200,175,145,0.25)",
            background: "linear-gradient(135deg, #f5e6d8 0%, #fce4d6 50%, #f8ddd0 100%)",
          }}
        >
          <AnimatePresence mode="popLayout">
            <motion.img
              key={`tl-img-${photoIndex}`}
              src={images[photoIndex]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              draggable={false}
              style={{
                /* Warm romantic tint on photos */
                filter: "saturate(0.92) sepia(0.06) brightness(1.02) contrast(0.98)",
              }}
            />
          </AnimatePresence>

          {/* Soft vignette over the photo for dreamy feel */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, transparent 55%, rgba(180,140,110,0.12) 100%)",
            }}
          />

          {/* Photo dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <div
                  key={i}
                  className="transition-all duration-300"
                  style={{
                    width: i === photoIndex ? 14 : 5,
                    height: 5,
                    borderRadius: 3,
                    background: i === photoIndex
                      ? "rgba(210,140,130,0.9)"
                      : "rgba(255,255,255,0.45)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Caption area — warm romantic tones */}
        <div className="mt-3 px-1 text-center relative z-10">
          <p
            className="leading-snug"
            style={{
              fontFamily: "var(--font-handwritten)",
              fontSize: "1rem",
              color: "#5a4a3e",
            }}
          >
            {memory.caption}
          </p>
          <p
            className="mt-1.5 font-medium"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.8rem",
              color: "#c9868e",
            }}
          >
            {getLocationName(memory.locationKey)}
          </p>
          <p
            className="mt-0.5"
            style={{
              fontFamily: "var(--font-handwritten)",
              fontSize: "0.75rem",
              color: "#c4b09a",
            }}
          >
            {formatDate(memory)}
          </p>
        </div>

        {/* Progress indicator — soft pastel dots */}
        <div className="mt-3 flex items-center justify-center gap-1.5 relative z-10">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className="transition-all duration-500"
              style={{
                width: i === index ? 18 : 6,
                height: 4,
                borderRadius: 2,
                background:
                  i < index
                    ? "#d4a0a6"
                    : i === index
                    ? "#e8868e"
                    : "#e8ddd0",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function TimeTravelMode({ memories, mapInstance, onExit }: TimeTravelModeProps) {
  const sortedMemories = useMemo(() => sortChronologically(memories), [memories]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = not started
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Called when the dotted line animation finishes drawing to the next point
  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
    // Advance to the next memory index now that the line has arrived
    setCurrentIndex((prev) => prev + 1);
  }, []);

  // Draw the animated glowing dotted path on the map
  useAnimatedGlowingPath(mapInstance, sortedMemories, currentIndex, isTransitioning, handleTransitionComplete);

  // Start the journey
  const startJourney = useCallback(() => {
    setIsStarted(true);
    setCurrentIndex(0);
    if (musicEnabled) {
      startMusic();
    }
  }, [musicEnabled]);

  // Fly to a memory on the map (used for initial positioning and going back)
  const flyToMemory = useCallback(
    (index: number) => {
      if (!mapInstance || index < 0 || index >= sortedMemories.length) return;
      const memory = sortedMemories[index];
      mapInstance.flyTo([memory.lat, memory.lng], TRAVEL_ZOOM, {
        duration: 2,
        easeLinearity: 0.25,
      });
    },
    [mapInstance, sortedMemories]
  );

  // Navigate to next memory — triggers the animated dotted line transition
  const goNext = useCallback(() => {
    if (isTransitioning) return; // Don't allow during active animation
    if (currentIndex < sortedMemories.length - 1) {
      // Start the animated line transition
      setIsTransitioning(true);
      // The actual index advance happens in handleTransitionComplete
    }
  }, [currentIndex, sortedMemories.length, isTransitioning]);

  // Navigate to previous memory
  const goPrev = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      flyToMemory(prev);
    }
  }, [currentIndex, flyToMemory, isTransitioning]);

  // Auto-play: advance after a pause (longer pause for the romantic feel)
  useEffect(() => {
    if (!isStarted || !isAutoPlaying || currentIndex < 0 || isTransitioning) return;

    autoPlayTimerRef.current = setTimeout(() => {
      if (currentIndex < sortedMemories.length - 1) {
        goNext();
      } else {
        // Reached the end — stop auto-play
        setIsAutoPlaying(false);
      }
    }, 4000);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [isStarted, isAutoPlaying, currentIndex, sortedMemories.length, goNext, isTransitioning]);

  // Fly to first memory when started
  useEffect(() => {
    if (isStarted && currentIndex === 0) {
      flyToMemory(0);
    }
  }, [isStarted, currentIndex, flyToMemory]);

  // Toggle music
  const toggleMusic = useCallback(() => {
    if (isMusicPlaying()) {
      stopMusic();
      setMusicEnabled(false);
    } else {
      startMusic();
      setMusicEnabled(true);
    }
  }, []);

  // Exit handler
  const handleExit = useCallback(() => {
    stopMusic();
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    // Reset map zoom
    if (mapInstance) {
      mapInstance.flyTo([1.3521, 103.8198], 12, { duration: 1.5 });
    }
    onExit();
  }, [mapInstance, onExit]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExit();
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleExit, goNext, goPrev]);

  if (sortedMemories.length === 0) return null;

  return (
    <AnimatePresence>
      {/* Cinematic overlay */}
      <motion.div
        className="fixed inset-0 z-[1500] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Cinematic letterbox bars */}
        <motion.div
          className="absolute top-0 left-0 right-0 bg-black/80 pointer-events-auto"
          initial={{ height: 0 }}
          animate={{ height: isStarted ? 56 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-black/80 pointer-events-auto"
          initial={{ height: 0 }}
          animate={{ height: isStarted ? 56 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {/* Vignette overlay for cinematic feel */}
        {isStarted && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* "Start Our Story" intro screen */}
        <AnimatePresence>
          {!isStarted && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)",
                  backdropFilter: "blur(4px)",
                }}
              />

              <motion.div
                className="relative z-10 text-center px-6"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                {/* Decorative heart */}
                <motion.div
                  className="mb-6"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <svg
                    width="56"
                    height="56"
                    viewBox="0 0 24 24"
                    fill="#ff4466"
                    className="mx-auto"
                    style={{ filter: "drop-shadow(0 0 20px rgba(255,68,102,0.5))" }}
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </motion.div>

                <h2
                  className="text-white text-3xl sm:text-4xl mb-3 drop-shadow-lg"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  Our Story
                </h2>
                <p
                  className="text-white/70 mb-8 max-w-xs mx-auto"
                  style={{ fontFamily: "var(--font-handwritten)", fontSize: "1.1rem" }}
                >
                  {sortedMemories.length} {sortedMemories.length === 1 ? "memory" : "memories"} across Singapore
                </p>

                <motion.button
                  onClick={startJourney}
                  className="flex items-center gap-3 mx-auto px-8 py-4 rounded-full
                             text-white font-semibold text-lg
                             shadow-[0_8px_40px_rgba(255,68,102,0.4)]
                             border border-white/10"
                  style={{
                    fontFamily: "var(--font-display)",
                    background: "linear-gradient(135deg, #ff4466 0%, #C4878E 100%)",
                  }}
                  whileHover={{ scale: 1.06, boxShadow: "0 12px 50px rgba(255,68,102,0.5)" }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Play size={22} fill="white" />
                  Start Our Story
                </motion.button>

                {/* Close button */}
                <motion.button
                  onClick={handleExit}
                  className="mt-6 text-white/40 hover:text-white/70 transition-colors text-sm"
                  style={{ fontFamily: "var(--font-body)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  or press Esc to go back
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline playback UI */}
        {isStarted && currentIndex >= 0 && (
          <>
            {/* Memory card — bottom left */}
            <div className="absolute bottom-[72px] left-4 sm:left-8 z-10 pointer-events-auto">
              <AnimatePresence mode="wait">
                <TimelineCard
                  key={sortedMemories[currentIndex]?.id}
                  memory={sortedMemories[currentIndex]}
                  index={currentIndex}
                  total={sortedMemories.length}
                />
              </AnimatePresence>
            </div>

            {/* Timeline chapter title — top center */}
            <div className="absolute top-[68px] left-0 right-0 flex justify-center z-10 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`chapter-${currentIndex}`}
                  className="text-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5 }}
                >
                  <span
                    className="text-white/50 text-xs tracking-[0.3em] uppercase"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Chapter {currentIndex + 1}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Transition indicator — shows when line is drawing */}
            <AnimatePresence>
              {isTransitioning && (
                <motion.div
                  className="absolute top-[92px] left-0 right-0 flex justify-center z-10 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span
                    className="text-white/30 text-[10px] tracking-[0.2em] uppercase"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    traveling to next memory...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation controls — bottom center */}
            <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
              <motion.div
                className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full
                           px-3 py-2 border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {/* Previous */}
                <button
                  onClick={goPrev}
                  disabled={currentIndex <= 0 || isTransitioning}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                             text-white/70 hover:text-white hover:bg-white/10
                             disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={18} />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="w-10 h-10 flex items-center justify-center rounded-full
                             bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  {isAutoPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
                </button>

                {/* Next */}
                <button
                  onClick={goNext}
                  disabled={currentIndex >= sortedMemories.length - 1 || isTransitioning}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                             text-white/70 hover:text-white hover:bg-white/10
                             disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-white/20 mx-1" />

                {/* Music toggle */}
                <button
                  onClick={toggleMusic}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                             text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  {musicEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Skip to end */}
                <button
                  onClick={() => {
                    if (isTransitioning) return;
                    const last = sortedMemories.length - 1;
                    setCurrentIndex(last);
                    flyToMemory(last);
                    setIsAutoPlaying(false);
                  }}
                  disabled={isTransitioning}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                             text-white/70 hover:text-white hover:bg-white/10
                             disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <SkipForward size={16} />
                </button>
              </motion.div>
            </div>

            {/* Close button — top right */}
            <motion.button
              onClick={handleExit}
              className="absolute top-[68px] right-4 z-10 pointer-events-auto
                         w-10 h-10 flex items-center justify-center rounded-full
                         bg-black/30 hover:bg-black/50 text-white/70 hover:text-white
                         backdrop-blur-sm border border-white/10 transition-all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <X size={18} />
            </motion.button>

            {/* "The End" screen when all memories are viewed */}
            <AnimatePresence>
              {currentIndex >= sortedMemories.length - 1 && !isAutoPlaying && !isTransitioning && (
                <motion.div
                  className="absolute top-[68px] right-4 sm:right-8 bottom-[68px]
                             flex items-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                >
                  <motion.div
                    className="text-right"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 2.5, duration: 0.8 }}
                  >
                    <p
                      className="text-white/30 text-sm tracking-widest uppercase"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      to be continued...
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
