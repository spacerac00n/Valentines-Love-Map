/**
 * FloatingHearts — Subtle valentine vibe background.
 * Very light, non-distracting floating heart particles.
 * Uses CSS animations defined in index.css.
 */
import { useMemo } from "react";

const HEART_COUNT = 12;

export default function FloatingHearts() {
  const hearts = useMemo(() => {
    return Array.from({ length: HEART_COUNT }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 10 + Math.random() * 14,
      duration: `${18 + Math.random() * 20}s`,
      delay: `${Math.random() * 20}s`,
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
            ["--duration" as string]: h.duration,
            ["--delay" as string]: h.delay,
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
