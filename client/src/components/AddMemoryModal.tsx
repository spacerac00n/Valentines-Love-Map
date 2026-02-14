/**
 * AddMemoryModal — Form for adding a new memory (up to 3 photos + caption + date + location).
 * Uses Framer Motion for smooth bottom-sheet style animation on mobile,
 * centered modal on desktop.
 * 
 * Design: Botanical scrapbook — kraft paper background, handwritten font accents.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ImagePlus, CalendarHeart, Plus } from "lucide-react";
import { SG_LOCATIONS } from "@/lib/locations";
import { compressImage } from "@/lib/imageUtils";
import type { Memory } from "@/lib/types";
import { nanoid } from "nanoid";

const PAPER_TEXTURE_URL = "https://private-us-east-1.manuscdn.com/sessionFile/V7ap1rZxcMDRNORRbX2u8f/sandbox/OlM2VxncM6wyctmFHlZwrJ-img-3_1771057380000_na1fn_cGFwZXItdGV4dHVyZQ.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVjdhcDFyWnhjTURSTk9SUmJYMnU4Zi9zYW5kYm94L09sTTJWeG5jTTZ3eWN0bUZIbFp3ckotaW1nLTNfMTc3MTA1NzM4MDAwMF9uYTFmbl9jR0Z3WlhJdGRHVjRkSFZ5WlEuanBnP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=mVguKKvLPE94WjBlUq47loO4hTSAE-9j7QCi2s9eVl56~WkgQjGPQPQEq2wK8fu4i6H~prsqSppGh2Uu~kGgWXWIMt7VubCv4xh0pxMV0VhkhdUVjxyiONYkwe2ymcTkIgJL2jC6OAfG6JQawdB3qeTYbptH~VMTvp~gs0TKVdmOMn-KnIcZIJTjfzJyoII~HBXW38Xxd4PycPGcFM--LrUCwjiVcmoWNFUMHyKI4GpursbgmM2YLf-9xRB8983YsavhEPNKyHM~ihnj-y~6dyAWnwm79oG2xsTb6Cpe5oCbohQFhRxgyc2FRB4rGv3tQs4uQZCh57Pz8n3vzno4Ug__";

const MAX_PHOTOS = 3;

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (memory: Memory) => void;
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function AddMemoryModal({ isOpen, onClose, onSubmit }: AddMemoryModalProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [memoryDate, setMemoryDate] = useState(todayISO());
  const [locationKey, setLocationKey] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMemoryDate(todayISO());
    }
  }, [isOpen]);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPhotos((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        return [...prev, compressed];
      });
    } catch (err) {
      console.error("Image compression failed:", err);
    } finally {
      setIsCompressing(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (photos.length === 0 || !caption.trim() || !locationKey) return;

    const location = SG_LOCATIONS.find((l) => l.key === locationKey);
    if (!location) return;

    const memory: Memory = {
      id: nanoid(),
      createdAt: Date.now(),
      memoryDate: memoryDate || undefined,
      locationKey: location.key,
      lat: location.lat,
      lng: location.lng,
      caption: caption.trim(),
      imageDataUrl: photos[0], // backward compat
      imageDataUrls: photos,
    };

    onSubmit(memory);

    // Reset form
    setPhotos([]);
    setCaption("");
    setMemoryDate(todayISO());
    setLocationKey("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photos, caption, memoryDate, locationKey, onSubmit]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setPhotos([]);
      setCaption("");
      setMemoryDate(todayISO());
      setLocationKey("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 300);
  }, [onClose]);

  const isValid = photos.length > 0 && caption.trim() && locationKey;

  const mobileVariants = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { type: "spring" as const, damping: 28, stiffness: 300 } },
    exit: { y: "100%", opacity: 0, transition: { duration: 0.25 } },
  };

  const desktopVariants = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
  };

  const variants = isDesktop ? desktopVariants : mobileVariants;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal panel */}
          <motion.div
            className={`fixed z-[1001] max-h-[90vh] overflow-y-auto
                       ${isDesktop
                         ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full rounded-2xl"
                         : "inset-x-0 bottom-0 rounded-t-2xl"
                       }`}
            style={{
              backgroundImage: `url(${PAPER_TEXTURE_URL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
          >
            <div className={`bg-[#f5f0eb]/88 backdrop-blur-sm p-6 ${isDesktop ? "rounded-2xl" : "rounded-t-2xl"}`}>
              {!isDesktop && (
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full bg-[#d4c8b8]" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-2xl text-[#4a3f35]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  Add a Memory
                </h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                             bg-[#d4c8b8]/40 hover:bg-[#d4c8b8]/70 transition-colors text-[#6b5c4f]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Multi-photo upload area */}
              <div className="mb-5">
                <label
                  className="block text-sm font-medium text-[#6b5c4f] mb-2"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Your Photos
                  <span className="text-[#b5a898] font-normal ml-1">({photos.length}/{MAX_PHOTOS})</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {photos.length > 0 ? (
                  <div className="space-y-3">
                    {/* Photo thumbnails grid */}
                    <div className="flex gap-2">
                      <AnimatePresence mode="popLayout">
                        {photos.map((photo, i) => (
                          <motion.div
                            key={`photo-${i}-${photo.substring(30, 50)}`}
                            className="relative group flex-1"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -10 }}
                            transition={{ type: "spring" as const, damping: 20, stiffness: 300 }}
                            layout
                          >
                            <div className="polaroid-card !p-1.5 !pb-2">
                              <img
                                src={photo}
                                alt={`Photo ${i + 1}`}
                                className="w-full h-24 sm:h-28 object-cover rounded-sm"
                              />
                              <p
                                className="text-center text-[#b5a898] mt-1"
                                style={{ fontFamily: "var(--font-handwritten)", fontSize: "0.65rem" }}
                              >
                                {i + 1} of {photos.length}
                              </p>
                            </div>
                            {/* Remove button */}
                            <button
                              onClick={() => removePhoto(i)}
                              className="absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center
                                         rounded-full bg-white shadow-md text-[#C4878E] hover:bg-red-50 hover:text-red-500
                                         opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Add more button (if under limit) */}
                      {photos.length < MAX_PHOTOS && (
                        <motion.button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isCompressing}
                          className="flex-1 min-h-[100px] sm:min-h-[120px] border-2 border-dashed border-[#d4c8b8] rounded-lg
                                     flex flex-col items-center justify-center gap-1
                                     hover:border-[#C4878E] hover:bg-[#C4878E]/5 transition-all text-[#8b7355]"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring" as const, damping: 20 }}
                        >
                          {isCompressing ? (
                            <div className="animate-spin w-5 h-5 border-2 border-[#C4878E] border-t-transparent rounded-full" />
                          ) : (
                            <>
                              <Plus size={20} className="text-[#C4878E]" />
                              <span className="text-[10px]" style={{ fontFamily: "var(--font-body)" }}>
                                Add more
                              </span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="w-full h-40 border-2 border-dashed border-[#d4c8b8] rounded-lg
                               flex flex-col items-center justify-center gap-2
                               hover:border-[#C4878E] hover:bg-[#C4878E]/5 transition-all
                               text-[#8b7355] group"
                  >
                    {isCompressing ? (
                      <div className="animate-spin w-6 h-6 border-2 border-[#C4878E] border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-[#C4878E]/10 flex items-center justify-center
                                        group-hover:bg-[#C4878E]/15 transition-colors">
                          <ImagePlus size={22} className="text-[#C4878E]" />
                        </div>
                        <span className="text-sm" style={{ fontFamily: "var(--font-body)" }}>
                          Tap to upload photos (up to {MAX_PHOTOS})
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Caption */}
              <div className="mb-5">
                <label
                  className="block text-sm font-medium text-[#6b5c4f] mb-2"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 80))}
                  placeholder="A short love note..."
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-lg border border-[#d4c8b8] bg-white/70
                             text-[#4a3f35] placeholder:text-[#b5a898]
                             focus:outline-none focus:ring-2 focus:ring-[#C4878E]/40 focus:border-[#C4878E]
                             transition-all"
                  style={{ fontFamily: "var(--font-handwritten)", fontSize: "1.1rem" }}
                />
                <span className="text-xs text-[#b5a898] mt-1 block text-right"
                      style={{ fontFamily: "var(--font-body)" }}>
                  {caption.length}/80
                </span>
              </div>

              {/* Date picker */}
              <div className="mb-5">
                <label
                  className="block text-sm font-medium text-[#6b5c4f] mb-2"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  When did this happen?
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#C4878E]">
                    <CalendarHeart size={18} />
                  </div>
                  <input
                    type="date"
                    value={memoryDate}
                    onChange={(e) => setMemoryDate(e.target.value)}
                    max={todayISO()}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#d4c8b8] bg-white/70
                               text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#C4878E]/40
                               focus:border-[#C4878E] transition-all"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>

              {/* Location picker */}
              <div className="mb-6">
                <label
                  className="block text-sm font-medium text-[#6b5c4f] mb-2"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Location in Singapore
                </label>
                <div className="relative">
                  <select
                    value={locationKey}
                    onChange={(e) => setLocationKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[#d4c8b8] bg-white/70
                               text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#C4878E]/40
                               focus:border-[#C4878E] transition-all appearance-none pr-10"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    <option value="">Choose a place...</option>
                    {SG_LOCATIONS.map((loc) => (
                      <option key={loc.key} value={loc.key}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8b7355]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <motion.button
                onClick={handleSubmit}
                disabled={!isValid}
                className="w-full py-3.5 rounded-lg font-medium text-white
                           flex items-center justify-center gap-2 transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  background: isValid
                    ? "linear-gradient(135deg, #C4878E 0%, #c4836a 100%)"
                    : "#d4c8b8",
                }}
                whileHover={isValid ? { scale: 1.02 } : {}}
                whileTap={isValid ? { scale: 0.98 } : {}}
              >
                <Heart size={18} fill="currentColor" />
                Pin This Memory
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
