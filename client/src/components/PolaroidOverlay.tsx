/**
 * PolaroidOverlay — Animated overlay that reveals Polaroid photos when a pin is clicked.
 * 
 * Animation sequence (Heart Bloom / Polaroid Burst):
 * 1. Heart pin expands into a pulsing heart (scale up + glow)
 * 2. "Bloom" explosion — hearts burst outward in a circular pattern
 * 3. Polaroid(s) fly out, rotate slightly, land with bounce + shadow
 * 4. Multiple photos fan out like a deck with staggered motion
 * 5. Background dims with spotlight focus
 *
 * Design: Botanical scrapbook — paper texture, washi tape, handwritten captions.
 */
import { useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import type { Memory } from "@/lib/types";
import { SG_LOCATIONS } from "@/lib/locations";

const WASHI_TAPE_URL = "https://private-us-east-1.manuscdn.com/sessionFile/V7ap1rZxcMDRNORRbX2u8f/sandbox/OlM2VxncM6wyctmFHlZwrJ_1771057387767_na1fn_cG9sYXJvaWQtdGFwZQ.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVjdhcDFyWnhjTURSTk9SUmJYMnU4Zi9zYW5kYm94L09sTTJWeG5jTTZ3eWN0bUZIbFp3ckpfMTc3MTA1NzM4Nzc2N19uYTFmbl9jRzlzWVhKdmFXUXRkR0Z3WlEucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=vd4Isj-OfG6EHWj9Uyr0wEOEJV0CfVwrxxDOLfWr9e7q2m9W064hKNAxLxEJgENgu2Mh8NNKExTjFeMnOPeoOD9kBDiKUFOjjc3FFS-vRUnDronbR7zYkDk-TLarH0BdY7t0kchSNVJ~d7ROGq5BiINL1uBoQikaAcmKdZW69XjwEB9YGXBlq-5QKyxk8YvYiOWhSN0x2A1Z~ptnxvcxGPsEVrQkxBc6OQ-z7dfDdn3xM0ld7-VfG0n0GWURSmZhv6PHuSEvJ8qzQ2VjmCAESXvG5LRiH7DvfDQX2ggOnZ4JEW-14-p4sQcAywVIKr73EZncmfrf63pWfRersGHSLQ__";

interface PolaroidOverlayProps {
  memories: Memory[];
  locationKey: string | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

/**
 * Generates random rotation for each Polaroid (-4° to +4°).
 * Uses a deterministic hash so the same card always gets the same rotation.
 */
function getRandomRotation(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return ((hash % 9) - 4);
}

/**
 * Heart burst particles — small hearts that explode outward from center.
 * Creates a circular burst pattern with varying sizes and speeds.
 */
function HeartBurstParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const distance = 60 + Math.random() * 80;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0.3 + Math.random() * 0.7,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.12,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: [0, p.scale, 0],
            opacity: [1, 1, 0],
            rotate: p.rotation,
          }}
          transition={{
            duration: 0.9,
            delay: p.delay,
            ease: "easeOut",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#C4878E">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Central pulsing heart that appears before the burst.
 * Scales up with a glow effect, then fades away.
 */
function PulsingHeart() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[0]"
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1.6, 1.3, 1.5, 0],
        opacity: [0, 1, 0.8, 1, 0],
      }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <svg width="64" height="64" viewBox="0 0 24 24" fill="#C4878E" style={{ filter: "drop-shadow(0 0 24px rgba(196,135,142,0.7))" }}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </motion.div>
  );
}

/**
 * Single Polaroid card with spring animation.
 * Includes washi tape corner decoration, paper grain texture,
 * handwritten caption, and delete button on hover.
 */
