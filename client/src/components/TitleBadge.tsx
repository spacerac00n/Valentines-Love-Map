/**
 * TitleBadge — Top-left floating title badge for "Singapore Love Map".
 * 
 * Design: Botanical scrapbook — paper-textured badge with botanical corner accent,
 * elegant serif title, subtle shadow.
 */
import { motion } from "framer-motion";

const BOTANICAL_CORNER_URL = "https://private-us-east-1.manuscdn.com/sessionFile/V7ap1rZxcMDRNORRbX2u8f/sandbox/OlM2VxncM6wyctmFHlZwrJ_1771057387768_na1fn_Ym90YW5pY2FsLWNvcm5lcg.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVjdhcDFyWnhjTURSTk9SUmJYMnU4Zi9zYW5kYm94L09sTTJWeG5jTTZ3eWN0bUZIbFp3ckpfMTc3MTA1NzM4Nzc2OF9uYTFmbl9ZbTkwWVc1cFkyRnNMV052Y201bGNnLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=gSOLabHzOlva~tYHt9Ed9RpGLP5mmtDwzsm5zzBVXCRMHJD3DA0fN4K9Xa0fNZopgcPMVgZLplfaNydnm3qV10cAOvxkROsdtEiwr-hybjvBBt4V9huQp8MIXxQOS253CjBtqs7QC3kDNV6uvbZpUytjwtXP6b9uxbqTqZ08in-e-xZOz4gwRIjxJGLL8xi8N7KLwMLQN0u7Qn~Dd0XfEjp7~NbncHKOOQDzNfNnFtDHRREFmY4Jsiav0sL2Dx-C~U2kncEO6jUfKIudEQavleJG3CFDJymXCpqEvZl6SJc2XKKoqHf9OTBOMjXZaHj-Cgqrl~sGlFKFXGhdddXW9Q__";

export default function TitleBadge() {
  return (
    <motion.div
      className="fixed top-4 left-4 z-[500] pointer-events-none"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div
        className="relative bg-[#f5f0eb]/90 backdrop-blur-sm rounded-xl px-5 py-3
                    shadow-[0_4px_20px_rgba(139,115,85,0.12)] border border-[#e8ddd0]
                    overflow-hidden"
      >
        {/* Botanical corner decoration */}
        <img
          src={BOTANICAL_CORNER_URL}
          alt=""
          className="absolute -bottom-2 -right-2 w-16 h-16 opacity-30 pointer-events-none"
          style={{ transform: "rotate(180deg)" }}
        />

        <div className="flex items-center gap-3">
          {/* Heart icon with subtle glow */}
          <div className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#C4878E">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <div
              className="absolute inset-0 rounded-full"
              style={{ filter: "blur(6px)", background: "rgba(196,135,142,0.3)" }}
            />
          </div>
          <div>
            <h1
              className="text-lg sm:text-xl text-[#4a3f35] leading-tight"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              Singapore Love Map
            </h1>
            <p
              className="text-[10px] text-[#8b7355] tracking-[0.15em] uppercase"
              style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}
            >
              Pin your memories
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
