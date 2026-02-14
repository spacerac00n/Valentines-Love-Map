/**
 * FloatingHearts — Romantic floating heart particles.
 * More varied sizes, colors, sway patterns, and opacity for a richer valentine feel.
 * Uses CSS animations defined in index.css.
 */
import { useMemo } from "react";

const HEART_COUNT = 18;

const HEART_COLORS = [
  "#C4878E",  // dried rose
  "#d4a0a6",  // lighter rose
  "#c4836a",  // terracotta rose
  "#e8b4b8",  // blush pink
  "#b07a7f",  // deeper rose
  "#dbb8a0",  // warm peach
];

export default function FloatingHearts() {
  const hearts = useMemo(() => {
    return Array.from({ length: HEART_COUNT }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      size: 8 + Math.random() * 18,
      duration: `${14 + Math.random() * 22}s`,
      delay: `${Math.random() * 18}s`,
      sway: `${(Math.random() - 0.5) * 60}px`,
      maxOpacity: (0.06 + Math.random() * 0.12).toFixed(2),
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {hearts.map((h) => (
        <svg
          key={h.id}
          className="floating-heart"
          style={{
            left: h.left,
            width: h.size,
            height: h.size,
            color: h.color,
            ["--duration" as string]: h.duration,
            ["--delay" as string]: h.delay,
            ["--sway" as string]: h.sway,
            ["--max-opacity" as string]: h.maxOpacity,
          }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ))}
    </div>
  );
}
