/**
 * Core data model for a memory pin on the Singapore Love Map.
 * Each memory represents 1-3 photos + caption at a specific Singapore location.
 */
export type Memory = {
  id: string;
  createdAt: number;
  memoryDate?: string; // ISO date string (YYYY-MM-DD) for when the memory happened
  locationKey: string; // from dropdown
  lat: number;
  lng: number;
  caption: string;
  imageDataUrl: string; // first photo — kept for backward compat
  imageDataUrls?: string[]; // all photos (1-3) — new field
};

/** Helper to get all image URLs from a memory, handling old single-image format */
export function getMemoryImages(memory: Memory): string[] {
  if (memory.imageDataUrls && memory.imageDataUrls.length > 0) {
    return memory.imageDataUrls;
  }
  return [memory.imageDataUrl];
}
