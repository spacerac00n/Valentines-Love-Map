/**
 * TimeTravelMode — Animated relationship timeline overlay.
 *
 * When activated:
 * 1. Sorts memories chronologically
 * 2. Auto-zooms to the first pin (earliest date)
 * 3. Draws a glowing red path connecting memories in order
 * 4. Fades in soft ambient music
 * 5. Shows a Polaroid card for each memory as the camera pans
 * 6. Feels like watching a love documentary
 *
 * Uses Leaflet map instance directly for smooth flyTo animations.
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
 * The glowing red polyline drawn on the Leaflet map.
 * Uses two layers: a wide glow layer and a thin bright core.
 */
function useGlowingPath(map: L.Map | null, sortedMemories: Memory[], currentIndex: number) {
  const glowLayerRef = useRef<L.Polyline | null>(null);
  const coreLayerRef = useRef<L.Polyline | null>(null);
  const pulseLayerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Build path up to current index
    const points: L.LatLngExpression[] = sortedMemories
      .slice(0, currentIndex + 1)
      .map((m) => [m.lat, m.lng] as L.LatLngExpression);

    if (points.length < 1) return;

    // Remove old layers
    if (glowLayerRef.current) map.removeLayer(glowLayerRef.current);
    if (coreLayerRef.current) map.removeLayer(coreLayerRef.current);
    if (pulseLayerRef.current) map.removeLayer(pulseLayerRef.current);

    if (points.length >= 2) {
      // Outer glow
      glowLayerRef.current = L.polyline(points, {
        color: "#ff4466",
        weight: 10,
        opacity: 0.25,
        smoothFactor: 1.5,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Core line
      coreLayerRef.current = L.polyline(points, {
        color: "#ff2244",
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1.5,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "8 4",
      }).addTo(map);
    }

    // Pulsing dot at current position
    const currentMemory = sortedMemories[currentIndex];
    if (currentMemory) {
      pulseLayerRef.current = L.circleMarker([currentMemory.lat, currentMemory.lng], {
        radius: 8,
        color: "#ff2244",
        fillColor: "#ff4466",
        fillOpacity: 0.8,
        weight: 2,
        className: "time-travel-pulse",
      }).addTo(map);
    }

    return () => {
      if (glowLayerRef.current) map.removeLayer(glowLayerRef.current);
      if (coreLayerRef.current) map.removeLayer(coreLayerRef.current);
      if (pulseLayerRef.current) map.removeLayer(pulseLayerRef.current);
    };
  }, [map, sortedMemories, currentIndex]);
}

/** Memory card shown during timeline playback */
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
      <div
        className="bg-white rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.25)] overflow-hidden"
        style={{
          width: "min(280px, 80vw)",
          padding: "10px 10px 16px 10px",
        }}
      >
        {/* Photo with crossfade */}
        <div className="relative w-full h-[180px] sm:h-[200px] overflow-hidden rounded-sm bg-[#f5f0eb]">
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
            />
          </AnimatePresence>

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
                    background: i === photoIndex ? "#ff4466" : "rgba(255,255,255,0.5)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="mt-3 px-1 text-center">
          <p
            className="text-[#4a3f35] leading-snug"
            style={{ fontFamily: "var(--font-handwritten)", fontSize: "1rem" }}
          >
            {memory.caption}
          </p>
          <p
            className="text-[#C4878E] mt-1.5 font-medium"
            style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem" }}
          >
            {getLocationName(memory.locationKey)}
          </p>
          <p
            className="text-[#b5a898] mt-0.5"
            style={{ fontFamily: "var(--font-handwritten)", fontSize: "0.75rem" }}
          >
            {formatDate(memory)}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
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
                    ? "#C4878E"
                    : i === index
                    ? "#ff4466"
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
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Draw the glowing path on the map
  useGlowingPath(mapInstance, sortedMemories, currentIndex);

  // Start the journey
  const startJourney = useCallback(() => {
    setIsStarted(true);
    setCurrentIndex(0);
    if (musicEnabled) {
      startMusic();
    }
  }, [musicEnabled]);

  // Fly to a memory on the map
  const flyToMemory = useCallback(
    (index: number) => {
      if (!mapInstance || index < 0 || index >= sortedMemories.length) return;
      const memory = sortedMemories[index];
      mapInstance.flyTo([memory.lat, memory.lng], 15, {
        duration: 2,
        easeLinearity: 0.25,
      });
    },
    [mapInstance, sortedMemories]
  );

  // Navigate to next memory
  const goNext = useCallback(() => {
    if (currentIndex < sortedMemories.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      flyToMemory(next);
    }
  }, [currentIndex, sortedMemories.length, flyToMemory]);

  // Navigate to previous memory
  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      flyToMemory(prev);
    }
  }, [currentIndex, flyToMemory]);

  // Auto-play: advance every 5 seconds
  useEffect(() => {
    if (!isStarted || !isAutoPlaying || currentIndex < 0) return;

    autoPlayTimerRef.current = setTimeout(() => {
      if (currentIndex < sortedMemories.length - 1) {
        goNext();
      } else {
        // Reached the end — stop auto-play
        setIsAutoPlaying(false);
      }
    }, 5000);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [isStarted, isAutoPlaying, currentIndex, sortedMemories.length, goNext]);

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
                  disabled={currentIndex <= 0}
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
                  disabled={currentIndex >= sortedMemories.length - 1}
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
                    const last = sortedMemories.length - 1;
                    setCurrentIndex(last);
                    flyToMemory(last);
                    setIsAutoPlaying(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                             text-white/70 hover:text-white hover:bg-white/10 transition-all"
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
              {currentIndex >= sortedMemories.length - 1 && !isAutoPlaying && (
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
