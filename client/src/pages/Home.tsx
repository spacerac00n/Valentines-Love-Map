/**
 * Home — Main page for Singapore Love Map.
 * Full-screen map with floating UI elements, Add Memory modal,
 * and Polaroid reveal overlay. Data persists via localStorage.
 *
 * Design: Botanical scrapbook — linen background, soft earthy tones,
 * floating hearts, kraft paper panels.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, Settings, MapPin } from "lucide-react";
import { toast } from "sonner";
import MapView from "@/components/MapView";
import AddMemoryModal from "@/components/AddMemoryModal";
import PolaroidOverlay from "@/components/PolaroidOverlay";
import TitleBadge from "@/components/TitleBadge";
import FloatingHearts from "@/components/FloatingHearts";
import { loadMemories, addMemory, deleteMemory, clearAllMemories } from "@/lib/storage";
import type { Memory } from "@/lib/types";

export default function Home() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load memories from localStorage on mount
  useEffect(() => {
    const saved = loadMemories();
    setMemories(saved);
  }, []);

  // Close settings when clicking outside
  useEffect(() => {
    if (!showSettings) return;
    const handler = () => setShowSettings(false);
    const timer = setTimeout(() => {
      document.addEventListener("click", handler, { once: true });
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [showSettings]);

  // Handle adding a new memory
  const handleAddMemory = useCallback((memory: Memory) => {
    const updated = addMemory(memory);
    setMemories(updated);
    setIsModalOpen(false);
    toast.success("Memory pinned!", {
      description: `Your memory at ${memory.locationKey.replace(/-/g, " ")} has been saved.`,
      style: {
        fontFamily: "var(--font-body)",
        background: "#f5f0eb",
        border: "1px solid #e8ddd0",
        color: "#4a3f35",
      },
    });
  }, []);

  // Handle clicking a map pin
  const handlePinClick = useCallback((locationKey: string) => {
    setSelectedLocation(locationKey);
  }, []);

  // Handle closing the polaroid overlay
  const handleCloseOverlay = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  // Handle deleting a memory
  const handleDeleteMemory = useCallback((id: string) => {
    const updated = deleteMemory(id);
    setMemories(updated);
    // If no more memories at this location, close overlay
    if (selectedLocation) {
      const remaining = updated.filter((m) => m.locationKey === selectedLocation);
      if (remaining.length === 0) {
        setSelectedLocation(null);
      }
    }
    toast("Memory removed", {
      style: {
        fontFamily: "var(--font-body)",
        background: "#f5f0eb",
        border: "1px solid #e8ddd0",
        color: "#4a3f35",
      },
    });
  }, [selectedLocation]);

  // Handle clearing all memories
  const handleReset = useCallback(() => {
    if (!window.confirm("Are you sure you want to clear all memories? This cannot be undone.")) return;
    clearAllMemories();
    setMemories([]);
    setSelectedLocation(null);
    setShowSettings(false);
    toast("All memories cleared", {
      style: {
        fontFamily: "var(--font-body)",
        background: "#f5f0eb",
        border: "1px solid #e8ddd0",
        color: "#4a3f35",
      },
    });
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f5f0eb]">
      {/* Floating hearts background — subtle valentine vibe */}
      <FloatingHearts />

      {/* Full-screen map */}
      <div className="absolute inset-0 z-[2]">
        <MapView memories={memories} onPinClick={handlePinClick} />
      </div>

      {/* Title badge — top left */}
      <TitleBadge />

      {/* Memory count badge — top right */}
      <AnimatePresence>
        {memories.length > 0 && (
          <motion.div
            className="fixed top-4 right-4 z-[500]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div
              className="bg-[#f5f0eb]/90 backdrop-blur-sm rounded-full px-4 py-2
                          shadow-[0_4px_20px_rgba(139,115,85,0.15)] border border-[#e8ddd0]
                          flex items-center gap-2"
            >
              <MapPin size={14} className="text-[#C4878E]" />
              <span
                className="text-sm text-[#6b5c4f]"
                style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}
              >
                {memories.length} {memories.length === 1 ? "memory" : "memories"}
              </span>

              {/* Settings gear */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full
                           hover:bg-[#d4c8b8]/50 transition-colors text-[#8b7355]"
              >
                <Settings size={14} />
              </button>
            </div>

            {/* Settings dropdown */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  className="absolute top-full right-0 mt-2 bg-[#f5f0eb]/95 backdrop-blur-sm
                             rounded-lg shadow-lg border border-[#e8ddd0] p-2 min-w-[160px]"
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md
                               text-sm text-red-600 hover:bg-red-50 transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    <RotateCcw size={14} />
                    Clear All Memories
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state hint — when no memories exist */}
      <AnimatePresence>
        {memories.length === 0 && (
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5]
                       pointer-events-none text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <div className="bg-[#f5f0eb]/80 backdrop-blur-sm rounded-2xl px-8 py-6
                            shadow-[0_4px_30px_rgba(139,115,85,0.1)] border border-[#e8ddd0]/50">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#C4878E" className="mx-auto mb-3 opacity-50">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </motion.div>
              <p
                className="text-[#8b7355] text-sm"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontStyle: "italic" }}
              >
                Tap "Add a Memory" to pin your first love note
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Add a Memory" button — bottom center */}
      <motion.div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-full
                     text-white shadow-[0_8px_30px_rgba(196,135,142,0.35)]
                     border border-white/20"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.05rem",
            fontWeight: 600,
            background: "linear-gradient(135deg, #C4878E 0%, #c4836a 100%)",
          }}
          whileHover={{ scale: 1.05, boxShadow: "0 12px 40px rgba(196,135,142,0.45)" }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={20} strokeWidth={2.5} />
          Add a Memory
        </motion.button>
      </motion.div>

      {/* Add Memory Modal */}
      <AddMemoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddMemory}
      />

      {/* Polaroid Reveal Overlay */}
      <PolaroidOverlay
        memories={memories}
        locationKey={selectedLocation}
        onClose={handleCloseOverlay}
        onDelete={handleDeleteMemory}
      />
    </div>
  );
}
