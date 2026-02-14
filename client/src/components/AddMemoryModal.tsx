/**
 * AddMemoryModal — Form for adding a new memory (photo + caption + location).
 * Uses Framer Motion for smooth bottom-sheet style animation on mobile,
 * centered modal on desktop.
 * 
 * Design: Botanical scrapbook — kraft paper background, handwritten font accents.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Heart, ImagePlus } from "lucide-react";
import { SG_LOCATIONS } from "@/lib/locations";
import { compressImage } from "@/lib/imageUtils";
import type { Memory } from "@/lib/types";
import { nanoid } from "nanoid";

const PAPER_TEXTURE_URL = "https://private-us-east-1.manuscdn.com/sessionFile/V7ap1rZxcMDRNORRbX2u8f/sandbox/OlM2VxncM6wyctmFHlZwrJ-img-3_1771057380000_na1fn_cGFwZXItdGV4dHVyZQ.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVjdhcDFyWnhjTURSTk9SUmJYMnU4Zi9zYW5kYm94L09sTTJWeG5jTTZ3eWN0bUZIbFp3ckotaW1nLTNfMTc3MTA1NzM4MDAwMF9uYTFmbl9jR0Z3WlhJdGRHVjRkSFZ5WlEuanBnP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=mVguKKvLPE94WjBlUq47loO4hTSAE-9j7QCi2s9eVl56~WkgQjGPQPQEq2wK8fu4i6H~prsqSppGh2Uu~kGgWXWIMt7VubCv4xh0pxMV0VhkhdUVjxyiONYkwe2ymcTkIgJL2jC6OAfG6JQawdB3qeTYbptH~VMTvp~gs0TKVdmOMn-KnIcZIJTjfzJyoII~HBXW38Xxd4PycPGcFM--LrUCwjiVcmoWNFUMHyKI4GpursbgmM2YLf-9xRB8983YsavhEPNKyHM~ihnj-y~6dyAWnwm79oG2xsTb6Cpe5oCbohQFhRxgyc2FRB4rGv3tQs4uQZCh57Pz8n3vzno4Ug__";

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (memory: Memory) => void;
}

export default function AddMemoryModal({ isOpen, onClose, onSubmit }: AddMemoryModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
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

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setImageDataUrl(compressed);
      setImagePreview(compressed);
    } catch (err) {
      console.error("Image compression failed:", err);
    } finally {
      setIsCompressing(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!imageDataUrl || !caption.trim() || !locationKey) return;

    const location = SG_LOCATIONS.find((l) => l.key === locationKey);
    if (!location) return;

    const memory: Memory = {
      id: nanoid(),
      createdAt: Date.now(),
      locationKey: location.key,
      lat: location.lat,
      lng: location.lng,
      caption: caption.trim(),
      imageDataUrl,
    };

    onSubmit(memory);

    // Reset form
    setImagePreview(null);
    setImageDataUrl(null);
    setCaption("");
    setLocationKey("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [imageDataUrl, caption, locationKey, onSubmit]);

  const handleClose = useCallback(() => {
    onClose();
    // Reset form on close
    setTimeout(() => {
      setImagePreview(null);
      setImageDataUrl(null);
      setCaption("");
      setLocationKey("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 300);
  }, [onClose]);

  const isValid = imageDataUrl && caption.trim() && locationKey;

  // Different animation variants for mobile (bottom sheet) vs desktop (centered modal)
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
            {/* Semi-transparent overlay for readability */}
            <div className={`bg-[#f5f0eb]/88 backdrop-blur-sm p-6 ${isDesktop ? "rounded-2xl" : "rounded-t-2xl"}`}>
              {/* Drag handle on mobile */}
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

              {/* Image upload */}
              <div className="mb-5">
                <label
                  className="block text-sm font-medium text-[#6b5c4f] mb-2"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Your Photo
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative group">
                    <div className="polaroid-card inline-block mx-auto w-full">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-sm"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setImageDataUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center
                                 rounded-full bg-white/90 shadow-md text-[#6b5c4f] hover:bg-white
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
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
                          Tap to upload a photo
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
                  {/* Custom dropdown arrow */}
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