function PolaroidCard({
  memory,
  index,
  total,
  onDelete,
}: {
  memory: Memory;
  index: number;
  total: number;
  onDelete?: (id: string) => void;
}) {
  const rotation = getRandomRotation(memory.id);
  
  // Fan out cards if multiple — spread them horizontally with slight rotation
  const fanOffset = total > 1 ? (index - (total - 1) / 2) * 35 : 0;
  const fanRotation = total > 1 ? (index - (total - 1) / 2) * 6 : rotation;

  // Use memoryDate if available, otherwise fall back to createdAt
  const dateStr = memory.memoryDate
    ? new Date(memory.memoryDate + "T00:00:00").toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date(memory.createdAt).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return (
    <motion.div
      className="relative group"
      style={{ zIndex: total - index }}
      // Polaroid flies out from center, rotates, lands with bounce
      initial={{
        scale: 0,
        y: 80,
        x: 0,
        rotate: 0,
        opacity: 0,
      }}
      animate={{
        scale: 1,
        y: 0,
        x: fanOffset,
        rotate: fanRotation,
        opacity: 1,
      }}
      transition={{
        type: "spring" as const,
        damping: 14,
        stiffness: 180,
        delay: 0.35 + index * 0.12, // Staggered entrance after burst
      }}
      whileHover={{
        scale: 1.04,
        rotate: 0,
        zIndex: 50,
        transition: { duration: 0.2 },
      }}
    >
      <div className="polaroid-card w-[230px] sm:w-[270px] cursor-default relative">
        {/* Washi tape decoration — top center */}
        <img
          src={WASHI_TAPE_URL}
          alt=""
          className="absolute -top-5 left-1/2 -translate-x-1/2 w-16 h-8 opacity-60 pointer-events-none"
          style={{ transform: "translateX(-50%) rotate(-2deg)" }}
        />

        {/* Photo */}
        <img
          src={memory.imageDataUrl}
          alt={memory.caption}
          className="w-full h-[170px] sm:h-[200px] object-cover rounded-sm"
          draggable={false}
        />
        
        {/* Caption at bottom in handwritten font */}
        <div className="mt-3 px-1">
          <p
            className="text-center text-[#4a3f35] leading-tight"
            style={{
              fontFamily: "var(--font-handwritten)",
              fontSize: "1rem",
            }}
          >
            {memory.caption}
          </p>
          <p
            className="text-center text-[#b5a898] mt-1"
            style={{
              fontFamily: "var(--font-handwritten)",
              fontSize: "0.75rem",
            }}
          >
            {dateStr}
          </p>
        </div>

        {/* Delete button — appears on hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(memory.id);
            }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center
                       rounded-full bg-white/90 shadow-md text-[#C4878E] hover:bg-red-50 hover:text-red-500
                       opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function PolaroidOverlay({ memories, locationKey, onClose, onDelete }: PolaroidOverlayProps) {
  const locationMemories = useMemo(() => {
    if (!locationKey) return [];
    // Filter by location, then sort chronologically (oldest first)
    return memories
      .filter((m) => m.locationKey === locationKey)
      .sort((a, b) => {
        const dateA = a.memoryDate ? new Date(a.memoryDate).getTime() : a.createdAt;
        const dateB = b.memoryDate ? new Date(b.memoryDate).getTime() : b.createdAt;
        return dateA - dateB;
      });
  }, [memories, locationKey]);

  const locationName = useMemo(() => {
    if (!locationKey) return "";
    return SG_LOCATIONS.find((l) => l.key === locationKey)?.name || locationKey;
  }, [locationKey]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {locationKey && locationMemories.length > 0 && (
        <>
          {/* Dimmed backdrop with spotlight feel */}
          <motion.div
            className="fixed inset-0 z-[2000] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={handleBackdropClick}
          >
            {/* Dark overlay with radial spotlight */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 100%)",
                backdropFilter: "blur(3px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            {/* Content container — stops click propagation */}
            <div
              className="relative z-10 flex flex-col items-center px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pulsing heart animation */}
              <PulsingHeart />

              {/* Heart burst particles */}
              <HeartBurstParticles />

              {/* Location name */}
              <motion.h3
                className="text-white mb-6 drop-shadow-lg text-center"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
                }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {locationName}
              </motion.h3>

              {/* Polaroid cards */}
              <div className="flex items-center justify-center gap-2 flex-wrap max-w-[90vw]">
                {locationMemories.map((memory, i) => (
                  <PolaroidCard
                    key={memory.id}
                    memory={memory}
                    index={i}
                    total={locationMemories.length}
                    onDelete={onDelete}
                  />
                ))}
              </div>

              {/* Close button */}
              <motion.button
                className="mt-8 w-10 h-10 flex items-center justify-center rounded-full
                           bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm
                           transition-colors border border-white/10"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring" as const, damping: 15 }}
                onClick={onClose}
              >
                <X size={20} />
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
